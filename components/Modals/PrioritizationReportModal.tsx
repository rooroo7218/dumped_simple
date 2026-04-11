import React from 'react';
import { XMarkIcon, SparklesIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { ActionItem } from '../../types';

interface PrioritizationReportModalProps {
    summary: string;
    onClose: () => void;
    rankedTasks: ActionItem[];
}

export const PrioritizationReportModal: React.FC<PrioritizationReportModalProps> = ({ summary, onClose, rankedTasks }) => {
    const majorShifts = [...rankedTasks]
        .filter(t => t.trend && t.trend !== 'same')
        .sort((a, b) => (b.trendDelta || 0) - (a.trendDelta || 0));

    const ups = majorShifts.filter(t => t.trend === 'up').slice(0, 3);
    const downs = majorShifts.filter(t => t.trend === 'down').slice(0, 3);

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40 animate-in fade-in duration-300">
            <div className="w-full max-w-2xl flex flex-col bg-white/80 backdrop-blur-3xl border-2 border-slate-950 rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <SparklesIcon className="w-5 h-5 text-slate-500" />
                        <h2 className="text-lg font-semibold text-slate-800">Priorities updated</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-slate-100">
                        <XMarkIcon className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

                    {/* Summary */}
                    <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">What changed</p>
                        <p className="text-sm font-medium leading-relaxed text-slate-700">
                            "{summary}"
                        </p>
                    </div>

                    {/* Shifts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Moved up */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-1.5">
                                <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">Moved up</p>
                            </div>
                            <div className="space-y-2">
                                {ups.length > 0 ? ups.map(t => (
                                    <div key={t.id} className="px-3 py-2.5 bg-white/70 border border-slate-200 rounded-xl">
                                        <p className="text-sm font-semibold truncate text-slate-700">{t.text}</p>
                                        <p className="text-[10px] text-emerald-600 mt-0.5">+{t.trendDelta} spots · urgency {t.urgency}</p>
                                    </div>
                                )) : (
                                    <p className="text-xs text-slate-500 italic">Nothing moved up significantly.</p>
                                )}
                            </div>
                        </div>

                        {/* Moved down */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-1.5">
                                <ArrowTrendingDownIcon className="w-4 h-4 text-slate-500" />
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Moved down</p>
                            </div>
                            <div className="space-y-2">
                                {downs.length > 0 ? downs.map(t => (
                                    <div key={t.id} className="px-3 py-2.5 bg-white/40 border border-slate-200 rounded-xl opacity-70">
                                        <p className="text-sm font-medium truncate text-slate-500">{t.text}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Dropped {t.trendDelta} spots</p>
                                    </div>
                                )) : (
                                    <p className="text-xs text-slate-500 italic">Nothing dropped significantly.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] bg-slate-900 text-white rounded-xl hover:bg-slate-700"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
