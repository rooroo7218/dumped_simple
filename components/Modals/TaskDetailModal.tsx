import React, { useState, useEffect } from 'react';
import {
    XMarkIcon,
    CheckCircleIcon,
    SparklesIcon,
    PlusIcon,
    TrashIcon,
    Bars3Icon,
    TagIcon,
    CalendarIcon,
} from '@heroicons/react/24/outline';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ActionItem } from '../../types';
import { SortableItem } from '../SortableItem';

interface TaskDetailModalProps {
    selectedTask: { memoryId: string; task: ActionItem };
    setSelectedTask: (val: { memoryId: string; taskId: string } | null) => void;
    updateTaskDetails: (memoryId: string, taskId: string, updates: Partial<ActionItem>) => void;
    toggleTask: (e: React.MouseEvent, memoryId: string, task: ActionItem) => void;
    handleDeleteTask: (memoryId: string, taskId: string) => void;
    toggleStep: (memoryId: string, taskId: string, stepId: string) => void;
    handleDeepBreakdown: () => Promise<void>;
    isProcessing: boolean;
    allCategories?: string[];
    allActiveTasks?: ActionItem[];
    onStartFocus?: (taskId: string) => void;
    isMaybeLater?: boolean;
    onMaybeLater?: (id: string) => void;
    onRestoreMaybeLater?: (id: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
    selectedTask,
    setSelectedTask,
    updateTaskDetails,
    toggleTask,
    handleDeleteTask,
    toggleStep,
    handleDeepBreakdown,
    isProcessing,
    allCategories = ['Career', 'Health', 'Finance', 'Household', 'Creativity', 'Learning', 'Experiment', 'Social', 'Maintenance'],
    allActiveTasks = [],
    onStartFocus,
    isMaybeLater = false,
    onMaybeLater,
    onRestoreMaybeLater,
}) => {
    const { task, memoryId } = selectedTask;

    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [newContextTag, setNewContextTag] = useState('');
    const [batchInput, setBatchInput] = useState(task.batchId || '');
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const close = () => {
        setVisible(false);
        setTimeout(() => setSelectedTask(null), 1000);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    // ── Steps ──────────────────────────────────────────────────────────────────

    const handleAddStep = () => {
        const newStep = { id: crypto.randomUUID(), text: '', durationMinutes: 15, completed: false };
        updateTaskDetails(memoryId, task.id, { steps: [...(task.steps || []), newStep] });
    };

    const handleDeleteStep = (stepId: string) => {
        updateTaskDetails(memoryId, task.id, { steps: (task.steps || []).filter(s => s.id !== stepId) });
    };

    const handleUpdateStep = (stepId: string, text: string) => {
        updateTaskDetails(memoryId, task.id, { steps: (task.steps || []).map(s => s.id === stepId ? { ...s, text } : s) });
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const steps = task.steps || [];
            const oldIndex = steps.findIndex(s => s.id === active.id);
            const newIndex = steps.findIndex(s => s.id === over?.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                updateTaskDetails(memoryId, task.id, { steps: arrayMove(steps, oldIndex, newIndex) });
            }
        }
    };

    // ── Styles ─────────────────────────────────────────────────────────────────

    const panel = 'bg-white border-2 border-slate-950';

    const label = 'text-[11px] font-semibold uppercase tracking-widest text-slate-800';

    const chipBase = 'px-2.5 py-1 rounded-full text-[11px] font-medium border';
    const chipMuted = `${chipBase} bg-slate-50 text-slate-500 border-slate-200`;

    const pill = (active: boolean) =>
        `${chipBase} transition-all cursor-pointer ${active
            ? 'bg-slate-800 text-white border-slate-800'
            : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
        }`;

    const existingBatches = Array.from(new Set(allActiveTasks.map(t => t.batchId).filter(Boolean))) as string[];

    return (
        <>
        {/* Backdrop — only covers the modal panel area so the task board stays scrollable */}
        <div
            className={`fixed bottom-0 right-0 z-[199] w-full sm:w-[440px] max-h-[80vh] transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={close}
        />
        <div
            style={{ transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
            className={`fixed bottom-0 right-0 z-[200] w-full sm:w-[440px] max-h-[80vh] flex flex-col shadow-2xl rounded-t-[28px] ${visible ? 'translate-y-0' : 'translate-y-full'} ${panel}`}
        >
            {/* ── Header: title + close ── */}
            <div className="shrink-0 flex items-start gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
                <textarea
                    rows={2}
                    value={task.text}
                    onChange={e => updateTaskDetails(memoryId, task.id, { text: e.target.value })}
                    className="flex-1 text-[17px] font-bold leading-snug resize-none bg-transparent border-none focus:ring-0 p-0 text-slate-900 placeholder-slate-400"
                />
                <button
                    onClick={close}
                    className="shrink-0 mt-0.5 p-1.5 rounded-full transition-all active:scale-90 text-slate-500 hover:bg-slate-100"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>

            {/* ── Chips row: category + status badges ── */}
            <div className="shrink-0 flex items-center gap-1.5 px-5 py-2 border-b flex-wrap border-slate-100">
                <div className="relative">
                    <button onClick={() => setIsCategoryOpen(!isCategoryOpen)} className={`${chipMuted} hover:opacity-80 transition-opacity`}>
                        {task.category}
                    </button>
                    {isCategoryOpen && (
                        <div className="absolute top-full left-0 mt-1 w-44 z-10 rounded-2xl border shadow-xl overflow-hidden bg-white border-slate-200">
                            {allCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => { updateTaskDetails(memoryId, task.id, { category: cat }); setIsCategoryOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-[12px] font-medium transition-colors ${task.category === cat ? 'bg-slate-100 text-slate-800 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {task.urgency > 7 && <span className={`${chipBase} bg-amber-50 text-amber-600 border-amber-100`}>Urgent</span>}
                {task.estimatedMinutes && <span className={chipMuted}>~{task.estimatedMinutes} min</span>}
                {task.isNew && <span className={`${chipBase} bg-rose-500 text-white border-rose-500`}>New</span>}
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ scrollbarWidth: 'none' }}>

                {/* AI reasoning — subtle quote at the top if present */}
                {task.rationale && (
                    <p className="text-[12px] leading-relaxed italic border-l-2 pl-3 text-slate-500 border-slate-200">
                        {task.rationale}
                    </p>
                )}

                {/* Notes */}
                <div className="space-y-1.5">
                    <p className={label}>Notes</p>
                    <textarea
                        value={task.description || ''}
                        onChange={e => updateTaskDetails(memoryId, task.id, { description: e.target.value })}
                        rows={3}
                        placeholder="Add notes, links, or context…"
                        className="w-full rounded-xl px-3 py-2 text-[13px] font-medium leading-relaxed focus:ring-0 resize-none border transition-colors bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-300"
                    />
                </div>

                {/* Steps */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className={label}>Steps</p>
                        <div className="flex items-center gap-1.5">
                            {!task.completed && (
                                <button
                                    onClick={handleDeepBreakdown}
                                    disabled={isProcessing}
                                    className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border transition-all bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <SparklesIcon className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                                    {isProcessing ? 'Generating…' : 'AI breakdown'}
                                </button>
                            )}
                            <button
                                onClick={handleAddStep}
                                className="p-1 rounded-full border transition-all text-slate-500 border-slate-200 hover:bg-slate-50"
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {task.steps && task.steps.length > 0 ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={(task.steps || []).map(s => s.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-1">
                                    {task.steps.map((step, idx) => (
                                        <SortableItem key={step.id} id={step.id} useHandle={true}>
                                            {({ attributes, listeners }) => (
                                                <div className="flex items-center gap-2 p-2 rounded-lg border group transition-all bg-slate-50/60 border-slate-100">
                                                    <div {...attributes} {...listeners} className="cursor-grab opacity-20 group-hover:opacity-50 transition-opacity shrink-0">
                                                        <Bars3Icon className="w-3 h-3" />
                                                    </div>
                                                    <span className="text-[10px] font-bold shrink-0 w-3.5 text-center text-slate-400">{idx + 1}</span>
                                                    <input
                                                        value={step.text}
                                                        onChange={e => handleUpdateStep(step.id, e.target.value)}
                                                        placeholder="Step description…"
                                                        className={`flex-1 bg-transparent border-none focus:ring-0 p-0 text-[13px] font-medium text-slate-800 placeholder-slate-400 ${step.completed ? 'line-through opacity-40' : ''}`}
                                                    />
                                                    <button onClick={() => toggleStep(memoryId, task.id, step.id)} className={`shrink-0 transition-all active:scale-90 ${step.completed ? 'text-slate-600' : 'text-slate-400 hover:text-slate-500'}`}>
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteStep(step.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-rose-300 hover:text-rose-500 transition-all">
                                                        <TrashIcon className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </SortableItem>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <button
                            onClick={handleAddStep}
                            className="w-full py-2 border border-dashed rounded-lg text-[12px] font-medium text-center transition-all border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                        >
                            + Add a step
                        </button>
                    )}
                </div>

                {/* Metadata grid */}
                <div className="space-y-3 pt-3 border-t border-slate-100">

                    {/* Urgency + Due date — side by side */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <p className={label}>Urgency</p>
                                <span className="text-[11px] font-semibold text-slate-500">{task.urgency}/10</span>
                            </div>
                            <input
                                type="range" min="1" max="10" value={task.urgency}
                                onChange={e => updateTaskDetails(memoryId, task.id, { urgency: parseInt(e.target.value) })}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-slate-700"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3 opacity-40" />
                                <p className={label}>Due</p>
                            </div>
                            <input
                                type="date"
                                value={task.completeBy ? new Date(task.completeBy).toISOString().split('T')[0] : ''}
                                onChange={e => {
                                    const date = e.target.value ? new Date(e.target.value).getTime() : undefined;
                                    updateTaskDetails(memoryId, task.id, { completeBy: date });
                                }}
                                className="w-full text-[12px] font-medium border rounded-lg px-2 py-1.5 focus:ring-0 transition-all bg-slate-50 border-slate-200 text-slate-600 focus:border-slate-300"
                            />
                        </div>
                    </div>

                    {/* Context tags */}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                            <TagIcon className="w-3 h-3 opacity-40" />
                            <p className={label}>Context</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                            {(task.contextTags || []).map(tag => (
                                <span key={tag} className={`flex items-center gap-1 ${chipMuted}`}>
                                    {tag}
                                    <button onClick={() => updateTaskDetails(memoryId, task.id, { contextTags: (task.contextTags || []).filter(t => t !== tag) })} className="hover:text-rose-400 transition-colors">
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            <input
                                value={newContextTag}
                                onChange={e => setNewContextTag(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newContextTag.trim()) {
                                        const updated = [...new Set([...(task.contextTags || []), newContextTag.trim()])];
                                        updateTaskDetails(memoryId, task.id, { contextTags: updated });
                                        setNewContextTag('');
                                    }
                                }}
                                placeholder="Add…"
                                className="text-[12px] w-16 border-b bg-transparent focus:ring-0 focus:outline-none py-0.5 border-slate-200 text-slate-700 placeholder-slate-400"
                            />
                        </div>
                    </div>

                    {/* Group / batch */}
                    <div className="space-y-1.5">
                        <p className={label}>Group</p>
                        <div className="flex flex-wrap gap-1.5 items-center">
                            {task.batchId && (
                                <span className={`flex items-center gap-1 ${chipMuted}`}>
                                    {task.batchId}
                                    <button onClick={() => updateTaskDetails(memoryId, task.id, { batchId: undefined })} className="hover:text-rose-400 transition-colors">
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {existingBatches.filter(b => b !== task.batchId).map(batch => (
                                <button key={batch} onClick={() => { updateTaskDetails(memoryId, task.id, { batchId: batch }); setBatchInput(batch); }} className={pill(false)}>
                                    {batch}
                                </button>
                            ))}
                            <input
                                value={batchInput}
                                onChange={e => setBatchInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && batchInput.trim()) {
                                        updateTaskDetails(memoryId, task.id, { batchId: batchInput.trim() });
                                    }
                                }}
                                placeholder="New…"
                                className="text-[12px] w-16 border-b bg-transparent focus:ring-0 focus:outline-none py-0.5 border-slate-200 text-slate-700 placeholder-slate-400"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 pb-5 border-t border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                    {onStartFocus && !task.completed && !isMaybeLater && (
                        <button
                            onClick={() => { onStartFocus(task.id); close(); }}
                            className="px-5 py-2.5 rounded-full text-[13px] font-bold shadow-sm transition-all hover:scale-105 active:scale-95 bg-slate-900 text-white hover:bg-slate-700"
                        >
                            Start
                        </button>
                    )}
                    <button
                        onClick={e => { toggleTask(e, memoryId, task); close(); }}
                        className="px-5 py-2.5 rounded-full text-[13px] font-bold border transition-all hover:scale-105 active:scale-95 border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        {task.completed ? 'Reactivate' : 'Mark complete'}
                    </button>
                    {!task.completed && (
                        isMaybeLater ? (
                            <button
                                onClick={() => { onRestoreMaybeLater?.(task.id); close(); }}
                                className="px-4 py-2.5 rounded-full text-[13px] font-medium border transition-all hover:scale-105 active:scale-95 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            >
                                Restore to active
                            </button>
                        ) : (
                            <button
                                onClick={() => { onMaybeLater?.(task.id); close(); }}
                                className="px-4 py-2.5 rounded-full text-[13px] font-medium border transition-all hover:scale-105 active:scale-95 border-slate-200 text-slate-500 hover:bg-slate-50"
                            >
                                Maybe later
                            </button>
                        )
                    )}
                </div>
                {confirmingDelete ? (
                    <div className="flex items-center gap-2 animate-in fade-in duration-150">
                        <span className="text-[11px] text-slate-500">Delete task?</span>
                        <button
                            onClick={() => { handleDeleteTask(memoryId, task.id); close(); }}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                        >
                            Yes, delete
                        </button>
                        <button
                            onClick={() => setConfirmingDelete(false)}
                            className="text-[11px] text-slate-500 hover:text-slate-600 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setConfirmingDelete(true)}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-rose-500 transition-all"
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                        Delete
                    </button>
                )}
            </div>
        </div>
        </>
    );
};
