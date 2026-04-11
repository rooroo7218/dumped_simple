import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SchemaType } from '@google/generative-ai';
import { ASSISTANT_INSTRUCTION, verifyAuth, checkRateLimit, fetchUserContext, generateWithFallback, extractText, getTimeContext } from '../_shared.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const userId = await verifyAuth(req);
        if (!await checkRateLimit(userId, res)) return;
        const { persona: personaOverride } = req.body;
        const { persona, history } = await fetchUserContext(userId, personaOverride);

        const result = await generateWithFallback(
            {
                systemInstruction: ASSISTANT_INSTRUCTION +
                    '\nProvide a clear and helpful summary of the user\'s current progress and life balance.',
            },
            {
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `${getTimeContext()}

Here is the current state of your tasks and life context:
            Persona: ${JSON.stringify(persona)}
            Logs & Memories: ${history.map((m: any) => `[${m.category}] ${m.content} (Priority: ${m.priority})`).join('\n')}

            Based on this aggregate data, how are you doing?
            1. THEMES: What are the recurring subjects in my life right now?
            2. ALIGNMENT: How well do current tasks align with my Long-Term Goals (${JSON.stringify(persona.longTermGoals)})?
            3. STRATEGIC REASONING: Explain how you perceived the importance of these tasks.
            4. SYNTHESIS: A direct and encouraging executive summary.`,
                    }],
                }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            themes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                            frictionPoints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                            currentTrajectory: { type: SchemaType.STRING },
                            synthesis: { type: SchemaType.STRING },
                            strategicReasoning: { type: SchemaType.STRING },
                        },
                        required: ['themes', 'frictionPoints', 'currentTrajectory', 'synthesis', 'strategicReasoning'],
                    },
                },
            }
        );

        const text = await extractText(result.response);
        if (!text) throw new Error('Empty response from AI');
        return res.json(JSON.parse(text));

    } catch (error: any) {
        if (error.message?.startsWith('Unauthorized')) return res.status(401).json({ error: 'Unauthorized' });
        return res.status(500).json({ error: 'Failed to synthesize context', message: error.message });
    }
}
