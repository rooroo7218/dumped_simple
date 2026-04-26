import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { verifyAuth, supabaseAdmin } from '../_shared.js';

// Lazy init Stripe to prevent top-level crashes if env vars are missing/delayed
let stripeInstance: Stripe | null = null;
function getStripe() {
    if (!stripeInstance) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) throw new Error('STRIPE_SECRET_KEY is missing from environment');
        stripeInstance = new Stripe(key);
    }
    return stripeInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const stripe = getStripe();
        const userId = await verifyAuth(req);

        const { data: sub, error: subError } = await supabaseAdmin!
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (subError) {
            console.error('❌ [Database] Portal lookup failed:', subError.message);
        }

        if (!sub?.stripe_customer_id) {
            return res.status(404).json({ error: 'No billing account found' });
        }

        const origin = (req.headers.origin as string) || 'https://dumped.app';

        const session = await stripe.billingPortal.sessions.create({
            customer: sub.stripe_customer_id,
            return_url: origin,
        });

        res.json({ url: session.url });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}
