import React from 'react';
import { XMarkIcon, FireIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { MemoryItem } from '../types';
import { computeWeeklyStats } from '../utils/weeklyStats';

interface WeeklySummaryModalProps {
    memories: MemoryItem[];
    onClose: () => void;
    /** If coming from a Focus session, pass how many tasks were completed in that session */
    sessionCompletions?: number;
}

export const WeeklySummaryModal: React.FC<WeeklySummaryModalProps> = ({
    memories,
    onClose,
    sessionCompletions,
}) => {
    const stats = computeWeeklyStats(memories);

    const delta = stats.thisWeekCount - stats.lastWeekCount;
    const deltaLabel =
        delta > 0  ? `↑ ${delta} more than last week` :
        delta < 0  ? `↓ ${Math.abs(delta)} fewer than last week` :
                     'Same as last week';
    const deltaColor =
        delta > 0  ? 'text-emerald-500' :
        delta < 0  ? 'text-rose-400' :
                     'text-slate-500';

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-slate-100 p-7 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                            This week
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Session callout (only shown from Focus exit) */}
                {sessionCompletions != null && sessionCompletions > 0 && (
                    <div className="mb-5 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                        <p className="text-[13px] font-semibold text-slate-700">
                            {sessionCompletions === 1
                                ? 'You cleared 1 task this session 🎯'
                                : `You cleared ${sessionCompletions} tasks this session 🎯`}
                        </p>
                    </div>
                )}

                {/* Big number */}
                <div className="text-center mb-2">
                    <span className="text-[64px] font-black leading-none tabular-nums text-slate-900">
                        {stats.thisWeekCount}
                    </span>
                </div>
                <p className="text-center text-[13px] font-medium text-slate-500 mb-1">
                    tasks cleared this week
                </p>
                <p className={`text-center text-[12px] font-semibold mb-7 ${deltaColor}`}>
                    {deltaLabel}
                </p>

                {/* Stats row */}
                <div className="flex gap-3 mb-7">
                    {/* Streak */}
                    <div className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                            <FireIcon className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-[18px] font-bold text-slate-800">{stats.streakDays}</span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500">
                            {stats.streakDays === 1 ? 'day streak' : 'day streak'}
                        </p>
                    </div>

                    {/* Top category */}
                    {stats.topCategory && (
                        <div className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                            <p className="text-[13px] font-bold text-slate-800 mb-0.5 truncate">
                                {stats.topCategory}
                            </p>
                            <p className="text-[10px] font-medium text-slate-500">
                                {stats.topCategoryCount} tasks · top area
                            </p>
                        </div>
                    )}
                </div>

                {/* CTA */}
                <button
                    onClick={onClose}
                    className="w-full py-3.5 rounded-2xl text-[14px] font-bold bg-slate-900 text-white hover:bg-slate-700 transition-all active:scale-[0.98]"
                >
                    Keep going →
                </button>

                {stats.totalCompleted > 0 && (
                    <p className="text-center text-[11px] text-slate-400 mt-3">
                        {stats.totalCompleted} tasks completed all time
                    </p>
                )}
            </div>
        </div>
    );
};
