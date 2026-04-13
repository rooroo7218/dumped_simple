import React, { useState, useEffect, useCallback } from 'react';
import { MemoryItem, UserPersona, ActionItem } from '../types';
import { databaseService, SyncStatus } from '../services/databaseService';

export const useAppData = (userId?: string, confirmFn?: (message: string, sub?: string) => Promise<boolean>) => {
    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [persona, setPersona] = useState<UserPersona>({
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
    const [aiStatus, setAiStatus] = useState<'idle' | 'processing' | 'error' | 'success'>('idle');
    const [lastAiError, setLastAiError] = useState<string | null>(null);
    const [isDbLoading, setIsDbLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

    useEffect(() => {
        databaseService.onSyncChange(setSyncStatus);
        return () => { databaseService.onSyncChange(null); };
    }, []);

    // Initial Load
    useEffect(() => {
        const initDb = async () => {
            setIsDbLoading(true);
            try {
                const [dbMems, dbPersona] = await Promise.all([
                    databaseService.loadMemories(),
                    databaseService.loadPersona()
                ]);

                setMemories(dbMems || []);
                if (dbPersona) setPersona(dbPersona);
            } catch (e) {
                console.error("Failed to load initial data from DB:", e);
            } finally {
                setIsDbLoading(false);
            }
        };
        initDb();
    }, [userId]);

    // Data Update Handlers
    const handleClearAllMemories = useCallback(async () => {
        const ok = confirmFn
            ? await confirmFn('Purge ALL recorded memories?', 'This cannot be undone.')
            : window.confirm('Purge ALL recorded memories?');
        if (!ok) return;

        try {
            await databaseService.clearAllMemories();
            setMemories([]);
        } catch (e) {
            console.error("Failed to clear memories:", e);
        }
    }, [setMemories, confirmFn]);

    const handleUpdatePersona = useCallback((updates: Partial<UserPersona>) => {
        setPersona(prev => {
            const next = { ...prev, ...updates, lastUpdated: Date.now() };
            databaseService.savePersona(next);
            return next;
        });
    }, []);

    const handleAddManualTask = useCallback(async (content: string, actions: ActionItem[]) => {
        const newMemory: MemoryItem = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            content,
            source: 'manual',
            priority: 'medium',
            tags: [],
            processed: true,
            actions
        };

        setMemories(prev => [newMemory, ...prev]);
        await databaseService.saveMemory(newMemory);
    }, []);

    const handleDeleteMemory = useCallback(async (id: string) => {
        const ok = confirmFn
            ? await confirmFn('Delete this memory?')
            : window.confirm('Delete this memory?');
        if (!ok) return;

        try {
            await databaseService.deleteMemory(id);
            setMemories(prev => prev.filter(m => m.id !== id));
        } catch (e) {
            console.error("Failed to delete memory:", e);
        }
    }, [confirmFn]);

    const handleSyncMemory = useCallback(async (memory: MemoryItem) => {
        setMemories(prev => prev.map(m => m.id === memory.id ? memory : m));
        await databaseService.saveMemory(memory);
    }, []);

    return {
        // State
        memories,
        persona,
        aiStatus,
        lastAiError,
        isDbLoading,
        syncStatus,

        // Actions
        setMemories,
        setPersona,
        setAiStatus,
        setLastAiError,
        handleClearAllMemories,
        handleUpdatePersona,
        handleAddManualTask,
        handleDeleteMemory,
        handleSyncMemory
    };
};
