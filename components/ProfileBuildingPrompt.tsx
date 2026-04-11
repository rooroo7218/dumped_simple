import React, { useState } from 'react';
import { UserPersona } from '../types';
import { SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ProfileBuildingPromptProps {
    persona: UserPersona;
    onUpdatePersona: (updated: UserPersona) => void;
    onDismiss: () => void;
}

const QUESTIONS = [
    { id: 'energy_lately',   text: "What's been taking up most of your mental energy lately?" },
    { id: 'shift_priority',  text: "Has anything shifted in what matters most to you right now?" },
    { id: 'new_constraint',  text: "Any new constraints or limitations I should factor in?" },
    { id: 'going_well',      text: "What's been going better than expected?" },
    { id: 'avoided_task',    text: "Is there a task you keep avoiding? What's really behind it?" },
    { id: 'work_style',      text: "How has your focus and energy been — deep work or quick tasks?" },
    { id: 'life_change',     text: "Has anything significant changed in your life or work recently?" },
    { id: 'next_milestone',  text: "What's one thing you want to have done a month from now?" },
    { id: 'friction',        text: "What's creating the most friction in your day right now?" },
    { id: 'values_check',    text: "Are your current tasks actually connected to what you care about?" },
    { id: 'support_needed',  text: "Is there anything you're waiting on from someone else?" },
    { id: 'wins',            text: "What's one thing you've done recently that you're proud of?" },
];

const ANSWERED_KEY = 'dumped_profile_questions_answered';
const LAST_ASKED_KEY = 'dumped_profile_last_asked';

function getNextQuestion(): (typeof QUESTIONS)[0] | null {
    try {
        const answered: string[] = JSON.parse(localStorage.getItem(ANSWERED_KEY) || '[]');
        const unanswered = QUESTIONS.filter(q => !answered.includes(q.id));
        // Cycle back through all when exhausted
        const pool = unanswered.length > 0 ? unanswered : QUESTIONS;
        return pool[Math.floor(Math.random() * pool.length)];
    } catch {
        return QUESTIONS[0];
    }
}

export function shouldShowProfilePrompt(memoriesCount: number): boolean {
    if (memoriesCount < 3) return false;
    try {
        const lastAsked = parseInt(localStorage.getItem(LAST_ASKED_KEY) || '0', 10);
        return Date.now() - lastAsked > 7 * 24 * 60 * 60 * 1000;
    } catch {
        return false;
    }
}

export const ProfileBuildingPrompt: React.FC<ProfileBuildingPromptProps> = ({
    persona, onUpdatePersona, onDismiss,
}) => {
    const [question] = useState(() => getNextQuestion());
    const [answer, setAnswer] = useState('');
    const [saved, setSaved] = useState(false);

    if (!question) return null;

    const handleSave = () => {
        if (!answer.trim()) return;

        // Append to persona.profileInsights
        const insight = { question: question.text, answer: answer.trim(), answeredAt: Date.now() };
        const updated: UserPersona = {
            ...persona,
            profileInsights: [...(persona.profileInsights ?? []), insight],
            lastUpdated: Date.now(),
        };
        onUpdatePersona(updated);

        // Track answered
        try {
            const answered: string[] = JSON.parse(localStorage.getItem(ANSWERED_KEY) || '[]');
            if (!answered.includes(question.id)) answered.push(question.id);
            localStorage.setItem(ANSWERED_KEY, JSON.stringify(answered));
            localStorage.setItem(LAST_ASKED_KEY, String(Date.now()));
        } catch {}

        setSaved(true);
        setTimeout(onDismiss, 1200);
    };

    return (
        <div className="max-w-2xl mx-auto mb-5 animate-in fade-in slide-in-from-bottom-3 duration-400">
            <div className="p-5 rounded-3xl bg-white/70 border-2 border-slate-950 backdrop-blur-md shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quick check-in</span>
                    </div>
                    <button onClick={onDismiss} className="p-1 text-slate-400 hover:text-slate-500 transition-colors">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                <p className="text-[15px] font-semibold text-slate-800 leading-snug">
                    {question.text}
                </p>

                {saved ? (
                    <p className="text-[13px] font-semibold text-emerald-600">Got it — I'll keep this in mind.</p>
                ) : (
                    <>
                        <textarea
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            placeholder="Write freely — no right answer…"
                            autoFocus
                            rows={3}
                            className="w-full p-3 rounded-2xl text-sm text-slate-700 bg-white/50 border border-slate-200/60 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300/50 placeholder:text-slate-400 transition-all"
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave(); }}
                        />
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">⌘↵ to save</span>
                            <button
                                onClick={handleSave}
                                disabled={!answer.trim()}
                                className="px-5 py-2 rounded-full text-[13px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed bg-slate-800 text-white hover:bg-slate-700"
                            >
                                Save →
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
