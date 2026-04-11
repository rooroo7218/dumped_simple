import React, { useState } from 'react';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
    CheckCircleIcon,
    SparklesIcon,
    Bars3Icon,
    ArrowPathIcon,
    TrashIcon,
    ChevronUpIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';

const ParkingLotIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 17H3V9l2.5-5h11L19 9v8h-2" />
        <path d="M3 9h16" />
        <circle cx="7.5" cy="17" r="1.5" />
        <circle cx="16.5" cy="17" r="1.5" />
        <path d="M9 17h6" />
    </svg>
);
import { ActionItem, MemoryItem } from '../types';
import { SortableItem } from './SortableItem';
import { getCategoryIcon } from '../utils/uiUtils';

interface TaskBucketProps {
    bucket: string;
    items: { memoryId: string; task: ActionItem }[];
    themeClasses: any;
    toggleTask: (e: React.MouseEvent, memoryId: string, task: ActionItem) => void;
    setSelectedTask: (val: { memoryId: string; taskId: string } | null) => void;
    memories: MemoryItem[];
    updateTaskDetails: (memoryId: string, taskId: string, updates: Partial<ActionItem>) => void;
    deleteCategory: (category: string, deleteTasks: boolean) => void;
    activeDragBatchId?: string | null;
    onAddTask?: (text: string) => void;
    maybeLaterIds?: string[];
    onMaybeLater?: (id: string) => void;
    onRestoreMaybeLater?: (id: string) => void;
}

export const TaskBucket: React.FC<TaskBucketProps> = ({
    bucket,
    items,
    themeClasses,
    toggleTask,
    setSelectedTask,
    memories,
    updateTaskDetails,
    deleteCategory,
    activeDragBatchId,
    onAddTask,
    maybeLaterIds = [],
    onMaybeLater,
    onRestoreMaybeLater,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: bucket,
        data: { type: 'category', bucket }
    });

    const { setNodeRef: setTasksDropRef, isOver: isTasksOver } = useDroppable({
        id: `drop:${bucket}`,
        data: { type: 'column', bucket },
    });

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [addingTask, setAddingTask] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const Icon = getCategoryIcon(bucket);

    const [isArchiveOpen, setIsArchiveOpen] = React.useState(false);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [canScrollUp, setCanScrollUp] = React.useState(false);
    const [canScrollDown, setCanScrollDown] = React.useState(false);

    const updateScrollIndicators = React.useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollUp(el.scrollTop > 4);
        setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    }, []);

    React.useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        updateScrollIndicators();
        el.addEventListener('scroll', updateScrollIndicators);
        const ro = new ResizeObserver(updateScrollIndicators);
        ro.observe(el);
        return () => { el.removeEventListener('scroll', updateScrollIndicators); ro.disconnect(); };
    }, [updateScrollIndicators, items]);

    const archivedTasks = React.useMemo(() => {
        return memories
            .flatMap(m => m.actions || [])
            .filter(a => a.category === bucket && a.completed);
    }, [memories, bucket]);

    return (
        <div ref={setNodeRef} style={style} className="w-full md:w-[280px] md:shrink-0 flex flex-col md:h-full">
            <div className="flex flex-col md:flex-1 md:overflow-hidden">

                {/* Column Header */}
                <header className="px-3 py-2.5 mx-1 flex items-center justify-between shrink-0 border-2 border-black rounded-xl mb-0.5 bg-white/85">
                    <div className="flex items-center gap-2">
                        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-20 hover:opacity-60 transition-opacity">
                            <Bars3Icon className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-sm">{bucket}</h3>
                        <span className="text-[11px] font-semibold opacity-50">{items.length}</span>
                    </div>
                    {confirmDelete ? (
                        <div className="flex items-center gap-1 animate-in fade-in duration-150">
                            <button
                                onClick={() => { deleteCategory(bucket, false); setConfirmDelete(false); }}
                                className="text-[9px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Keep tasks
                            </button>
                            <button
                                onClick={() => { deleteCategory(bucket, true); setConfirmDelete(false); }}
                                className="text-[9px] font-bold px-2 py-1 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                            >
                                Delete all
                            </button>
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="text-[9px] text-slate-400 hover:text-slate-500 px-1 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="opacity-10 hover:opacity-100 hover:text-rose-500 transition-all p-1"
                            title="Delete Category"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                </header>

                {/* Task List */}
                <div className="relative md:flex-1 md:min-h-0">
                    {canScrollUp && (
                        <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pointer-events-none">
                            <ChevronUpIcon className="w-4 h-4 opacity-30 animate-bounce" />
                        </div>
                    )}
                    {canScrollDown && (
                        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center pointer-events-none">
                            <ChevronDownIcon className="w-4 h-4 opacity-30 animate-bounce" />
                        </div>
                    )}
                    <div ref={(node) => { (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node; setTasksDropRef(node); }} className="h-full overflow-y-auto px-1 py-1 space-y-1.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <SortableContext items={items.map(i => i.task.id)} strategy={verticalListSortingStrategy}>
                            {items.length === 0 ? (
                                <div className={`h-full min-h-[120px] rounded-xl transition-colors ${isTasksOver ? 'bg-slate-100/80 border-2 border-dashed border-slate-400' : ''}`} />
                            ) : (
                                items.map(({ memoryId, task }) => (
                                    <SortableItem key={task.id} id={task.id} useHandle={false} className="mb-0">
                                        {({ attributes, listeners }) => (
                                            <div
                                                {...attributes}
                                                {...listeners}
                                                onClick={() => {
                                                    updateTaskDetails(memoryId, task.id, { viewCount: (task.viewCount || 0) + 1 });
                                                    setSelectedTask({ memoryId, taskId: task.id });
                                                }}
                                                className={`group relative px-3 py-2 transition-all cursor-pointer h-[72px] overflow-hidden ${themeClasses.card} ${task.completed ? 'opacity-40 grayscale' : ''}`}
                                            >
                                                <div className="flex gap-3 h-full">
                                                    {/* Completion button */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleTask(e, memoryId, task); }}
                                                        className={`shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded-full border-2 border-black transition-all ${
                                                            task.completed ? 'bg-black text-white' : 'bg-transparent text-black opacity-40 hover:opacity-80'
                                                        }`}
                                                    >
                                                        <CheckCircleIcon className="w-3 h-3" />
                                                    </button>

                                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                        {/* Title row */}
                                                        <div className="flex items-start gap-1.5">
                                                            <span className={`text-[13px] font-semibold leading-snug flex-1 min-w-0 line-clamp-2 ${task.completed ? 'line-through' : ''}`}>
                                                                {task.text}
                                                            </span>
                                                            {(task.alignmentScore || 0) > 8 && (
                                                                <SparklesIcon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                                            )}
                                                            {/* Star button */}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); updateTaskDetails(memoryId, task.id, { starred: !task.starred }); }}
                                                                className={`text-sm shrink-0 transition-opacity ${task.starred ? 'text-amber-400' : 'opacity-30 hover:opacity-70'}`}
                                                                title={task.starred ? 'Unstar task' : 'Star task'}
                                                            >
                                                                {task.starred ? '★' : '☆'}
                                                            </button>
                                                            {/* Maybe Later button */}
                                                            {!task.completed && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        maybeLaterIds.includes(task.id)
                                                                            ? onRestoreMaybeLater?.(task.id)
                                                                            : onMaybeLater?.(task.id);
                                                                    }}
                                                                    className={`text-sm shrink-0 transition-opacity ${
                                                                        maybeLaterIds.includes(task.id)
                                                                            ? 'text-amber-400 opacity-80 hover:opacity-100'
                                                                            : 'opacity-30 hover:opacity-70 text-slate-500'
                                                                    }`}
                                                                    title={maybeLaterIds.includes(task.id) ? 'Restore to active' : 'Maybe later'}
                                                                >
                                                                    <ParkingLotIcon className="w-[14px] h-[14px]" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Context bubbles row */}
                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                            {task.isNew && (
                                                                <span className="text-[8px] font-black shrink-0 px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                                                                    NEW
                                                                </span>
                                                            )}
                                                            {task.urgency > 8 && (
                                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                                                                    Urgent
                                                                </span>
                                                            )}
                                                            {task.batchId && (
                                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 bg-indigo-100 text-indigo-600">
                                                                    {task.batchId}
                                                                </span>
                                                            )}
                                                            {(task.viewCount || 0) >= 3 && !task.completed && (
                                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-500 shrink-0">
                                                                    Revisit
                                                                </span>
                                                            )}
                                                            {task.contextTags?.slice(0, 2).map(tag => (
                                                                <span key={tag} className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 whitespace-nowrap shrink-0">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </SortableItem>
                                ))
                            )}
                        </SortableContext>

                        {/* Quick-add task */}
                        {onAddTask && (
                            addingTask ? (
                                <input
                                    autoFocus
                                    type="text"
                                    value={newTaskText}
                                    onChange={e => setNewTaskText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            if (newTaskText.trim()) {
                                                onAddTask(newTaskText.trim());
                                                setNewTaskText('');
                                                setAddingTask(false);
                                            }
                                        }
                                        if (e.key === 'Escape') {
                                            setAddingTask(false);
                                            setNewTaskText('');
                                        }
                                    }}
                                    onBlur={() => {
                                        if (!newTaskText.trim()) {
                                            setAddingTask(false);
                                            setNewTaskText('');
                                        }
                                    }}
                                    placeholder="Task name…"
                                    className="border-2 border-dashed border-slate-200 rounded-xl px-3 py-2 mx-1 mt-1 text-[11px] text-slate-700 font-medium bg-transparent outline-none w-[calc(100%-8px)] placeholder:text-slate-400"
                                />
                            ) : (
                                <div
                                    onClick={() => setAddingTask(true)}
                                    className="border-2 border-dashed border-slate-200 rounded-xl px-3 py-2 mx-1 mt-1 text-[11px] text-slate-400 font-medium cursor-pointer hover:border-slate-400 hover:text-slate-500 transition-colors flex items-center gap-1.5"
                                >
                                    <span>+</span>
                                    <span>Add task</span>
                                </div>
                            )
                        )}

                        {/* Completed Archive */}
                        {archivedTasks.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-dashed border-current/10">
                                <button
                                    onClick={() => setIsArchiveOpen(!isArchiveOpen)}
                                    className="w-full flex items-center justify-between opacity-40 hover:opacity-100 transition-opacity px-1"
                                >
                                    <div className="flex items-center gap-2">
                                        <CheckCircleIcon className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Done ({archivedTasks.length})</span>
                                    </div>
                                    <ArrowPathIcon className={`w-3 h-3 transition-transform ${isArchiveOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isArchiveOpen && (
                                    <div className="mt-2 space-y-1 animate-in slide-in-from-top-2">
                                        {archivedTasks.map(task => (
                                            <div key={task.id} className={`px-3 py-2 flex items-center gap-3 ${themeClasses.card} opacity-50`}>
                                                <button onClick={(e) => toggleTask(e, memories.find(m => m.actions?.some(a => a.id === task.id))?.id!, task)}>
                                                    <ArrowPathIcon className="w-3 h-3 shrink-0 hover:text-emerald-500 transition-colors" />
                                                </button>
                                                <span className="text-[11px] font-semibold line-through truncate flex-1">{task.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
