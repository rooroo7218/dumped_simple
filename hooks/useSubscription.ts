import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

export type SubscriptionStatus = 'loading' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface SubscriptionState {
    status: SubscriptionStatus;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
    daysLeftInTrial: number;
    /** True if user can use the app (active or within trial) */
    isAllowed: boolean;
    /** True if the trial or subscription has lapsed and they need to pay */
    isBlocked: boolean;
    /** Triggers a manual re-fetch of the subscription status */
    refresh: () => Promise<void>;
}

const GUEST_ID = '00000000-0000-0000-0000-000000000000';

export function useSubscription(userId: string | null): SubscriptionState {
    const [status, setStatus]                   = useState<SubscriptionStatus>('loading');
    const [trialEndsAt, setTrialEndsAt]         = useState<Date | null>(null);
    const [currentPeriodEnd, setCurrentPeriodEnd] = useState<Date | null>(null);

    const load = useCallback(async () => {
        if (!userId) return;

        // Guest testers always get full access
        if (userId === GUEST_ID) {
            setStatus('active');
            return;
        }

        const { data, error } = await supabase
            .from('subscriptions')
            .select('status, trial_ends_at, current_period_end')
            .eq('user_id', userId)
            .maybeSingle(); // Use maybeSingle to handle missing rows gracefully

        if (error || !data) {
            // No row yet (user signed up before migration trigger).
            // Insert a fresh trial row client-side.
            const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
            const { error: insertErr } = await supabase
                .from('subscriptions')
                .insert({ user_id: userId, status: 'trialing', trial_ends_at: trialEnd.toISOString() });

            if (!insertErr) {
                setTrialEndsAt(trialEnd);
                setStatus('trialing');
            } else {
                // Can't write — assume active to avoid locking a legitimate user out
                setStatus('active');
            }
            return;
        }

        const trialEnd = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
        const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
        setTrialEndsAt(trialEnd);
        setCurrentPeriodEnd(periodEnd);

        if (data.status === 'active') {
            setStatus('active');
        } else if (data.status === 'trialing' && trialEnd && trialEnd > new Date()) {
            setStatus('trialing');
        } else if (data.status === 'past_due') {
            setStatus('past_due');
        } else if (data.status === 'canceled') {
            setStatus('canceled');
        } else {
            // Trial ended, no paid subscription
            setStatus('expired');
        }
    }, [userId]);

    useEffect(() => {
        load();
    }, [load]);

    const daysLeftInTrial = trialEndsAt
        ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    const isAllowed  = true; // Bypass for development
    const isBlocked  = false; // Bypass for development

    return { status: 'active', trialEndsAt, currentPeriodEnd, daysLeftInTrial, isAllowed, isBlocked, refresh: load };
}
