import { supabase } from './supabaseClient';
import { MemoryItem, UserPersona, DiaryEntry, ActionItem, TaskStep, UserSticker } from '../types';

// ─── Sync status event system ─────────────────────────────────────────────────
export type SyncStatus = 'idle' | 'saving' | 'saved' | 'local-only';
type SyncListener = (status: SyncStatus) => void;
let _syncListener: SyncListener | null = null;
let _savedTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Persona conflict detection ───────────────────────────────────────────────
type ConflictListener = (cloudPersona: UserPersona) => void;
let _conflictListener: ConflictListener | null = null;
let _lastLoadedPersonaTimestamp = 0;

function emitSync(status: SyncStatus) {
    if (!_syncListener) return;
    if (_savedTimer) { clearTimeout(_savedTimer); _savedTimer = null; }
    _syncListener(status);
    // Auto-clear 'saved' back to 'idle' after 3 seconds
    if (status === 'saved') {
        _savedTimer = setTimeout(() => { _syncListener?.('idle'); }, 3000);
    }
}

export const databaseService = {
    onSyncChange(cb: SyncListener | null) { _syncListener = cb; },
    onPersonaConflict(cb: ConflictListener | null) { _conflictListener = cb; },

    async sendActivationEmail(email: string, name: string): Promise<void> {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;
            await fetch('/api/email/activation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ email, name }),
            });
        } catch {}
    },
    // --- Persona ---
    sanitizePersona(persona: UserPersona): UserPersona {
        const sanitized = { ...persona };

        // Fix corrupted coreValues (string-spread objects)
        if (Array.isArray(sanitized.coreValues)) {
            sanitized.coreValues = sanitized.coreValues.map(v => {
                if (typeof v === 'object' && v !== null && '0' in v) {
                    // It's a string-spread object. Try to reconstruct it.
                    try {
                        const reconstructed = Object.values(v).filter(val => typeof val === 'string' && val.length === 1).join('');
                        const parsed = JSON.parse(reconstructed);
                        // If it has a 'value', prefer the structured one if reconstruction fails
                        return { ...parsed, value: parsed.value || (v as any).value || "Untitled" };
                    } catch (e) {
                        console.warn("Failed to reconstruct corrupted value, using fallback:", v);
                        return { value: (v as any).value || "Untitled", importance: 10, description: "" };
                    }
                }
                return v;
            });
        }

        // Fix legacy values/coreValues overlap: Merge them to ensure no loss
        const existingCoreValueNames = new Set((sanitized.coreValues || []).map(v => v.value.toLowerCase()));
        const legacyValues = (sanitized.values || []).filter(v => typeof v === 'string' && !existingCoreValueNames.has(v.toLowerCase()));

        if (legacyValues.length > 0) {
            sanitized.coreValues = [
                ...(sanitized.coreValues || []),
                ...legacyValues.map(v => ({ value: v, importance: 10, description: "" }))
            ];
        }

        return sanitized;
    },

    async savePersona(persona: UserPersona) {
        const sanitized = this.sanitizePersona(persona);

        // ALWAYS save to localStorage FIRST
        localStorage.setItem('dumped_persona', JSON.stringify(sanitized));

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // 3.9 — Conflict detection: check if cloud version is newer than what we're about to overwrite
        const cloudMeta = user.user_metadata?.persona_v1 as UserPersona | undefined;
        const cloudTime = cloudMeta?.lastUpdated ?? 0;
        const ourTime   = sanitized.lastUpdated ?? 0;
        const loadedTime = _lastLoadedPersonaTimestamp;
        // If cloud was updated after we last loaded, someone else saved — fire conflict event
        if (cloudTime > loadedTime + 5000 && cloudTime > ourTime) {
            _conflictListener?.(cloudMeta!);
        }

        const { data, error } = await supabase.auth.updateUser({
            data: { persona_v1: sanitized }
        });

        if (error) {
            console.error("Failed to save Persona to Auth:", error);
        }

        return { data, error };
    },

    async loadPersona(): Promise<UserPersona | null> {
        const { data: { user } } = await supabase.auth.getUser();
        let dbPersona: UserPersona | null = null;
        const localStr = localStorage.getItem('dumped_persona');
        const local = localStr ? JSON.parse(localStr) : null;

        if (user) {
            // Priority 1: Check Auth Metadata (The new reliable source)
            const meta = user.user_metadata?.persona_v1;
            if (meta) {
                dbPersona = this.sanitizePersona(meta);

                // CONFLICT RESOLUTION: Last Write Wins
                const cloudTime = dbPersona?.lastUpdated || 0;
                const localTime = local?.lastUpdated || 0;

                // Track what timestamp we loaded so savePersona can detect conflicts
                _lastLoadedPersonaTimestamp = Math.max(cloudTime, localTime);

                if (cloudTime > localTime) {
                    localStorage.setItem('dumped_persona', JSON.stringify(dbPersona));
                    return dbPersona;
                } else if (localTime > cloudTime) {
                    // We don't await this, let it happen in background
                    this.savePersona(local);
                    return local;
                } else {
                    return dbPersona;
                }
            } else {
                // Priority 2: Fallback to Profile Table (Migration path)
                const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
                if (data) {
                    dbPersona = {
                        writingStyle: data.writing_style,
                        thoughtProcess: data.thought_process,
                        values: data.values_list,
                        speakingNuances: data.speaking_nuances,
                        age: data.age,
                        jobTitle: data.career,
                        incomeLevel: data.income_level,
                        maritalStatus: data.marital_status,
                        lifestyle: data.lifestyle,
                        longTermGoals: data.long_term_goals || [],
                        coreValues: data.core_values || []
                    };
                    // Immediately migrate to Metadata for next time
                    await this.savePersona(dbPersona);
                } else if (local) {
                    this.savePersona(local);
                    return local;
                }
            }
        }

        if (dbPersona) return dbPersona;

        // Priority 3: localStorage
        return local;
    },

    // --- Memories & Task Steps ---
    async saveMemory(memory: MemoryItem) {
        emitSync('saving');
        // ALWAYS save to localStorage FIRST (works for Tester Mode)
        const localMemories = JSON.parse(localStorage.getItem('dumped_memories') || '[]');
        const existingIndex = localMemories.findIndex((m: any) => m.id === memory.id);
        if (existingIndex >= 0) {
            localMemories[existingIndex] = memory;
        } else {
            localMemories.unshift(memory);
        }
        localStorage.setItem('dumped_memories', JSON.stringify(localMemories));

        // 1. Save memory to database (may fail if not authenticated or missing columns)
        let { error: memError } = await supabase.from('memories').upsert({
            id: memory.id,
            timestamp: memory.timestamp,
            content: memory.content,
            source: memory.source,
            priority: memory.priority,
            tags: memory.tags,
            processed: memory.processed,
            category: memory.category,
            mood: memory.mood,
            life_context_insight: memory.lifeContextInsight,
            user_id: (await supabase.auth.getUser()).data.user?.id || (JSON.parse(localStorage.getItem('dumped_user') || '{}').id)
        });

        // RECOVERY: If columns like 'mood' or 'life_context_insight' are missing in OLD projects, strip and retry
        if (memError && (memError.message?.includes('column') || memError.details?.includes('column'))) {
            console.warn('Schema mismatch on memories — stripping new columns and retrying...');
            const { error: retryError } = await supabase.from('memories').upsert({
                id: memory.id,
                timestamp: memory.timestamp,
                content: memory.content,
                source: memory.source,
                priority: memory.priority,
                tags: memory.tags,
                processed: memory.processed,
                category: memory.category,
                user_id: (await supabase.auth.getUser()).data.user?.id || (JSON.parse(localStorage.getItem('dumped_user') || '{}').id)
            });
            memError = retryError;
        }

        if (memError) {
            emitSync('local-only');
            console.error('⚠️ Supabase memory save failed:', memError.message, '| code:', memError.code, '| details:', memError.details);
            // Save to localStorage as backup
            const backupMemories = JSON.parse(localStorage.getItem('dumped_memories') || '[]');
            const existingIndex = backupMemories.findIndex((m: any) => m.id === memory.id);
            if (existingIndex >= 0) {
                backupMemories[existingIndex] = memory;
            } else {
                backupMemories.unshift(memory);
            }
            localStorage.setItem('dumped_memories', JSON.stringify(backupMemories));
        }

        // 2. Save actions (with fallback if table doesn't exist yet)
        if (memory.actions && memory.actions.length > 0) {
            try {
                // Get current user ID for RLS (Support Tester Mode)
                const { data: { user } } = await supabase.auth.getUser();
                let userId = user?.id;

                if (!userId) {
                    const localUser = localStorage.getItem('dumped_user');
                    if (localUser) {
                        try {
                            const parsed = JSON.parse(localUser);
                            if (parsed.id) userId = parsed.id;
                        } catch (e) {
                            console.warn("Failed to parse local user for DB save", e);
                        }
                    }
                }

                const actionsToSave = memory.actions.map(action => ({
                    id: action.id,
                    user_id: userId, // Required for RLS policy
                    memory_id: memory.id,
                    text: action.text,
                    urgency: action.urgency,
                    effort: action.effort,
                    category: action.category,
                    rationale: action.rationale,
                    completed: action.completed,
                    scheduled_time: action.scheduledTime,
                    x: action.x,
                    y: action.y,
                    description: action.description,
                    category_order: action.categoryOrder,
                    alignment_score: action.alignmentScore,
                    impact_area: action.impactArea,
                    deadline: action.deadline,
                    last_reviewed: action.lastReviewed,
                    context_tags: action.contextTags,
                    complete_by: action.completeBy,
                    trend: action.trend,
                    trend_delta: action.trendDelta,
                    time_of_day: action.timeOfDay,
                    parked: action.parked ?? false,
                    global_order: action.globalOrder ?? null
                }));

                let { error: actionsError } = await supabase.from('actions').upsert(actionsToSave);

                // If new columns don't exist yet in live DB, strip them and retry
                const missingColumnError = (e: typeof actionsError) =>
                    e?.message?.includes('column') || e?.details?.includes('column') ||
                    e?.message?.includes('parked') || e?.message?.includes('time_of_day') || e?.message?.includes('global_order');

                if (actionsError && missingColumnError(actionsError)) {
                    console.warn('Schema mismatch on actions — stripping new columns and retrying. Run migrations in Supabase SQL editor:\n  ALTER TABLE actions ADD COLUMN IF NOT EXISTS parked BOOLEAN DEFAULT FALSE;\n  ALTER TABLE actions ADD COLUMN IF NOT EXISTS time_of_day TEXT;\n  ALTER TABLE actions ADD COLUMN IF NOT EXISTS global_order INTEGER;');
                    const stripped = actionsToSave.map(({ parked: _p, time_of_day: _t, global_order: _g, ...rest }: any) => rest);
                    const retryResult = await supabase.from('actions').upsert(stripped);
                    actionsError = retryResult.error;
                }

                // If actions table doesn't exist, save to localStorage as backup
                if (actionsError) {
                    emitSync('local-only');
                    console.error('⚠️ Supabase actions save failed:', actionsError.message, '| code:', actionsError.code, '| details:', actionsError.details);

                    // Save memory to localStorage too
                    const backupMemories = JSON.parse(localStorage.getItem('dumped_memories') || '[]');
                    const existingIndex = backupMemories.findIndex((m: any) => m.id === memory.id);
                    if (existingIndex >= 0) {
                        backupMemories[existingIndex] = memory;
                    } else {
                        backupMemories.unshift(memory);
                    }
                    localStorage.setItem('dumped_memories', JSON.stringify(backupMemories));

                    // Save actions to localStorage
                    const existingActions = JSON.parse(localStorage.getItem('backup_actions') || '{}');
                    existingActions[memory.id] = memory.actions;
                    localStorage.setItem('backup_actions', JSON.stringify(existingActions));
                }

                // 3. Save task steps for each action
                for (const action of memory.actions) {
                    if (action.steps && action.steps.length > 0) {
                        const stepsToSave = action.steps.map(step => ({
                            id: step.id,
                            memory_id: memory.id,
                            task_text: action.text,
                            step_text: step.text,
                            duration_minutes: step.durationMinutes,
                            completed: step.completed
                        }));
                        const { error: stepsError } = await supabase.from('task_steps').upsert(stepsToSave);
                        if (stepsError) console.warn('Error saving steps:', stepsError);
                    }
                }
            } catch (err) {
                emitSync('local-only');
                console.warn('Error saving actions, using localStorage backup:', err);
                const existingActions = JSON.parse(localStorage.getItem('backup_actions') || '{}');
                existingActions[memory.id] = memory.actions;
                localStorage.setItem('backup_actions', JSON.stringify(existingActions));
            }
        }

        // If we got here without hitting local-only, the save succeeded
        if (_syncListener) emitSync('saved');
    },

    async loadMemories(): Promise<MemoryItem[]> {
        const { data: { session } } = await supabase.auth.getSession();
        const isTesterMode = !session;

        // Try database if NOT in tester mode or if specifically desired
        if (!isTesterMode) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Load from Supabase — no limit, load all memories
                const { data: mems, error: memError } = await supabase
                    .from('memories')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('timestamp', { ascending: false });

                if (memError) throw memError;

                let actions: any[] = [];
                const { data: actionsData, error: actionsError } = await supabase
                    .from('actions')
                    .select('*')
                    .in('memory_id', mems.map(m => m.id));

                if (actionsError) {
                    console.warn('⚠️ Error loading actions from database, falling back to localStorage:', actionsError);
                    // If we can't load actions, the synchronization would wipe them. Fallback to localStorage instead.
                    const localMemories = JSON.parse(localStorage.getItem('dumped_memories') || '[]');
                    return localMemories;
                }
                actions = actionsData || [];

                // Secondary Recovery: Check backup_actions for anything missed
                const backupActionsByMem = JSON.parse(localStorage.getItem('backup_actions') || '{}');
                const localMemories = JSON.parse(localStorage.getItem('dumped_memories') || '[]');

                const { data: steps, error: stepsError } = await supabase
                    .from('task_steps')
                    .select('*')
                    .in('memory_id', mems.map(m => m.id));
                if (stepsError) console.warn('Note: Optional task_steps table load error:', stepsError);

                const items = mems.map(m => {
                    let memActions = actions.filter(a => a.memory_id === m.id);
                    const localMem = localMemories.find(lm => lm.id === m.id);
                    const archivedActions = backupActionsByMem[m.id];

                    // RECOVERY: Only recover if we have 0 actions for THIS memory AND we have local data,
                    // but ONLY if the local data is very recent (syncing) or if we strictly suspect a missing record.
                    if (memActions.length === 0 && (localMem?.actions?.length || archivedActions?.length)) {
                        // Strict check: Only recover if memory is under 5 mins old OR if there are NO actions 
                        // loaded across the entire app (which suggests a query failure/timeout).
                        const isVeryNew = Date.now() - m.timestamp < 5 * 60 * 1000;
                        const isGlobalFailure = actions.length === 0;

                        if (isVeryNew || isGlobalFailure) {
                            return {
                                ...m,
                                source: m.source as any,
                                priority: m.priority as any,
                                actions: localMem?.actions || archivedActions || []
                            };
                        }
                    }

                    const actionsWithSteps = memActions.map(action => {
                        const actionSteps = (steps || [])
                            .filter(s => s.memory_id === m.id && s.task_text === action.text)
                            .map(s => ({
                                id: s.id,
                                text: s.step_text,
                                durationMinutes: s.duration_minutes,
                                completed: s.completed
                            }));

                        const localAction = localMem?.actions?.find(la => la.id === action.id) || archivedActions?.find((la: any) => la.id === action.id);

                        return {
                            id: action.id,
                            text: action.text,
                            urgency: action.urgency || 5,
                            effort: (action.effort || 'medium') as 'low' | 'medium' | 'high',
                            category: action.category || m.category,
                            rationale: action.rationale,
                            completed: action.completed || false,
                            scheduledTime: action.scheduledTime || action.scheduled_time,
                            x: action.x,
                            y: action.y,
                            description: action.description,
                            categoryOrder: action.category_order,
                            globalOrder: action.global_order ?? localAction?.globalOrder ?? 0,
                            alignmentScore: action.alignment_score,
                            impactArea: action.impact_area,
                            deadline: action.deadline,
                            lastReviewed: action.last_reviewed,
                            contextTags: action.context_tags || [],
                            completeBy: action.complete_by,
                            trend: action.trend,
                            trendDelta: action.trend_delta,
                            timeOfDay: action.time_of_day,
                            parked: action.parked ?? false,
                            memoryId: m.id,
                            steps: actionSteps.length > 0 ? actionSteps : undefined
                        };
                    });

                    return {
                        id: m.id,
                        timestamp: m.timestamp,
                        content: m.content,
                        source: m.source as any,
                        priority: m.priority as any,
                        tags: m.tags,
                        processed: m.processed,
                        category: m.category,
                        mood: m.mood,
                        lifeContextInsight: m.life_context_insight,
                        actions: actionsWithSteps
                    };
                });

                // Sycn localStorage with what we found in DB
                localStorage.setItem('dumped_memories', JSON.stringify(items));
                return items;
            }
        }

        // Fallback or Tester Mode: Try localStorage
        const localMemories = JSON.parse(localStorage.getItem('dumped_memories') || '[]');
        return localMemories;
    },

    // --- Journal ---
    async saveDiaryEntry(entry: DiaryEntry) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        return await supabase.from('diary').upsert({
            id: entry.id,
            timestamp: entry.timestamp,
            content: entry.content,
            mood: entry.mood,
            transmutation_count: entry.transmutationCount,
            user_id: user.id
        });
    },

    async loadDiary(): Promise<DiaryEntry[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('diary')
            .select('*')
            .eq('user_id', user.id)
            .order('timestamp', { ascending: false });

        if (error) return [];
        return data.map(d => ({
            id: d.id,
            timestamp: d.timestamp,
            content: d.content,
            mood: d.mood,
            transmutationCount: d.transmutation_count
        }));
    },

    // --- Deletion ---
    async deleteMemory(memoryId: string) {
        // Update localStorage
        const localMemories = JSON.parse(localStorage.getItem('dumped_memories') || '[]');
        localStorage.setItem('dumped_memories', JSON.stringify(localMemories.filter((m: any) => m.id !== memoryId)));

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('memories').delete().eq('id', memoryId).eq('user_id', user.id);
        if (error) throw error;
    },

    async clearAllMemories() {
        // WIPE ALL local copies
        localStorage.removeItem('dumped_memories');
        localStorage.removeItem('backup_memories');
        localStorage.removeItem('backup_actions');
        localStorage.removeItem('dumped_synthesis');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('memories').delete().eq('user_id', user.id);
        if (error) throw error;
    },

    async deleteAction(memoryId: string, taskId: string) {
        // 1. Update localStorage (dumped_memories)
        const localMemories = JSON.parse(localStorage.getItem('dumped_memories') || '[]');
        const updated = localMemories.map((m: any) => {
            if (m.id === memoryId) {
                return { ...m, actions: (m.actions || []).filter((a: any) => a.id !== taskId) };
            }
            return m;
        });
        localStorage.setItem('dumped_memories', JSON.stringify(updated));

        // 2. Update localStorage (backup_actions) - CRITICAL to prevent recovery of deleted tasks
        const backupActions = JSON.parse(localStorage.getItem('backup_actions') || '{}');
        if (backupActions[memoryId]) {
            backupActions[memoryId] = backupActions[memoryId].filter((a: any) => a.id !== taskId);
            localStorage.setItem('backup_actions', JSON.stringify(backupActions));
        }

        // 3. Delete from Supabase actions table
        const { error: actionError } = await supabase.from('actions').delete().eq('id', taskId);
        if (actionError) {
            console.warn('Failed to delete action from Supabase, likely doesn\'t exist in DB', actionError);
        }

        // 4. Also delete task steps
        const { error: stepsError } = await supabase.from('task_steps').delete().eq('task_id', taskId);
        if (stepsError) {
            console.warn('Failed to delete steps from Supabase', stepsError);
        }
    },

    async deleteDiaryEntry(entryId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('diary').delete().eq('id', entryId).eq('user_id', user.id);
        if (error) throw error;
    },

    async clearAllDiary() {
        // Clear locally if we ever add local storage for diary
        localStorage.removeItem('dumped_diary');

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Explicitly delete by user_id
            const { error } = await supabase.from('diary').delete().eq('user_id', user.id);
            if (error) throw error;
        }
    },

    loadStickers: async (): Promise<UserSticker[]> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                const local = localStorage.getItem('dumped_stickers');
                return local ? JSON.parse(local) : [];
            }

            const { data, error } = await supabase
                .from('stickers')
                .select('*')
                .eq('user_id', user.id)
                .order('earned_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(s => ({
                id: s.id,
                stickerId: s.sticker_id,
                rarity: s.rarity,
                earnedAt: s.earned_at,
                taskId: s.task_id,
                taskText: s.task_text,
                x: s.x,
                y: s.y,
                rotation: s.rotation
            }));
        } catch (e) {
            console.warn("Falling back to local stickers:", e);
            const local = localStorage.getItem('dumped_stickers');
            return local ? JSON.parse(local) : [];
        }
    },

    saveSticker: async (sticker: UserSticker): Promise<void> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const stickers = JSON.parse(localStorage.getItem('dumped_stickers') || '[]');
            const existingIndex = stickers.findIndex((s: any) => s.id === sticker.id);
            if (existingIndex >= 0) {
                stickers[existingIndex] = sticker;
            } else {
                stickers.push(sticker);
            }
            localStorage.setItem('dumped_stickers', JSON.stringify(stickers));

            if (user) {
                const { error } = await supabase
                    .from('stickers')
                    .upsert([{
                        id: sticker.id,
                        user_id: user.id,
                        sticker_id: sticker.stickerId,
                        rarity: sticker.rarity,
                        earned_at: sticker.earnedAt,
                        task_id: sticker.taskId,
                        task_text: sticker.taskText,
                        x: sticker.x,
                        y: sticker.y,
                        rotation: sticker.rotation
                    }]);
                if (error) throw error;
            }
        } catch (e) {
            console.error("Failed to save sticker:", e);
        }
    },

    deleteStickers: async (stickerIds: string[]): Promise<void> => {
        try {
            const stickers = JSON.parse(localStorage.getItem('dumped_stickers') || '[]');
            const filtered = stickers.filter((s: any) => !stickerIds.includes(s.id));
            localStorage.setItem('dumped_stickers', JSON.stringify(filtered));

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('stickers')
                    .delete()
                    .in('id', stickerIds)
                    .eq('user_id', user.id);
                if (error) throw error;
            }
        } catch (e) {
            console.error("Failed to delete stickers:", e);
        }
    },

    clearAllStickers: async (): Promise<void> => {
        try {
            localStorage.setItem('dumped_stickers', '[]');
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('stickers')
                    .delete()
                    .eq('user_id', user.id);
                if (error) throw error;
            }
        } catch (e) {
            console.error("Failed to clear all stickers:", e);
        }
    }
};
