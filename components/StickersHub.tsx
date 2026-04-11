import React, { useState } from 'react';
import { ActionItem, UserSticker, Sticker, StickerRarity } from '../types';
import { STICKER_COLLECTION } from '../services/stickerLibrary';
import { SparklesIcon, TrophyIcon, HandRaisedIcon, BeakerIcon, ArrowDownCircleIcon, PlusIcon, BoltIcon } from '@heroicons/react/24/outline';
import { craftStickers } from '../services/stickerCraftingService';
import { useDndMonitor, useDraggable, useDroppable, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface StickersHubProps {
    userStickers: UserSticker[];
    onUpdatePosition?: (id: string, x: number, y: number) => void;
    onCraftSuccess?: (newSticker: UserSticker, consumedIds: string[]) => void;
    onClearAll?: () => void;
}

interface RarityBadgeProps {
    rarity: StickerRarity;
}

const RarityBadge: React.FC<RarityBadgeProps> = ({ rarity }) => {
    const styles: Record<StickerRarity, string> = {
        common: 'bg-slate-100 text-slate-500',
        rare: 'bg-blue-100 text-blue-600 border-blue-200',
        legendary: 'bg-amber-100 text-amber-600 border-amber-200',
        holographic: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white animate-pulse'
    };

    return (
        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${styles[rarity]}`}>
            {rarity}
        </span>
    );
};

interface DraggableStickerProps {
    sticker: UserSticker;
    base: Sticker;
    isDragging: boolean;
    isSelected: boolean;
    onMouseDown: (e: React.MouseEvent, id: string) => void;
    onClick: (id: string) => void;
}

const DraggableStickerBase: React.FC<DraggableStickerProps> = ({
    sticker,
    base,
    isDragging,
    isSelected,
    onMouseDown,
    onClick
}) => {
    const { attributes, listeners, setNodeRef, transform, isDragging: isDndDragging } = useDraggable({
        id: sticker.id,
        data: { type: 'sticker', sticker, base }
    });

    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${sticker.x ?? 50}%`,
        top: `${sticker.y ?? 50}%`,
        transform: `rotate(${sticker.rotation ?? 0}deg) scale(${isSelected ? 1.1 : 1})`,
        zIndex: isSelected ? 50 : 10,
        touchAction: 'none',
        opacity: isDndDragging ? 0 : 1
    };

    const stickerClass = base.style === 'jelly' ? 'sticker-jelly' : base.style === 'stamp' ? 'sticker-stamp' : 'sticker-diecut';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={(e) => {
                e.stopPropagation();
                onClick(sticker.id);
            }}
            className={`group select-none flex flex-col items-center cursor-grab active:cursor-grabbing ${stickerClass} ${sticker.rarity === 'holographic' ? 'sticker-holographic' : ''} ${isSelected ? 'ring-4 ring-purple-400 rounded-full' : ''}`}
        >
            <div className="sticker-content relative flex items-center justify-center pointer-events-none">
                <div className="text-6xl md:text-7xl mb-1 drop-shadow-sm z-10">{base.emoji}</div>
                {base.style === 'stamp' && <span className="absolute top-1 right-1 text-[8px] font-black opacity-20 select-none">5¢</span>}
                {base.style === 'jelly' && <div className="sticker-shine z-20" />}
            </div>
            {isSelected && (
                <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full border shadow-xl animate-in zoom-in pointer-events-none mt-2 z-50">
                    <span className="text-[10px] font-black uppercase tracking-tighter">{base.name}</span>
                </div>
            )}
        </div>
    );
};

const DraggableSticker = React.memo(DraggableStickerBase);

interface CraftSlotProps {
    id: string;
    sticker?: UserSticker;
    base?: Sticker;
}

const CraftSlot: React.FC<CraftSlotProps> = ({ id, sticker, base }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`w-28 h-28 md:w-32 md:h-32 rounded-3xl md:rounded-[40px] border-4 border-dashed flex items-center justify-center transition-all ${isOver ? 'border-black bg-slate-100 scale-105' :
                sticker ? 'border-black bg-white' :
                    'border-slate-200 bg-slate-50 opacity-50'
                } ${sticker ? 'shadow-inner' : ''}`}
        >
            {sticker && base ? (
                <DraggableSticker
                    sticker={sticker}
                    base={base}
                    isDragging={false}
                    isSelected={false}
                    onMouseDown={() => { }}
                    onClick={() => { }}
                />
            ) : (
                <PlusIcon className={`w-8 h-8 opacity-20 ${isOver ? 'animate-bounce' : ''}`} />
            )}
        </div>
    );
};

export const StickersHub: React.FC<StickersHubProps> = ({ userStickers, onUpdatePosition, onCraftSuccess, onClearAll }) => {
    const [craftMessage, setCraftMessage] = useState<string | null>(null);
    const [selectedForCraft, setSelectedForCraft] = useState<string[]>([]);

    const boardRef = React.useRef<HTMLDivElement>(null);
    const { setNodeRef: setBoardRef } = useDroppable({ id: 'sticker-board' });

    const getStickerBase = (id: string) => STICKER_COLLECTION.find(s => s.id === id);

    useDndMonitor({
        onDragEnd(event) {
            const { active, over } = event;
            const dragData = active.data.current;

            if (!over || !boardRef.current || dragData?.type !== 'sticker') return;

            const stickerId = active.id as string;
            const dropId = over.id as string;

            if (dropId.startsWith('craft-slot-')) {
                // Add to crafting
                setSelectedForCraft(prev => {
                    if (prev.includes(stickerId)) return prev;
                    if (prev.length >= 3) return prev;
                    return [...prev, stickerId];
                });
                return;
            }

            if (dropId === 'sticker-board' && onUpdatePosition) {
                // Check if it was in crafting slots, remove it
                setSelectedForCraft(prev => prev.filter(id => id !== stickerId));

                const rect = boardRef.current!.getBoundingClientRect();
                const sticker = userStickers.find(s => s.id === stickerId);
                if (sticker) {
                    const deltaX = (event.delta.x / rect.width) * 100;
                    const deltaY = (event.delta.y / rect.height) * 100;
                    let newX = (sticker.x ?? 50) + deltaX;
                    let newY = (sticker.y ?? 50) + deltaY;

                    newX = Math.max(5, Math.min(95, newX));
                    newY = Math.max(5, Math.min(95, newY));

                    onUpdatePosition(stickerId, newX, newY);
                }
            }
        },
    });

    const removeFromCraft = (id: string) => {
        setSelectedForCraft(prev => prev.filter(p => p !== id));
    };

    const handleCraft = () => {
        const stickersToCraft = userStickers.filter(s => selectedForCraft.includes(s.id));
        const result = craftStickers(stickersToCraft);

        if (result.success && result.result) {
            const newSticker: UserSticker = {
                id: crypto.randomUUID(),
                stickerId: result.result.stickerId!,
                rarity: result.result.rarity!,
                earnedAt: Date.now(),
                x: 45 + Math.random() * 10,
                y: 45 + Math.random() * 10,
                rotation: Math.random() * 20 - 10
            };
            if (onCraftSuccess) {
                onCraftSuccess(newSticker, selectedForCraft);
            }
            setSelectedForCraft([]);
            setCraftMessage(result.message);
            setTimeout(() => setCraftMessage(null), 3000);
        } else {
            setCraftMessage(result.message);
            setTimeout(() => setCraftMessage(null), 3000);
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-20">
            {/* CRAFTING OVERLAY MESSAGE */}
            {craftMessage && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-black text-white px-8 py-4 rounded-full font-black uppercase tracking-widest shadow-2xl border-4 border-purple-500 animate-in slide-in-from-top-10">
                    {craftMessage}
                </div>
            )}

            {/* PROMINENT SPARKLE MIXIE STATION (The Header Section) */}
            <section className="relative overflow-hidden p-8 md:p-12 bg-slate-900 text-white rounded-[40px] shadow-2xl border-4 border-black">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 blur-3xl opacity-20 bg-purple-500 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-48 h-48 blur-2xl opacity-10 bg-pink-500" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-16">
                    <div className="flex-1 space-y-6 text-center md:text-left">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur rounded-full border border-white/20">
                            <SparklesIcon className="w-5 h-5 text-pink-400" />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">Sparkle Mixologist</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tight">
                            Sparkle Mixie <br /> <span className="text-purple-400">Station</span>
                        </h2>
                        <p className="text-sm opacity-60 font-medium max-w-md">
                            Mix 3 stickers to manifest higher rarities or discover hidden recipes. Drag stickers here to start the magic!
                        </p>

                        <div className="flex flex-wrap gap-4 pt-4 justify-center md:justify-start">
                            {[
                                { rarity: 'common', emoji: '🌟' },
                                { rarity: 'rare', emoji: '💎' },
                                { rarity: 'legendary', emoji: '👑' },
                                { rarity: 'holographic', emoji: '🌈' }
                            ].map((ex, i) => (
                                <div key={i} className="flex flex-col items-center gap-1">
                                    <div className="text-xl grayscale hover:grayscale-0 transition-all cursor-help" title={ex.rarity}>
                                        {ex.emoji}
                                    </div>
                                    <div className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-slate-400' : i === 1 ? 'bg-blue-400' : i === 2 ? 'bg-amber-400' : 'bg-purple-400'}`} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CRAFTING SLOTS AREA */}
                    <div className="flex flex-col items-center space-y-8">
                        <div className="flex gap-4 md:gap-6">
                            {[0, 1, 2].map(i => {
                                const usId = selectedForCraft[i];
                                const us = usId ? userStickers.find(s => s.id === usId) : undefined;
                                const base = us ? getStickerBase(us.stickerId) : undefined;
                                return (
                                    <div key={i} className="relative group">
                                        <CraftSlot id={`craft-slot-${i}`} sticker={us} base={base} />
                                        {us && (
                                            <button
                                                onClick={() => removeFromCraft(us.id)}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                            >
                                                <PlusIcon className="w-4 h-4 rotate-45" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={handleCraft}
                            disabled={selectedForCraft.length !== 3}
                            className={`group relative px-12 py-5 font-black text-xl uppercase tracking-[0.3em] transition-all overflow-hidden ${selectedForCraft.length === 3
                                ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white shadow-[0_20px_50px_rgba(147,51,234,0.3)] hover:scale-105 active:scale-95'
                                : 'bg-white/5 text-white/20 border-2 border-white/10 cursor-not-allowed'
                                } rounded-[32px] md:rounded-[40px]`}
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                <BoltIcon className={`w-6 h-6 ${selectedForCraft.length === 3 ? 'animate-pulse text-amber-300' : ''}`} />
                                Transmute
                            </span>
                            {selectedForCraft.length === 3 && (
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                            )}
                        </button>
                    </div>
                </div>
            </section>

            {/* USER COLLECTION: THE BOARD */}
            <section className="space-y-8">
                <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-2xl bg-black text-white">
                            <HandRaisedIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest opacity-80">Collection Board</h3>
                            <p className="text-[10px] opacity-40 uppercase font-black tracking-tighter">Arranged with love ({userStickers.length} pieces)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-30">
                        <ArrowDownCircleIcon className="w-4 h-4 animate-bounce" />
                        Drag to reorder
                    </div>
                    {onClearAll && (
                        <button
                            onClick={onClearAll}
                            className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                <div
                    ref={(node) => {
                        boardRef.current = node;
                        setBoardRef(node);
                    }}
                    className="relative w-full min-h-[700px] transition-all bg-white/50 backdrop-blur-sm rounded-[60px] border-4 border-dashed border-slate-100"
                >
                    {userStickers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center absolute inset-0 opacity-10 pointer-events-none">
                            <TrophyIcon className="w-20 h-20 mb-6" />
                            <p className="font-black uppercase tracking-[0.4em] text-lg">Empty Canvas</p>
                            <p className="text-xs uppercase font-bold mt-2">Finish tasks to unlock stickers</p>
                        </div>
                    ) : (
                        userStickers
                            .filter(us => !selectedForCraft.includes(us.id))
                            .map((us) => {
                                const base = getStickerBase(us.stickerId);
                                if (!base) return null;
                                return (
                                    <DraggableSticker
                                        key={us.id}
                                        sticker={us}
                                        base={base}
                                        isDragging={false}
                                        isSelected={false}
                                        onMouseDown={() => { }}
                                        onClick={() => { }}
                                    />
                                );
                            })
                    )}
                </div>
            </section>
        </div>
    );
};
