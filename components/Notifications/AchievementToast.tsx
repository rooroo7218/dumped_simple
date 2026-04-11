import React from 'react';
import { UserSticker } from '../../types';

interface AchievementToastProps {
    newStickerAward: UserSticker & { name: string, emoji: string };
}

export const AchievementToast: React.FC<AchievementToastProps> = ({
    newStickerAward,
}) => {
    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[600] animate-in slide-in-from-bottom-20 zoom-in duration-500">
            <div className="p-8 border-4 bg-white flex items-center gap-6 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.2)] border-black">
                <div className={`text-6xl ${newStickerAward.rarity === 'holographic' ? 'animate-bounce' : ''}`}>
                    {newStickerAward.emoji}
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                        Achievement Unlocked!
                    </span>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">
                        {newStickerAward.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${newStickerAward.rarity === 'holographic' ? 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white border-transparent' :
                            newStickerAward.rarity === 'legendary' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                newStickerAward.rarity === 'rare' ? 'bg-blue-100 text-blue-600 border-blue-200' :
                                    'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                            {newStickerAward.rarity}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
