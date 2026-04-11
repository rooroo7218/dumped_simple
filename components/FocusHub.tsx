import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActionItem, MemoryItem, UserPersona } from '../types';
import {
    PlayIcon,
    PauseIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ForwardIcon,
    SparklesIcon,
} from '@heroicons/react/24/solid';
import { ArrowsRightLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FocusHubProps {
    rankedTasks: ActionItem[];
    memories: MemoryItem[];
    toggleTask: (e: React.MouseEvent, memoryId: string, task: ActionItem) => void;
    updateTaskDetails: (memoryId: string, taskId: string, updates: Partial<ActionItem>) => void;
    setIsZenMode: (val: boolean) => void;
    initialTaskId?: string | null;
    onExitFocus?: (sessionCompletions: number) => void;
    persona?: UserPersona;
}

const DURATION_OPTIONS = [10, 15, 25, 45, 60] as const;

function computeFocusStreak(): number {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = `dumped_focus_sessions_${d.toDateString()}`;
        try {
            const val = parseInt(localStorage.getItem(key) || '0', 10);
            if (val > 0) { streak++; } else if (i > 0) { break; } // gap — stop (but skip today if it's 0 yet)
        } catch { break; }
    }
    return streak;
}

const SESSION_TIME_MAP: Record<string, number> = {
    '15min':  15,
    '30min':  25,
    '1hour':  45,
    '2hours': 60,
};

function readSessionDuration(): number | null {
    try {
        const raw = localStorage.getItem('dumped_session_context');
        if (!raw) return null;
        const ctx = JSON.parse(raw) as { time?: string; answeredAt?: number };
        if (!ctx.answeredAt || Date.now() - ctx.answeredAt > 60 * 60 * 1000) return null;
        return ctx.time ? (SESSION_TIME_MAP[ctx.time] ?? null) : null;
    } catch {
        return null;
    }
}

export const FocusHub: React.FC<FocusHubProps> = ({
    rankedTasks,
    memories,
    toggleTask,
    updateTaskDetails,
    setIsZenMode,
    initialTaskId,
    onExitFocus,
    persona,
}) => {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId ?? null);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    const [selectedDuration, setSelectedDuration] = useState<number>(() => readSessionDuration() ?? 15);
    const [timeLeft, setTimeLeft] = useState(selectedDuration * 60);
    const [isActive, setIsActive] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [sessionCount, setSessionCount] = useState(() => {
        try { return parseInt(localStorage.getItem(`dumped_focus_sessions_${new Date().toDateString()}`) || '0', 10); } catch { return 0; }
    });
    const [showBreakOffer, setShowBreakOffer] = useState(false);
    const [showBreakEnd, setShowBreakEnd] = useState(false);
    const sessionStartRef = useRef<number>(Date.now());

    const handleDurationChange = (mins: number) => {
        if (isActive) return;
        setSelectedDuration(mins);
        setTimeLeft(mins * 60);
        setIsBreak(false);
    };

    useEffect(() => {
        if (initialTaskId) {
            setSelectedTaskId(initialTaskId);
            setIsActive(true);
            setIsFocusMode(true);
            sessionStartRef.current = Date.now();
        }
    }, [initialTaskId]);

    const exitFocusMode = useCallback(() => {
        setIsActive(false);
        setIsFocusMode(false);
        setIsZenMode(false);
        // Count tasks completed since the session started
        const completedInSession = memories
            .flatMap(m => m.actions ?? [])
            .filter(a => a.completed && a.completedAt != null && a.completedAt >= sessionStartRef.current)
            .length;
        if (onExitFocus) onExitFocus(completedInSession);
    }, [setIsZenMode, memories, onExitFocus]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') exitFocusMode(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [exitFocusMode]);

    const activeTask = selectedTaskId
        ? rankedTasks.find(t => t.id === selectedTaskId)
        : rankedTasks.find(t => !t.completed) || null;

    const memoryId = activeTask
        ? memories.find(m => m.actions?.some(a => a.id === activeTask.id))?.id || ''
        : '';

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (isActive && timeLeft > 0) {
            setIsZenMode(true);
            interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (!isBreak) {
                setShowBreakOffer(true);
                setSessionCount(c => {
                    const next = c + 1;
                    try { localStorage.setItem(`dumped_focus_sessions_${new Date().toDateString()}`, String(next)); } catch {}
                    return next;
                });
            } else {
                setShowBreakEnd(true);
            }
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isActive, timeLeft, isBreak, setIsZenMode]);

    const handleBreakYes = () => { setShowBreakOffer(false); setIsBreak(true); setTimeLeft(5 * 60); setIsActive(true); };
    const handleBreakNo  = () => { setShowBreakOffer(false); setIsBreak(false); setTimeLeft(selectedDuration * 60); };
    const handleBreakEnd = () => { setShowBreakEnd(false); setIsBreak(false); setTimeLeft(selectedDuration * 60); };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const totalSeconds = isBreak ? 5 * 60 : selectedDuration * 60;
    const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

    const CX = 192, CY = 192, R = 168, STROKE = 32;
    const circumference = 2 * Math.PI * R;

    const cardBg = 'bg-white/70 border-2 border-slate-950 backdrop-blur-md shadow-sm';


    return (
        <section className="flex flex-col items-center min-h-[calc(100vh-350px)] pb-8 gap-5">

            <div className={`w-full max-w-2xl overflow-hidden transition-all duration-500 ease-in-out ${isActive ? 'max-h-0 opacity-0 mb-0' : 'max-h-24 opacity-100 mb-6'}`}>
                <div className="flex items-center gap-2 mb-1">
                    <SparklesIcon className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Focus</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">It's time to lock in.</h2>
            </div>

            {/* ── Task Selector Overlay ── */}
            {isSelectorOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsSelectorOpen(false)}>
                    <div className="w-full max-w-md max-h-[70vh] overflow-y-auto p-5 rounded-3xl shadow-2xl bg-white/95 border border-white/40 backdrop-blur-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Choose a task</span>
                            <button onClick={() => setIsSelectorOpen(false)} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
                                <XMarkIcon className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            {rankedTasks.filter(t => !t.completed).map(task => (
                                <button key={task.id} onClick={() => { setSelectedTaskId(task.id); setIsSelectorOpen(false); }}
                                    className={`w-full text-left px-3 py-2.5 rounded-2xl border transition-all ${activeTask?.id === task.id
                                        ? 'bg-slate-800 text-white border-slate-700'
                                        : 'bg-white/60 border-white/30 hover:bg-white/80'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        {task.category && (
                                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 bg-slate-100 text-slate-500">
                                                {task.category}
                                            </span>
                                        )}
                                        <span className="text-sm font-medium truncate">{task.text}</span>
                                        {task.urgency > 7 && <span className="ml-auto text-xs shrink-0">🔥</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Session-end prompts ── */}
            {(showBreakOffer || showBreakEnd) && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
                    <div className="w-full max-w-xs p-6 rounded-3xl shadow-2xl text-center space-y-4 bg-white border border-white/40">
                        {showBreakOffer ? (
                            <>
                                <div className="text-3xl">🎯</div>
                                <p className="font-semibold text-slate-800">Session complete!</p>
                                {(() => {
                                    const goalMatch = persona?.longTermGoals?.find(g =>
                                        g.category?.toLowerCase() === activeTask?.category?.toLowerCase()
                                    );
                                    return goalMatch ? (
                                        <p className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl">
                                            Step toward: {goalMatch.goal}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-slate-500">Take a 5-minute break?</p>
                                    );
                                })()}
                                <div className="flex gap-2 justify-center">
                                    <button onClick={handleBreakYes} className="px-4 py-2 rounded-full text-sm font-semibold bg-slate-800 text-white">Yes please</button>
                                    <button onClick={handleBreakNo} className="px-4 py-2 rounded-full text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">Keep going</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-3xl">☕</div>
                                <p className="font-semibold text-slate-800">Break's over</p>
                                <button onClick={handleBreakEnd} className="px-4 py-2 rounded-full text-sm font-semibold bg-slate-800 text-white">
                                    Start next session
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Exit focus mode ── */}
            {isActive && (
                <button onClick={exitFocusMode} className="fixed top-8 right-8 z-[60] px-4 py-2 rounded-full text-xs font-semibold border shadow-md transition-all hover:scale-105 active:scale-95 bg-white/70 backdrop-blur-md border-white/30 text-slate-700 hover:bg-white/90">
                    Exit focus mode
                </button>
            )}

            {/* ══ TASK BUBBLE ══ */}
            <div className={`w-full max-w-2xl flex items-center gap-5 px-7 py-5 rounded-3xl shadow-sm transition-all ${cardBg}`}>
                {activeTask ? (
                    <button onClick={(e) => toggleTask(e, memoryId, activeTask)} title="Mark complete"
                        className="shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 active:scale-90 border-slate-300 hover:bg-slate-700 hover:border-slate-700 hover:text-white text-slate-400">
                        <CheckCircleIcon className="w-4 h-4" />
                    </button>
                ) : (
                    <div className="shrink-0 w-8 h-8" />
                )}

                <div className="flex-1 min-w-0">
                    {activeTask ? (
                        <>
                            <p className="text-xl font-semibold leading-snug text-slate-800">
                                {activeTask.text}
                            </p>
                            {activeTask.category && (
                                <span className="inline-block mt-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                    {activeTask.category}
                                </span>
                            )}
                        </>
                    ) : (
                        <p className="text-base text-slate-500">No task selected</p>
                    )}
                </div>

                <button onClick={() => setIsSelectorOpen(true)} title="Switch task"
                    className="shrink-0 p-2.5 rounded-full transition-all hover:scale-110 active:scale-90 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                    <ArrowsRightLeftIcon className="w-5 h-5" />
                </button>
            </div>

            {/* ══ TIMER ══ */}
            <div className={`w-full max-w-2xl flex flex-col items-center gap-8 px-4 py-8 md:px-16 md:py-12 rounded-3xl shadow-lg transition-all ${cardBg}`}>

                {/* Ring */}
                <div className="relative cursor-pointer w-full max-w-[280px] md:max-w-[384px]" onClick={() => { setIsActive(!isActive); if (!isActive) setIsFocusMode(true); }}>
                    <svg viewBox="0 0 384 384" className="w-full -rotate-90 drop-shadow-xl">
                        {/* Track */}
                        <circle cx={CX} cy={CY} r={R} stroke="currentColor" strokeWidth={STROKE} fill="transparent"
                            className="text-slate-950/10" />
                        {/* Progress arc */}
                        <circle cx={CX} cy={CY} r={R} stroke="currentColor" strokeWidth={STROKE} fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference - (progress / 100) * circumference}
                            className="transition-all duration-1000 ease-linear text-slate-950"
                            strokeLinecap="round" />
                    </svg>

                    {/* Time display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl md:text-8xl font-bold tabular-nums drop-shadow text-slate-800">
                            {formatTime(timeLeft)}
                        </span>
                        <span className="mt-3 text-sm font-semibold uppercase tracking-widest text-slate-500">
                            {isBreak ? 'Break' : 'Focus'}
                        </span>
                        {sessionCount > 0 && (
                            <span className="mt-1.5 text-xs text-slate-500">{sessionCount} today</span>
                        )}
                        {(() => { const s = computeFocusStreak(); return s > 1 ? <span className="mt-0.5 text-xs text-slate-500">🔥 {s}d streak</span> : null; })()}
                    </div>
                </div>

                {/* Controls */}
                <div className={`flex items-center gap-6 transition-all duration-500 ${isFocusMode ? 'opacity-40 hover:opacity-100' : ''}`}>
                    <button onClick={() => { setTimeLeft(selectedDuration * 60); setIsActive(false); setIsBreak(false); setIsZenMode(false); }}
                        className="p-4 rounded-full transition-all hover:scale-110 active:scale-90 bg-white/60 text-slate-500 hover:bg-white/80"
                        title="Reset">
                        <ArrowPathIcon className="w-6 h-6" />
                    </button>

                    <button onClick={() => {
                        if (!isActive) {
                            setIsFocusMode(true);
                            sessionStartRef.current = Date.now();
                        }
                        setIsActive(!isActive);
                    }}
                        className="p-8 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 bg-slate-800 text-white hover:bg-slate-700">
                        {isActive ? <PauseIcon className="w-9 h-9" /> : <PlayIcon className="w-9 h-9 pl-1" />}
                    </button>

                    <button onClick={() => { setIsBreak(!isBreak); setTimeLeft(isBreak ? selectedDuration * 60 : 5 * 60); setIsActive(false); setIsZenMode(false); }}
                        className="p-4 rounded-full transition-all hover:scale-110 active:scale-90 bg-white/60 text-slate-500 hover:bg-white/80"
                        title="Skip to break">
                        <ForwardIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Duration picker */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mr-1">Duration</span>
                    {DURATION_OPTIONS.map(mins => (
                        <button
                            key={mins}
                            onClick={() => handleDurationChange(mins)}
                            disabled={isActive}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                selectedDuration === mins
                                    ? 'bg-slate-800 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-white/60'
                            }`}
                        >
                            {mins}m
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
};
