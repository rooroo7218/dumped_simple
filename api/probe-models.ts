import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in Vercel settings.' });
    }

    try {
        // Direct REST call to Google models endpoint to see what this key has access to
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                status: 'error',
                message: 'Google API rejected the request for models.',
                details: data
            });
        }

        return res.json({
            status: 'success',
            message: 'Successfully listed models for your API key.',
            models: data.models || []
        });

    } catch (error: any) {
        return res.status(500).json({
            status: 'error',
            message: 'Failed to connect to Google API.',
            error: error.message
        });
    }
}
