import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Item, DumpItem } from '../types';
import { databaseService } from '../services/databaseService';

import {
    FlagIcon as FlagOutline,
    CheckCircleIcon as CheckOutline,
    SwatchIcon,
} from '@heroicons/react/24/outline';
import {
    FlagIcon as FlagSolid,
    CheckCircleIcon as CheckSolid,
    SparklesIcon,
} from '@heroicons/react/24/solid';

// ── Style system ────────────────────────────────────────────────────────────

type ColorKey = 'default' | 'rose' | 'amber' | 'emerald' | 'violet' | 'sky' | 'slate' | 'aurora';
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
    { key: 'aurora',  label: 'Aurora',  bg: '#0e131f',                 dot: 'linear-gradient(135deg, #ac5cff, #38bdf8)' },
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

// ── TilesHub ───────────────────────────────────────────────────────────

interface TilesHubProps {
    setActiveTab: (tab: string) => void;
}

export const TilesHub: React.FC<TilesHubProps> = ({ setActiveTab }) => {
    const [items, setItems] = useState<Item[]>([]);
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [excerpts, setExcerpts] = useState<Record<string, DumpItem[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [itemStyles, setItemStyles] = useState<Record<string, ItemStyle>>(loadStyles);

    const [showCompleted, setShowCompleted] = useState(false);

    // Drag state
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [draggedGroup, setDraggedGroup] = useState<number | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    // Undo-delete state
    const [pendingDeletes, setPendingDeletes] = useState<Map<string, { item: Item }>>(new Map());
    const pendingDeleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    useEffect(() => {
        return () => { pendingDeleteTimers.current.forEach(clearTimeout); };
    }, []);

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

    const handleDelete = useCallback((e: React.MouseEvent, item: Item) => {
        e.stopPropagation();
        if (pendingDeleteTimers.current.has(item.id)) {
            clearTimeout(pendingDeleteTimers.current.get(item.id)!);
        }
        const timer = setTimeout(async () => {
            await databaseService.deleteItem(item.id);
            pendingDeleteTimers.current.delete(item.id);
            setPendingDeletes(prev => { const next = new Map(prev); next.delete(item.id); return next; });
            setItems(prev => prev.filter(i => i.id !== item.id));
        }, 5000);
        pendingDeleteTimers.current.set(item.id, timer);
        setPendingDeletes(prev => new Map(prev).set(item.id, { item }));
        setExpandedItemId(null);
    }, []);

    const handleUndoDelete = useCallback((itemId: string) => {
        if (pendingDeleteTimers.current.has(itemId)) {
            clearTimeout(pendingDeleteTimers.current.get(itemId)!);
            pendingDeleteTimers.current.delete(itemId);
        }
        setPendingDeletes(prev => { const next = new Map(prev); next.delete(itemId); return next; });
    }, []);

    const handleLabelChange = useCallback((itemId: string, newLabel: string) => {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, label: newLabel } : i));
    }, []);

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

    const displayItems = items.filter(i => !pendingDeletes.has(i.id));
    const flagged   = displayItems.filter(i => !i.isCompleted && i.isFlagged);
    const active    = displayItems.filter(i => !i.isCompleted && !i.isFlagged && (now - i.lastMentionedAt < fourteenDaysMs));
    const completed = displayItems.filter(i => i.isCompleted);
    const faded     = displayItems.filter(i => !i.isCompleted && !i.isFlagged && (now - i.lastMentionedAt >= fourteenDaysMs));

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
                <p className="text-[#1a1a1a] font-normal text-[17px] leading-[1.75] mb-4">Your head is empty (for now).</p>
                <button
                    onClick={() => setActiveTab('dump')}
                    className="text-[#1a1a1a] font-bold text-[17px] leading-[1.75] border-b border-[#1a1a1a] pb-0.5 hover:opacity-70 transition-opacity"
                >
                    Start a dump
                </button>
            </div>
        );
    }

    const maxMentionCount = Math.max(...[...active, ...flagged].map(i => i.mentionCount), 1);

    const tileProps = (item: Item, size: 'flagged' | 'lg' | 'md' | 'sm', extraClass?: string) => {
        const count = item.mentionCount;
        let colSpan: string;
        if (count === 1)      colSpan = 'col-span-3';
        else if (count === 2) colSpan = 'col-span-6';
        else                  colSpan = 'col-span-9';

        const aspectRatio = count === 1 ? '1 / 1' : count === 2 ? '2 / 1' : '3 / 1';

        return {
            item,
            isExpanded: expandedItemId === item.id,
            excerpts: excerpts[item.id] || [],
            onToggle: () => toggleExpand(item.id),
            onFlag: (e: React.MouseEvent) => handleToggleFlag(e, item),
            onComplete: (e: React.MouseEvent) => handleToggleComplete(e, item),
            onDelete: (e: React.MouseEvent) => handleDelete(e, item),
            onLabelChange: (newLabel: string) => handleLabelChange(item.id, newLabel),
            onStyleChange: (patch: Partial<ItemStyle>) => handleStyleChange(item.id, patch),
            style: itemStyles[item.id] ?? { color: 'default' as ColorKey, texture: 'none' as TextureKey },
            size,
            aspectRatio,
            className: `${colSpan} ${extraClass ?? ''}`,
        };
    };

    return (
        <div className="max-w-3xl mx-auto w-full pb-24 animate-in fade-in duration-700">

            {/* ── Flagged ─────────────────────────────────────────────── */}
            {flagged.length > 0 && (
                <section className="mb-12">
                    <div className="mb-5 mx-1 pb-3 border-b border-slate-100/60">
                        <div className="flex items-center gap-2 mb-1">
                            <SparklesIcon className="w-4 h-4 text-rose-400" />
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Flagged ({flagged.length})</span>
                        </div>
                        <h2 className="text-xl font-medium tracking-tight text-slate-900">Needs your attention.</h2>
                    </div>
                    <div className="grid grid-cols-9 gap-1 auto-rows-min">
                        {flagged.map(item => (
                            <ItemTile
                                key={item.id}
                                {...tileProps(item, 'md')}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Active — grouped by mentionCount, draggable within group ── */}
            <section className="mb-12">
                <div className="mb-5 mx-1 pb-3 border-b border-slate-100/60">
                    <div className="flex items-center gap-2 mb-1">
                        <SparklesIcon className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Tasks ({active.length})</span>
                    </div>
                    <h2 className="text-xl font-medium tracking-tight text-slate-900">Phew...Here's all your stuff.</h2>
                </div>
                <div className="grid grid-cols-9 gap-1 auto-rows-min">
                    {activeGroups.flatMap(({ items: groupItems }) =>
                        groupItems.map(item => (
                            <ItemTile
                                key={item.id}
                                {...tileProps(item, 'md')}
                                isDragging={draggedId === item.id}
                                isDragOver={dragOverId === item.id}
                                canDrop={draggedGroup === item.mentionCount}
                                onDragStart={() => handleDragStart(item.id, item.mentionCount)}
                                onDragOver={(e: React.DragEvent) => handleDragOver(e, item.id, item.mentionCount)}
                                onDrop={() => handleDrop(item.id, item.mentionCount)}
                                onDragEnd={handleDragEnd}
                            />
                        ))
                    )}
                </div>
            </section>

            {/* ── Completed / Faded ───────────────────────────────────── */}
            {(completed.length > 0 || faded.length > 0) && (
                <section>
                    <button
                        onClick={() => setShowCompleted(v => !v)}
                        className="w-full mb-4 mx-1 pb-3 border-b border-slate-100/60 opacity-50 grayscale text-left flex items-center justify-between"
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <SparklesIcon className="w-4 h-4 text-slate-400" />
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Resolved ({completed.length + faded.length})</span>
                            </div>
                            <h2 className="text-xl font-medium tracking-tight text-slate-900">Done and dusted.</h2>
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 shrink-0 mr-1">
                            {showCompleted ? 'Hide' : 'Show'}
                        </span>
                    </button>

                    {showCompleted && (
                        <div className="flex flex-col gap-1.5">
                            {[...completed, ...faded].map(item => (
                                <CompletedRow
                                    key={item.id}
                                    item={item}
                                    onComplete={(e) => handleToggleComplete(e, item)}
                                    onDelete={(e) => handleDelete(e, item)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}
            {/* Undo-delete toast */}
            {pendingDeletes.size > 0 && (
                <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-950/90 text-white shadow-xl backdrop-blur-sm animate-in slide-in-from-bottom-4 fade-in duration-300 whitespace-nowrap">
                    <span className="text-[13px] font-medium">
                        {pendingDeletes.size === 1 ? 'Item deleted' : `${pendingDeletes.size} items deleted`}
                    </span>
                    <button
                        onClick={() => [...pendingDeletes.keys()].forEach(handleUndoDelete)}
                        className="text-[13px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        Undo
                    </button>
                </div>
            )}
        </div>
    );
};

// ── CompletedRow ─────────────────────────────────────────────────────────────

interface CompletedRowProps {
    item: Item;
    onComplete: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
}

const CompletedRow: React.FC<CompletedRowProps> = ({ item, onComplete, onDelete }) => (
    <div className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl border border-black/70 bg-white/40 opacity-50">
        <button onClick={onComplete} className="shrink-0 text-emerald-600 active:scale-95 transition-all">
            <CheckSolid className="w-3.5 h-3.5" />
        </button>
        <span className="flex-1 text-[12px] font-semibold text-slate-800 line-through truncate">
            {item.label}
        </span>
        <button onClick={onDelete} className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-red-400 active:scale-95 transition-all">
            Delete
        </button>
    </div>
);

// ── ItemTile ────────────────────────────────────────────────────────────────

interface ItemTileProps {
    item: Item;
    isExpanded: boolean;
    excerpts: DumpItem[];
    onToggle: () => void;
    onFlag: (e: React.MouseEvent) => void;
    onComplete: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onLabelChange?: (newLabel: string) => void;
    onStyleChange: (patch: Partial<ItemStyle>) => void;
    style: ItemStyle;
    size: 'flagged' | 'lg' | 'md' | 'sm';
    aspectRatio?: string;
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
    onLabelChange, onStyleChange, style: itemStyle, size, aspectRatio, className,
    isDragging, isDragOver, canDrop,
    onDragStart, onDragOver, onDrop, onDragEnd,
}) => {
    const isFlagged = size === 'flagged';
    const isSmall = size === 'sm';
    const draggable = !!onDragStart;
    const [stylerOpen, setStylerOpen] = useState(false);
    const stylerRef = useRef<HTMLDivElement>(null);
    const [draftLabel, setDraftLabel] = useState(item.label);

    useEffect(() => { setDraftLabel(item.label); }, [item.label]);

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

    const borderRadius = '10px';
    const padding = '8px';

    return (
        <div
            className={`
                relative overflow-${stylerOpen ? 'visible' : 'hidden'} group select-none text-left flex flex-col justify-between
                ${isExpanded ? 'border border-black/70 z-20 col-span-full shadow-lg' : 'border border-black/70 shadow-sm'}
                ${isDragOver && canDrop ? 'ring-[3px] ring-slate-900' : ''}
                ${isDragging ? 'opacity-40' : ''}
                ${draggable && !isExpanded ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                rounded-[10px] bg-white text-slate-900
                ${className ?? ''}
            `}
            style={{
                background: colorBg,
                ...textureStyle,
                padding,
                ...(isExpanded ? {} : { aspectRatio })
            }}
            draggable={draggable}
            onDragStart={onDragStart ? (e) => { e.stopPropagation(); onDragStart(); } : undefined}
            onDragOver={onDragOver ? (e) => { e.stopPropagation(); onDragOver(e); } : undefined}
            onDrop={onDrop ? (e) => { e.stopPropagation(); onDrop(); } : undefined}
            onDragEnd={onDragEnd}
            onClick={onToggle}
        >

            <div className="flex flex-col gap-2">
                {/* ── Top: Complete button + Title ── */}
                <div className="flex items-start gap-1.5">
                    <button
                        onClick={onComplete}
                        className={`shrink-0 mt-0.5 transition-all active:scale-95 ${
                            item.isCompleted
                                ? (itemStyle.color === 'aurora' ? 'text-emerald-400' : 'text-emerald-600')
                                : (itemStyle.color === 'aurora' ? 'text-white/40 hover:text-white' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]')
                        }`}
                        title={item.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                    >
                        {item.isCompleted ? <CheckSolid className="w-3.5 h-3.5" /> : <CheckOutline className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded ? (
                        <textarea
                            value={draftLabel}
                            onChange={e => setDraftLabel(e.target.value)}
                            onBlur={() => { if (draftLabel.trim() && draftLabel !== item.label) onLabelChange?.(draftLabel.trim()); }}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
                            onClick={e => e.stopPropagation()}
                            rows={2}
                            className={`
                                w-full bg-transparent border-none resize-none
                                tracking-tight font-normal leading-[1.75] text-[16px]
                                ${itemStyle.color === 'aurora' ? 'text-white' : 'text-[#1a1a1a]'}
                                focus:outline-none focus:ring-0
                                ${item.isCompleted ? 'line-through opacity-40' : ''}
                            `}
                            style={{ padding: 0 }}
                        />
                    ) : (
                        <p className={`
                            tracking-tight font-semibold leading-snug
                            ${itemStyle.color === 'aurora' ? 'text-white' : 'text-slate-800'}
                            ${isSmall ? 'text-[11px]' : 'text-[12px]'}
                            ${item.isCompleted ? 'line-through opacity-40' : ''}
                        `}>
                            {item.label}
                        </p>
                    )}
                </div>

                {/* ── Mention Count Pill (Airy style) ── */}
                {item.mentionCount > 1 && !isExpanded && (
                    <div className="flex items-center mt-1">
                        <div className={`backdrop-blur-sm border-2 px-2 py-0.5 rounded-full flex items-center gap-1.5 ${itemStyle.color === 'aurora' ? 'bg-black/40 border-white/10' : 'bg-white/40 border-black/5'}`}>
                            <div
                                className="h-1 w-1 rounded-full shrink-0"
                                style={{ background: COLOR_OPTIONS.find(c => c.key === itemStyle.color)?.dot ?? '#cbd5e1' }}
                            />
                            <span className={`text-[10px] font-medium tracking-tight ${itemStyle.color === 'aurora' ? 'text-white/60' : 'text-[#1a1a1a]/60'}`}>
                                {item.mentionCount}×
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Bottom: Icons grouped (Detached/Absolute) ── */}
            {!isExpanded && (
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0">
                    {/* Flag Button */}
                    <button
                        onClick={onFlag}
                        className={`p-1.5 rounded-xl transition-all active:scale-90 ${
                            item.isFlagged
                                ? (itemStyle.color === 'aurora' ? 'text-amber-400' : 'text-amber-600')
                                : (itemStyle.color === 'aurora' ? 'text-white/40 hover:text-white' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]')
                        }`}
                        title={item.isFlagged ? 'Unflag' : 'Flag'}
                    >
                        {item.isFlagged ? <FlagSolid className="w-4 h-4" /> : <FlagOutline className="w-4 h-4" />}
                    </button>

                    {/* Style Button */}
                    <div className="relative" ref={stylerRef}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setStylerOpen(v => !v); }}
                            className={`p-1.5 rounded-xl transition-all active:scale-90 ${
                                stylerOpen
                                    ? (itemStyle.color === 'aurora' ? 'bg-white/10 text-white' : 'bg-[#1a1a1a]/10 text-[#1a1a1a]')
                                    : (itemStyle.color === 'aurora' ? 'text-white/40 hover:text-white' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]')
                            }`}
                            title="Style"
                        >
                            <SwatchIcon className="w-4 h-4" />
                        </button>

                        {stylerOpen && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-0 bottom-full mb-2 z-50 p-3 rounded-2xl shadow-xl border-2 border-white/40"
                                style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', minWidth: 188 }}
                            >
                                <p className="text-[11px] font-medium text-[#1a1a1a] leading-[1.75] mb-2 opacity-50 uppercase tracking-widest">Color</p>
                                <div className="flex gap-1.5 flex-wrap mb-3">
                                    {COLOR_OPTIONS.map(c => (
                                        <button
                                            key={c.key}
                                            onClick={() => onStyleChange({ color: c.key })}
                                            title={c.label}
                                            className="w-6 h-6 rounded-full transition-all active:scale-90 hover:scale-110"
                                            style={{
                                                background: c.dot,
                                                outline: itemStyle.color === c.key ? '2px solid #1a1a1a' : '2px solid transparent',
                                                outlineOffset: 2,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* ── Expanded detail ── */}
            {isExpanded && (
                <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-10 mb-6 pb-5 border-b border-slate-100/60">
                        <div>
                            <span className="block text-[9px] font-medium uppercase text-slate-400 tracking-widest mb-1">Frequency</span>
                            <span className="text-base font-medium text-[#1a1a1a]">{item.mentionCount} sightings</span>
                        </div>
                        <div>
                            <span className="block text-[9px] font-medium uppercase text-slate-400 tracking-widest mb-1">Last Noted</span>
                            <span className="text-base font-medium text-[#1a1a1a]">{new Date(item.lastMentionedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <span className="block text-[9px] font-medium uppercase text-slate-400 tracking-widest mb-2">Original Thoughts</span>
                        {excerpts.length > 0 ? excerpts.map(ex => (
                            <div key={ex.id} className="rounded-2xl p-4 italic text-[#1a1a1a] text-[14px] leading-relaxed relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(15,23,42,0.1)' }}>
                                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full bg-slate-900/10" />
                                "{ex.rawExcerpt}"
                            </div>
                        )) : (
                            <p className="text-sm text-slate-400 italic px-2">No excerpts yet.</p>
                        )}
                    </div>
                    <div className="mt-8 flex items-center justify-between">
                        <button
                            onClick={onDelete}
                            className="text-[10px] font-medium uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors"
                        >
                            Delete Forever
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggle(); }}
                            className="bg-black/[0.05] text-[#1a1a1a]/60 hover:bg-black/[0.09] font-medium text-[11px] uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all active:scale-95"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
