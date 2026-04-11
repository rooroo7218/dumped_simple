import React, { useState, useRef } from 'react';
import { ActionItem, MemoryItem } from '../types';
import { TaskBucket } from './TaskBucket';
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy,
    useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { Bars3Icon } from '@heroicons/react/24/outline';

interface TasksHubProps {
    memories: MemoryItem[];
    activeTab: string;
    allCategories: string[];
    groupedTasks: Record<string, { memoryId: string; task: ActionItem }[]>;
    themeClasses: any;
    toggleTask: (e: React.MouseEvent, memoryId: string, task: ActionItem) => void;
    setSelectedTask: (val: { memoryId: string; taskId: string } | null) => void;
    findDuplicateTasks: (tasks: ActionItem[]) => Promise<any[]>;
    handleDeleteTask: (memoryId: string, text: string) => void;
    clearAllTasks: () => void;
    isCheckingDuplicates: boolean;
    setIsCheckingDuplicates: (val: boolean) => void;
    setDuplicateGroups: (groups: any[]) => void;
    setIsCleanupModalOpen: (val: boolean) => void;
    updateTaskDetails: (memoryId: string, taskId: string, updates: Partial<ActionItem>) => void;
    addCustomCategory: (category: string) => void;
    deleteCategory: (category: string, deleteTasks: boolean) => void;
    exportAppData: () => string;
    importAppData: (json: string) => Promise<boolean>;
    reorderCategories: (categories: string[]) => void;
    addManualTask: (text: string, category: string, effort?: 'low' | 'medium' | 'high') => void;
    rankedTasks?: ActionItem[];
    reorderTasks?: (items: { id: string; globalOrder?: number }[]) => void;

    activeDragBatchId?: string | null;
    maybeLaterIds?: string[];
    onMaybeLater?: (id: string) => void;
    onRestoreMaybeLater?: (id: string) => void;
}

const DEFAULT_CONTEXTS = ["Need Car", "At Computer", "On Phone", "Around the House", "Low Mental Load"];

export const TasksHub: React.FC<TasksHubProps> = ({
    memories,
    allCategories,
    groupedTasks,
    themeClasses,
    toggleTask,
    setSelectedTask,
    findDuplicateTasks,
    handleDeleteTask,
    clearAllTasks,
    isCheckingDuplicates,
    setIsCheckingDuplicates,
    setDuplicateGroups,
    setIsCleanupModalOpen,
    updateTaskDetails,
    addCustomCategory,
    deleteCategory,
    reorderCategories,
    addManualTask,
    rankedTasks = [],
    reorderTasks,

    exportAppData,
    importAppData,
    activeDragBatchId,
    maybeLaterIds = [],
    onMaybeLater,
    onRestoreMaybeLater,
}) => {
    const [viewMode, setViewMode] = React.useState<'category' | 'context' | 'list'>('category');
    const [showCategoryInput, setShowCategoryInput] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const categoryInputRef = useRef<HTMLInputElement>(null);

    const handleAddCategory = () => {
        if (newCategoryName.trim()) {
            addCustomCategory(newCategoryName.trim());
        }
        setNewCategoryName('');
        setShowCategoryInput(false);
    };

    // Collect parked tasks from all memories (preserving memoryId for actions)
    const maybeLaterItems = React.useMemo(() => {
        const items: { memoryId: string; task: ActionItem }[] = [];
        memories.forEach(m => {
            (m.actions || []).forEach(action => {
                if (!action.completed && maybeLaterIds.includes(action.id)) {
                    items.push({ memoryId: m.id, task: action });
                }
            });
        });
        return items;
    }, [memories, maybeLaterIds]);

    // Grouping Logic — parked tasks are excluded from regular columns
    const derivedGroupedTasks = React.useMemo(() => {
        const filterParked = (items: { memoryId: string; task: ActionItem }[]) =>
            items.filter(({ task }) => !maybeLaterIds.includes(task.id));

        if (viewMode === 'category') {
            const filtered: Record<string, { memoryId: string; task: ActionItem }[]> = {};
            Object.entries(groupedTasks).forEach(([cat, items]) => {
                filtered[cat] = filterParked(items as { memoryId: string; task: ActionItem }[]);
            });
            return filtered;
        }

        const contextGroups: Record<string, { memoryId: string; task: ActionItem }[]> = {};
        const allContextsSet = new Set<string>();

        memories.forEach(m => {
            (m.actions || []).forEach(action => {
                if (action.completed || maybeLaterIds.includes(action.id)) return;

                const contexts = action.contextTags && action.contextTags.length > 0
                    ? action.contextTags
                    : ['Uncategorized Context'];

                contexts.forEach(ctx => {
                    if (!contextGroups[ctx]) contextGroups[ctx] = [];
                    contextGroups[ctx].push({ memoryId: m.id, task: action });
                    allContextsSet.add(ctx);
                });
            });
        });

        return contextGroups;
    }, [viewMode, groupedTasks, memories, maybeLaterIds]);

    const displayedCategories = React.useMemo(() => {
        const activeKeys = Object.keys(derivedGroupedTasks);
        if (viewMode === 'context') {
            const combined = [...DEFAULT_CONTEXTS];
            activeKeys.forEach(k => {
                if (!combined.includes(k)) combined.push(k);
            });
            return combined;
        }

        // For category view, start with default order but append any others found
        const combined = new Set(allCategories);
        activeKeys.forEach(k => combined.add(k));
        return Array.from(combined);
    }, [viewMode, allCategories, derivedGroupedTasks]);

    // ── List view state ──
    const listSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    // Active tasks sorted for list view: by globalOrder (set by user drag), then fallback to rankedTasks order
    const listTasks = React.useMemo(() => {
        const active = rankedTasks.filter(t => !t.completed && !maybeLaterIds.includes(t.id));
        const hasGlobalOrder = active.some(t => t.globalOrder != null);
        if (hasGlobalOrder) {
            return [...active].sort((a, b) => (b.globalOrder ?? 0) - (a.globalOrder ?? 0));
        }
        return active;
    }, [rankedTasks, maybeLaterIds]);

    const [listOrder, setListOrder] = React.useState<string[]>(() => listTasks.map(t => t.id));

    // Keep listOrder in sync when tasks change
    React.useEffect(() => {
        setListOrder(prev => {
            const newIds = listTasks.map(t => t.id);
            const kept = prev.filter(id => newIds.includes(id));
            const added = newIds.filter(id => !prev.includes(id));
            return [...kept, ...added];
        });
    }, [listTasks.map(t => t.id).join(',')]);

    function handleListDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setListOrder(prev => {
            const oldIdx = prev.indexOf(active.id as string);
            const newIdx = prev.indexOf(over.id as string);
            const next = arrayMove(prev, oldIdx, newIdx);
            // Persist: highest index = highest globalOrder
            if (reorderTasks) {
                const updates = next.map((id, i) => ({ id, globalOrder: next.length - i }));
                reorderTasks(updates);
            }
            return next;
        });
    }

    const orderedListTasks = listOrder
        .map(id => listTasks.find(t => t.id === id))
        .filter((t): t is ActionItem => !!t);

    return (
        <section className="animate-in fade-in space-y-4">
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <SparklesIcon className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Tasks</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Phew...Here's all the stuff that was in your head.</h2>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex flex-col gap-1.5 font-['Plus_Jakarta_Sans']">
                    {/* View Mode Toggle */}
                    <div className="flex gap-1 p-0.5 bg-slate-800/10 backdrop-blur-sm rounded-full w-fit border border-slate-300">
                        {(['category', 'context', 'list'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1 text-[10px] font-semibold rounded-full transition-all capitalize ${viewMode === mode
                                    ? 'bg-slate-800 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-600'
                                }`}
                            >
                                {mode === 'list' ? 'List' : mode === 'category' ? 'Categories' : 'Contexts'}
                            </button>
                        ))}
                    </div>
                    {viewMode === 'context' && (
                        <p className="text-[10px] font-medium opacity-40 ml-2 animate-in slide-in-from-left-2 text-slate-900">
                            Where & When / Situational Availability
                        </p>
                    )}
                </div>

                <div className="flex gap-1.5 w-full md:w-auto flex-wrap">
                    {showCategoryInput ? (
                        <div className="flex items-center gap-1.5 bg-white/80 border border-slate-300 rounded-xl px-2 py-1">
                            <input
                                ref={categoryInputRef}
                                autoFocus
                                type="text"
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddCategory();
                                    if (e.key === 'Escape') { setShowCategoryInput(false); setNewCategoryName(''); }
                                }}
                                placeholder="Category name…"
                                className="w-32 bg-transparent border-none outline-none text-[11px] font-semibold text-slate-700 placeholder:text-slate-400"
                            />
                            <button onClick={handleAddCategory} className="text-[11px] font-bold text-slate-600 hover:text-slate-900 px-1">Add</button>
                            <button onClick={() => { setShowCategoryInput(false); setNewCategoryName(''); }} className="text-[11px] text-slate-400 hover:text-slate-500 px-0.5">✕</button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowCategoryInput(true)}
                            className="px-4 py-2 bg-white/60 border border-slate-400 text-slate-600 text-[11px] font-semibold rounded-xl hover:bg-white/80 hover:border-slate-600 active:scale-95 transition-all"
                        >
                            + Category
                        </button>
                    )}
                    <button
                        onClick={async () => {
                            setIsCheckingDuplicates(true);
                            const allTasks = memories
                                .flatMap(m => m.actions || [])
                                .filter(t => !t.completed);

                            const dups = await findDuplicateTasks(allTasks);
                            setDuplicateGroups(dups);
                            setIsCleanupModalOpen(true);
                            setIsCheckingDuplicates(false);
                        }}
                        disabled={isCheckingDuplicates}
                        className="px-4 py-2 bg-white/60 border border-slate-400 text-slate-600 text-[11px] font-semibold rounded-xl hover:bg-white/80 hover:border-slate-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isCheckingDuplicates ? 'Scanning...' : 'Clean Up'}
                    </button>

                </div>
            </div>

            {viewMode === 'list' && (
                <DndContext sensors={listSensors} collisionDetection={closestCenter} onDragEnd={handleListDragEnd}>
                    <SortableContext items={listOrder} strategy={verticalListSortingStrategy}>
                        <div className="space-y-0.5 pb-32 max-w-2xl">
                            {orderedListTasks.map((task, idx) => (
                                <SortableListRow
                                    key={task.id}
                                    task={task}
                                    idx={idx}
                                    card={themeClasses.card}
                                    onOpen={() => setSelectedTask({
                                        memoryId: memories.find(m => m.actions?.some(a => a.id === task.id))?.id ?? '',
                                        taskId: task.id,
                                    })}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {viewMode !== 'list' && <div className="flex flex-col md:flex-row gap-1.5 pb-4 md:items-stretch md:h-[70vh] md:overflow-x-auto no-scrollbar w-full">
                <SortableContext items={displayedCategories} strategy={horizontalListSortingStrategy}>
                    {displayedCategories.map(bucket => {
                        const items = derivedGroupedTasks[bucket] || [];
                        return (
                            <TaskBucket
                                key={bucket}
                                bucket={bucket}
                                items={items}
                                themeClasses={themeClasses}
                                toggleTask={toggleTask}
                                setSelectedTask={setSelectedTask}
                                memories={memories}
                                updateTaskDetails={updateTaskDetails}
                                deleteCategory={deleteCategory}
                                activeDragBatchId={activeDragBatchId}
                                onAddTask={(text) => addManualTask(text, bucket)}
                                maybeLaterIds={maybeLaterIds}
                                onMaybeLater={onMaybeLater}
                                onRestoreMaybeLater={onRestoreMaybeLater}
                            />
                        );
                    })}
                </SortableContext>

                {/* Maybe Later column — greyed out, outside sortable context */}
                {maybeLaterItems.length > 0 && (
                    <div className="w-full md:w-[280px] md:shrink-0 flex flex-col md:h-full opacity-50">
                        <header className="px-3 py-2.5 mx-1 flex items-center gap-2 shrink-0 border-2 border-black rounded-xl mb-0.5 bg-white/85">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                                <path d="M5 17H3V9l2.5-5h11L19 9v8h-2" />
                                <path d="M3 9h16" />
                                <circle cx="7.5" cy="17" r="1.5" />
                                <circle cx="16.5" cy="17" r="1.5" />
                                <path d="M9 17h6" />
                            </svg>
                            <h3 className="font-bold text-sm">Maybe Later</h3>
                            <span className="text-[11px] font-semibold opacity-50">{maybeLaterItems.length}</span>
                        </header>
                        <div className="md:flex-1 md:min-h-0 md:overflow-y-auto px-1 py-1 space-y-1.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {maybeLaterItems.map(({ memoryId, task }) => (
                                <div
                                    key={task.id}
                                    onClick={() => setSelectedTask({ memoryId, taskId: task.id })}
                                    className={`group relative px-3 py-2 cursor-pointer h-[72px] overflow-hidden ${themeClasses.card}`}
                                >
                                    <div className="flex gap-3 h-full">
                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <div className="flex items-start gap-1.5">
                                                <span className="text-[13px] font-semibold leading-snug flex-1 min-w-0 line-clamp-2">
                                                    {task.text}
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onRestoreMaybeLater?.(task.id); }}
                                                    className="text-sm shrink-0 text-amber-400 opacity-80 hover:opacity-100 transition-opacity"
                                                    title="Restore to active"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]">
                                                        <path d="M5 17H3V9l2.5-5h11L19 9v8h-2" />
                                                        <path d="M3 9h16" />
                                                        <circle cx="7.5" cy="17" r="1.5" />
                                                        <circle cx="16.5" cy="17" r="1.5" />
                                                        <path d="M9 17h6" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
                                                    {task.category}
                                                </span>
                                                {task.urgency > 8 && (
                                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                                                        Urgent
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>}
        </section>
    );
};

// ── Compact sortable row for list view ────────────────────────────────────────

const SortableListRow: React.FC<{
    task: ActionItem;
    idx: number;
    card: string;
    onOpen: () => void;
}> = ({ task, idx, card, onOpen }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
    const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

    return (
        <div ref={setNodeRef} style={style} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${card}`}>
            {/* Drag handle */}
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-20 hover:opacity-60 transition-opacity shrink-0 touch-none">
                <Bars3Icon className="w-3.5 h-3.5" />
            </button>
            {/* Index */}
            <span className="text-[10px] font-semibold tabular-nums text-slate-400 w-4 text-center shrink-0">{idx + 1}</span>
            {/* Main content — clickable */}
            <div className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer" onClick={onOpen}>
                <span className="text-[10px] font-medium text-slate-400 shrink-0 whitespace-nowrap">{task.category}</span>
                <span className="text-slate-200 text-[10px] shrink-0">·</span>
                <p className="text-[13px] font-semibold text-slate-800 truncate leading-snug">{task.text}</p>
            </div>
            {/* Badges */}
            <div className="flex items-center gap-1 shrink-0">
                {task.urgency > 7 && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">Urgent</span>
                )}
                {task.effort === 'low' && (
                    <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">low</span>
                )}
                {task.effort === 'high' && (
                    <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-500">high</span>
                )}
            </div>
        </div>
    );
};
