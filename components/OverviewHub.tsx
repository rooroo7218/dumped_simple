import React from 'react';
import { LifeSynthesis } from '../types';
import { StarGraph } from './StarGraph';
import {
    ChartBarIcon,
    GlobeAltIcon,
    MapIcon,
    ExclamationTriangleIcon,
    SparklesIcon,
    LightBulbIcon
} from '@heroicons/react/24/outline';

interface OverviewHubProps {
    lifeSynthesis: LifeSynthesis | null;
    starGraphData: Record<string, number>;
    themeClasses: {
        panel: string;
    };
}

const cardBase = 'bg-white/70 border border-slate-200 backdrop-blur-md rounded-3xl shadow-sm';
const sectionLabel = 'text-[11px] font-semibold uppercase tracking-widest text-slate-400';

export const OverviewHub: React.FC<OverviewHubProps> = ({
    lifeSynthesis,
    starGraphData,
}) => {
    return (
        <section className="animate-in fade-in max-w-7xl mx-auto space-y-6 pb-32">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Operational Balance */}
                <div className={`p-8 ${cardBase} flex flex-col items-center space-y-6`}>
                    <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-500">
                            <ChartBarIcon className="w-5 h-5" />
                            <span className={sectionLabel}>Operational Balance</span>
                        </div>
                        <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Live</span>
                    </div>
                    <div className="w-full flex items-center justify-center py-4 rounded-2xl bg-slate-50/60">
                        <StarGraph data={starGraphData} />
                    </div>
                    <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                        Pending pressure across key life dimensions.
                    </p>
                </div>

                {/* Life Trajectory */}
                <div className={`p-8 ${cardBase} flex flex-col justify-between`}>
                    <div className="space-y-5">
                        <div className="flex items-center gap-2 text-emerald-500">
                            <GlobeAltIcon className="w-5 h-5" />
                            <span className={sectionLabel}>Life Trajectory</span>
                        </div>
                        <div className="border-l-2 border-slate-200 pl-4">
                            <p className="text-2xl font-bold text-slate-800 leading-snug">
                                {lifeSynthesis?.currentTrajectory || "Synchronizing context…"}
                            </p>
                        </div>
                    </div>
                    <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Status</p>
                            <p className="text-sm font-semibold text-slate-700 mt-0.5">Current Path</p>
                        </div>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="w-4 h-1 rounded-full bg-slate-200" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Core Resonance */}
                <div className={`p-8 ${cardBase} space-y-5`}>
                    <div className="flex items-center gap-2 text-rose-400">
                        <MapIcon className="w-5 h-5" />
                        <span className={sectionLabel}>Core Resonance</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {lifeSynthesis?.themes.map((theme, i) => (
                            <span
                                key={i}
                                className="px-3.5 py-1.5 rounded-full text-[12px] font-medium border border-slate-200 bg-white text-slate-700 hover:border-slate-400 transition-colors"
                            >
                                {theme}
                            </span>
                        ))}
                        {(!lifeSynthesis?.themes || lifeSynthesis.themes.length === 0) && (
                            <div className="w-full h-20 flex items-center justify-center rounded-2xl border border-dashed border-slate-200">
                                <p className="text-sm text-slate-300">Analyzing resonance…</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Points to Resolve */}
                <div className={`p-8 ${cardBase} flex flex-col`}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-amber-500">
                            <ExclamationTriangleIcon className="w-5 h-5" />
                            <span className={sectionLabel}>Points to Resolve</span>
                        </div>
                    </div>
                    <div className="space-y-3 flex-1">
                        {lifeSynthesis?.frictionPoints.map((point, i) => (
                            <div key={i} className="flex gap-3 items-start">
                                <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold flex items-center justify-center mt-0.5">
                                    {i + 1}
                                </span>
                                <p className="text-[14px] font-medium text-slate-700 leading-snug">{point}</p>
                            </div>
                        ))}
                        {(!lifeSynthesis?.frictionPoints || lifeSynthesis.frictionPoints.length === 0) && (
                            <div className="h-full min-h-[100px] flex flex-col items-center justify-center gap-2 opacity-30">
                                <SparklesIcon className="w-8 h-8" />
                                <p className="text-sm text-slate-400">All smooth</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Synthesis quote */}
            <div className="p-10 text-center border-t border-slate-100 bg-white/40 rounded-3xl">
                <LightBulbIcon className="w-8 h-8 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-600 italic leading-relaxed max-w-3xl mx-auto">
                    "{lifeSynthesis?.synthesis || "Life is a series of kinetic operations. Process them with intent, or be processed by their entropy."}"
                </p>
            </div>
        </section>
    );
};
