import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';
import { supabase } from '../services/supabaseClient';
import type { SubscriptionStatus } from '../hooks/useSubscription';

interface PaywallModalProps {
    reason: SubscriptionStatus;
}

const PERKS = [
    'Unlimited brain dumps',
    'AI extracts your tasks automatically',
    'Pattern tracking & streaks',
    'Custom themes & backgrounds',
    'Syncs across all your devices',
];

async function getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
}

async function redirectToCheckout(plan: 'monthly' | 'annual'): Promise<void> {
    const token = await getAuthToken();
    const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ reason }) => {
    const [loading, setLoading]   = useState<'monthly' | 'annual' | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

    const headline =
        reason === 'expired'  ? 'Your free trial has ended' :
        reason === 'past_due' ? 'Payment failed' :
        reason === 'canceled' ? 'Your subscription has ended' :
        'Upgrade to keep going';

    const subline =
        reason === 'past_due'
            ? 'Please update your payment method to continue.'
            : 'Less than a coffee. Cancel any time.';

    const handleSubscribe = async () => {
        setLoading(selectedPlan);
        try {
            await redirectToCheckout(selectedPlan);
        } catch {
            setLoading(null);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] flex items-center justify-center px-4"
            style={{ backdropFilter: 'blur(16px)', background: 'rgba(255,255,255,0.6)' }}
        >
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.08, type: 'spring', stiffness: 300, damping: 24 }}
                className="w-full max-w-sm bg-white border-2 border-black rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="px-7 pt-8 pb-5 border-b border-black/8">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                        Dumped.
                    </p>
                    <h2 className="text-[22px] font-bold text-slate-900 leading-tight">
                        {headline}
                    </h2>
                    <p className="text-[13px] text-slate-500 mt-1">{subline}</p>
                </div>

                {/* Plan selector */}
                <div className="px-7 pt-5 pb-3">
                    <div className="flex gap-2">
                        {(['monthly', 'annual'] as const).map((plan) => (
                            <button
                                key={plan}
                                onClick={() => setSelectedPlan(plan)}
                                className={`flex-1 rounded-2xl border-2 p-3 text-left transition-all active:scale-95 ${
                                    selectedPlan === plan
                                        ? 'border-black bg-slate-950 text-white'
                                        : 'border-black/15 bg-white text-slate-700 hover:border-black/40'
                                }`}
                            >
                                <div className="text-[12px] font-bold capitalize">{plan}</div>
                                <div className="text-[18px] font-bold mt-0.5">
                                    {plan === 'monthly' ? '$7' : '$56'}
                                    <span className="text-[11px] font-normal opacity-60">
                                        {plan === 'monthly' ? '/mo' : '/yr'}
                                    </span>
                                </div>
                                {plan === 'annual' && (
                                    <div className={`text-[10px] font-semibold mt-0.5 ${selectedPlan === 'annual' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                        2 months free
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Perks */}
                <ul className="px-7 py-3 space-y-2">
                    {PERKS.map((perk) => (
                        <li key={perk} className="flex items-center gap-2.5">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-950 flex items-center justify-center">
                                <CheckIcon className="w-2.5 h-2.5 text-white stroke-[3]" />
                            </span>
                            <span className="text-[13px] text-slate-700">{perk}</span>
                        </li>
                    ))}
                </ul>

                {/* CTA */}
                <div className="px-7 pb-7 pt-3">
                    <button
                        onClick={handleSubscribe}
                        disabled={loading !== null}
                        className="w-full py-3.5 rounded-2xl bg-slate-950 text-white text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
                    >
                        {loading ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                            `Subscribe · ${selectedPlan === 'monthly' ? '$7/mo' : '$56/yr'}`
                        )}
                    </button>
                    <p className="text-center text-[11px] text-slate-400 mt-3">
                        Secure payment via Stripe · Cancel any time
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};
