import React, { useState, useEffect } from 'react';
import { Item, DumpItem } from '../types';
import { databaseService } from '../services/databaseService';
import { 
    FlagIcon as FlagOutline,
    CheckCircleIcon as CheckOutline,
    ChevronDownIcon,
    ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { 
    FlagIcon as FlagSolid,
    CheckCircleIcon as CheckSolid 
} from '@heroicons/react/24/solid';

interface MemoryGridHubProps {
    setActiveTab: (tab: string) => void;
}

export const MemoryGridHub: React.FC<MemoryGridHubProps> = ({ setActiveTab }) => {
    const [items, setItems] = useState<Item[]>([]);
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [excerpts, setExcerpts] = useState<Record<string, DumpItem[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    const load = async () => {
        setIsLoading(true);
        const data = await databaseService.loadItems();
        setItems(data);
        setIsLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const toggleExpand = async (itemId: string) => {
        if (expandedItemId === itemId) {
            setExpandedItemId(null);
            return;
        }
        setExpandedItemId(itemId);
        if (!excerpts[itemId]) {
            const data = await databaseService.loadItemExcerpts(itemId);
            setExcerpts(prev => ({ ...prev, [itemId]: data }));
        }
    };

    const handleToggleFlag = async (e: React.MouseEvent, item: Item) => {
        e.stopPropagation();
        await databaseService.toggleFlag(item.id, !item.isFlagged);
        load();
    };

    const handleToggleComplete = async (e: React.MouseEvent, item: Item) => {
        e.stopPropagation();
        await databaseService.toggleComplete(item.id, !item.isCompleted);
        load();
    };

    // Filter Items
    const now = Date.now();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    
    const flagged = items.filter(i => !i.isCompleted && i.isFlagged);
    const active = items.filter(i => !i.isCompleted && !i.isFlagged && (now - i.lastMentionedAt < fourteenDaysMs));
    const completed = items.filter(i => i.isCompleted);
    const faded = items.filter(i => !i.isCompleted && !i.isFlagged && (now - i.lastMentionedAt >= fourteenDaysMs));

    if (isLoading && items.length === 0) return null;

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-slate-400 font-medium mb-4">Your head is empty (for now).</p>
                <button 
                    onClick={() => setActiveTab('dump')}
                    className="text-slate-900 font-bold border-b-2 border-slate-900 pb-1"
                >
                    Start a dump
                </button>
            </div>
        );
    }

    const maxMentionCount = Math.max(...active.map(i => i.mentionCount), 1);

    return (
        <div className="max-w-3xl mx-auto w-full pb-24 animate-in fade-in duration-700">
            
            {/* ── Flagged ────────────────────────────────────────────────── */}
            {flagged.length > 0 && (
                <section className="mb-12">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1">Flagged</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {flagged.map(item => (
                            <ItemTile 
                                key={item.id} 
                                item={item} 
                                isExpanded={expandedItemId === item.id}
                                excerpts={excerpts[item.id] || []}
                                onToggle={() => toggleExpand(item.id)}
                                onFlag={(e) => handleToggleFlag(e, item)}
                                onComplete={(e) => handleToggleComplete(e, item)}
                                size="flagged"
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Active (Frequency-based) ───────────────────────────────── */}
            <section className="mb-12">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1">Active</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 auto-rows-min">
                    {active.map(item => {
                        // Calculate size based on frequency
                        const ratio = item.mentionCount / maxMentionCount;
                        const isLarge = ratio > 0.6 && item.mentionCount > 1;
                        return (
                            <ItemTile 
                                key={item.id} 
                                item={item} 
                                isExpanded={expandedItemId === item.id}
                                excerpts={excerpts[item.id] || []}
                                onToggle={() => toggleExpand(item.id)}
                                onFlag={(e) => handleToggleFlag(e, item)}
                                onComplete={(e) => handleToggleComplete(e, item)}
                                size={isLarge ? 'lg' : 'md'}
                                className={isLarge ? 'col-span-2' : ''}
                            />
                        );
                    })}
                </div>
            </section>

            {/* ── Completed / Faded ──────────────────────────────────────── */}
            {(completed.length > 0 || faded.length > 0) && (
                <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-4 ml-1">Resolved & Faded</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 opacity-50">
                        {[...completed, ...faded].map(item => (
                            <ItemTile 
                                key={item.id} 
                                item={item} 
                                isExpanded={expandedItemId === item.id}
                                excerpts={excerpts[item.id] || []}
                                onToggle={() => toggleExpand(item.id)}
                                onFlag={(e) => handleToggleFlag(e, item)}
                                onComplete={(e) => handleToggleComplete(e, item)}
                                size="sm"
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

interface ItemTileProps {
    item: Item;
    isExpanded: boolean;
    excerpts: DumpItem[];
    onToggle: () => void;
    onFlag: (e: React.MouseEvent) => void;
    onComplete: (e: React.MouseEvent) => void;
    size: 'flagged' | 'lg' | 'md' | 'sm';
    className?: string;
}

const ItemTile: React.FC<ItemTileProps> = ({ 
    item, isExpanded, excerpts, onToggle, onFlag, onComplete, size, className 
}) => {
    const isFlaggedSection = size === 'flagged';
    const isSmall = size === 'sm';
    
    return (
        <div 
            onClick={onToggle}
            className={`
                relative cursor-pointer transition-all duration-300 group
                bg-white border text-left
                ${isExpanded ? 'ring-2 ring-slate-900 border-transparent z-20' : 'border-slate-100/80 hover:border-slate-300'}
                ${isFlaggedSection ? 'rounded-2xl p-5 bg-slate-50' : 'rounded-xl p-4'}
                ${isSmall ? 'py-3' : ''}
                ${isExpanded ? 'scale-[1.02] shadow-xl col-span-full' : ''}
                ${className}
            `}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <p className={`
                        font-medium leading-tight
                        ${isFlaggedSection ? 'text-lg text-slate-900 font-bold' : 'text-slate-800'}
                        ${isSmall ? 'text-xs text-slate-400' : 'text-sm'}
                        ${item.isCompleted ? 'line-through opacity-60' : ''}
                    `}>
                        {item.label}
                    </p>
                    {item.mentionCount > 1 && !isSmall && !isExpanded && (
                        <span className="text-[10px] font-black text-slate-300 mt-1 uppercase tracking-widest">
                            Seen {item.mentionCount}×
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onFlag} className="p-1.5 rounded-full hover:bg-slate-100">
                        {item.isFlagged ? <FlagSolid className="w-4 h-4 text-amber-500" /> : <FlagOutline className="w-4 h-4 text-slate-300" />}
                    </button>
                    <button onClick={onComplete} className="p-1.5 rounded-full hover:bg-slate-100">
                        {item.isCompleted ? <CheckSolid className="w-4 h-4 text-emerald-500" /> : <CheckOutline className="w-4 h-4 text-slate-300" />}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-6 mb-4 pb-4 border-b border-slate-100">
                        <div>
                            <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Mentioned</span>
                            <span className="text-sm font-bold text-slate-900">{item.mentionCount} times</span>
                        </div>
                        <div>
                            <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Last Activity</span>
                            <span className="text-sm font-bold text-slate-900">{new Date(item.lastMentionedAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">In your words...</span>
                        {excerpts.length > 0 ? excerpts.map((ex, i) => (
                            <div key={ex.id} className="bg-slate-50 rounded-lg p-3 italic text-slate-600 text-sm leading-relaxed">
                                "{ex.rawExcerpt}"
                            </div>
                        )) : (
                            <p className="text-xs text-slate-300 italic">No excerpts captured yet.</p>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-2 text-xs">
                         <button 
                            onClick={(e) => { e.stopPropagation(); onToggle(); }}
                            className="text-slate-400 hover:text-slate-600 font-bold px-3 py-1"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

