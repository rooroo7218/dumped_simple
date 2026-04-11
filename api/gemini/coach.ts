import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SchemaType } from '@google/generative-ai';
import { verifyAuth, checkRateLimit, fetchUserContext, fetchUserTasks, generateWithFallback, extractText, getTimeContext } from '../_shared.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const userId = await verifyAuth(req);
        if (!await checkRateLimit(userId, res)) return;
        const { messages, persona: personaOverride } = req.body;
        const [context, tasks] = await Promise.all([
            fetchUserContext(userId, personaOverride),
            fetchUserTasks(userId),
        ]);
        const { persona } = context;
        const lastUserMsg = messages[messages.length - 1].text;

        const result = await generateWithFallback({}, {
            contents: [{
                role: 'user',
                parts: [{
                    text: `${getTimeContext()}

User Persona: ${JSON.stringify(persona)}
              Active Tasks: ${JSON.stringify(tasks)}

              Conversation History:
              ${messages.map((m: any) => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}

              LATEST USER MESSAGE: "${lastUserMsg}"

              Please act as a strategic life coach. Listen to the user, provide supportive advice, and if it makes sense, suggest specific updates to their task list.`,
                }],
            }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        advice: { type: SchemaType.STRING },
                        suggestions: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    taskId: { type: SchemaType.STRING },
                                    updates: { type: SchemaType.OBJECT },
                                    rationale: { type: SchemaType.STRING },
                                },
                                required: ['taskId', 'updates', 'rationale'],
                            },
                        },
                    },
                    required: ['advice'],
                },
            },
        });

        const text = await extractText(result.response);
        return res.json(JSON.parse(text));

    } catch (error: any) {
        if (error.message?.startsWith('Unauthorized')) return res.status(401).json({ error: 'Unauthorized' });
        return res.status(500).json({ error: 'Failed to get coach response', message: error.message });
    }
}
