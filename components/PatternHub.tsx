import React, { useState, useEffect } from 'react';
import { databaseService } from '../services/databaseService';
import { DumpCalendar } from './ui/dump-calendar';
import { SparklesIcon } from '@heroicons/react/24/solid';

export const PatternHub: React.FC = () => {
    const [activeView, setActiveView] = useState<'dumps' | 'completions'>('dumps');
    const [dumpData, setDumpData] = useState<{ date: string; count: number }[]>([]);
    const [completionData, setCompletionData] = useState<{ date: string; count: number }[]>([]);

    useEffect(() => {
        databaseService.fetchDumpCalendarData().then(setDumpData);

        // Fetch completed tasks data
        databaseService.loadItems().then(items => {
            const countsByDate: Record<string, number> = {};
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const limitTime = oneYearAgo.getTime();

            const toLocalDate = (ms: number): string => {
                const d = new Date(ms);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };

            items.forEach(item => {
                if (item.isCompleted && item.completedAt && item.completedAt >= limitTime) {
                    const date = toLocalDate(item.completedAt);
                    countsByDate[date] = (countsByDate[date] || 0) + 1;
                }
            });

            const formatted = Object.entries(countsByDate).map(([date, count]) => ({ date, count }));
            setCompletionData(formatted);
        });
    }, []);

    const hasData = activeView === 'dumps' 
        ? dumpData.some(d => d.count > 0)
        : completionData.some(d => d.count > 0);

    return (
        <div className="max-w-3xl mx-auto w-full pb-24 animate-in fade-in duration-700">
            {/* Toggle Switcher matching Space switcher in TilesHub */}
            <div className="mb-6 mx-1 flex justify-between items-center bg-white/40 backdrop-blur-md border border-slate-200/50 p-1 rounded-2xl shadow-sm w-fit">
                <button
                    onClick={() => setActiveView('dumps')}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
                        activeView === 'dumps'
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                    }`}
                >
                    dumps
                </button>
                <button
                    onClick={() => setActiveView('completions')}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
                        activeView === 'completions'
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                    }`}
                >
                    completions
                </button>
            </div>

            {/* Header Style matching TilesHub */}
            <div className="mb-2 mx-1 pb-2 border-b border-slate-100/60">
                <div className="flex items-center gap-2 mb-1.5">
                    <SparklesIcon className={`w-4 h-4 ${activeView === 'dumps' ? 'text-violet-400' : 'text-blue-400'}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Activity</span>
                </div>
                <h2 className="text-xl font-medium tracking-tight text-slate-900">
                    {activeView === 'dumps' ? 'Your dump history.' : 'Your completion history.'}
                </h2>
            </div>
            
            <div className="pl-10 pr-4"> {/* Extra left padding for month labels */}
                {hasData ? (
                    activeView === 'dumps' ? (
                        <DumpCalendar data={dumpData} theme="purple" unitName="dump" />
                    ) : (
                        <DumpCalendar data={completionData} theme="blue" unitName="completed task" />
                    )
                ) : (
                    <div className="py-12 text-center text-slate-400 text-[15px]">
                        {activeView === 'dumps' ? 'nothing yet. go dump something.' : 'nothing yet. go finish something.'}
                    </div>
                )}
            </div>
        </div>
    );
};
