import React, { useState, useEffect, useCallback } from 'react';
import { MemoryItem, UserPersona, DiaryEntry, UserSticker, LifeSynthesis, ActionItem } from '../types';
import { databaseService, SyncStatus } from '../services/databaseService';

export const useAppData = (userId?: string, confirmFn?: (message: string, sub?: string) => Promise<boolean>) => {
    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
    const [persona, setPersona] = useState<UserPersona>({
        writingStyle: "",
        thoughtProcess: "",
        values: [],
        speakingNuances: "",
        age: undefined,
        jobTitle: "",
        lifestyle: "",
        brutalistBackground: 'miyazaki_meadow'
    });
    const [userStickers, setUserStickers] = useState<UserSticker[]>([]);
    const [diaryInput, setDiaryInput] = useState('');
    const [diaryMood, setDiaryMood] = useState('neutral');
    const [lifeSynthesis, setLifeSynthesis] = useState<LifeSynthesis | null>(() => {
        const saved = localStorage.getItem('dumped_synthesis');
        return saved ? JSON.parse(saved) : null;
    });
    const [aiStatus, setAiStatus] = useState<'idle' | 'processing' | 'error' | 'success'>('idle');
    const [lastAiError, setLastAiError] = useState<string | null>(null);
    const [isDbLoading, setIsDbLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

    useEffect(() => {
        databaseService.onSyncChange(setSyncStatus);
        return () => { databaseService.onSyncChange(null); };
    }, []);

    // Initial Load - Re-run when userId changes (login/logout/switch)
    useEffect(() => {
        const initDb = async () => {
            // If no user (and not tester mode), maybe clear data?
            // For now, just reload whatever the service finds (it handles fallback)
            setIsDbLoading(true);
            try {
                const [dbMems, dbPersona, dbDiary, dbStickers] = await Promise.all([
                    databaseService.loadMemories(),
                    databaseService.loadPersona(),
                    databaseService.loadDiary(),
                    databaseService.loadStickers()
                ]);

                setMemories(dbMems || []);
                setPersona(dbPersona || {
                    writingStyle: "",
                    thoughtProcess: "",
                    values: [],
                    speakingNuances: "",
                    age: undefined,
                    jobTitle: "",
                    lifestyle: "",
                    brutalistBackground: 'miyazaki_meadow',
                    customCategories: ['Career', 'Health', 'Finance', 'Household', 'Creativity', 'Learning', 'Experiment', 'Social', 'Maintenance']
                });
                setDiaryEntries(dbDiary || []);
                setUserStickers(dbStickers || []);
            } catch (e) {
                console.error("Failed to load initial data from DB:", e);
            } finally {
                setIsDbLoading(false);
            }
        };
        initDb();
    }, [userId]);

    // Persistence observers
    useEffect(() => {
        if (lifeSynthesis) {
            localStorage.setItem('dumped_synthesis', JSON.stringify(lifeSynthesis));
        }
    }, [lifeSynthesis]);

    // Data Update Handlers
    const updateTaskDetails = useCallback((memoryId: string, taskId: string, updates: Partial<ActionItem>) => {
        setMemories(prev => {
            const mIdx = prev.findIndex(m => m.id === memoryId);
            if (mIdx === -1) return prev;

            const newMemories = [...prev];
            const updatedActions = newMemories[mIdx].actions!.map(a => a.id === taskId ? { ...a, ...updates } : a);
            newMemories[mIdx] = { ...newMemories[mIdx], actions: updatedActions };

            databaseService.saveMemory(newMemories[mIdx]);
            return newMemories;
        });
    }, []);

    const toggleTask = useCallback((e: React.MouseEvent, memoryId: string, task: ActionItem, onEarnSticker: (sticker: UserSticker) => void) => {
        e.stopPropagation();

        // State update handled here, sticker logic passed in as callback to keep this hook pure-ish
        setMemories(prev => prev.map(m => {
            if (m.id === memoryId) {
                const updatedActions = m.actions?.map(a => {
                    if (a.id !== task.id) return a;
                    const nowCompleting = !task.completed;
                    return { ...a, completed: nowCompleting, completedAt: nowCompleting ? Date.now() : undefined };
                });
                const updatedMem = { ...m, actions: updatedActions };
                databaseService.saveMemory(updatedMem);
                return updatedMem;
            }
            return m;
        }));

    }, []);

    const deleteTask = useCallback(async (memoryId: string, taskId: string) => {
        try {
            await databaseService.deleteAction(memoryId, taskId);
            setMemories(prev => prev.map(m => {
                if (m.id === memoryId) {
                    const updatedActions = (m.actions || []).filter(a => a.id !== taskId);
                    return { ...m, actions: updatedActions };
                }
                return m;
            }));
            return true;
        } catch (e) {
            console.error("Failed to delete task:", e);
            return false;
        }
    }, []);

    const reorderTasks = useCallback((reorderedItems: { id: string, urgency?: number, categoryOrder?: number, globalOrder?: number }[], newCategory?: string, persist = true, draggedId?: string) => {
        setMemories(prev => {
            const updateMap = new Map(reorderedItems.map(item => [item.id, item]));
            let hasGlobalChanges = false;

            const newMemories = prev.map(m => {
                let memoryHasChanges = false;
                const updatedActions = m.actions?.map(a => {
                    const update = updateMap.get(a.id);
                    const isDragged = draggedId === a.id;
                    if (update || (newCategory && isDragged)) {
                        memoryHasChanges = true;
                        hasGlobalChanges = true;
                        return {
                            ...a,
                            ...(update || {}),
                            ...(newCategory && isDragged ? { category: newCategory } : {})
                        };
                    }
                    return a;
                });

                if (memoryHasChanges) {
                    const updatedMem = { ...m, actions: updatedActions };
                    if (persist) databaseService.saveMemory(updatedMem);
                    return updatedMem;
                }
                return m;
            });

            return hasGlobalChanges ? newMemories : prev;
        });
    }, []);

    const clearAllTasks = useCallback(async () => {
        const ok = confirmFn
            ? await confirmFn('Wipe ALL tasks forever?', 'This cannot be undone.')
            : window.confirm('CRITICAL: Wipe ALL tasks forever?');
        if (!ok) return;
        try {
            await databaseService.clearAllMemories();
            setMemories([]);
        } catch (e) {
            console.error("Failed to clear tasks:", e);
        }
    }, [setMemories, confirmFn]);

    const handleSaveDiary = useCallback(() => {
        if (!diaryInput.trim()) return;
        const newEntry: DiaryEntry = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            content: diaryInput,
            mood: diaryMood,
            transmutationCount: 0
        };
        setDiaryEntries(prev => [newEntry, ...prev]);
        databaseService.saveDiaryEntry(newEntry);
        setDiaryInput('');
        setDiaryMood('neutral');
    }, [diaryInput, diaryMood]);

    const handleDeleteDiaryEntry = useCallback(async (id: string, e: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const ok = confirmFn
            ? await confirmFn('Delete this journal entry?')
            : window.confirm('Delete this entry?');
        if (!ok) return;
        try {
            await databaseService.deleteDiaryEntry(id);
            setDiaryEntries(prev => prev.filter(entry => entry.id !== id));
        } catch (e) {
            console.error("Failed to delete diary entry:", e);
        }
    }, [confirmFn]);

    const handleClearAllDiary = useCallback(async () => {
        const ok = confirmFn
            ? await confirmFn('Purge ALL journal entries?', 'This cannot be undone.')
            : window.confirm('Purge ALL journal entries?');
        if (!ok) return;
        try {
            await databaseService.clearAllDiary();
            setDiaryEntries([]);
        } catch (e) {
            console.error("Failed to clear diary:", e);
        }
    }, [confirmFn]);

    const updateStickerPosition = useCallback((id: string, x: number, y: number) => {
        setUserStickers(prev => prev.map(s => {
            if (s.id === id) {
                const updated = { ...s, x, y };
                databaseService.saveSticker(updated);
                return updated;
            }
            return s;
        }));
    }, []);

    const onCraftSuccess = useCallback((newSticker: UserSticker, consumedIds: string[]) => {
        setUserStickers(prev => {
            const filtered = prev.filter(s => !consumedIds.includes(s.id));
            const updated = [newSticker, ...filtered];

            // Database updates
            databaseService.deleteStickers(consumedIds);
            databaseService.saveSticker(newSticker);

            return updated;
        });
    }, []);

    const handleClearAllStickers = useCallback(async () => {
        const ok = confirmFn
            ? await confirmFn('Clear ALL stickers?', 'This cannot be undone.')
            : window.confirm('Are you sure you want to clear ALL stickers? This cannot be undone!');
        if (!ok) return;
        try {
            await databaseService.clearAllStickers();
            setUserStickers([]);
        } catch (e) {
            console.error("Failed to clear stickers:", e);
        }
    }, [confirmFn]);

    const addManualTask = useCallback((text: string, category: string, effort: 'low' | 'medium' | 'high' = 'medium') => {
        const memoryId = crypto.randomUUID();
        const taskId = crypto.randomUUID();
        const newTask: ActionItem = {
            id: taskId,
            text,
            category,
            urgency: 5,
            effort,
            completed: false,
            isNew: true,
            memoryId,
        };
        const newMemory: MemoryItem = {
            id: memoryId,
            timestamp: Date.now(),
            content: text,
            source: 'text',
            priority: 'medium',
            tags: [category],
            processed: true,
            category,
            actions: [newTask],
        };
        setMemories(prev => [newMemory, ...prev]);
        databaseService.saveMemory(newMemory);
    }, []);

    const addCustomCategory = useCallback((category: string) => {
        setPersona(prev => {
            const updated = {
                ...prev,
                customCategories: [...new Set([...(prev.customCategories || []), category])]
            };
            databaseService.savePersona(updated);
            return updated;
        });
    }, []);
    const deleteCategory = useCallback(async (category: string, deleteTasks: boolean) => {
        setPersona(prev => {
            const updated = {
                ...prev,
                customCategories: (prev.customCategories || []).filter(c => c !== category)
            };
            databaseService.savePersona(updated);
            return updated;
        });

        setMemories(prev => {
            const updated = prev.map(m => {
                let hasChanges = false;
                const filteredActions = (m.actions || []).map(a => {
                    if (a.category === category) {
                        hasChanges = true;
                        if (deleteTasks) return null;
                        return { ...a, category: 'Household' };
                    }
                    return a;
                }).filter(Boolean) as ActionItem[];

                if (hasChanges) {
                    const updatedMem = { ...m, actions: filteredActions };
                    databaseService.saveMemory(updatedMem);
                    return updatedMem;
                }
                return m;
            });
            return updated;
        });
    }, []);

    const reorderCategories = useCallback((newCategories: string[], persist = true) => {
        setPersona(prev => {
            const updated = {
                ...prev,
                customCategories: newCategories
            };
            if (persist) databaseService.savePersona(updated);
            return updated;
        });
    }, []);

    const updateBrutalistBackground = useCallback((background: string) => {
        setPersona(prev => {
            const updated = { ...prev, brutalistBackground: background };
            databaseService.savePersona(updated);
            return updated;
        });
    }, []);

    const exportAppData = useCallback(() => {
        const data = {
            memories,
            persona,
            diaryEntries,
            userStickers,
            version: '1.0',
            exportedAt: Date.now()
        };
        return JSON.stringify(data);
    }, [memories, persona, diaryEntries, userStickers]);

    const importAppData = useCallback(async (jsonString: string) => {
        try {
            const data = JSON.parse(jsonString);
            if (!data.memories && !data.persona) {
                throw new Error("Invalid data format");
            }

            if (data.memories) {
                setMemories(data.memories);
                data.memories.forEach((m: any) => databaseService.saveMemory(m));
            }
            if (data.persona) {
                setPersona(data.persona);
                databaseService.savePersona(data.persona);
            }
            if (data.diaryEntries) {
                setDiaryEntries(data.diaryEntries);
                for (const entry of data.diaryEntries) {
                    await databaseService.saveDiaryEntry(entry);
                }
            }
            if (data.userStickers) {
                setUserStickers(data.userStickers);
                for (const sticker of data.userStickers) {
                    await databaseService.saveSticker(sticker);
                }
            }
            return true;
        } catch (e) {
            console.error("Failed to import data:", e);
            return false;
        }
    }, [setMemories, setPersona, setDiaryEntries, setUserStickers]);

    return {
        memories,
        setMemories,
        diaryEntries,
        setDiaryEntries,
        persona,
        setPersona,
        userStickers,
        setUserStickers,
        diaryInput,
        setDiaryInput,
        diaryMood,
        setDiaryMood,
        lifeSynthesis,
        setLifeSynthesis,
        isDbLoading,
        updateTaskDetails,
        toggleTask,
        deleteTask,
        reorderTasks,
        clearAllTasks,
        handleSaveDiary,
        handleDeleteDiaryEntry,
        handleClearAllDiary,
        updateStickerPosition,
        onCraftSuccess,
        handleClearAllStickers,
        addManualTask,
        addCustomCategory,
        deleteCategory,
        reorderCategories,
        updateBrutalistBackground,
        exportAppData,
        importAppData,
        aiStatus,
        setAiStatus,
        lastAiError,
        setLastAiError,
        syncStatus,
    };
};
