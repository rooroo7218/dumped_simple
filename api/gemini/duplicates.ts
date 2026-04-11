import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SchemaType } from '@google/generative-ai';
import { verifyAuth, checkRateLimit, fetchUserTasks, generateWithFallback, extractText } from '../_shared.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const userId = await verifyAuth(req);
        if (!await checkRateLimit(userId, res)) return;
        const { tasks: tasksOverride } = req.body;
        const allTasks = tasksOverride || await fetchUserTasks(userId);

        if (allTasks.length < 2) return res.json({ duplicateGroups: [] });

        const result = await generateWithFallback({}, {
            contents: [{
                role: 'user',
                parts: [{
                    text: `You are an expert at semantic deduplication.
            Analyze the following tasks and identify pairs or groups that are semantically identical or highly similar in intent.

            TASKS:
            ${JSON.stringify(allTasks.map((t: any) => ({
                        id: t.id,
                        text: t.text,
                        category: t.category,
                        context: t.contextTags?.join(', ') || '',
                    })))}

            RULES:
            1. Look for tasks that have the same goal and context, even if worded differently.
            2. Be moderately aggressive: if two tasks clearly point to the same physical action or outcome, group them.
            3. Ignore differences in capitalization or punctuation.
            4. Provide a very short, clear reason why they were grouped.
            5. Return an empty array if no clear duplicates are found.`,
                }],
            }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        duplicateGroups: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    tasks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                                    reason: { type: SchemaType.STRING },
                                },
                                required: ['tasks', 'reason'],
                            },
                        },
                    },
                    required: ['duplicateGroups'],
                },
            },
        });

        const text = await extractText(result.response);
        let data: any;
        try {
            data = JSON.parse(text);
        } catch {
            return res.json({ duplicateGroups: [] });
        }

        return res.json({ duplicateGroups: data.duplicateGroups || [] });

    } catch (error: any) {
        if (error.message?.startsWith('Unauthorized')) return res.status(401).json({ error: 'Unauthorized' });
        return res.status(500).json({ error: 'Failed to find duplicates', message: error.message });
    }
}
