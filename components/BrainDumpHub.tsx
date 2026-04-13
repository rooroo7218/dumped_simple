import React, { useState, useEffect } from 'react';
import {
    Squares2X2Icon,
    ArrowPathIcon,
    PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { databaseService } from '../services/databaseService';

interface BrainDumpHubProps {
    input: string;
    setInput: (val: string) => void;
    isProcessing: boolean;
    handleBrainDumpSubmit: () => Promise<void>;
    onNavigateToGrid: () => void;
}

export const BrainDumpHub: React.FC<BrainDumpHubProps> = ({
    input,
    setInput,
    isProcessing,
    handleBrainDumpSubmit,
    onNavigateToGrid,
}) => {
    const [habitDots, setHabitDots] = useState<boolean[]>(new Array(7).fill(false));

    useEffect(() => {
        const loadHabit = async () => {
            const dots = await databaseService.fetchHabitData();
            setHabitDots(dots);
        };
        loadHabit();
    }, []);

    return (
        <section className="relative h-screen w-full flex flex-col bg-[#FDFCFB] overflow-hidden p-6 md:p-12">
            
            {/* Corner Navigation: To Grid */}
            <button 
                onClick={onNavigateToGrid}
                className="absolute top-8 right-8 p-3 rounded-full text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-90 z-50"
                title="Go to Grid"
            >
                <Squares2X2Icon className="w-7 h-7" />
            </button>

            <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full pt-16 md:pt-24">
                
                {/* Guide Question (Soft Label) */}
                <label className="text-sm font-medium text-slate-300 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-1000">
                    What's weighing on you right now?
                </label>

                {/* Primary Input: Textarea */}
                <textarea
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleBrainDumpSubmit();
                        }
                    }}
                    placeholder="Put it all down here..."
                    className="flex-1 w-full bg-transparent border-none focus:ring-0 resize-none text-2xl md:text-3xl font-medium text-slate-800 placeholder:text-slate-200 leading-relaxed p-0 mb-12"
                    disabled={isProcessing}
                />

                {/* Bottom Bar: Action + Habit Strip */}
                <div className="flex flex-col items-center gap-12 pb-8 md:pb-16">
                    
                    {/* Submit Button */}
                    <button
                        onClick={handleBrainDumpSubmit}
                        disabled={isProcessing || !input.trim()}
                        className={`group relative flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg transition-all active:scale-95 ${
                            isProcessing || !input.trim()
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'text-slate-950 hover:bg-slate-100'
                        }`}
                    >
                        {isProcessing ? (
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <span>Put it all down.</span>
                                <PaperAirplaneIcon className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </>
                        )}
                    </button>

                    {/* Habit Strip: 7 dots */}
                    <div className="flex items-center gap-4">
                        {habitDots.map((filled, i) => (
                            <div 
                                key={i}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-1000 ${
                                    filled 
                                        ? 'bg-slate-900 scale-110 shadow-sm' 
                                        : 'bg-slate-100'
                                }`}
                                title={i === 6 ? "Today" : `${6-i} days ago`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Subtle processing overlay (for that "instant clear" feel while background work happens) */}
            {isProcessing && (
                <div className="fixed inset-x-0 top-0 h-1 bg-slate-950/10 z-[60]">
                    <div className="h-full bg-slate-950 animate-progress origin-left" />
                </div>
            )}
        </section>
    );
};

// Global styles for the progress bar
const style = document.createElement('style');
style.textContent = `
    @keyframes progress {
        0% { transform: scaleX(0); }
        50% { transform: scaleX(0.7); }
        100% { transform: scaleX(1); }
    }
    .animate-progress {
        animation: progress 2s ease-in-out infinite;
    }
`;
document.head.appendChild(style);
