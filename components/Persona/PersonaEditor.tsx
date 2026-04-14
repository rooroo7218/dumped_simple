import React, { useState } from 'react';
import { UserPersona } from '../../types';
import { TrashIcon, PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bars3Icon } from '@heroicons/react/24/outline';

interface PersonaEditorProps {
    persona: UserPersona;
    onSave: (updatedPersona: UserPersona) => void;
    onReprioritize: (updatedPersona: UserPersona) => void;
    isProcessing?: boolean;
    onRerunOnboarding?: () => void;
}

// ── Sortable goal item ───────────────────────────────────────────────────────
const SortableGoalItem: React.FC<{
    goal: { goal: string; timeframe: string; category: string; priority?: number };
    index: number;
    onUpdate: (field: string, val: string | number) => void;
    onRemove: () => void;
    onBlurSave: () => void;
    inputCls: string;
    card: string;
}> = ({ goal, index, onUpdate, onRemove, onBlurSave, inputCls, card }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: index });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
    return (
        <div ref={setNodeRef} style={style} className={`flex items-start gap-3 p-4 rounded-2xl ${card}`}>
            <button className="p-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-500 mt-1 touch-none" {...attributes} {...listeners}>
                <Bars3Icon className="w-4 h-4" />
            </button>
            <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-[11px] font-black bg-slate-800 text-white">{index + 1}</div>
            <div className="flex-1 min-w-0 space-y-2">
                <input className={inputCls} placeholder="What do you want to achieve?" value={goal.goal}
                    onChange={e => onUpdate('goal', e.target.value)} onBlur={onBlurSave} />
                <div className="flex items-center gap-2 flex-wrap">
                    <select value={goal.timeframe} onChange={e => { onUpdate('timeframe', e.target.value); setTimeout(onBlurSave, 0); }}
                        className="text-[10px] font-black uppercase tracking-widest border-0 outline-none cursor-pointer rounded-full px-2.5 py-1 bg-slate-100 text-slate-500">
                        <option value="1-year">1 year</option>
                        <option value="3-year">3 years</option>
                        <option value="5-year">5 years</option>
                    </select>
                    <span className="text-[10px] font-black uppercase tracking-widest rounded-full px-2.5 py-1 flex items-center gap-1 bg-slate-50 text-slate-500">
                        Priority
                        <input type="number" min={1} max={10} value={goal.priority || 5}
                            onChange={e => onUpdate('priority', parseInt(e.target.value))} onBlur={onBlurSave}
                            className="w-5 bg-transparent outline-none text-center font-black" />
                        <span className="opacity-40">/10</span>
                    </span>
                </div>
            </div>
            <button onClick={onRemove} className="opacity-20 hover:opacity-80 hover:text-rose-500 transition-all flex-shrink-0 mt-1">
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

export const PersonaEditor: React.FC<PersonaEditorProps> = ({
    persona, onSave, onReprioritize, isProcessing, onRerunOnboarding
}) => {
    const [p, setP] = useState<UserPersona>(persona);
    const goalSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const save = (updated: UserPersona) => { setP(updated); onSave(updated); };

    // ── Goals ────────────────────────────────────────────────────────────────
    const updateGoal = (i: number, field: string, val: string | number) => {
        const goals = [...(p.longTermGoals || [])];
        goals[i] = { ...goals[i], [field]: val };
        setP(prev => ({ ...prev, longTermGoals: goals }));
    };
    const addGoal = () => save({ ...p, longTermGoals: [...(p.longTermGoals || []), { goal: '', timeframe: '1-year', category: 'General', priority: 5 }] });
    const removeGoal = (i: number) => save({ ...p, longTermGoals: (p.longTermGoals || []).filter((_, idx) => idx !== i) });

    // ── Values ───────────────────────────────────────────────────────────────
    const updateValue = (i: number, val: string) => {
        const vals = [...(p.coreValues || [])];
        vals[i] = { ...vals[i], value: val };
        setP(prev => ({ ...prev, coreValues: vals }));
    };
    const addValue = () => save({ ...p, coreValues: [...(p.coreValues || []), { value: '', importance: 8, description: '' }] });
    const removeValue = (i: number) => save({ ...p, coreValues: (p.coreValues || []).filter((_, idx) => idx !== i) });

    // ── Constraints ──────────────────────────────────────────────────────────
    const updateConstraint = (i: number, val: string) => {
        const arr = [...(p.currentConstraints || [])];
        arr[i] = val;
        setP(prev => ({ ...prev, currentConstraints: arr }));
    };
    const addConstraint = () => save({ ...p, currentConstraints: [...(p.currentConstraints || []), ''] });
    const removeConstraint = (i: number) => save({ ...p, currentConstraints: (p.currentConstraints || []).filter((_, idx) => idx !== i) });

    // ── Theme shorthands ─────────────────────────────────────────────────────
    const card = 'bg-white/60 backdrop-blur-md border-2 border-slate-950 rounded-[28px] shadow-md';

    const inputCls = 'w-full bg-transparent border-b-2 border-slate-200 focus:border-slate-800 outline-none py-1.5 text-sm font-semibold text-slate-800 transition-colors placeholder:text-slate-400';

    const sectionTitle = 'text-[11px] font-black uppercase tracking-widest text-slate-500';

    const addBtn = 'flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors py-1';

    const reprioritizeBtn = 'flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[11px] font-semibold rounded-xl hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed';

    return (
        <div className="max-w-2xl mx-auto pb-8 px-1 space-y-6">

            {/* ── Header ── */}
            <div className="mb-6 relative">
                <div className="flex items-center gap-2 mb-1">
                    <SparklesIcon className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">About Me</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    What's life like recently?
                </h2>
                <div className="absolute top-0 right-0 flex flex-col items-end gap-2">
                    <button
                        onClick={() => onReprioritize(p)}
                        disabled={isProcessing}
                        className={reprioritizeBtn}
                    >
                        <SparklesIcon className="w-3.5 h-3.5" />
                        {isProcessing ? 'Re-ranking…' : 'Re-prioritize'}
                    </button>
                    {onRerunOnboarding && (
                        <button
                            onClick={() => onRerunOnboarding()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-slate-300 text-slate-500 text-[11px] font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all"
                        >
                            Redo Setup
                        </button>
                    )}
                </div>
            </div>

            {/* ── Goals ── */}
            <div className={`${card} p-6 space-y-4`}>
                <div className="flex items-center justify-between">
                    <p className={sectionTitle}>Goals</p>
                    <button onClick={addGoal} className={addBtn}>
                        <PlusIcon className="w-3 h-3" /> Add
                    </button>
                </div>

                {(p.longTermGoals || []).length === 0 && (
                    <p className="text-[12px] text-slate-400 italic py-2">No goals yet — add one to help the AI prioritise.</p>
                )}

                <DndContext sensors={goalSensors} collisionDetection={closestCenter} onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (!over || active.id === over.id) return;
                    const goals = p.longTermGoals || [];
                    const oldIdx = active.id as number;
                    const newIdx = over.id as number;
                    const reordered = arrayMove(goals, oldIdx, newIdx);
                    save({ ...p, longTermGoals: reordered });
                }}>
                    <SortableContext items={(p.longTermGoals || []).map((_, i) => i)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                            {(p.longTermGoals || []).map((g, i) => (
                                <SortableGoalItem
                                    key={i}
                                    goal={g}
                                    index={i}
                                    onUpdate={(field, val) => updateGoal(i, field, val)}
                                    onRemove={() => removeGoal(i)}
                                    onBlurSave={() => onSave(p)}
                                    inputCls={inputCls}
                                    card="bg-white/80"
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                {(p.longTermGoals || []).length > 0 && (
                    <p className="text-[10px] text-slate-400 font-semibold pt-1">
                        Goal 1 gets the most weight. Drag to reorder.
                    </p>
                )}
            </div>

            {/* ── How you work ── */}
            <div className={`${card} p-6 space-y-5`}>
                <p className={sectionTitle}>How you work</p>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Peak energy window</label>
                        <input
                            className={inputCls}
                            placeholder="e.g. Morning (9am–12pm)"
                            value={p.productivityPatterns?.peakEnergyTime || ''}
                            onChange={e => setP(prev => ({ ...prev, productivityPatterns: { ...prev.productivityPatterns, peakEnergyTime: e.target.value, focusType: prev.productivityPatterns?.focusType || '' } }))}
                            onBlur={() => onSave(p)}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Focused hours per day</label>
                        <input
                            className={inputCls}
                            placeholder="e.g. 2–4 hours"
                            value={p.productivityPatterns?.focusType || ''}
                            onChange={e => setP(prev => ({ ...prev, productivityPatterns: { ...prev.productivityPatterns, focusType: e.target.value, peakEnergyTime: prev.productivityPatterns?.peakEnergyTime || '' } }))}
                            onBlur={() => onSave(p)}
                        />
                    </div>
                </div>
            </div>

            {/* ── Constraints ── */}
            <div className={`${card} p-6 space-y-4`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={sectionTitle}>What you're working around</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Responsibilities the AI should respect</p>
                    </div>
                    <button onClick={addConstraint} className={addBtn}>
                        <PlusIcon className="w-3 h-3" /> Add
                    </button>
                </div>

                {(p.currentConstraints || []).length === 0 && (
                    <p className="text-[12px] text-slate-400 italic py-1">Nothing listed — the AI will assume no constraints.</p>
                )}

                <div className="space-y-3">
                    {(p.currentConstraints || []).map((c, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <input
                                className={`${inputCls} flex-1`}
                                placeholder="e.g. Responsible for young kids"
                                value={c}
                                onChange={e => updateConstraint(i, e.target.value)}
                                onBlur={() => onSave(p)}
                            />
                            <button
                                onClick={() => removeConstraint(i)}
                                className="opacity-20 hover:opacity-80 hover:text-rose-500 transition-all flex-shrink-0"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Values ── */}
            <div className={`${card} p-6 space-y-4`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={sectionTitle}>Core values</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Principles the AI uses to judge what really matters</p>
                    </div>
                    <button onClick={addValue} className={addBtn}>
                        <PlusIcon className="w-3 h-3" /> Add
                    </button>
                </div>

                {(p.coreValues || []).length === 0 && (
                    <p className="text-[12px] text-slate-400 italic py-1">No values added yet.</p>
                )}

                <div className="flex flex-wrap gap-2">
                    {(p.coreValues || []).map((v, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full border-2 text-[12px] font-semibold bg-white border-slate-200 text-slate-700"
                        >
                            <input
                                className="bg-transparent outline-none min-w-[60px] max-w-[140px] font-semibold"
                                style={{ width: `${Math.max(60, (v.value?.length || 1) * 8)}px` }}
                                placeholder="Value…"
                                value={v.value}
                                onChange={e => updateValue(i, e.target.value)}
                                onBlur={() => onSave(p)}
                            />
                            <button
                                onClick={() => removeValue(i)}
                                className="opacity-30 hover:opacity-100 hover:text-rose-500 transition-all"
                            >
                                <span className="text-base leading-none">×</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Life vision ── */}
            <div className={`${card} p-6 space-y-3`}>
                <div>
                    <p className={sectionTitle}>Your vision</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">What does "everything under control" look like?</p>
                </div>
                <textarea
                    rows={5}
                    placeholder="I wake up knowing exactly what matters today. My finances are sorted, I'm present with my family, and the business is growing without me drowning in it…"
                    value={p.successVision || ''}
                    onChange={e => setP(prev => ({ ...prev, successVision: e.target.value }))}
                    onBlur={() => onSave(p)}
                    className="w-full text-sm font-medium leading-relaxed resize-none outline-none rounded-2xl p-4 transition-colors placeholder:text-slate-400 bg-white/80 border-2 border-slate-200 focus:border-slate-500 text-slate-800"
                />
            </div>

            {/* ── What I've Learned About You ── */}
            <div className={`${card} p-6 space-y-5`}>
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-amber-400 shrink-0" />
                    <p className={sectionTitle}>What I've learned about you</p>
                </div>

                {!p.aiObservations && !p.behavioralPatterns ? (
                    <p className="text-sm text-slate-400 italic">As you use Dumped, I'll start noticing patterns and share what I learn here.</p>
                ) : (
                    <div className="space-y-5">

                        {/* AI insights feed */}
                        {(p.aiObservations?.insights?.length ?? 0) > 0 && (
                            <div className="space-y-2">
                                {p.aiObservations!.insights.map((insight, i) => {
                                    const daysAgo = Math.floor((Date.now() - insight.generatedAt) / 86400000);
                                    const when = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`;
                                    return (
                                        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 border-2 border-amber-100">
                                            <SparklesIcon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                            <p className="text-[13px] text-amber-800 leading-relaxed flex-1">{insight.text}</p>
                                            <span className="text-[10px] text-amber-400 shrink-0 mt-0.5">{when}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Identity paragraph */}
                        {p.aiObservations?.identityNotes && (
                            <div className="space-y-1">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Identity</p>
                                <p className="text-sm text-slate-600 leading-relaxed">{p.aiObservations.identityNotes}</p>
                            </div>
                        )}

                        {/* Goal drift */}
                        {p.aiObservations?.goalDriftNote && (
                            <div className="space-y-1">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Priorities shifting?</p>
                                <p className="text-sm text-slate-600 leading-relaxed">{p.aiObservations.goalDriftNote}</p>
                            </div>
                        )}

                        {/* Behavioral patterns */}
                        {p.behavioralPatterns && Object.keys(p.behavioralPatterns.categoryStats).length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Task patterns</p>
                                {(Object.entries(p.behavioralPatterns.categoryStats) as [string, { total: number; completed: number; lastUpdated: number }][])
                                    .filter(([, s]) => s.total >= 2)
                                    .sort(([, a], [, b]) => (b.completed / b.total) - (a.completed / a.total))
                                    .map(([cat, s]) => {
                                        const pct = Math.round((s.completed / s.total) * 100);
                                        const avoided = p.behavioralPatterns!.avoidedCategories.includes(cat);
                                        return (
                                            <div key={cat} className="space-y-0.5">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className={`font-medium ${avoided ? 'text-amber-600' : 'text-slate-600'}`}>
                                                        {cat}{avoided ? ' ⚠' : ''}
                                                    </span>
                                                    <span className="text-slate-400">{s.completed}/{s.total}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${avoided ? 'bg-amber-300' : 'bg-emerald-400'}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}

                        {/* Last updated */}
                        {p.aiObservations?.lastUpdatedAt && (
                            <p className="text-[10px] text-slate-400">
                                Updated {Math.floor((Date.now() - p.aiObservations.lastUpdatedAt) / 3600000) < 1
                                    ? 'recently'
                                    : `${Math.floor((Date.now() - p.aiObservations.lastUpdatedAt) / 3600000)}h ago`}
                            </p>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
};
