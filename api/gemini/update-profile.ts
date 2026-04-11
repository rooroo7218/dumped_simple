import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SchemaType } from '@google/generative-ai';
import { ASSISTANT_INSTRUCTION, verifyAuth, checkRateLimit, generateWithFallback, extractText } from '../_shared.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const userId = await verifyAuth(req);
        if (!await checkRateLimit(userId, res)) return;

        const {
            triggerSource,
            recentDumpContent,
            recentDiaryEntries,
            categoryStats,
            currentObservations,
            persona,
        } = req.body;

        const signalBlock = triggerSource === 'dump' && recentDumpContent
            ? `LATEST BRAIN DUMP:\n"${recentDumpContent}"`
            : triggerSource === 'journal' && recentDiaryEntries?.length
            ? `RECENT JOURNAL ENTRIES:\n${recentDiaryEntries.slice(0, 3).map((d: any) => `- [${d.mood ?? 'no mood'}] "${d.content}"`).join('\n')}`
            : `TASK COMPLETION DATA:\n${Object.entries(categoryStats ?? {}).map(([cat, s]: [string, any]) => `- ${cat}: ${s.completed}/${s.total} done`).join('\n')}`;

        const categoryLines = Object.entries(categoryStats ?? {})
            .map(([cat, s]: [string, any]) => `- ${cat}: ${s.completed}/${s.total} tasks completed`)
            .join('\n') || '- No data yet';

        const result = await generateWithFallback(
            {
                systemInstruction: ASSISTANT_INSTRUCTION +
                    '\nYou are silently building a cumulative understanding of this person based on their behavior over time. Be observational, specific, and never give advice.',
            },
            {
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `SIGNAL SOURCE: ${triggerSource}

${signalBlock}

TASK COMPLETION PATTERNS:
${categoryLines}

WHAT YOU ALREADY KNOW ABOUT THEM:
Identity: ${currentObservations?.identityNotes || 'Nothing yet.'}
Goal drift: ${currentObservations?.goalDriftNote || 'Nothing yet.'}
Previous insights: ${(currentObservations?.insights ?? []).slice(0, 3).map((i: any) => `"${i.text}"`).join(', ') || 'None yet.'}

THEIR GOALS: ${(persona?.longTermGoals ?? []).map((g: any) => `"${g.goal}" [${g.timeframe}]`).join(', ') || 'Not set'}
THEIR VALUES: ${(persona?.values ?? []).join(', ') || 'Not set'}
JOB/ROLE: ${persona?.jobTitle || 'Not specified'}

TASK:
1. NEW_INSIGHT: Write ONE new behavioral observation (max 120 characters). Be specific — reference actual categories, moods, or patterns you see. Never be generic. Never give advice. If you don't have enough signal, write "Still learning your patterns."
2. IDENTITY_NOTES: Write a short paragraph (2-4 sentences) about who this person is. Incorporate the new signal. Replace, don't append. If signal is sparse, keep it brief.
3. GOAL_DRIFT_NOTE: Write one sentence about whether their priorities seem to be shifting based on recent behavior. If unclear, write "No drift detected yet."`,
                    }],
                }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            newInsight: { type: SchemaType.STRING },
                            identityNotes: { type: SchemaType.STRING },
                            goalDriftNote: { type: SchemaType.STRING },
                        },
                        required: ['newInsight', 'identityNotes', 'goalDriftNote'],
                    },
                },
            }
        );

        const text = await extractText(result.response);
        let parsed = { newInsight: '', identityNotes: '', goalDriftNote: '' };
        if (text) {
            try { parsed = JSON.parse(text); } catch { /* keep default */ }
        }

        return res.json(parsed);

    } catch (error: any) {
        if (error.message?.startsWith('Unauthorized')) return res.status(401).json({ error: 'Unauthorized' });
        return res.status(500).json({ error: 'Failed to update profile', message: error.message });
    }
}
