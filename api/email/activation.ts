import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from '../_shared.js';
import { Resend } from 'resend';

export const config = { maxDuration: 15 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // If Resend isn't configured, silently succeed — don't break the app
    if (!process.env.RESEND_API_KEY) {
        return res.json({ ok: true, skipped: true });
    }

    try {
        await verifyAuth(req);
        const { email, name } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const resend = new Resend(process.env.RESEND_API_KEY);
        const firstName = (name || 'there').split(' ')[0];

        await resend.emails.send({
            from: 'Dumped <hello@dumped.app>',
            to: email,
            subject: `Your first dump worked`,
            html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Plus Jakarta Sans',system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:48px 16px">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;border:2px solid #0f172a;overflow:hidden">
      <tr><td style="padding:40px 40px 0">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8">Dumped</p>
        <h1 style="margin:0 0 24px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">
          Hey ${firstName} — that worked.
        </h1>
        <p style="margin:0 0 16px;font-size:16px;color:#475569;line-height:1.6">
          You completed your first brain dump and looked at your priorities.
        </p>
        <p style="margin:0 0 16px;font-size:16px;color:#475569;line-height:1.6">
          That's the whole loop. Dump what's in your head. Let it sort your tasks. Focus on what matters.
        </p>
        <p style="margin:0 0 32px;font-size:16px;color:#475569;line-height:1.6">
          Come back tomorrow morning with one thing you want to get done. That's all it takes to build the habit.
        </p>
        <a href="https://dumped.app" style="display:inline-block;padding:14px 28px;background:#0f172a;color:#fff;text-decoration:none;border-radius:100px;font-size:14px;font-weight:700">
          Open Dumped →
        </a>
      </td></tr>
      <tr><td style="padding:32px 40px">
        <p style="margin:0;font-size:12px;color:#94a3b8">
          This is the only onboarding email you'll get. No drip. No guilt.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
        });

        return res.json({ ok: true });
    } catch (error: any) {
        if (error.message?.startsWith('Unauthorized')) return res.status(401).json({ error: 'Unauthorized' });
        console.error('[activation email]', error.message);
        return res.status(500).json({ error: error.message });
    }
}
