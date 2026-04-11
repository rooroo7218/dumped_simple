import React from 'react';
import { UserPersona, ActionItem, MemoryItem } from '../types';
import {
    FlagIcon,
    CalendarIcon,
    CheckCircleIcon,
    ArrowTrendingUpIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

interface TimelineViewProps {
    persona: UserPersona;
    memories: MemoryItem[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ persona, memories }) => {
    // Extract everything that looks like an action across all memories
    const allActions = memories.flatMap(m => m.actions || []);

    // Group goals by timeframe
    const timeframes = ['1-year', '3-year', '5-year'];

    const calculateProgress = (goalText: string) => {
        // Find tasks that mention the goal or match its impact area
        const relatedTasks = allActions.filter(a =>
            a.impactArea?.toLowerCase().includes(goalText.toLowerCase()) ||
            goalText.toLowerCase().includes(a.impactArea?.toLowerCase() || '') ||
            a.text.toLowerCase().includes(goalText.toLowerCase())
        );

        if (relatedTasks.length === 0) return 0;
        const completed = relatedTasks.filter(a => a.completed).length;
        return Math.round((completed / relatedTasks.length) * 100);
    };

    return (
        <div className="space-y-16 max-w-6xl mx-auto py-12 animate-in fade-in duration-700">
            <header className="text-center space-y-4">
                <h2 className="text-4xl md:text-7xl font-black uppercase font-['Plus_Jakarta_Sans'] tracking-tighter text-black">
                    ROADMAP.
                </h2>
                <p className="text-[12px] font-black uppercase tracking-[0.4em] opacity-40">CHRONOLOGICAL PROGRESSION OF YOUR VISION</p>
            </header>

            <div className="relative">
                {/* Central Vertical Line (Brutalist style) */}
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-black -translate-x-1/2 hidden md:block" />

                <div className="space-y-24">
                    {timeframes.map((tf, tfIdx) => {
                        const goals = persona.longTermGoals?.filter(g => g.timeframe === (tf as any)) || [];
                        if (goals.length === 0) return null;

                        return (
                            <div key={tf} className="relative">
                                {/* Timeframe Marker */}
                                <div className="flex justify-center mb-12">
                                    <div className="px-8 py-3 border-4 font-black uppercase tracking-widest text-lg z-10 transition-all bg-white border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                        {tf.replace('-', ' ')} Horizon
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                                    {goals.map((goal, gIdx) => {
                                        const progress = calculateProgress(goal.goal);
                                        const isEven = gIdx % 2 === 0;

                                        return (
                                            <div
                                                key={gIdx}
                                                className={`group flex flex-col ${isEven ? 'md:items-end md:text-right' : 'md:items-start md:text-left'}`}
                                            >
                                                <div className="w-full p-8 transition-all hover:scale-105 border-4 bg-white border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-none">
                                                    <div className={`flex items-center gap-4 mb-6 ${isEven ? 'md:flex-row-reverse' : ''}`}>
                                                        <div className="w-12 h-12 flex items-center justify-center rounded-2xl border-2 bg-black border-black text-white">
                                                            <FlagIcon className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-black uppercase opacity-30">{goal.category}</span>
                                                            <h4 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-tight">{goal.goal}</h4>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-[11px] font-black uppercase opacity-40">Kinetic completion</span>
                                                            <span className="text-[14px] font-black text-black">{progress}%</span>
                                                        </div>
                                                        <div className="h-8 w-full border-4 border-black overflow-hidden bg-slate-50">
                                                            <div
                                                                className="h-full transition-all duration-1000 ease-out bg-emerald-400"
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className={`mt-8 pt-6 border-t-2 border-dashed flex items-center gap-3 border-slate-100 ${isEven ? 'md:flex-row-reverse' : ''}`}>
                                                        {progress === 100 ? (
                                                            <>
                                                                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                                                <span className="text-[10px] font-black uppercase text-emerald-600">Milestone Secured</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ArrowTrendingUpIcon className="w-5 h-5 text-indigo-500" />
                                                                <span className="text-[10px] font-black uppercase opacity-40">In Progression</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="p-12 text-center border-4 border-dashed transition-all bg-slate-50 border-slate-200">
                <SparklesIcon className="w-12 h-12 mx-auto mb-6 opacity-20" />
                <p className="max-w-3xl mx-auto text-lg font-bold uppercase tracking-tight leading-relaxed opacity-60">
                    Your roadmap is automatically updated as your dump tasks into the canvas. Alfred tracks the vector between your daily actions and these permanent milestones.
                </p>
            </div>
        </div>
    );
};
