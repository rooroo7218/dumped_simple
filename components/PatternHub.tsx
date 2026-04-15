import React, { useState, useEffect } from 'react';
import { databaseService } from '../services/databaseService';
import { DumpCalendar } from './ui/dump-calendar';
import { SparklesIcon } from '@heroicons/react/24/solid';

export const PatternHub: React.FC = () => {
    const [calendarData, setCalendarData] = useState<{ date: string; count: number }[]>([]);

    useEffect(() => {
        databaseService.fetchDumpCalendarData().then(setCalendarData);
    }, []);

    return (
        <div className="max-w-xl mx-auto w-full pt-10 pb-24 px-6 animate-in fade-in duration-700">
            {/* Header Style matching TilesHub */}
            <div className="mb-10 mx-1 pb-4 border-b border-slate-100/60">
                <div className="flex items-center gap-2 mb-1.5">
                    <SparklesIcon className="w-4 h-4 text-violet-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Activity</span>
                </div>
                <h2 className="text-xl font-medium tracking-tight text-slate-900">Your patterns, visualized.</h2>
            </div>
            
            <div className="pl-10 pr-4"> {/* Extra left padding for month labels */}
                <DumpCalendar data={calendarData} />
            </div>
        </div>
    );
};
