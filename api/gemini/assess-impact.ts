import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SchemaType } from '@google/generative-ai';
import { verifyAuth, checkRateLimit, fetchUserContext, generateWithFallback, extractText } from '../_shared.js';

export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const userId = await verifyAuth(req);
        if (!await checkRateLimit(userId, res)) return;
        const { newPersona } = req.body;
        const { persona: oldPersona } = await fetchUserContext(userId);

        if (JSON.stringify(oldPersona) === JSON.stringify(newPersona)) {
            return res.json({ significant: false, reasoning: 'No changes detected.' });
        }

        const result = await generateWithFallback({}, {
            contents: [{
                role: 'user',
                parts: [{
                    text: `OLD PERSONA: ${JSON.stringify(oldPersona)}
            NEW PERSONA: ${JSON.stringify(newPersona)}

            Compare these two profiles.
            Did the user change anything SIGNIFICANT that would alter their Daily Priorities or Strategic Life Context?
            - Significant: Changing Job, Income, Marital Status, Core Values, Long-Term Goals.
            - Insignificant: Fixing typos, minor rewording, small style tweaks.`,
                }],
            }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        significant: { type: SchemaType.BOOLEAN },
                        reasoning: { type: SchemaType.STRING },
                    },
                    required: ['significant', 'reasoning'],
                },
            },
        });

        const text = await extractText(result.response);
        return res.json(JSON.parse(text));

    } catch (error: any) {
        if (error.message?.startsWith('Unauthorized')) return res.status(401).json({ error: 'Unauthorized' });
        return res.status(500).json({ error: 'Failed to assess impact', message: error.message });
    }
}
