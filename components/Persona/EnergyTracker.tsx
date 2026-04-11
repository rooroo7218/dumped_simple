import React from 'react';

interface EnergyTrackerProps {
    currentEnergy: number;
    onEnergyChange: (level: number) => void;
}

export const EnergyTracker: React.FC<EnergyTrackerProps> = ({ currentEnergy, onEnergyChange }) => {
    return (
        <div className="p-6 transition-all border-4 bg-white border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
                <h4 className="font-black uppercase text-sm tracking-widest">Capacity Level</h4>
                <p className="text-[10px] font-bold uppercase opacity-40 mt-1">Configure your current metabolic fuel</p>
            </div>
            <div className="flex gap-3">
                {[2, 4, 6, 8, 10].map((level) => (
                    <button
                        key={level}
                        onClick={() => onEnergyChange(level)}
                        className={`w-14 h-14 border-4 font-black transition-all flex items-center justify-center transform hover:scale-110 active:scale-90 ${currentEnergy === level
                            ? 'bg-black border-black text-white shadow-lg'
                            : 'bg-white border-slate-200 text-slate-300 hover:border-black hover:text-black'
                        }`}
                    >
                        <span className="text-xl md:text-2xl">{level}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
