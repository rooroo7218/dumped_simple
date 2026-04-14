import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Item, DumpItem } from '../types';
import { databaseService } from '../services/databaseService';
import { LiquidGlassCard } from './ui/liquid-weather-glass';
import {
    FlagIcon as FlagOutline,
    CheckCircleIcon as CheckOutline,
    XMarkIcon,
    SwatchIcon,
} from '@heroicons/react/24/outline';
import {
    FlagIcon as FlagSolid,
    CheckCircleIcon as CheckSolid,
} from '@heroicons/react/24/solid';

// ── Style system ────────────────────────────────────────────────────────────

type ColorKey = 'default' | 'rose' | 'amber' | 'emerald' | 'violet' | 'sky' | 'slate';
type TextureKey = 'none' | 'dots' | 'mesh' | 'linen';

interface ItemStyle { color: ColorKey; texture: TextureKey }

const COLOR_OPTIONS: { key: ColorKey; label: string; bg: string; dot: string }[] = [
    { key: 'default', label: 'Clear',   bg: 'rgba(255,255,255,0.42)',  dot: '#e2e8f0' },
    { key: 'rose',    label: 'Rose',    bg: 'rgba(254,205,211,0.55)',  dot: '#fda4af' },
    { key: 'amber',   label: 'Amber',   bg: 'rgba(253,230,138,0.55)',  dot: '#fcd34d' },
    { key: 'emerald', label: 'Emerald', bg: 'rgba(167,243,208,0.55)',  dot: '#6ee7b7' },
    { key: 'violet',  label: 'Violet',  bg: 'rgba(221,214,254,0.55)',  dot: '#c4b5fd' },
    { key: 'sky',     label: 'Sky',     bg: 'rgba(186,230,253,0.55)',  dot: '#7dd3fc' },
    { key: 'slate',   label: 'Slate',   bg: 'rgba(203,213,225,0.55)',  dot: '#94a3b8' },
];

const TEXTURE_OPTIONS: { key: TextureKey; label: string; pattern: React.CSSProperties }[] = [
    { key: 'none',   label: '—',    pattern: {} },
    { key: 'dots',   label: '···',  pattern: { backgroundImage: 'radial-gradient(circle, rgba(15,23,42,0.12) 1px, transparent 1px)', backgroundSize: '8px 8px' } },
    { key: 'mesh',   label: '⊞',   pattern: { backgroundImage: 'linear-gradient(rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.06) 1px, transparent 1px)', backgroundSize: '10px 10px' } },
    { key: 'linen',  label: '////',  pattern: { backgroundImage: 'repeating-linear-gradient(45deg, rgba(15,23,42,0.05) 0px, rgba(15,23,42,0.05) 1px, transparent 1px, transparent 7px)' } },
];

function getColorBg(key: ColorKey): string {
    return COLOR_OPTIONS.find(c => c.key === key)?.bg ?? COLOR_OPTIONS[0].bg;
}
function getTextureStyle(key: TextureKey): React.CSSProperties {
    return TEXTURE_OPTIONS.find(t => t.key === key)?.pattern ?? {};
}

function loadStyles(): Record<string, ItemStyle> {
    try { return JSON.parse(localStorage.getItem('dumped_item_styles') || '{}'); }
    catch { return {}; }
}
function saveStyles(s: Record<string, ItemStyle>) {
    localStorage.setItem('dumped_item_styles', JSON.stringify(s));
}

// ── MemoryGridHub ───────────────────────────────────────────────────────────

interface MemoryGridHubProps {
    setActiveTab: (tab: string) => void;
}

export const MemoryGridHub: React.FC<MemoryGridHubProps> = ({ setActiveTab }) => {
    const [items, setItems] = useState<Item[]>([]);
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [excerpts, setExcerpts] = useState<Record<string, DumpItem[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [itemStyles, setItemStyles] = useState<Record<string, ItemStyle>>(loadStyles);

    // Drag state
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [draggedGroup, setDraggedGroup] = useState<number | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    // Per-group custom order, persisted in localStorage
    const [itemOrder, setItemOrder] = useState<Record<string, string[]>>(() => {
        try { return JSON.parse(localStorage.getItem('dumped_item_order') || '{}'); }
        catch { return {}; }
    });

    const load = async () => {
        setIsLoading(true);
        const data = await databaseService.loadItems();
        setItems(data);
        setIsLoading(false);
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 3000);
        const timeout = setTimeout(() => clearInterval(interval), 30000);
        return () => { clearInterval(interval); clearTimeout(timeout); };
    }, []);

    const toggleExpand = async (itemId: string) => {
        if (expandedItemId === itemId) { setExpandedItemId(null); return; }
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

    const handleDelete = async (e: React.MouseEvent, item: Item) => {
        e.stopPropagation();
        await databaseService.deleteItem(item.id);
        load();
    };

    const handleStyleChange = (itemId: string, patch: Partial<ItemStyle>) => {
        const next = { ...itemStyles, [itemId]: { color: 'default', texture: 'none', ...itemStyles[itemId], ...patch } as ItemStyle };
        setItemStyles(next);
        saveStyles(next);
    };

    // ── Drag handlers ────────────────────────────────────────────────────────
    const handleDragStart = (id: string, group: number) => {
        setDraggedId(id);
        setDraggedGroup(group);
    };
    const handleDragOver = (e: React.DragEvent, id: string, group: number) => {
        if (draggedGroup !== group) return;
        e.preventDefault();
        if (dragOverId !== id) setDragOverId(id);
    };
    const handleDrop = (targetId: string, targetGroup: number) => {
        if (!draggedId || draggedGroup !== targetGroup || draggedId === targetId) return;
        const groupItems = activeGroups.find(g => g.count === targetGroup)?.items ?? [];
        const fromIdx = groupItems.findIndex(i => i.id === draggedId);
        const toIdx = groupItems.findIndex(i => i.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return;
        const reordered = [...groupItems];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);
        const newOrder = { ...itemOrder, [String(targetGroup)]: reordered.map(i => i.id) };
        setItemOrder(newOrder);
        localStorage.setItem('dumped_item_order', JSON.stringify(newOrder));
        setDraggedId(null);
        setDraggedGroup(null);
        setDragOverId(null);
    };
    const handleDragEnd = () => {
        setDraggedId(null);
        setDraggedGroup(null);
        setDragOverId(null);
    };

    // ── Filter & group ───────────────────────────────────────────────────────
    const now = Date.now();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

    const flagged   = items.filter(i => !i.isCompleted && i.isFlagged);
    const active    = items.filter(i => !i.isCompleted && !i.isFlagged && (now - i.lastMentionedAt < fourteenDaysMs));
    const completed = items.filter(i => i.isCompleted);
    const faded     = items.filter(i => !i.isCompleted && !i.isFlagged && (now - i.lastMentionedAt >= fourteenDaysMs));

    const activeGroups = useMemo(() => {
        const map = new Map<number, Item[]>();
        for (const item of active) {
            if (!map.has(item.mentionCount)) map.set(item.mentionCount, []);
            map.get(item.mentionCount)!.push(item);
        }
        return [...map.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([count, groupItems]) => {
                const storedIds = itemOrder[String(count)] ?? [];
                const idMap = new Map(groupItems.map(i => [i.id, i]));
                const ordered = storedIds.filter(id => idMap.has(id)).map(id => idMap.get(id)!);
                const remaining = groupItems.filter(i => !storedIds.includes(i.id));
                return { count, items: [...ordered, ...remaining] };
            });
    }, [active, itemOrder]);

    if (isLoading && items.length === 0) return null;

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-slate-600 font-medium mb-4">Your head is empty (for now).</p>
                <button onClick={() => setActiveTab('dump')} className="text-slate-900 font-bold border-b-2 border-slate-900 pb-1">
                    Start a dump
                </button>
            </div>
        );
    }

    const maxMentionCount = Math.max(...active.map(i => i.mentionCount), 1);

    const tileProps = (item: Item, size: 'flagged' | 'lg' | 'md' | 'sm', extraClass?: string) => ({
        item,
        isExpanded: expandedItemId === item.id,
        excerpts: excerpts[item.id] || [],
        onToggle: () => toggleExpand(item.id),
        onFlag: (e: React.MouseEvent) => handleToggleFlag(e, item),
        onComplete: (e: React.MouseEvent) => handleToggleComplete(e, item),
        onDelete: (e: React.MouseEvent) => handleDelete(e, item),
        onStyleChange: (patch: Partial<ItemStyle>) => handleStyleChange(item.id, patch),
        style: itemStyles[item.id] ?? { color: 'default' as ColorKey, texture: 'none' as TextureKey },
        size,
        className: extraClass,
    });

    return (
        <div className="max-w-3xl mx-auto w-full pb-24 animate-in fade-in duration-700">

            {/* ── Flagged ─────────────────────────────────────────────── */}
            {flagged.length > 0 && (
                <section className="mb-12">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-4 ml-1">Flagged</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {flagged.map(item => <ItemTile key={item.id} {...tileProps(item, 'flagged')} />)}
                    </div>
                </section>
            )}

            {/* ── Active — grouped by mentionCount, draggable within group ── */}
            <section className="mb-12">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-4 ml-1">Active</h3>
                <div className="flex flex-col gap-3">
                    {activeGroups.map(({ count, items: groupItems }) => (
                        <div key={count} className="grid grid-cols-2 md:grid-cols-3 gap-2 auto-rows-min">
                            {groupItems.map(item => {
                                const ratio = item.mentionCount / maxMentionCount;
                                const isLarge = ratio > 0.6 && item.mentionCount > 1;
                                return (
                                    <ItemTile
                                        key={item.id}
                                        {...tileProps(item, isLarge ? 'lg' : 'md', isLarge ? 'col-span-2' : '')}
                                        isDragging={draggedId === item.id}
                                        isDragOver={dragOverId === item.id}
                                        canDrop={draggedGroup === item.mentionCount}
                                        onDragStart={() => handleDragStart(item.id, item.mentionCount)}
                                        onDragOver={(e: React.DragEvent) => handleDragOver(e, item.id, item.mentionCount)}
                                        onDrop={() => handleDrop(item.id, item.mentionCount)}
                                        onDragEnd={handleDragEnd}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Completed / Faded ───────────────────────────────────── */}
            {(completed.length > 0 || faded.length > 0) && (
                <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 ml-1">Resolved & Faded</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 opacity-50">
                        {[...completed, ...faded].map(item => (
                            <ItemTile key={item.id} {...tileProps(item, 'sm')} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

// ── ItemTile ────────────────────────────────────────────────────────────────

interface ItemTileProps {
    item: Item;
    isExpanded: boolean;
    excerpts: DumpItem[];
    onToggle: () => void;
    onFlag: (e: React.MouseEvent) => void;
    onComplete: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onStyleChange: (patch: Partial<ItemStyle>) => void;
    style: ItemStyle;
    size: 'flagged' | 'lg' | 'md' | 'sm';
    className?: string;
    isDragging?: boolean;
    isDragOver?: boolean;
    canDrop?: boolean;
    onDragStart?: () => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: () => void;
    onDragEnd?: () => void;
}

const ItemTile: React.FC<ItemTileProps> = ({
    item, isExpanded, excerpts, onToggle, onFlag, onComplete, onDelete,
    onStyleChange, style: itemStyle, size, className,
    isDragging, isDragOver, canDrop,
    onDragStart, onDragOver, onDrop, onDragEnd,
}) => {
    const isFlagged = size === 'flagged';
    const isSmall = size === 'sm';
    const draggable = !!onDragStart;
    const [stylerOpen, setStylerOpen] = useState(false);
    const stylerRef = useRef<HTMLDivElement>(null);

    // Close styler when clicking outside
    useEffect(() => {
        if (!stylerOpen) return;
        const handler = (e: MouseEvent) => {
            if (stylerRef.current && !stylerRef.current.contains(e.target as Node)) {
                setStylerOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [stylerOpen]);

    const colorBg = getColorBg(itemStyle.color);
    const textureStyle = getTextureStyle(itemStyle.texture);

    const borderRadius = '14px';
    const padding = '14px';

    return (
        <LiquidGlassCard
            className={`
                group select-none text-left flex flex-col justify-between
                ${isExpanded ? 'ring-2 ring-slate-900/10 z-20 col-span-full' : 'h-full min-h-[140px]'}
                ${isDragOver && canDrop ? 'ring-2 ring-slate-900/30' : ''}
                ${isDragging ? 'opacity-40' : ''}
                ${draggable && !isExpanded ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                ${className ?? ''}
            `}
            borderRadius={borderRadius}
            blurIntensity="xl"
            shadowIntensity={isFlagged ? 'md' : 'sm'}
            glowIntensity="xs"
            style={{ background: colorBg, ...textureStyle, padding }}
            draggable={draggable}
            onDragStart={onDragStart ? (e) => { e.stopPropagation(); onDragStart(); } : undefined}
            onDragOver={onDragOver ? (e) => { e.stopPropagation(); onDragOver(e); } : undefined}
            onDrop={onDrop ? (e) => { e.stopPropagation(); onDrop(); } : undefined}
            onDragEnd={onDragEnd}
            onClick={onToggle}
        >
            <div className="flex flex-col gap-2">
                {/* ── Top: Title + repeat badge ── */}
                <p className={`
                    tracking-tight text-slate-950 font-medium leading-[1.4]
                    ${isSmall ? 'text-[12px]' : 'text-[17px]'}
                    ${item.isCompleted ? 'line-through opacity-40' : ''}
                `}>
                    {item.label}
                </p>

                {item.mentionCount > 1 && !isExpanded && (
                    <div className="flex items-center gap-1.5">
                        <div
                            className="h-1 w-1 rounded-full shrink-0"
                            style={{ background: COLOR_OPTIONS.find(c => c.key === itemStyle.color)?.dot ?? '#cbd5e1' }}
                        />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.12em]">
                            {item.mentionCount}×
                        </span>
                    </div>
                )}
            </div>

            {/* ── Bottom: Icons grouped ── */}
            {!isExpanded && (
                <div className="flex items-center gap-1 mt-auto -ml-1.5">
                    {/* Complete Button */}
                    <button
                        onClick={onComplete}
                        className={`p-1.5 rounded-xl transition-all active:scale-95 ${
                            item.isCompleted ? 'text-emerald-600' : 'text-slate-950'
                        }`}
                        title={item.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                    >
                        {item.isCompleted ? <CheckSolid className="w-5 h-5" /> : <CheckOutline className="w-5 h-5" />}
                    </button>

                    {/* Flag Button */}
                    <button
                        onClick={onFlag}
                        className={`p-1.5 rounded-xl transition-all active:scale-90 ${
                            item.isFlagged ? 'text-amber-600' : 'text-slate-950'
                        }`}
                        title={item.isFlagged ? 'Unflag' : 'Flag'}
                    >
                        {item.isFlagged ? <FlagSolid className="w-5 h-5" /> : <FlagOutline className="w-5 h-5" />}
                    </button>

                    {/* Style Button */}
                    <div className="relative" ref={stylerRef}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setStylerOpen(v => !v); }}
                            className={`p-1.5 rounded-xl transition-all active:scale-90 ${
                                stylerOpen ? 'bg-slate-900/10 text-slate-950' : 'text-slate-950'
                            }`}
                            title="Style"
                        >
                            <SwatchIcon className="w-5 h-5" />
                        </button>

                        {stylerOpen && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-0 bottom-full mb-2 z-50 p-3 rounded-2xl shadow-xl border border-white/40"
                                style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', minWidth: 188 }}
                            >
                                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 mb-2">Color</p>
                                <div className="flex gap-1.5 flex-wrap mb-3">
                                    {COLOR_OPTIONS.map(c => (
                                        <button
                                            key={c.key}
                                            onClick={() => onStyleChange({ color: c.key })}
                                            title={c.label}
                                            className="w-6 h-6 rounded-full transition-all active:scale-90 hover:scale-110"
                                            style={{
                                                background: c.dot,
                                                outline: itemStyle.color === c.key ? '2px solid #0f172a' : '2px solid transparent',
                                                outlineOffset: 2,
                                            }}
                                        />
                                    ))}
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 mb-2">Texture</p>
                                <div className="flex gap-1.5">
                                    {TEXTURE_OPTIONS.map(t => (
                                        <button
                                            key={t.key}
                                            onClick={() => onStyleChange({ texture: t.key })}
                                            title={t.label}
                                            className="w-9 h-7 rounded-lg text-[10px] font-bold text-slate-500 transition-all active:scale-90"
                                            style={{
                                                ...t.pattern,
                                                background: t.key === 'none' ? 'rgba(255,255,255,0.8)' : undefined,
                                                outline: itemStyle.texture === t.key ? '2px solid #0f172a' : '2px solid rgba(15,23,42,0.10)',
                                                outlineOffset: 1,
                                            }}
                                        >
                                            {t.key === 'none' ? '—' : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Delete Button (grouped last) */}
                    <button
                        onClick={onDelete}
                        className="p-1.5 rounded-xl text-slate-950 hover:text-red-600 transition-all active:scale-90"
                        title="Delete"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* ── Expanded detail ── */}
            {isExpanded && (
                <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-10 mb-6 pb-5 border-b border-slate-100/60">
                        <div>
                            <span className="block text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Frequency</span>
                            <span className="text-base font-black text-slate-950">{item.mentionCount} sightings</span>
                        </div>
                        <div>
                            <span className="block text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Last Noted</span>
                            <span className="text-base font-black text-slate-950">{new Date(item.lastMentionedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <span className="block text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Original Thoughts</span>
                        {excerpts.length > 0 ? excerpts.map(ex => (
                            <div key={ex.id} className="rounded-2xl p-4 italic text-slate-800 text-[14px] leading-relaxed relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.35)' }}>
                                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full bg-slate-900/10" />
                                "{ex.rawExcerpt}"
                            </div>
                        )) : (
                            <p className="text-sm text-slate-500 italic px-2">No excerpts yet.</p>
                        )}
                    </div>
                    <div className="mt-8 flex items-center justify-between">
                        <button
                            onClick={onDelete}
                            className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors"
                        >
                            Delete Forever
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggle(); }}
                            className="bg-black/[0.05] text-slate-600 hover:bg-black/[0.09] font-bold text-[11px] uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all active:scale-95"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </LiquidGlassCard>
    );
};
