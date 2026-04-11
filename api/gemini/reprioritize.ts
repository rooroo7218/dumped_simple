import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SchemaType } from '@google/generative-ai';
import { ASSISTANT_INSTRUCTION, verifyAuth, checkRateLimit, fetchUserContext, fetchUserTasks, generateWithFallback, extractText, getTimeContext } from '../_shared.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const userId = await verifyAuth(req);
        if (!await checkRateLimit(userId, res)) return;
        const { persona: personaOverride, tasks: tasksOverride, diaryEntries, allTasksForStats, clientHour } = req.body;
        const hour = typeof clientHour === 'number' ? clientHour : new Date().getUTCHours();
        const timeLabel = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        const clientTimeContext = `Current time: ${timeLabel} (${hour}:00 local time)`;

        const [context, dbTasks] = await Promise.all([
            fetchUserContext(userId, personaOverride),
            tasksOverride ? Promise.resolve(tasksOverride) : fetchUserTasks(userId),
        ]);
        const { persona, history } = context;
        const allTasks = tasksOverride || dbTasks;
        const recentContext = history.slice(0, 10);

        // Compute per-category completion rates from all tasks (including completed)
        const statsSource: any[] = allTasksForStats || allTasks;
        const categoryStats: Record<string, { total: number; completed: number }> = {};
        for (const t of statsSource) {
            const cat = t.category || 'Uncategorized';
            if (!categoryStats[cat]) categoryStats[cat] = { total: 0, completed: 0 };
            categoryStats[cat].total++;
            if (t.completed) categoryStats[cat].completed++;
        }
        const completionPatternLines = Object.entries(categoryStats)
            .filter(([, s]) => s.total >= 2)
            .sort(([, a], [, b]) => (a.completed / a.total) - (b.completed / b.total))
            .map(([cat, s]) => {
                const pct = Math.round((s.completed / s.total) * 100);
                const flag = pct < 25 ? ' ← low — consider why this category stalls' : '';
                return `- ${cat}: ${s.completed}/${s.total} tasks completed (${pct}%)${flag}`;
            }).join('\n');

        const tasksForAi = allTasks.map((t: any) => ({
            id: t.id,
            text: t.text,
            category: t.category,
        }));

        const result = await generateWithFallback(
            {
                systemInstruction: ASSISTANT_INSTRUCTION +
                    '\nYou are a strategic advisor helping the user re-prioritize their life.',
            },
            {
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `${clientTimeContext}

TASK: Re-rank these tasks based on the provided USER context.

                    USER GOALS (sorted by importance, 10 = Must-Win):
                    ${(persona.longTermGoals || []).sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0)).map((g: any) => `- "${g.goal}" [priority ${g.priority}/10, ${g.timeframe}]`).join('\n')}

                    USER VALUES:
                    ${(persona.coreValues || []).map((v: any) => `- ${v.value} (importance ${v.importance}/10): ${v.description || ''}`).join('\n')}

                    PRODUCTIVITY PROFILE:
                    - Peak energy window: ${persona.productivityPatterns?.peakEnergyTime || 'Not specified'}
                    - Daily focused time: ${persona.productivityPatterns?.focusType || 'Not specified'}

                    LIFE CONSTRAINTS:
                    ${(persona.currentConstraints || []).map((c: any) => `- ${c}`).join('\n') || '- None listed'}

                    RECENT LIFE CONTEXT:
                    ${recentContext.map((m: any) => `- [${m.category}] ${m.content} (Priority: ${m.priority})`).join('\n')}

                    RECENT REFLECTIONS (Diary):
                    ${(diaryEntries || []).slice(0, 5).map((d: any) => `- ${d.content}`).join('\n')}

                    COMPLETION PATTERNS (how the user actually behaves by category):
                    ${completionPatternLines || '- Not enough data yet'}
                    Use these to adjust urgency and rationale. Flag categories with low completion in your rationale.

                    CURRENT TASKS:
                    ${JSON.stringify(tasksForAi)}

                    INSTRUCTIONS:
                    1. Assign an URGENCY (1-10) and ALIGNMENT SCORE (0-100) to each task.
                    2. Use goal priority to NUDGE scores, not dominate them. A priority-10 goal gives a +1 to +2 urgency boost over a priority-5 goal — not a +5. Every goal deserves representation in the ranked list.
                    3. GOAL BALANCE RULE: No single goal should account for more than 40% of the top-urgency tasks (7+). Spread high-urgency slots across multiple goals. A user with 5 goals should see tasks from at least 3 of them in the top 10.
                    4. Return a "strategySummary" explaining your reasoning.
                    5. CONTEXT TAGS: Assign 1-2 tags ONLY from: ["Need Car", "At Computer", "On Phone", "Around the House", "Low Mental Load"].

                    URGENCY CALIBRATION — be strict. A well-managed life has mostly 3-6s:
                    1-2 = Someday / nice to have, no consequence if ignored for months
                    3-4 = Worth doing soon, life goes on without it for weeks
                    5-6 = Moderately important, should happen within a few weeks
                    7-8 = Time-sensitive — real consequence if delayed more than a week
                    9   = Blocking other things or has a hard deadline within days
                    10  = Drop everything — genuine crisis only. Assign sparingly.
                    Do NOT inflate urgency to make tasks feel important. If the user has many 8-10s, recalibrate most of them downward.`,
                    }],
                }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            strategySummary: { type: SchemaType.STRING },
                            updatedTasks: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        id: { type: SchemaType.STRING },
                                        urgency: { type: SchemaType.NUMBER },
                                        alignmentScore: { type: SchemaType.NUMBER },
                                        impactArea: { type: SchemaType.STRING },
                                        rationale: { type: SchemaType.STRING },
                                        contextTags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                                    },
                                    required: ['id', 'urgency', 'alignmentScore', 'impactArea', 'rationale', 'contextTags'],
                                },
                            },
                        },
                        required: ['strategySummary', 'updatedTasks'],
                    },
                },
            }
        );

        const text = await extractText(result.response);
        let parsed: any = { updatedTasks: [], strategySummary: '' };
        if (text) {
            try { parsed = JSON.parse(text); } catch { /* keep default */ }
        }
        if (!parsed.strategySummary?.trim()) {
            parsed.strategySummary = 'Analyzed your tasks against your strategic goals and core values.';
        }

        return res.json(parsed);

    } catch (error: any) {
        if (error.message?.startsWith('Unauthorized')) return res.status(401).json({ error: 'Unauthorized' });
        return res.status(500).json({ error: 'Failed to reprioritize tasks', message: error.message });
    }
}
