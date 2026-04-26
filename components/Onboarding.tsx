import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
    {
        emoji: '🧠',
        title: 'Dump anything',
        body: 'Every worry, task, idea — just type it out. No formatting, no categories. Just let it flow.',
    },
    {
        emoji: '✦',
        title: 'AI does the sorting',
        body: 'After you hit "put it all down", AI reads your dump and turns it into a clean set of tiles — one per thing.',
    },
    {
        emoji: '○',
        title: 'Watch your patterns',
        body: "Over time you'll see what keeps coming up. That's the stuff that actually matters.",
    },
];

const STORAGE_KEY = 'onboarding_completed';

interface OnboardingProps {
    onDone: () => void;
    userId?: string;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onDone }) => {
    const [step, setStep] = useState(0);
    const isLast = step === STEPS.length - 1;

    const advance = async () => {
        if (isLast) {
            localStorage.setItem(STORAGE_KEY, '1');
            
            // If we have a real user, persist to Supabase Auth metadata
            if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
                try {
                    const { supabase } = await import('../services/supabaseClient');
                    await supabase.auth.updateUser({
                        data: { onboarding_completed: true }
                    });
                } catch (err) {
                    console.warn("Failed to persist onboarding status to metadata:", err);
                }
            }
            
            onDone();
        } else {
            setStep(s => s + 1);
        }
    };

    const current = STEPS[step];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190] flex items-end justify-center pb-32 px-4"
            style={{ backdropFilter: 'blur(20px)', background: 'rgba(255,255,255,0.65)' }}
            onClick={advance}
        >
            <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm bg-white border-2 border-black rounded-3xl shadow-2xl px-7 py-7"
            >
                <div className="text-3xl mb-4">{current.emoji}</div>
                <h2 className="text-[20px] font-bold text-slate-900 mb-2">{current.title}</h2>
                <p className="text-[14px] text-slate-500 leading-relaxed mb-6">{current.body}</p>

                {/* Step dots */}
                <div className="flex items-center gap-1.5 mb-5">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`rounded-full transition-all duration-300 ${
                                i === step ? 'w-5 h-2 bg-slate-900' : 'w-2 h-2 bg-slate-200'
                            }`}
                        />
                    ))}
                </div>

                <button
                    onClick={advance}
                    className="w-full py-3 rounded-2xl bg-slate-950 text-white text-[14px] font-semibold active:scale-95 transition-all"
                >
                    {isLast ? 'Start dumping' : 'Next'}
                </button>

                <p className="text-center text-[11px] text-slate-300 mt-3">Tap anywhere to continue</p>
            </motion.div>
        </motion.div>
    );
};

export function shouldShowOnboarding(): boolean {
    return !localStorage.getItem(STORAGE_KEY);
}
