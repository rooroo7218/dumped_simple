import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SchemaType } from '@google/generative-ai';
import { verifyAuth, checkRateLimit, fetchUserContext, generateWithFallback, extractText } from '../_shared.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const userId = await verifyAuth(req);
        if (!await checkRateLimit(userId, res)) return;
        const { task, persona: personaOverride } = req.body;
        const { persona } = await fetchUserContext(userId, personaOverride);

        const result = await generateWithFallback({}, {
            contents: [{
                role: 'user',
                parts: [{
                    text: `GOAL: "${task.text}"
            CATEGORY: ${task.category}
            YOUR CONTEXT: ${JSON.stringify(persona)}

            Please provide a simple breakdown for this goal.
            I need 3-5 clear, executable steps that you can finish in one sitting.

            GUIDELINES:
            1. Steps must be specific and direct.
            2. Durations should be realistic chunks between 15 and 90 minutes.
            3. The breakdown should be written in plain English.`,
                }],
            }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        steps: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    text: { type: SchemaType.STRING },
                                    durationMinutes: { type: SchemaType.NUMBER },
                                },
                                required: ['text', 'durationMinutes'],
                            },
                        },
                    },
                    required: ['steps'],
                },
            },
        });

        const text = await extractText(result.response);
        const data = JSON.parse(text);
        const steps = (data.steps || []).map((s: any) => ({
            id: crypto.randomUUID(),
            completed: false,
            text: s.text,
            durationMinutes: s.durationMinutes,
        }));

        return res.json({ steps });

    } catch (error: any) {
        if (error.message?.startsWith('Unauthorized')) return res.status(401).json({ error: 'Unauthorized' });
        return res.status(500).json({ error: 'Failed to break down task', message: error.message });
    }
}
