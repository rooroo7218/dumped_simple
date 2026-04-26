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

    console.log('🏁 [Stripe] Starting checkout session creation…');

    try {
        const stripe = getStripe();
        const userId = await verifyAuth(req);
        const { plan = 'monthly' } = req.body as { plan?: 'monthly' | 'annual' };

        const priceId = plan === 'annual'
            ? process.env.STRIPE_ANNUAL_PRICE_ID
            : process.env.STRIPE_MONTHLY_PRICE_ID;

        if (!priceId) {
            console.error('❌ [Stripe] Missing Price ID for plan:', plan);
            throw new Error(`STRIPE_${plan.toUpperCase()}_PRICE_ID is missing from environment`);
        }

        // Look up existing Stripe customer ID for this user
        // Use maybeSingle to prevent crash if row is missing
        const { data: sub, error: subError } = await supabaseAdmin!
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (subError) {
            console.error('❌ [Database] Subscription query failed:', subError.message);
        }

        let customerId = sub?.stripe_customer_id as string | undefined;

        if (!customerId) {
            console.log('👤 [Stripe] New customer detected, creating Stripe profile…');
            const { data: { user: authUser }, error: authError } = await supabaseAdmin!.auth.admin.getUserById(userId);
            
            if (authError || !authUser) {
                console.error('❌ [Database] User lookup failed:', authError?.message);
                throw new Error('Failed to retrieve user info for checkout');
            }

            const customer = await stripe.customers.create({
                email: authUser.email,
                metadata: { supabase_user_id: userId },
            });
            customerId = customer.id;

            // Ensure the row exists before updating (or it will just fail silently)
            const { error: upsertError } = await supabaseAdmin!
                .from('subscriptions')
                .upsert({ 
                    user_id: userId, 
                    stripe_customer_id: customerId, 
                    updated_at: new Date().toISOString() 
                }, { onConflict: 'user_id' });

            if (upsertError) {
                console.error('❌ [Database] Failed to save customer ID:', upsertError.message);
            }
        }

        const origin = (req.headers.origin as string) || 'https://dumped.app';
        console.log('💳 [Stripe] Creating checkout session for customer:', customerId);

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${origin}/?checkout=success`,
            cancel_url: `${origin}/?checkout=canceled`,
            allow_promotion_codes: true,
        });

        console.log('✅ [Stripe] Session created successfully:', session.id);
        res.json({ url: session.url });
    } catch (err: any) {
        console.error('💥 [Stripe] Checkout error:', err.message);
        res.status(500).json({ error: err.message });
    }
}
