import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { supabaseAdmin } from '../_shared.js';

// Disable Vercel's automatic body parsing — Stripe needs the raw bytes to verify the signature.
// Disable Vercel's automatic body parsing — Stripe needs the raw bytes to verify the signature.
export const config = { api: { bodyParser: false } };

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

function getRawBody(req: VercelRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

async function upsertSubscription(customerId: string, updates: Record<string, unknown>): Promise<void> {
    await supabaseAdmin!
        .from('subscriptions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('stripe_customer_id', customerId);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const stripe = getStripe();
    const sig = req.headers['stripe-signature'] as string;
    const rawBody = await getRawBody(req);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('❌ [Stripe] Webhook secret is missing');
        return res.status(500).json({ error: 'Stripe configuration error' });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
        console.error('❌ [Stripe] Webhook signature invalid:', err.message);
        return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
    }

    console.log(`🔔 [Stripe] Received webhook event: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as any;
                if (session.subscription) {
                    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
                    await upsertSubscription(session.customer as string, {
                        stripe_subscription_id: (sub as any).id,
                        status: 'active',
                        current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
                    });
                }
                break;
            }

            case 'customer.subscription.updated': {
                const sub = event.data.object as any;
                await upsertSubscription(sub.customer as string, {
                    stripe_subscription_id: sub.id,
                    status: sub.status,
                    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                });
                break;
            }

            case 'customer.subscription.deleted': {
                const sub = event.data.object as any;
                await upsertSubscription(sub.customer as string, {
                    status: 'canceled',
                    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                });
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as any;
                if (invoice.customer) {
                    await upsertSubscription(invoice.customer as string, { status: 'past_due' });
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as any;
                if (invoice.subscription && invoice.customer) {
                    const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
                    await upsertSubscription(invoice.customer as string, {
                        status: 'active',
                        current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
                    });
                }
                break;
            }
        }

        res.json({ received: true });
    } catch (err: any) {
        console.error('💥 [Webhook] Handler failed:', err.message);
        res.status(500).json({ error: err.message });
    }
}
