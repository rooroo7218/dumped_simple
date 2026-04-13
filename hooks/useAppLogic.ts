import React, { useMemo, useState } from 'react';
import { MemoryItem, UserPersona, ActionItem } from '../types';

export const useAppLogic = (
    memories: MemoryItem[],
    _setMemories: React.Dispatch<React.SetStateAction<MemoryItem[]>>,
    persona: UserPersona,
    _diaryEntries: any[],
    _setLifeSynthesis: (val: any | null) => void,
    _updateTaskDetails: (memoryId: string, taskId: string, updates: Partial<ActionItem>) => void,
    _addCustomCategory: (category: string) => void,
    _deleteCategory: (category: string, deleteTasks: boolean) => void,
    _setAiStatus: (status: any) => void,
    _setLastAiError: (error: string | null) => void,
    _showToast: (message: string, variant?: any, sub?: string) => void,
    _maybeLaterIds: string[] = []
) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const allActiveTasks = useMemo(() => memories.flatMap(m => m.actions || []).filter(a => !a.completed), [memories]);

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
        return groups;
    }, [memories]);

    const allCategories = useMemo(() => {
        const manualBuckets = persona.customCategories || [];
        const dynamicBuckets = Object.keys(groupedTasks).filter(b => !manualBuckets.includes(b));
        return [...manualBuckets, ...dynamicBuckets];
    }, [groupedTasks, persona.customCategories]);

    return {
        allActiveTasks,
        groupedTasks,
        allCategories,
        isProcessing,
        setIsProcessing,
        // Legacy stubs
        handleAutoReprioritize: async () => {},
        duplicateGroups: [],
        setDuplicateGroups: () => {},
        isCleanupModalOpen: false,
        setIsCleanupModalOpen: () => {},
        isCheckingDuplicates: false,
        setIsCheckingDuplicates: () => {},
        handleResolveDuplicateGroup: async () => {},
    };
};
