import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, checkRateLimit, ai } from '../_shared.js';

export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const userId = await verifyAuth(req);
        if (!await checkRateLimit(userId, res)) return;

        const { imageData, mimeType } = req.body;
        if (!imageData || !mimeType) return res.status(400).json({ error: 'Missing image data or mimeType' });
        if (!ai) throw new Error('Missing GEMINI_API_KEY');

        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContent([
            { inlineData: { data: imageData, mimeType } },
            {
                text: `Look at this image and extract every task, checklist item, note, or to-do you can find.
Return them as plain text, one item per line.
If items are checked off, mark them with [done].
If items are unchecked, leave them as plain text.
Do not add any commentary, headers, or explanation. Just the extracted items.`
            }
        ]);

        const text = result.response.text().trim();
        return res.json({ text });

    } catch (error: any) {
        if (error.message?.startsWith('Unauthorized')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.status(500).json({ error: 'Failed to analyze image', message: error.message });
    }
}
