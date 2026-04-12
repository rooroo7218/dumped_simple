import React from 'react';
import { LifeSynthesis } from '../types';
import { LightBulbIcon } from '@heroicons/react/24/outline';

interface OverviewHubProps {
    lifeSynthesis: LifeSynthesis | null;
    starGraphData?: Record<string, number>;
    themeClasses?: {
        panel: string;
    };
}

export const OverviewHub: React.FC<OverviewHubProps> = ({
    lifeSynthesis,
}) => {
    return (
        <section className="animate-in fade-in max-w-lg mx-auto space-y-6 pb-12">
            {/* Synthesis quote */}
            <div className="p-8 text-center bg-white/40 rounded-3xl border border-slate-100 backdrop-blur-sm">
                <LightBulbIcon className="w-8 h-8 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-600 italic leading-relaxed">
                    "{lifeSynthesis?.synthesis || "Life is a series of kinetic operations. Process them with intent, or be processed by their entropy."}"
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-4">AI Life Synthesis</p>
            </div>
        </section>
    );
};
