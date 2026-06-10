import React, { useState, useEffect } from 'react';
import { databaseService } from '../services/databaseService';
import { DumpCalendar } from './ui/dump-calendar';
import { SparklesIcon } from '@heroicons/react/24/solid';

export const PatternHub: React.FC = () => {
    const [calendarData, setCalendarData] = useState<{ date: string; count: number }[]>([]);

    useEffect(() => {
        databaseService.fetchDumpCalendarData().then(setCalendarData);
    }, []);

    const hasDumps = calendarData.some(d => d.count > 0);

    return (
        <div className="max-w-3xl mx-auto w-full pb-24 animate-in fade-in duration-700">
            {/* Header Style matching TilesHub */}
            <div className="mb-2 mx-1 pb-2 border-b border-slate-100/60">
                <div className="flex items-center gap-2 mb-1.5">
                    <SparklesIcon className="w-4 h-4 text-violet-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Activity</span>
                </div>
                <h2 className="text-xl font-medium tracking-tight text-slate-900">Your dump history.</h2>
            </div>
            
            <div className="pl-10 pr-4"> {/* Extra left padding for month labels */}
                {hasDumps ? (
                    <DumpCalendar data={calendarData} />
                ) : (
                    <div className="py-12 text-center text-slate-400 text-[15px]">
                        nothing yet. go dump something.
                    </div>
                )}
            </div>
        </div>
    );
};
