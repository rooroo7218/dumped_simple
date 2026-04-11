import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SchemaType } from '@google/generative-ai';
import { verifyAuth, checkRateLimit, fetchUserTasks, generateWithFallback, extractText, getTimeContext } from '../_shared.js';

export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const userId = await verifyAuth(req);
        if (!await checkRateLimit(userId, res)) return;
        const { synthesis } = req.body;
        const tasks = await fetchUserTasks(userId);

        const result = await generateWithFallback({}, {
            contents: [{
                role: 'user',
                parts: [{
                    text: `${getTimeContext()}

Current Tasks: ${JSON.stringify(tasks)}
            Status Summary: ${JSON.stringify(synthesis)}
            Which three tasks should we focus on this week to keep things moving forward?`,
                }],
            }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        recommendations: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    taskId: { type: SchemaType.STRING },
                                    rationale: { type: SchemaType.STRING },
                                    impactScore: { type: SchemaType.NUMBER },
                                    estimatedMinutes: { type: SchemaType.NUMBER },
                                    steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                                },
                                required: ['taskId', 'rationale', 'impactScore', 'estimatedMinutes', 'steps'],
                            },
                        },
                    },
                    required: ['recommendations'],
                },
            },
        });

        const text = await extractText(result.response);
        return res.json(JSON.parse(text));

    } catch (error: any) {
        if (error.message?.startsWith('Unauthorized')) return res.status(401).json({ error: 'Unauthorized' });
        return res.status(500).json({ error: 'Failed to recommend priorities', message: error.message });
    }
}
