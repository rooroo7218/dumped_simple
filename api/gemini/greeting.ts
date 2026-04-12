import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ASSISTANT_INSTRUCTION, verifyAuth, checkRateLimit, fetchUserContext, generateWithFallback, extractText, getTimeContext } from '../_shared.js';

export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const userId = await verifyAuth(req);
        if (!await checkRateLimit(userId, res)) return;
        const { persona: personaOverride, clientHour } = req.body;
        const { persona, history } = await fetchUserContext(userId, personaOverride);

        const topTasks = history
            .flatMap((m: any) => m.actions || [])
            .filter((a: any) => !a.completed)
            .slice(0, 3)
            .map((a: any) => a.text)
            .join(', ');

        const goals = (persona.longTermGoals || []).map((g: any) => g.goal).slice(0, 2).join(' and ');

        const recentInsights = (persona.profileInsights || [])
            .slice(-3)
            .map((i: any) => `Q: ${i.question} A: ${i.answer}`)
            .join('\n');

        const hour = typeof clientHour === 'number' ? clientHour : new Date().getUTCHours();
        const timeLabel = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        const clientTimeContext = `Current time: ${timeLabel} (${hour}:00 local)`;

        const result = await generateWithFallback(
            { systemInstruction: ASSISTANT_INSTRUCTION },
            {
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `${clientTimeContext}

User profile: ${persona.jobTitle || 'busy person'}, goals: ${goals || 'staying on top of life'}.
Top pending tasks: ${topTasks || 'none yet'}.
${recentInsights ? `Recent context from user:\n${recentInsights}` : ''}

Write ONE warm, encouraging morning greeting sentence (max 20 words).
No "Good morning," opener. No lists. Just a single human sentence that acknowledges where they are and nudges them forward.
Return only the sentence, nothing else.`,
                    }],
                }],
                generationConfig: { maxOutputTokens: 60 },
            }
        );

        const text = await extractText(result.response);
        if (!text) throw new Error('Empty response');
        return res.json({ greeting: text });

    } catch (error: any) {
        if (error.message?.startsWith('Unauthorized')) return res.status(401).json({ error: 'Unauthorized' });
        console.error('[greeting] Error:', error.message);
        return res.status(500).json({ 
            error: 'Greeting Failed', 
            message: error.message 
        });
    }
}
