import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SchemaType } from '@google/generative-ai';
import { ASSISTANT_INSTRUCTION, verifyAuth, checkRateLimit, fetchUserContext, generateWithFallback, extractText, getTimeContext } from '../_shared.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const userId = await verifyAuth(req);
        if (!await checkRateLimit(userId, res)) return;
        const { input, imageAttachment, activeItems = [] } = req.body;
        const { persona } = await fetchUserContext(userId, req.body.persona);

        const activeItemsJson = JSON.stringify(activeItems.map((item: any) => ({ id: item.id, label: item.label })));

        const promptText = `
SYSTEM INSTRUCTION:
You are a processing engine for a brain dump app. The user has submitted a dump. Your job is two steps.

Step 1 — Extract all discrete items from the dump. An item is anything specific: a task, a worry, something to do, something weighing on them. Ignore vague filler.

Step 2 — For each extracted item, check against the user's existing active items. If semantically the same thing (even if worded differently), assign to that item. If genuinely new, create it.

Existing active items:
${activeItemsJson}

Dump text:
"${input}"

RULES:
- Labels: 2–5 words, lowercase, plain language
- Assign when semantic overlap is clear (e.g., "milk" and "buy milk" are the same)
- Create only when genuinely new
- raw_excerpt must be the user's ACTUAL words from the dump, never paraphrased.
`;

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
                            results: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        action: { type: SchemaType.STRING, enum: ['assign', 'create'] },
                                        item_id: { type: SchemaType.STRING, nullable: true },
                                        label: { type: SchemaType.STRING, nullable: true },
                                        raw_excerpt: { type: SchemaType.STRING },
                                    },
                                    required: ['action', 'raw_excerpt'],
                                },
                            },
                        },
                        required: ['results'],
                    },
                },
            }
        );

        const text = await extractText(result.response);
        if (!text) throw new Error('AI returned no results.');

        let parsed: any = { results: [] };
        try {
            parsed = JSON.parse(text);
            if (!Array.isArray(parsed.results)) parsed.results = [];
        } catch {
            // Safety net handles this
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
                ? 'Limit reached. Try again in a minute.'
                : `Error: ${error.message}`,
        });
    }
}

