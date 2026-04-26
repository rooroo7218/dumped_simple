import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { verifyAuth, supabaseAdmin } from '../_shared.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const userId = await verifyAuth(req);

        // 1. Cancel Stripe subscription if active
        const { data: sub } = await supabaseAdmin!
            .from('subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', userId)
            .single();

        if (sub?.stripe_subscription_id) {
            try {
                await stripe.subscriptions.cancel(sub.stripe_subscription_id);
            } catch {
                // Non-fatal: subscription may already be cancelled
            }
        }

        // 2. Delete all user data (Supabase CASCADE handles child rows)
        await Promise.all([
            supabaseAdmin!.from('memories').delete().eq('user_id', userId),
            supabaseAdmin!.from('items').delete().eq('user_id', userId),
            supabaseAdmin!.from('subscriptions').delete().eq('user_id', userId),
        ]);

        // 3. Delete the auth user — this removes them permanently
        await supabaseAdmin!.auth.admin.deleteUser(userId);

        res.json({ deleted: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}
