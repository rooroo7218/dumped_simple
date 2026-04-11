import React, { useState, useEffect } from 'react';
import {
    SparklesIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ArrowUturnLeftIcon,
    Bars3Icon,
    ChevronDownIcon,
    ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { ActionItem, MemoryItem } from '../types';
import { getEffectiveCompositeScore, getEffectiveUrgency, getTimeOfDayBonus, getCurrentTimeSlot } from '../utils/taskScoring';
import { computeWeeklyStats } from '../utils/weeklyStats';
import { WeeklySummaryModal } from './WeeklySummaryModal';
import {
    DndContext,
    closestCenter,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PrioritiesHubProps {
    rankedTasks: ActionItem[];
    memories: MemoryItem[];
    handleGlobalReprioritization: () => void;
    isProcessing: boolean;
    themeClasses: any;
    setSelectedTask: (val: { memoryId: string; taskId: string } | null) => void;
    activeDragBatchId?: string | null;
    onStartFocus?: (taskId: string) => void;
    maybeLaterIds: string[];
    onMaybeLater: (id: string) => void;
    onRestoreMaybeLater: (id: string) => void;
}

// ─── Session context ───────────────────────────────────────────────────────────

const SESSION_KEY = 'dumped_session_context';
const SESSION_TTL = 60 * 60 * 1000; // 1 hour

interface SessionContext {
    mood: string;
    time: string;
    location: string;
    answeredAt: number;
}

function loadSession(): SessionContext | null {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const ctx = JSON.parse(raw) as SessionContext;
        if (Date.now() - ctx.answeredAt > SESSION_TTL) return null;
        return ctx;
    } catch {
        return null;
    }
}

function saveSession(ctx: SessionContext): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(ctx));
}

function clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
}

// Load a session that expired but was answered today (for "Still the same?" prompt)
function loadStaleSessionFromToday(): SessionContext | null {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const ctx = JSON.parse(raw) as SessionContext;
        const age = Date.now() - ctx.answeredAt;
        if (age <= SESSION_TTL) return null; // still fresh — no need for prompt
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (ctx.answeredAt < today.getTime()) return null; // different day
        return ctx; // same day, expired
    } catch {
        return null;
    }
}


// ─── Question definitions ──────────────────────────────────────────────────────

const MOOD_OPTIONS = [
    { id: 'energized',  label: 'Energized',   emoji: '⚡' },
    { id: 'focused',    label: 'Focused',      emoji: '🎯' },
    { id: 'okay',       label: 'Okay',         emoji: '😌' },
    { id: 'tired',      label: 'Tired',        emoji: '😴' },
    { id: 'stressed',   label: 'Stressed',     emoji: '😰' },
];

const TIME_OPTIONS = [
    { id: '15min',   label: '15 minutes',  maxMinutes: 20 },
    { id: '30min',   label: '30 minutes',  maxMinutes: 35 },
    { id: '1hour',   label: '1 hour',      maxMinutes: 70 },
    { id: '2hours',  label: '2+ hours',    maxMinutes: Infinity },
];

const LOCATION_OPTIONS = [
    { id: 'high',    label: 'High energy',        tags: ['At Computer', 'At Desk'] },
    { id: 'medium',  label: 'Decent energy',       tags: ['On Phone'] },
    { id: 'low',     label: 'Low energy',          tags: ['Around the House'] },
    { id: 'drained', label: 'Running on fumes',    tags: [] },
];

// ─── Task classification — infer mental load from text + category ─────────────

function classifyTask(task: ActionItem): { mentalLoad: 'high' | 'low' } {
    const text = (task.text + ' ' + task.category + ' ' + (task.contextTags ?? []).join(' ')).toLowerCase();
    const highLoad = /plan|strateg|writ|design|analy|research|decid|review|develop|build|creat|solv|code|draft|pitch|present|brainstorm|think|evaluat|diagnos|architect|proofread|negotiat|figure out|assess|priorit/i.test(text);
    const lowLoad  = /buy|pick.?up|call|schedul|book|pay|clean|organis|organiz|errand|shop|drop.?off|remind|print|sign|scan|post|collect|tidy|wash|charge|confirm|cancel|renew|order|submit/i.test(text);
    // Default to high if ambiguous — safer to under-schedule than to overload
    return { mentalLoad: lowLoad && !highLoad ? 'low' : 'high' };
}

// ─── Estimate task duration from text, category, and effort ──────────────────
//
// Used when the task has no explicit estimatedMinutes. Prefers keyword matching
// first, then falls back to effort level. All estimates are intentionally
// conservative so time-fit scoring doesn't over-penalise good tasks.

export function estimateMinutes(task: ActionItem): number {
    if (task.estimatedMinutes) return task.estimatedMinutes;

    const text = (task.text + ' ' + (task.category ?? '')).toLowerCase();
    const effort = task.effort ?? 'medium';

    // Very quick (5–15 min): communications, simple lookups
    if (/\b(call|text|message|reply|respond|confirm|remind|check in|look up|google|find out|log|note)\b/i.test(text))
        return effort === 'high' ? 20 : 10;

    // Quick admin (10–20 min): bookings, payments, forms
    if (/\b(book|schedule|pay|transfer|sign|scan|print|submit|register|order|renew|cancel|update)\b/i.test(text))
        return effort === 'high' ? 30 : 15;

    // Errands / physical trips (30–75 min)
    if (/\b(buy|pick.?up|shop|store|errand|drop.?off|post|collect|bank|gym|appointment)\b/i.test(text))
        return effort === 'low' ? 30 : effort === 'high' ? 75 : 45;

    // Reading / reviewing (15–45 min)
    if (/\b(read|review|check|go through|skim|watch|listen)\b/i.test(text))
        return effort === 'low' ? 15 : effort === 'high' ? 45 : 25;

    // Writing / creating / building (30–120 min)
    if (/\b(write|draft|create|design|build|develop|code|make|produce|prepare|put together)\b/i.test(text))
        return effort === 'low' ? 30 : effort === 'high' ? 90 : 50;

    // Planning / thinking (20–90 min)
    if (/\b(plan|strateg|think|figure out|decide|brainstorm|research|analy|evaluat|assess|organis|organiz)\b/i.test(text))
        return effort === 'low' ? 20 : effort === 'high' ? 75 : 40;

    // Household / maintenance (20–60 min)
    if (/\b(clean|tidy|sort|wash|vacuum|cook|meal prep|fix|repair|set up|install)\b/i.test(text))
        return effort === 'low' ? 20 : effort === 'high' ? 60 : 35;

    // Conversations / meetings (20–60 min)
    if (/\b(meet|meeting|discuss|talk to|speak to|catch up|presenta|interview)\b/i.test(text))
        return effort === 'low' ? 20 : effort === 'high' ? 60 : 40;

    // Fallback: effort only
    return effort === 'low' ? 15 : effort === 'high' ? 60 : 30;
}

// ─── Time-fit multiplier — mood-aware ────────────────────────────────────────
//
// How well the task duration fits the available window, adjusted by mood:
//   focused  → wants tasks that meaningfully fill the time (too short wastes it)
//   tired / stressed → strongly prefers short tasks even in a long window
//   others   → standard graduated curve

function getTimeFitMultiplier(taskMin: number, maxMin: number, mood: string): number {
    if (maxMin === Infinity) {
        // No hard time limit, but tired/stressed still strongly prefer shorter tasks
        if (mood === 'tired' || mood === 'stressed')
            return taskMin <= 15 ? 1.55 : taskMin <= 30 ? 1.25 : taskMin <= 60 ? 0.85 : 0.55;
        return 1.0;
    }

    const ratio = taskMin / maxMin;

    if (mood === 'focused') {
        // Deep work: tasks that are too short waste focused time
        if (ratio <= 0.25) return 0.80;   // too quick — doesn't use focused session well
        if (ratio <= 0.55) return 1.10;
        if (ratio <= 0.85) return 1.35;   // fills ~70-85% — ideal focused work
        if (ratio <= 1.05) return 1.20;   // fills the window exactly
        if (ratio <= 1.50) return 0.60;   // slightly over — risky
        return 0.25;
    }

    if (mood === 'tired' || mood === 'stressed') {
        // Steep curve: very short tasks get a big lift, anything filling the window feels daunting
        if (ratio <= 0.15) return 1.70;   // tiny task — perfect confidence builder
        if (ratio <= 0.30) return 1.45;   // short
        if (ratio <= 0.50) return 1.15;
        if (ratio <= 0.70) return 0.85;
        if (ratio <= 1.00) return 0.55;   // fills the whole window — probably too much
        if (ratio <= 1.50) return 0.30;
        return 0.15;
    }

    // energized / okay — standard graduated curve
    if (ratio <= 0.40) return 1.05;
    if (ratio <= 0.75) return 1.25;
    if (ratio <= 1.00) return 1.15;
    if (ratio <= 1.40) return 0.70;
    if (ratio <= 2.00) return 0.40;
    return 0.20;
}

// ─── Quick-win multiplier (tired / stressed only) ─────────────────────────────
//
// Concrete, clearly completable tasks (call, pay, book, send…) give a
// disproportionate sense of accomplishment relative to their cost.
// This multiplier stacks on top of effort + mental-load to surface them
// when the user needs momentum, not just the "most important" thing.

function getQuickWinMultiplier(task: ActionItem, mood: string): number {
    if (mood !== 'tired' && mood !== 'stressed') return 1.0;
    const text = (task.text + ' ' + task.category).toLowerCase();
    const isConcrete = /\b(call|text|message|email|send|reply|respond|pay|book|schedule|confirm|sign|submit|order|buy|pick.?up|drop.?off|print|scan|return|cancel|renew|register|fill in|fill out)\b/i.test(text);
    const mins = estimateMinutes(task);
    if (isConcrete && mins <= 15) return 1.35;  // ideal: concrete + very quick
    if (isConcrete && mins <= 30) return 1.18;  // concrete but a bit longer
    if (mins <= 15)               return 1.12;  // short but open-ended
    return 1.0;
}

// ─── Task scoring based on session context ────────────────────────────────────
//
// Scoring uses THREE independent dimensions:
//   effort     (low / medium / high) — how much physical energy the task takes
//   mentalLoad (high / low)          — how much concentration / thinking it needs
//   timeFit                          — how well the task fills the available window
//
// Each mood maps differently onto all three axes. See multiplier tables above.

const EFFORT_MULTIPLIER: Record<string, [number, number, number]> = {
    // [low, medium, high effort]
    energized: [0.65, 1.05, 1.70],  // sharper pull toward big meaningful tasks
    focused:   [0.80, 1.20, 1.50],  // want depth; effort matters less than load
    okay:      [0.95, 1.05, 1.00],  // slight nudge toward medium effort
    tired:     [1.80, 0.75, 0.25],  // need easy tasks, strong avoidance of heavy ones
    stressed:  [1.70, 0.70, 0.20],  // quick wins only — big tasks make stress worse
};

const MENTAL_LOAD_MODIFIER: Record<string, { high: number; low: number }> = {
    energized: { high: 1.35, low: 0.80 }, // high mental load is a bonus when sharp
    focused:   { high: 1.55, low: 0.55 }, // focused = made for deep thinking; low-load tasks feel wasteful
    okay:      { high: 1.00, low: 1.00 }, // neutral
    tired:     { high: 0.45, low: 1.50 }, // avoid mental load entirely when tired
    stressed:  { high: 0.35, low: 1.55 }, // even stronger: complexity when stressed is harmful
};

function scoreTask(task: ActionItem, ctx: SessionContext): number {
    const base = getEffectiveCompositeScore(task);
    const { mentalLoad } = classifyTask(task);
    const effortNum = task.effort === 'low' ? 1 : task.effort === 'high' ? 3 : 2;

    const effortRow = EFFORT_MULTIPLIER[ctx.mood] ?? EFFORT_MULTIPLIER.okay;
    const loadRow   = MENTAL_LOAD_MODIFIER[ctx.mood] ?? MENTAL_LOAD_MODIFIER.okay;
    const moodMultiplier = effortRow[effortNum - 1] * loadRow[mentalLoad];

    // Time fit — mood-aware, uses auto-estimated minutes if none set
    const maxMin   = TIME_OPTIONS.find(o => o.id === ctx.time)?.maxMinutes ?? Infinity;
    const taskMin  = estimateMinutes(task);
    const timeFit  = getTimeFitMultiplier(taskMin, maxMin, ctx.mood);

    // Energy level bonus (additive — rewards effort-aligned tasks)
    const energyBonus = (() => {
        const effort = task.effort ?? 'medium';
        if (ctx.location === 'high')   return effort === 'high' ? 0.15 : effort === 'medium' ? 0.05 : -0.05;
        if (ctx.location === 'medium') return effort === 'medium' ? 0.10 : effort === 'low' ? 0.05 : 0;
        if (ctx.location === 'low')    return effort === 'low' ? 0.15 : effort === 'medium' ? 0.02 : -0.10;
        // drained
        return effort === 'low' ? 0.20 : effort === 'high' ? -0.15 : -0.05;
    })();
    const locationBonus = energyBonus;

    const quickWinMult = getQuickWinMultiplier(task, ctx.mood);
    const timeOfDayBonus = getTimeOfDayBonus(task) / 10; // normalize: +0.4 match, -0.1/-0.2 mismatch
    return base * moodMultiplier * timeFit * quickWinMult + locationBonus + timeOfDayBonus;
}

// ─── Smart top-3: guarantees at least one low-effort task ─────────────────────

function getSmartTop3(sorted: ActionItem[]): { top3: ActionItem[]; queue: ActionItem[] } {
    if (sorted.length === 0) return { top3: [], queue: [] };
    const top3 = sorted.slice(0, 3);
    const rest = sorted.slice(3);
    if (top3.some(t => t.effort === 'low')) return { top3, queue: rest };
    const candidates = sorted.slice(0, 5);
    const qwIdx = candidates.findIndex(t => t.effort === 'low');
    if (qwIdx === -1) return { top3, queue: rest };
    const quickWin = candidates[qwIdx];
    const displaced = top3[2];
    const newTop3 = [top3[0], top3[1], quickWin];
    const newQueue = sorted.filter(t => t.id !== quickWin.id && !newTop3.some(x => x.id === t.id));
    if (displaced) newQueue.unshift(displaced);
    return { top3: newTop3, queue: newQueue };
}

// ─── Rationale popover button ─────────────────────────────────────────────────

const RationalePopover: React.FC<{ text: string }> = ({ text }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative inline-flex">
            <button
                onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
                title="Why this task?"
                className={`flex items-center justify-center w-6 h-6 rounded-full transition-all active:scale-90 ${
                    open
                        ? 'bg-amber-100 text-amber-500'
                        : 'text-amber-400 opacity-50 hover:opacity-100 hover:bg-amber-50'
                }`}
            >
                <SparklesIcon className="w-3.5 h-3.5" />
            </button>
            {open && (
                <>
                    {/* Backdrop to close on outside click */}
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    {/* Bubble */}
                    <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-2xl bg-amber-50 border border-amber-100 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
                        {/* Tail */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-amber-100" />
                        <p className="text-[12px] text-amber-800 leading-relaxed">{text}</p>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Context check-in card ─────────────────────────────────────────────────────

const CheckInCard: React.FC<{
    themeClasses: any;
    onComplete: (ctx: SessionContext) => void;
}> = ({ themeClasses, onComplete }) => {
    const [mood, setMood] = useState<string | null>(null);
    const [time, setTime] = useState<string | null>(null);
    const [location, setLocation] = useState<string | null>(null);

    const allAnswered = mood && time && location;

    const optionClass = (selected: boolean) =>
        `flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium border transition-all cursor-pointer select-none ${
            selected
                ? 'bg-slate-800 text-white border-slate-800 shadow-sm scale-[1.02]'
                : 'bg-white/60 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
        }`;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-2xl mx-auto">
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <SparklesIcon className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Quick check-in
                    </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Let's find the right tasks for right now.
                </h2>
            </div>

            <div className={`${themeClasses.card} p-6 space-y-7`}>

                {/* Q1: Mood */}
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3 text-slate-500">
                        How do you feel right now?
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {MOOD_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setMood(opt.id)}
                                className={optionClass(mood === opt.id)}
                            >
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Q2: Time */}
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3 text-slate-500">
                        How much time do you have?
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {TIME_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setTime(opt.id)}
                                className={optionClass(time === opt.id)}
                            >
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Q3: Energy level */}
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3 text-slate-500">
                        What's your energy like?
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {LOCATION_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setLocation(opt.id)}
                                className={optionClass(location === opt.id)}
                            >
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submit */}
                <div className="pt-2 border-t border-slate-100">
                    <button
                        disabled={!allAnswered}
                        onClick={() => {
                            if (!allAnswered) return;
                            const ctx: SessionContext = { mood: mood!, time: time!, location: location!, answeredAt: Date.now() };
                            saveSession(ctx);
                            onComplete(ctx);
                        }}
                        className={`w-full py-3 rounded-2xl text-[14px] font-bold transition-all duration-200 ${
                            allAnswered
                                ? 'bg-slate-800 text-white shadow-md hover:bg-slate-700 hover:scale-[1.01] active:scale-[0.99]'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        Show my priorities →
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Sortable queue bubble ─────────────────────────────────────────────────────

interface QueueBubbleProps {
    task: ActionItem;
    index: number;
    accentText: string;
    mutedText: string;
    card: string;
    onOpen: () => void;
    onMaybeLater: () => void;
}

const SortableQueueBubble: React.FC<QueueBubbleProps> = ({
    task, index, accentText, mutedText, card, onOpen, onMaybeLater,
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div ref={setNodeRef} style={style}
            className={`group flex items-center gap-3 px-4 py-2 transition-all ${card} ${isDragging ? 'shadow-xl' : ''}`}
        >
            <span className={`text-[10px] font-semibold shrink-0 w-5 text-center ${mutedText} opacity-50`}>
                {index + 4}
            </span>
            <div className="flex-1 min-w-0 cursor-pointer flex items-center gap-1.5 overflow-hidden" onClick={onOpen}>
                <span className="text-[10px] font-semibold text-slate-500 shrink-0 whitespace-nowrap">
                    {task.category}
                </span>
                <span className="text-slate-400 text-[10px] shrink-0">·</span>
                <p className={`text-[13px] font-semibold leading-snug truncate ${accentText} group-hover:opacity-70 transition-opacity`}>
                    {task.text}
                </p>
            </div>
            <button
                onClick={onMaybeLater}
                className={`shrink-0 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${mutedText} opacity-40 hover:opacity-100 hover:bg-slate-100`}
            >
                Later
            </button>
            <button
                className="shrink-0 p-1.5 rounded-lg cursor-grab active:cursor-grabbing touch-none text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                {...attributes}
                {...listeners}
            >
                <Bars3Icon className="w-4 h-4" />
            </button>
        </div>
    );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const PrioritiesHub: React.FC<PrioritiesHubProps> = ({
    rankedTasks,
    memories,
    handleGlobalReprioritization,
    isProcessing,
    themeClasses,
    setSelectedTask,
    onStartFocus,
    maybeLaterIds,
    onMaybeLater,
    onRestoreMaybeLater,
}) => {
    const [session, setSession] = useState<SessionContext | null>(() => loadSession());
    const [top3Ids, setTop3Ids] = useState<string[]>([]);
    const [isQuickWinMode, setIsQuickWinMode] = useState(false);
    const [isGlobalListOpen, setIsGlobalListOpen] = useState(false);
    const [isMaybeLaterOpen, setIsMaybeLaterOpen] = useState(false);
    const [showWeeklySummary, setShowWeeklySummary] = useState(false);
    const [isQueueOpen, setIsQueueOpen] = useState(false);

    const addMaybeLater = (id: string) => {
        onMaybeLater(id);
        setTop3Ids(prev => prev.filter(x => x !== id));
    };

    // Reset session when tasks are completed (watch completedCount)
    const completedCount = memories.flatMap(m => m.actions ?? []).filter(a => a.completed).length;
    const prevCompletedRef = React.useRef(completedCount);
    useEffect(() => {
        if (prevCompletedRef.current !== completedCount && prevCompletedRef.current !== 0) {
            clearSession();
            setSession(null);
        }
        prevCompletedRef.current = completedCount;
    }, [completedCount]);

    const activeTasks = rankedTasks.filter(t => !t.completed && !maybeLaterIds.includes(t.id));
    const maybeLaterTasks = rankedTasks.filter(t => !t.completed && maybeLaterIds.includes(t.id));

    const getMemoryId = (task: ActionItem) =>
        memories.find(m => m.actions?.some(a => a.id === task.id))?.id ?? '';

    const accentText = 'text-slate-800';
    const mutedText = 'text-slate-500';
    const card = themeClasses.card;

    // Compute scored tasks before guards (safe with null session)
    const rawSorted = session
        ? [...activeTasks].sort((a, b) => scoreTask(b, session) - scoreTask(a, session))
        : [];
    const { top3: smartTop3, queue: smartQueue } = getSmartTop3(rawSorted);

    // Sync top3Ids when the smart top-3 changes (new session or task completed)
    const smartTop3Key = smartTop3.map(t => t.id).join(',');
    useEffect(() => {
        if (smartTop3.length > 0) setTop3Ids(smartTop3.map(t => t.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [smartTop3Key]);

    // Derive display top-3 from top3Ids state (reflects user swaps)
    const allScoredById = new Map(rawSorted.map(t => [t.id, t]));
    const displayTop3 = top3Ids
        .map(id => allScoredById.get(id))
        .filter((t): t is ActionItem => !!t && !t.completed);

    // Swap pool = all active tasks not currently in the display top-3
    const swapPool = rawSorted.filter(t => !top3Ids.includes(t.id));

    // Backlog = swap pool tasks (for the queue display)
    const backlog = swapPool;

    // Queue ordering state
    const [queueOrder, setQueueOrder] = useState<string[]>(() => backlog.map(t => t.id));
    const backlogIds = backlog.map(t => t.id).join(',');
    useEffect(() => {
        setQueueOrder(prev => {
            const newIds = backlog.map(t => t.id);
            const kept = prev.filter(id => newIds.includes(id));
            const added = newIds.filter(id => !prev.includes(id));
            return [...kept, ...added];
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backlogIds]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setQueueOrder(prev => {
                const oldIndex = prev.indexOf(active.id as string);
                const newIndex = prev.indexOf(over.id as string);
                return arrayMove(prev, oldIndex, newIndex);
            });
        }
    }

    const orderedBacklog = queueOrder
        .map(id => backlog.find(t => t.id === id))
        .filter((t): t is ActionItem => !!t);

    // ── Weekly stats mini card (always computed) ──
    const weeklyStats = computeWeeklyStats(memories);
    const weeklyDelta = weeklyStats.thisWeekCount - weeklyStats.lastWeekCount;

    const WeeklyFlag = (
        <button
            onClick={() => setShowWeeklySummary(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all hover:scale-105 active:scale-95"
        >
            <span className="text-[11px] font-bold tabular-nums text-slate-700">
                {weeklyStats.thisWeekCount}
            </span>
            <span className="text-[10px] font-medium text-slate-500">this week</span>
            {weeklyStats.streakDays > 0 && (
                <span className="text-[10px]">🔥{weeklyStats.streakDays}d</span>
            )}
        </button>
    );

    // ── No session yet — show check-in (or "Still the same?" for stale same-day) ──
    if (!session) {
        const staleCtx = loadStaleSessionFromToday();
        const moodLabelStale = staleCtx ? MOOD_OPTIONS.find(o => o.id === staleCtx.mood)?.label : null;
        return (
            <section className="animate-in fade-in pb-32">
                {showWeeklySummary && (
                    <WeeklySummaryModal
                        memories={memories}
                        onClose={() => setShowWeeklySummary(false)}
                    />
                )}
                <div className="flex items-center gap-2 mb-5">
                    <SparklesIcon className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Priorities</span>
                </div>
                {staleCtx ? (
                    <div className="max-w-2xl mx-auto mb-4 p-5 rounded-2xl bg-white/70 border-2 border-slate-950 backdrop-blur-md shadow-sm space-y-3">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Still the same situation?</p>
                        <p className="text-sm font-semibold text-slate-700">
                            Last time: {moodLabelStale} · {TIME_OPTIONS.find(o => o.id === staleCtx.time)?.label} · {LOCATION_OPTIONS.find(o => o.id === staleCtx.location)?.label}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { saveSession({ ...staleCtx, answeredAt: Date.now() }); setSession({ ...staleCtx, answeredAt: Date.now() }); }}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                            >
                                Yes, same situation
                            </button>
                            <button
                                onClick={() => clearSession()}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                No, things changed
                            </button>
                        </div>
                    </div>
                ) : (
                    <CheckInCard
                        themeClasses={themeClasses}
                        onComplete={ctx => setSession(ctx)}
                    />
                )}
            </section>
        );
    }

    // Context label for the header
    const moodLabel = MOOD_OPTIONS.find(o => o.id === session.mood)?.label ?? '';
    const timeLabel = TIME_OPTIONS.find(o => o.id === session.time)?.label ?? '';
    const locationLabel = LOCATION_OPTIONS.find(o => o.id === session.location)?.label ?? '';

    return (
        <section className="animate-in fade-in pb-32 max-w-2xl mx-auto">

            {showWeeklySummary && (
                <WeeklySummaryModal
                    memories={memories}
                    onClose={() => setShowWeeklySummary(false)}
                />
            )}

            {/* ── Header ── */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <SparklesIcon className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Priorities</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Work on what matters, right now.</h2>
            </div>

            {/* ── Session context + reset ── */}
            <div className="flex items-center gap-2 mb-7">
                <span className="text-[12px] font-medium px-3 py-1.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200">
                    {moodLabel} · {timeLabel} · {locationLabel}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                <button
                    onClick={() => { clearSession(); setSession(null); }}
                    className={`text-[12px] font-medium transition-all hover:opacity-100 opacity-50 ${mutedText}`}
                >
                    Reset
                </button>
            </div>

            {isQuickWinMode ? (
                // ── Quick win mode: just one small thing ──
                (() => {
                    const quickTask = rawSorted.find(t => t.effort === 'low') ?? rawSorted[0];
                    if (!quickTask) return null;
                    return (
                        <div className="mb-10">
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-[10px] font-semibold uppercase tracking-widest ${mutedText}`}>
                                    Just this one thing
                                </span>
                                <button
                                    onClick={() => setIsQuickWinMode(false)}
                                    className={`text-[11px] font-medium transition-colors ${mutedText} hover:text-slate-600`}
                                >
                                    ← Show all priorities
                                </button>
                            </div>
                            <div className={`w-full p-6 transition-all ${card}`}>
                                <div className="flex items-start gap-2 mb-3">
                                    <p className={`flex-1 text-[18px] font-bold leading-snug ${accentText}`}>
                                        {quickTask.text}
                                    </p>
                                    {quickTask.rationale && <RationalePopover text={quickTask.rationale} />}
                                </div>
                                {onStartFocus && (
                                    <button
                                        onClick={() => onStartFocus(quickTask.id)}
                                        className="w-full mt-1 py-3 rounded-2xl text-[14px] font-bold bg-slate-900 text-white hover:bg-slate-700 transition-all"
                                    >
                                        Let's do it →
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })()
            ) : displayTop3.length > 0 ? (
                <div className="mb-10 space-y-2">
                    {displayTop3.map((task, idx) => (
                        <div
                            key={task.id}
                            className={`group w-full p-5 transition-all ${card}`}
                        >
                            <div
                                className="cursor-pointer"
                                onClick={() => setSelectedTask({ memoryId: getMemoryId(task), taskId: task.id })}
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <span className={`text-[11px] font-bold shrink-0 mt-0.5 ${mutedText}`}>{idx + 1}</span>
                                    <p className={`flex-1 text-[15px] font-semibold leading-snug ${accentText} group-hover:opacity-80 transition-opacity`}>
                                        {task.text}
                                    </p>
                                    {task.rationale && <RationalePopover text={task.rationale} />}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap ml-6 mb-3">
                                    <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                                        {task.category}
                                    </span>
                                    <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                                        ~{estimateMinutes(task)} min
                                    </span>
                                    {getEffectiveUrgency(task) > 7 && (
                                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-600">
                                            Urgent
                                        </span>
                                    )}
                                    {task.deadline && getEffectiveUrgency(task) > task.urgency && (
                                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                                            {(() => {
                                                const h = (task.deadline - Date.now()) / 3600000;
                                                if (h < 0) return 'Overdue';
                                                if (h < 24) return 'Due today';
                                                if (h < 72) return 'Due soon';
                                                return 'Due this week';
                                            })()}
                                        </span>
                                    )}
                                    {task.timeOfDay && task.timeOfDay !== 'anytime' && (() => {
                                        const slot = task.timeOfDay;
                                        const current = getCurrentTimeSlot();
                                        const isMatch = slot === current;
                                        const emoji = slot === 'morning' ? '🌅' : slot === 'afternoon' ? '☀️' : '🌙';
                                        return (
                                            <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${isMatch ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {emoji} {slot}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="flex items-center justify-between ml-6 mt-1">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            const next = swapPool.find(t => !top3Ids.includes(t.id));
                                            if (!next) return;
                                            setTop3Ids(prev => {
                                                const updated = [...prev];
                                                const slotIdx = updated.indexOf(task.id);
                                                if (slotIdx === -1) return prev;
                                                updated[slotIdx] = next.id;
                                                return updated;
                                            });
                                        }}
                                        disabled={swapPool.length === 0}
                                        className={`text-[11px] font-medium transition-colors ${mutedText} hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed`}
                                    >
                                        Not this one →
                                    </button>
                                    <button
                                        onClick={() => addMaybeLater(task.id)}
                                        className={`text-[11px] font-medium transition-colors ${mutedText} opacity-50 hover:opacity-100 hover:text-slate-500`}
                                    >
                                        Maybe later
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    {onStartFocus && (
                                        <button
                                            onClick={() => onStartFocus(task.id)}
                                            className="px-4 py-1.5 rounded-full text-[12px] font-bold transition-all hover:scale-105 active:scale-95 shadow-sm bg-slate-900 text-white hover:bg-slate-700"
                                        >
                                            Start
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {/* ── Just one small thing ── */}
                    <div className="flex justify-center pt-2">
                        <button
                            onClick={() => setIsQuickWinMode(true)}
                            className="text-[12px] font-semibold px-4 py-2 rounded-full border border-slate-300 bg-white/80 text-slate-500 hover:text-slate-700 hover:border-slate-400 hover:bg-white transition-all"
                        >
                            Just one small thing →
                        </button>
                    </div>
                </div>
            ) : (
                <div className={`p-12 text-center ${card}`}>
                    <p className={`text-sm font-medium ${mutedText}`}>
                        All clear — no active tasks. Add a brain dump to get started.
                    </p>
                </div>
            )}

            {/* ── Lower section: All Tasks ── */}
            {activeTasks.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">

                    {/* All tasks */}
                    {activeTasks.length > 0 && (
                        <div>
                            <button
                                onClick={() => setIsGlobalListOpen(v => !v)}
                                className="w-full flex items-center justify-between mb-2"
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-semibold uppercase tracking-widest ${mutedText}`}>All tasks</span>
                                    <span className="text-[10px] font-medium tabular-nums text-slate-400">{activeTasks.length}</span>
                                </div>
                                {isGlobalListOpen
                                    ? <ChevronUpIcon className={`w-3.5 h-3.5 ${mutedText}`} />
                                    : <ChevronDownIcon className={`w-3.5 h-3.5 ${mutedText}`} />
                                }
                            </button>
                            {isGlobalListOpen && (
                                <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                                    {[...activeTasks]
                                        .sort((a, b) => getEffectiveCompositeScore(b, memories) - getEffectiveCompositeScore(a, memories))
                                        .map((task, idx) => {
                                            const urgencyEff = getEffectiveUrgency(task);
                                            return (
                                                <div
                                                    key={task.id}
                                                    onClick={() => setSelectedTask({ memoryId: getMemoryId(task), taskId: task.id })}
                                                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all ${card} hover:opacity-80`}
                                                >
                                                    <span className={`text-[10px] font-semibold w-4 shrink-0 text-center tabular-nums ${mutedText} opacity-50`}>
                                                        {idx + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                                                        <span className="text-[10px] font-medium text-slate-500 shrink-0 whitespace-nowrap">{task.category}</span>
                                                        <span className="text-slate-300 text-[10px] shrink-0">·</span>
                                                        <p className={`text-[13px] font-semibold leading-snug truncate ${accentText}`}>{task.text}</p>
                                                        {task.trend === 'up' && <span className="text-[9px] font-bold text-emerald-500 shrink-0">↑</span>}
                                                        {task.trend === 'down' && <span className="text-[9px] font-bold text-rose-400 shrink-0">↓</span>}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {urgencyEff > 7 && (
                                                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">Urgent</span>
                                                        )}
                                                        {task.effort && task.effort !== 'medium' && (
                                                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                                                                task.effort === 'low' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                                                            }`}>
                                                                {task.effort}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            )}
                        </div>
                    )}

                </div>
            )}

            {/* ── Quiet footer ── */}
            {completedCount > 0 && (
                <div className="flex items-center justify-end mt-4 pt-4 border-t border-slate-100">
                    <span className={`text-[11px] font-medium opacity-30 flex items-center gap-1 ${mutedText}`}>
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        {completedCount} done
                    </span>
                </div>
            )}
        </section>
    );
};
