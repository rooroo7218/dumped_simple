import React, { useMemo, useState, useCallback } from 'react';
import { MemoryItem, UserPersona, ActionItem, DiaryEntry, LifeSynthesis } from '../types';
import { getEffectiveCompositeScore } from '../utils/taskScoring';
import { synthesizeLifeContext, reprioritizeTasks, generateStepBreakdown } from '../services/geminiService';
import { databaseService } from '../services/databaseService';
import type { ToastVariant } from './useToast';

export const useAppLogic = (
    memories: MemoryItem[],
    setMemories: React.Dispatch<React.SetStateAction<MemoryItem[]>>,
    persona: UserPersona,
    diaryEntries: DiaryEntry[],
    setLifeSynthesis: (val: LifeSynthesis | null) => void,
    updateTaskDetails: (memoryId: string, taskId: string, updates: Partial<ActionItem>) => void,
    addCustomCategory: (category: string) => void,
    deleteCategory: (category: string, deleteTasks: boolean) => void,
    setAiStatus: (status: 'idle' | 'processing' | 'error' | 'success') => void,
    setLastAiError: (error: string | null) => void,
    showToast: (message: string, variant?: ToastVariant, sub?: string) => void,
    maybeLaterIds: string[] = []
) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
    const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
    const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

    const allActiveTasks = useMemo(() => memories.flatMap(m => m.actions || []).filter(a => !a.completed && !maybeLaterIds.includes(a.id)), [memories, maybeLaterIds]);

    const groupedTasks = useMemo(() => {
        const groups: Record<string, { memoryId: string; task: ActionItem }[]> = {};
        memories.forEach(m => {
            (m.actions || []).forEach(t => {
                if (!t.completed) {
                    if (!groups[t.category]) groups[t.category] = [];
                    groups[t.category].push({ memoryId: m.id, task: t });
                }
            });
        });
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => {
                const orderA = a.task.categoryOrder ?? 0;
                const orderB = b.task.categoryOrder ?? 0;
                if (orderA !== orderB) return orderB - orderA;
                return getEffectiveCompositeScore(b.task, memories) - getEffectiveCompositeScore(a.task, memories);
            });
        });
        return groups;
    }, [memories]);

    const allCategories = useMemo(() => {
        const manualBuckets = persona.customCategories || [];
        const dynamicBuckets = Object.keys(groupedTasks).filter(b => !manualBuckets.includes(b));
        return [...manualBuckets, ...dynamicBuckets];
    }, [groupedTasks, persona.customCategories]);

    const rankedTasks = useMemo(() => {
        return [...allActiveTasks].sort((a, b) => {
            const scoreDiff = getEffectiveCompositeScore(b, memories) - getEffectiveCompositeScore(a, memories);
            if (scoreDiff !== 0) return scoreDiff;
            return (b.globalOrder || 0) - (a.globalOrder || 0);
        });
    }, [allActiveTasks, memories]);

    const starGraphData = useMemo(() => {
        const data: Record<string, number> = {};
        allActiveTasks.forEach(t => {
            data[t.category] = (data[t.category] || 0) + 1;
        });
        return data;
    }, [allActiveTasks]);

    const [strategySummary, setStrategySummary] = useState<string | null>(null);

    const handleGlobalReprioritization = useCallback(async (personaOverride?: UserPersona) => {
        if (isProcessing) return;

        // Defensive: Check if personaOverride is actually a React/DOM event
        let targetPersona = persona;
        if (personaOverride && !(personaOverride as any).target && !(personaOverride as any).nativeEvent) {
            targetPersona = personaOverride;
        }

        setIsProcessing(true);
        setAiStatus('processing');
        setLastAiError(null);
        setStrategySummary(null);

        try {
            // 1. Snapshot current rankings (Map id -> index)
            const stableSort = (a: any, b: any) => {
                const scoreDiff = getEffectiveCompositeScore(b, memories) - getEffectiveCompositeScore(a, memories);
                if (scoreDiff !== 0) return scoreDiff;
                if ((b.globalOrder || 0) !== (a.globalOrder || 0)) return (b.globalOrder || 0) - (a.globalOrder || 0);
                return a.id.localeCompare(b.id);
            };

            const currentRanked = [...allActiveTasks].sort(stableSort);
            const previousRankMap = new Map(currentRanked.map((t, i) => [t.id, i]));

            const allTasksEver = memories.flatMap(m => m.actions || []);
            const { updatedTasks, strategySummary: summary } = await reprioritizeTasks(allActiveTasks, targetPersona, memories.slice(0, 10), diaryEntries, allTasksEver);

            setStrategySummary(summary);

            // 2. Determine NEW rankings based on updated scores
            const tempMerged = allActiveTasks.map(t => {
                const update = updatedTasks.find((u: any) => u.id === t.id);
                return update ? { ...t, ...update } : t;
            });
            const newRanked = tempMerged.sort(stableSort);
            const newRankMap = new Map(newRanked.map((t, i) => [t.id, i]));

            setMemories(prev => {
                const newMemories = [...prev];
                updatedTasks.forEach((updatedTask: any) => {
                    const mIdx = newMemories.findIndex(m => m.actions?.some(a => a.id === updatedTask.id));
                    if (mIdx !== -1) {
                        // Calculate Trend
                        const oldRank = (previousRankMap.get(updatedTask.id) as number) ?? -1;
                        const newRank = (newRankMap.get(updatedTask.id) as number) ?? -1;

                        let trend: 'up' | 'down' | 'same' = 'same';
                        let delta = 0;

                        if (oldRank !== -1 && newRank !== -1) {
                            if (newRank < oldRank) {
                                trend = 'up'; // Lower index = higher specificity/top of list
                                delta = oldRank - newRank;
                            } else if (newRank > oldRank) {
                                trend = 'down';
                                delta = newRank - oldRank;
                            }
                        }

                        // Explicitly cast alignmentScore to number or default to 0 to avoid TS/runtime issues
                        const incomingScore = typeof updatedTask.alignmentScore === 'number' ? updatedTask.alignmentScore : 0;
                        const currentScore = typeof newMemories[mIdx].actions!.find(a => a.id === updatedTask.id)?.alignmentScore === 'number' ? newMemories[mIdx].actions!.find(a => a.id === updatedTask.id)!.alignmentScore : 0;
                        // Prefer incoming score, fall back to current, then 0. 
                        // But if incoming is 0, it might be real. The prompt asks for 0-10.
                        const finalScore = updatedTask.alignmentScore !== undefined ? updatedTask.alignmentScore : currentScore;

                        const updatedActions = newMemories[mIdx].actions!.map(a =>
                            a.id === updatedTask.id ? {
                                ...a,
                                ...updatedTask,
                                trend,
                                trendDelta: delta,
                                alignmentScore: finalScore
                            } : a
                        );
                        newMemories[mIdx] = { ...newMemories[mIdx], actions: updatedActions };
                    }
                });

                // Calculate total changes for feedback
                const actionsChanged = updatedTasks.length;
                if (actionsChanged === 0) {
                    showToast('You are aligned', 'success', 'No strategic changes required right now.');
                } else {
                    showToast('Reprioritisation complete', 'success', `${actionsChanged} task${actionsChanged !== 1 ? 's' : ''} updated — check for arrows to see what moved.`);
                }

                newMemories.forEach(m => databaseService.saveMemory(m));
                return newMemories;
            });
            setAiStatus('success');
            setTimeout(() => setAiStatus('idle'), 3000);
        } catch (e: any) {
            console.error("Global re-prioritization failed:", e);
            setAiStatus('error');
            setLastAiError(e.message || "Failed to reprioritize tasks.");
        } finally {
            setIsProcessing(false);
        }
    }, [allActiveTasks, persona, memories, diaryEntries, isProcessing, setMemories]);

    const handleSynthesis = useCallback(async () => {
        if (isSynthesizing) return;
        setIsSynthesizing(true);
        setAiStatus('processing');
        setLastAiError(null);
        try {
            const result = await synthesizeLifeContext(memories, persona);
            setLifeSynthesis(result);
            setAiStatus('success');
            setTimeout(() => setAiStatus('idle'), 3000);
        } catch (e: any) {
            console.error("Failed to synthesize life context:", e);
            setAiStatus('error');
            setLastAiError(e.message || "Failed to synthesize life context.");
        } finally {
            setIsSynthesizing(false);
        }
    }, [memories, persona, isSynthesizing, setLifeSynthesis]);

    const handleDeepBreakdown = useCallback(async (memoryId: string, task: ActionItem) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setAiStatus('processing');
        setLastAiError(null);
        try {
            const newSteps = await generateStepBreakdown(task, persona);
            updateTaskDetails(memoryId, task.id, { steps: newSteps || [] });
            setAiStatus('success');
            setTimeout(() => setAiStatus('idle'), 3000);
        } catch (e: any) {
            console.error("Deep breakdown failed:", e);
            setAiStatus('error');
            setLastAiError(e.message || "Failed to generate step breakdown.");
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, persona, updateTaskDetails]);

    // Silently scores only the newly committed tasks so they have effort/estimatedMinutes/contextTags/alignmentScore
    // before the user opens Priorities. No alerts, no UI blocking.
    const handleAutoReprioritize = useCallback(async (newTasks: ActionItem[]) => {
        if (newTasks.length === 0) return;
        try {
            const { updatedTasks } = await reprioritizeTasks(newTasks, persona, memories.slice(0, 5), diaryEntries);
            setMemories(prev => {
                const next = [...prev];
                updatedTasks.forEach((updatedTask: any) => {
                    const mIdx = next.findIndex(m => m.actions?.some(a => a.id === updatedTask.id));
                    if (mIdx !== -1) {
                        next[mIdx] = {
                            ...next[mIdx],
                            actions: next[mIdx].actions!.map(a =>
                                a.id === updatedTask.id ? { ...a, ...updatedTask } : a
                            ),
                        };
                    }
                });
                next.forEach(m => databaseService.saveMemory(m));
                return next;
            });
        } catch (e) {
            console.warn('[AutoReprioritize] Silent fail:', e);
        }
    }, [persona, memories, diaryEntries, setMemories]);

    const handleResolveDuplicateGroup = useCallback(async (groupId: string, masterTaskId: string, taskIdsToDelete: string[]) => {
        const group = duplicateGroups.find(g => g.id === groupId);
        if (!group) return;

        // 1. Merge sub-tasks (steps) from all variants to the master task
        const allSteps = group.tasks.flatMap((t: any) => t.steps || []);
        const uniqueSteps = allSteps.filter((v: any, i: number, a: any[]) => a.findIndex(t => t.text === v.text) === i);

        // 2. Explicitly delete duplicate tasks from Database
        // Note: deleteAction now takes memoryId and taskId (improves precision over text)
        for (const taskId of taskIdsToDelete) {
            const taskToDelete = group.tasks.find((t: any) => t.id === taskId);
            if (taskToDelete) {
                await databaseService.deleteAction(taskToDelete.memoryId || '', taskId).catch(err => {
                    console.error("Failed to delete duplicate action from DB:", err);
                });
            }
        }

        // 3. Update memories (Master task gets sub-tasks, others are deleted)
        setMemories(prev => {
            const updated = prev.map(m => {
                const actions = m.actions || [];
                const updatedActions = actions
                    .filter(a => !taskIdsToDelete.includes(a.id))
                    .map(a => a.id === masterTaskId ? { ...a, steps: uniqueSteps } : a);

                return { ...m, actions: updatedActions };
            });

            // Persistence update for the survivors (including the master task)
            updated.forEach(mem => {
                const hasSurvivor = mem.actions?.some(a => a.id === masterTaskId || !taskIdsToDelete.includes(a.id));
                const memoryWasChanged = group.tasks.some((gt: any) => gt.memoryId === mem.id);
                if (memoryWasChanged) {
                    databaseService.saveMemory(mem);
                }
            });

            return updated;
        });

        // 4. Update local state
        setDuplicateGroups(prev => prev.filter(g => g.id !== groupId));
        if (duplicateGroups.length <= 1) setIsCleanupModalOpen(false);
    }, [duplicateGroups, setMemories]);


    return {
        allActiveTasks,
        groupedTasks,
        allCategories,
        rankedTasks,
        isProcessing,
        isSynthesizing,
        setIsProcessing,
        handleGlobalReprioritization,
        handleAutoReprioritize,
        handleSynthesis,
        handleDeepBreakdown,
        duplicateGroups,
        setDuplicateGroups,
        isCleanupModalOpen,
        setIsCleanupModalOpen,
        isCheckingDuplicates,
        setIsCheckingDuplicates,
        starGraphData,
        handleResolveDuplicateGroup,
        strategySummary,
        setStrategySummary,
        addCustomCategory,
        deleteCategory,
    };
};
