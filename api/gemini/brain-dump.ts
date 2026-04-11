import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SchemaType } from '@google/generative-ai';
import { ASSISTANT_INSTRUCTION, verifyAuth, checkRateLimit, fetchUserContext, generateWithFallback, extractText, getTimeContext } from '../_shared.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const userId = await verifyAuth(req);
        if (!await checkRateLimit(userId, res)) return;
        const { input, imageAttachment } = req.body;
        const { persona } = await fetchUserContext(userId, req.body.persona);

        const isImageOnly = (!input || !input.trim()) && !!imageAttachment;

        const promptText = isImageOnly
            ? `TASK: EXTRACT EVERY SINGLE ACTIONABLE ITEM from the attached image.
         - The user has uploaded an image of notes, lists, or a whiteboard.
         - READ EVERY LINE. Do not summarize.
         - If text is semi-legible, take your best guess but include it.
         - Every distinct item must be its own task object.`
            : `USER INPUT: "${input}"

         TASK: You MUST extract at least one actionable task from this input.
         - If the input is short ("take out trash"), extract exactly that.
         - If the input is a mess of thoughts, separate them into 2-5 distinct tasks.
         - DO NOT RETURN AN EMPTY LIST. If the user said anything, it's a task.`;

        const parts: any[] = [{
            text: `${getTimeContext()}

${promptText}

      ABOUT THIS USER:
      - Role/Identity: ${persona.jobTitle || 'Not specified'}
      - Peak energy window: ${persona.productivityPatterns?.peakEnergyTime || 'Not specified'}
      - Daily focused time available: ${persona.productivityPatterns?.focusType || 'Not specified'}
      - Life focus areas: ${(persona.customCategories || persona.values || []).join(', ')}
      - Goals (ranked by importance): ${(persona.longTermGoals || []).map((g: any) => `"${g.goal}" (priority ${g.priority}/10)`).join('; ') || 'None set'}
      - Core values: ${(persona.coreValues || []).map((v: any) => v.value).join(', ') || 'None set'}
      - Current life constraints: ${(persona.currentConstraints || []).join(' | ') || 'None listed'}

      CRITICAL GUIDELINES:
      - EXTRACTION RESILIENCE: Return at least ONE task if the input contains any actionable intent.
      - NO SUBTASKS: Capture high-level thoughts. Breakdown happens on demand.
      - ATOMIC TASKS: Keep tasks as high-level single items.
      - MEANINGFUL TEXT: Each action must be clear and complete (e.g., "Buy milk" not just "Milk").
      - RATIONALE: Explain alignment with goals in 1 short sentence.
      - CATEGORIZE: Group into "Career", "Health", "Finance", "Household", or a new simple category.
      - CONTEXT TAGS: Assign 1-2 tags ONLY from: "Need Car", "At Computer", "On Phone", "Around the House", "Low Mental Load".
      - CATEGORY CONFIDENCE (0-100): How confident are you that this category assignment is correct? 90+ = obvious fit, 70-89 = likely correct, 50-69 = best guess, <50 = unclear. Be honest.
      - TIME OF DAY: Assign the best time slot for this task. Use "morning" for tasks requiring focus/energy (deep work, calls, planning), "afternoon" for mid-energy tasks (errands, admin, meetings), "evening" for low-energy/personal tasks (reading, reflecting, household). Use "anytime" only if the task genuinely has no preferred time.
      - URGENCY CALIBRATION (be strict — most tasks are NOT urgent):
        1-2 = Someday / nice to have, no real consequence if ignored for months
        3-4 = Worth doing soon, but life goes on without it
        5-6 = Moderately important, should happen within a few weeks
        7-8 = Time-sensitive — real consequence if delayed more than a week
        9   = Blocking other things or has a hard deadline within days
        10  = Drop everything — a true emergency. Reserve for genuine crises only.
        Typical new tasks should score 3-6. Only assign 7+ if the user's input clearly signals urgency.`
        }];

        if (imageAttachment) {
            parts.unshift({ inlineData: { data: imageAttachment.data, mimeType: imageAttachment.mimeType } });
        }

        const result = await generateWithFallback(
            { systemInstruction: ASSISTANT_INSTRUCTION },
            {
                contents: [{ role: 'user', parts }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            summary: { type: SchemaType.STRING },
                            actions: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        text: { type: SchemaType.STRING },
                                        urgency: { type: SchemaType.NUMBER },
                                        effort: { type: SchemaType.STRING },
                                        category: { type: SchemaType.STRING },
                                        rationale: { type: SchemaType.STRING },
                                        contextTags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                                        timeOfDay: { type: SchemaType.STRING },
                                        categoryConfidence: { type: SchemaType.NUMBER },
                                    },
                                    required: ['text', 'urgency', 'effort', 'category', 'rationale', 'contextTags', 'timeOfDay', 'categoryConfidence'],
                                },
                            },
                            category: { type: SchemaType.STRING },
                            tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                            priority: { type: SchemaType.STRING },
                        },
                        required: ['summary', 'actions', 'category', 'tags', 'priority'],
                    },
                },
            }
        );

        const text = await extractText(result.response);
        if (!text) throw new Error('AI returned no results.');

        let parsed: any = { summary: '', actions: [], category: 'General', tags: [], priority: 'medium' };
        try {
            parsed = JSON.parse(text);
            if (!Array.isArray(parsed.actions)) parsed.actions = [];
        } catch {
            // Safety net below handles this
        }

        if (!parsed.actions || parsed.actions.length === 0) {
            parsed.actions = [{
                text: (input && input.trim()) ? input.substring(0, 100) : 'Captured thought from image/upload',
                urgency: 5,
                effort: 'medium',
                category: 'General',
                rationale: 'Automated extraction fallback.',
                contextTags: ['Auto-Extracted'],
            }];
            if (!parsed.summary) parsed.summary = "I captured your thought directly since I wasn't sure how to break it down.";
        }

        return res.json(parsed);

    } catch (error: any) {
        if (error.message?.startsWith('Unauthorized')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const isQuota = error.message?.includes('429') || error.message?.toLowerCase().includes('exhausted') || error.status === 429;
        return res.status(isQuota ? 429 : 500).json({
            error: isQuota ? 'Quota Exceeded' : 'Processing Failed',
            message: error.message,
            actions: [],
            summary: isQuota
                ? 'Gemini API limit reached. Please wait a minute and try again.'
                : `Server error: ${error.message}`,
        });
    }
}
