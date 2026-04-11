import React, { useState, useEffect, useRef } from 'react';
import {
    XMarkIcon,
    MicrophoneIcon,
    LinkIcon,
    PaperAirplaneIcon,
    ArrowPathIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { ActionItem, MemoryItem, UserPersona } from '../types';
import { getMorningGreeting } from '../services/geminiService';
import { getCurrentTimeSlot } from '../utils/taskScoring';
import { computeWeeklyStats } from '../utils/weeklyStats';
import { ProfileBuildingPrompt, shouldShowProfilePrompt } from './ProfileBuildingPrompt';

interface BrainDumpHubProps {
    activeTab: string;
    canvasRef: React.RefObject<HTMLDivElement>;
    handleCanvasMouseMove: (e: React.MouseEvent) => void;
    handleCanvasMouseUp: () => void;
    scanDraft: MemoryItem | null;
    draggingTaskId: string | null;
    handleBubbleDragStart: (e: React.MouseEvent, taskId: string) => void;
    setScanDraft: (draft: MemoryItem | null | ((prev: MemoryItem | null) => MemoryItem | null)) => void;
    updateDraftTask: (taskId: string, updates: Partial<ActionItem>) => void;
    handleCommitScan: () => void;
    startSpeechToText: (onResult: (text: string) => void) => void;
    isListening: boolean;
    setInput: (val: string | ((prev: string) => string)) => void;
    handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    input: string;
    isProcessing: boolean;
    selectedImage: any;
    handleBrainDumpSubmit: () => Promise<void>;
    memories: MemoryItem[];
    persona: UserPersona;
    onUpdatePersona?: (updated: UserPersona) => void;
    setIsProcessing: (val: boolean) => void;
    clearImage: () => void;
    imagePreview: string | null;
}

const THINKING_MESSAGES = [
    'Thinking...',
    'Reading between the lines...',
    'Untangling your thoughts...',
    'Finding what actually matters...',
    'Making sense of the chaos...',
    'Connecting the dots...',
    'Working through it...',
    'Figuring you out...',
    'Processing...',
    'Almost there...',
    'Sifting through the noise...',
    'Getting your head straight...',
];

export const BrainDumpHub: React.FC<BrainDumpHubProps> = ({
    canvasRef,
    scanDraft,
    setScanDraft,
    updateDraftTask,
    handleCommitScan,
    startSpeechToText,
    isListening,
    setInput,
    handleImageSelect,
    input,
    isProcessing,
    handleBrainDumpSubmit,
    clearImage,
    imagePreview,
    persona,
    memories,
    onUpdatePersona,
}) => {
    const [thinkingMsg, setThinkingMsg] = useState(THINKING_MESSAGES[0]);
    const [greeting, setGreeting] = useState<string | null>(() => {
        try {
            const k = `dumped_greeting_${new Date().toDateString()}`;
            const raw = localStorage.getItem(k);
            if (!raw) return null;
            // Cache stores { text, slot } — discard if slot no longer matches current time
            try {
                const parsed = JSON.parse(raw) as { text: string; slot: string };
                return parsed.slot === getCurrentTimeSlot() ? parsed.text : null;
            } catch {
                // Legacy plain-string cache — discard it so we refetch with correct slot
                localStorage.removeItem(k);
                return null;
            }
        } catch { return null; }
    });
    const [greetingDismissed, setGreetingDismissed] = useState(false);
    const [weeklyBannerDismissed, setWeeklyBannerDismissed] = useState(() => {
        try { return localStorage.getItem(`dumped_weekly_banner_${new Date().toDateString()}`) === '1'; } catch { return false; }
    });
    const [profilePromptDismissed, setProfilePromptDismissed] = useState(false);
    const showProfilePrompt = !profilePromptDismissed && !input.trim() && !scanDraft && shouldShowProfilePrompt(memories.length);
    const greetingFetchedRef = useRef(false);

    useEffect(() => {
        if (greetingFetchedRef.current) return;
        if (greeting) return; // already have today's greeting for this time slot
        if (getCurrentTimeSlot() !== 'morning') return;
        greetingFetchedRef.current = true;
        getMorningGreeting(persona).then(g => {
            if (g) {
                setGreeting(g);
                try {
                    const k = `dumped_greeting_${new Date().toDateString()}`;
                    localStorage.setItem(k, JSON.stringify({ text: g, slot: getCurrentTimeSlot() }));
                } catch {}
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isProcessing) return;
        setThinkingMsg(THINKING_MESSAGES[0]);
        const interval = setInterval(() => {
            setThinkingMsg(THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)]);
        }, 2200);
        return () => clearInterval(interval);
    }, [isProcessing]);

    const cardBase = 'bg-white/70 backdrop-blur-md border-2 border-slate-950 rounded-2xl transition-all shadow-sm';

    const mutedText = 'text-slate-500';
    const accentText = 'text-slate-800';

    const tasks = scanDraft?.actions ?? [];

    return (
        <section ref={canvasRef} className="relative w-full pb-64 md:pb-52">

            {/* 1.2 ── Morning greeting ── */}
            {greeting && !greetingDismissed && (
                <div className="max-w-2xl mx-auto mb-5 flex items-start gap-3 px-5 py-4 rounded-2xl bg-amber-50 border border-amber-100 animate-in fade-in slide-in-from-top-2 duration-500">
                    <span className="text-lg shrink-0">☀️</span>
                    <p className="flex-1 text-[14px] font-semibold text-amber-800 leading-relaxed">{greeting}</p>
                    <button onClick={() => setGreetingDismissed(true)} className="shrink-0 text-amber-300 hover:text-amber-500 transition-colors text-lg leading-none">×</button>
                </div>
            )}

            {/* New — Periodic profile-building prompt */}
            {showProfilePrompt && onUpdatePersona && (
                <ProfileBuildingPrompt
                    persona={persona}
                    onUpdatePersona={onUpdatePersona}
                    onDismiss={() => setProfilePromptDismissed(true)}
                />
            )}

            {/* 2.1 ── Monday morning weekly recap ── */}
            {(() => {
                const isMonday = new Date().getDay() === 1;
                if (!isMonday || weeklyBannerDismissed) return null;
                const stats = computeWeeklyStats(memories);
                const delta = stats.thisWeekCount - stats.lastWeekCount;
                return (
                    <div className="max-w-2xl mx-auto mb-5 flex items-start gap-3 px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-500">
                        <span className="text-lg shrink-0">📊</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">Last week</p>
                            <p className="text-sm font-semibold text-slate-700">
                                {stats.lastWeekCount} tasks completed
                                {delta !== 0 && <span className={`ml-2 ${delta > 0 ? 'text-emerald-500' : 'text-rose-400'}`}>{delta > 0 ? `↑ ${delta}` : `↓ ${Math.abs(delta)}`} vs week before</span>}
                                {stats.topCategory && <span className="text-slate-500"> · Top: {stats.topCategory}</span>}
                            </p>
                        </div>
                        <button onClick={() => { setWeeklyBannerDismissed(true); try { localStorage.setItem(`dumped_weekly_banner_${new Date().toDateString()}`, '1'); } catch {} }}
                            className="shrink-0 text-slate-400 hover:text-slate-500 transition-colors text-lg leading-none">×</button>
                    </div>
                );
            })()}

            {/* ── Extracted task list ── */}
            {tasks.length > 0 && (
                <div className="max-w-2xl mx-auto mt-2 animate-in fade-in slide-in-from-bottom-4 duration-300">

                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3 px-1">
                        <span className={`text-[10px] font-semibold uppercase tracking-widest ${mutedText}`}>
                            {tasks.length} task{tasks.length !== 1 ? 's' : ''} extracted
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setScanDraft(null)}
                                className="px-3.5 py-1.5 text-[11px] font-semibold rounded-full border transition-all border-slate-200 text-slate-500 hover:bg-slate-50"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleCommitScan}
                                className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm bg-slate-900 text-white hover:bg-slate-700"
                            >
                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                Save to Tasks
                            </button>
                        </div>
                    </div>

                    {/* Task cards */}
                    <div className="space-y-2">
                        {tasks.map((task) => {
                            const isLoading = task.category === 'Processing...';
                            const lowConfidence = !isLoading && task.categoryConfidence !== undefined && task.categoryConfidence < 65;
                            const allCategories = [
                                ...(persona.customCategories ?? ['Career', 'Health', 'Finance', 'Household', 'Creativity', 'Learning', 'Social']),
                                ...(task.category && !persona.customCategories?.includes(task.category) ? [task.category] : []),
                            ];

                            return (
                                <div
                                    key={task.id}
                                    className={`group flex items-center gap-3 px-4 py-3 ${cardBase}`}
                                >
                                    {/* 3.6 — Category override dropdown / 3.7 — confidence indicator */}
                                    {isLoading ? (
                                        <ArrowPathIcon className="w-4 h-4 animate-spin shrink-0 opacity-30" />
                                    ) : (
                                        <div className="relative shrink-0">
                                            <select
                                                value={task.category}
                                                onChange={e => updateDraftTask(task.id, { category: e.target.value, categoryConfidence: 100 })}
                                                className={`appearance-none text-[9px] font-bold pl-2 pr-5 py-0.5 rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all ${
                                                    lowConfidence
                                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                        : 'bg-slate-100 text-slate-500 border border-transparent hover:border-slate-200'
                                                }`}
                                                title={lowConfidence ? 'AI is less certain about this category — tap to change' : 'Change category'}
                                            >
                                                {allCategories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] leading-none text-slate-500">▾</span>
                                            {lowConfidence && (
                                                <span className="absolute -top-2 -right-2 text-[8px] font-bold px-1 py-0.5 rounded-full bg-amber-400 text-white leading-none">?</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Editable text */}
                                    <input
                                        type="text"
                                        value={task.text}
                                        onChange={(e) => updateDraftTask(task.id, { text: e.target.value })}
                                        disabled={isLoading}
                                        placeholder={isLoading ? 'Processing…' : ''}
                                        className={`flex-1 min-w-0 bg-transparent border-none focus:ring-0 p-0 text-[14px] font-semibold leading-snug ${accentText} placeholder:text-slate-400 disabled:opacity-40`}
                                    />

                                    {/* Urgency badge */}
                                    {!isLoading && task.urgency > 7 && (
                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 shrink-0">
                                            Urgent
                                        </span>
                                    )}

                                    {/* Delete button */}
                                    <button
                                        onClick={() => setScanDraft(prev => {
                                            if (!prev) return null;
                                            return { ...prev, actions: (prev.actions || []).filter(a => a.id !== task.id) };
                                        })}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 rounded-lg hover:bg-rose-50"
                                        title="Remove task"
                                    >
                                        <XMarkIcon className="w-4 h-4 text-rose-400" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Input bar (fixed at bottom) ── */}
            <div className="fixed bottom-20 md:bottom-6 inset-x-0 flex justify-center px-4 z-50">
                <div className="w-full max-w-2xl flex flex-col gap-2">

                {/* Thinking indicator */}
                {isProcessing && (
                    <div className="pl-1">
                        <span className="text-sm text-slate-900 font-medium">
                            {thinkingMsg}
                        </span>
                    </div>
                )}

                <div className="w-full flex flex-col transition-all bg-white/70 backdrop-blur-md border-2 border-slate-950 rounded-[28px] shadow-lg">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleBrainDumpSubmit();
                        }}
                        placeholder={isProcessing ? 'Processing your dump…' : 'Take a deep breath and empty your mind - thoughts, tasks, worries, ideas, anything at all, get it all out...'}
                        rows={4}
                        className="w-full bg-transparent border-none focus:ring-0 resize-none font-medium text-base text-slate-800 placeholder:text-slate-500 px-5 pt-5 pb-3 leading-relaxed"
                    />

                    <div className="flex items-center justify-between px-4 pb-4 pt-1">
                        {/* Left: mic + attach */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => startSpeechToText((text) => setInput(prev => prev + (prev ? ' ' : '') + text))}
                                disabled={isProcessing}
                                title="Voice input"
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                                    isListening ? 'animate-pulse text-rose-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <MicrophoneIcon className="w-5 h-5" />
                            </button>
                            <label
                                title="Attach image"
                                className={`w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer transition-all text-slate-500 hover:text-slate-700 hover:bg-slate-100 ${
                                    isProcessing ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                                }`}
                            >
                                <LinkIcon className="w-5 h-5" />
                                <input
                                    type="file"
                                    accept="image/*,.pdf,.doc,.docx,.txt"
                                    className="hidden"
                                    onClick={(e) => (e.currentTarget.value = '')}
                                    onChange={handleImageSelect}
                                    disabled={isProcessing}
                                />
                            </label>
                        </div>

                        {/* Right: submit */}
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-medium hidden sm:block">⌘ Enter to send</span>
                            <button
                                onClick={handleBrainDumpSubmit}
                                className="h-10 px-5 flex items-center gap-2 flex-shrink-0 transition-all active:scale-95 font-semibold text-sm rounded-xl bg-slate-950 text-white hover:bg-slate-700"
                            >
                                {isProcessing
                                    ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Processing</>
                                    : <><PaperAirplaneIcon className="w-4 h-4" /> Dump it</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
                </div>
            </div>

            {/* ── Image preview ── */}
            {imagePreview && (
                <div className="fixed bottom-[260px] md:bottom-52 inset-x-0 flex justify-center z-40 px-4">
                    <div className="w-full max-w-2xl flex">
                        <div className="relative animate-in slide-in-from-bottom-5">
                            <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-2xl border-2 border-slate-200 shadow-lg" />
                            <button onClick={clearImage} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white flex items-center justify-center rounded-full shadow-md text-[10px]">✕</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
