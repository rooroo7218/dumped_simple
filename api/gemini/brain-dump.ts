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
            ? `TASK: Extract every distinct item or thought from the attached image.
               - Read the original text carefully.
               - Clean up grammar and spelling for readability.
               - Each distinct point or line must be its own object in the array.`
            : `USER INPUT: "${input}"
               TASK: Clean up and extract items from this dump.
               - If it's a single thought, return it cleaned up.
               - If it's multiple thoughts, separate them into 2-5 distinct items.
               - FIX GRAMMAR and ensure each item is a complete, clear sentence or phrase.
               - DO NOT SUMMARIZE. Preserve the user's intent.`;

        const parts: any[] = [{
            text: `${getTimeContext()}

${promptText}

      GUIDELINES:
      - CLEANUP: Rephrase slightly if needed for clarity/grammar (e.g. "milk" -> "Buy milk").
      - ATOMIC: Keep items distinct and simple.
      - CATEGORIZE: Group into "Career", "Health", "Finance", "Household", "Social", or "General".
      - URGENCY (1-10): 5 is neutral, 8+ is time sensitive, 1-3 is low priority.`
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
                                        category: { type: SchemaType.STRING },
                                        rationale: { type: SchemaType.STRING },
                                    },
                                    required: ['text', 'urgency', 'category', 'rationale'],
                                },
                            },
                            category: { type: SchemaType.STRING },
                        },
                        required: ['summary', 'actions', 'category'],
                    },
                },
            }
        );

        const text = await extractText(result.response);
        if (!text) throw new Error('AI returned no results.');

        let parsed: any = { summary: '', actions: [], category: 'General' };
        try {
            parsed = JSON.parse(text);
            if (!Array.isArray(parsed.actions)) parsed.actions = [];
        } catch {
            // Safety net handles this
        }

        if (!parsed.actions || parsed.actions.length === 0) {
            parsed.actions = [{
                text: (input && input.trim()) ? input.substring(0, 100) : 'Captured thought',
                urgency: 5,
                category: 'General',
                rationale: 'Extracted directly.',
            }];
            if (!parsed.summary) parsed.summary = "Captured.";
        }

        // Add dummy values for fields that were stripped from schema but might be expected by types
        parsed.tags = [];
        parsed.priority = 'medium';

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
                ? 'Limit reached. Try again in a minute.'
                : `Error: ${error.message}`,
        });
    }
}

