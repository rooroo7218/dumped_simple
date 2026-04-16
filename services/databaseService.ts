import { supabase } from './supabaseClient';
import { MemoryItem, UserPersona, DiaryEntry, ActionItem, TaskStep, UserSticker, Item, DumpItem } from '../types';

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

        // 1. Save memory to database (only when a real Supabase session exists)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id) {
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
                user_id: authUser.id
            });

            if (memError) {
                emitSync('local-only');
                console.error('⚠️ Supabase memory save failed:', memError.message);
            }
        } else {
            emitSync('local-only');
        }

        // 2. Save actions (only when a real Supabase session exists)
        if (memory.actions && memory.actions.length > 0 && authUser?.id) {
            try {
                const actionsToSave = memory.actions.map(action => ({
                    id: action.id,
                    user_id: authUser.id,
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

                if (actionsError) {
                    emitSync('local-only');
                    console.error('⚠️ Supabase actions save failed:', actionsError.message);
                }
            } catch (err) {
                emitSync('local-only');
                console.warn('Error saving actions:', err);
            }
        }

        if (_syncListener) emitSync('saved');
    },

    async loadMemories(): Promise<MemoryItem[]> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return JSON.parse(localStorage.getItem('dumped_memories') || '[]');
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: mems, error: memError } = await supabase
            .from('memories')
            .select('*')
            .eq('user_id', user.id)
            .order('timestamp', { ascending: false });

        if (memError) throw memError;

        const { data: actionsData, error: actionsError } = await supabase
            .from('actions')
            .select('*')
            .in('memory_id', (mems || []).map(m => m.id));

        const actions = actionsData || [];
        const items = (mems || []).map(m => {
            const memActions = actions.filter(a => a.memory_id === m.id).map(action => ({
                id: action.id,
                text: action.text,
                urgency: action.urgency || 5,
                effort: action.effort || 'medium',
                category: action.category || m.category,
                rationale: action.rationale,
                completed: action.completed || false,
                scheduledTime: action.scheduled_time,
                x: action.x,
                y: action.y,
                description: action.description,
                categoryOrder: action.category_order,
                globalOrder: action.global_order ?? 0,
                memoryId: m.id
            }));

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
                actions: memActions
            };
        });

        localStorage.setItem('dumped_memories', JSON.stringify(items));
        return items;
    },

    // --- Deletion ---
    async deleteMemory(memoryId: string) {
        const localMemories = JSON.parse(localStorage.getItem('dumped_memories') || '[]');
        localStorage.setItem('dumped_memories', JSON.stringify(localMemories.filter((m: any) => m.id !== memoryId)));

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('memories').delete().eq('id', memoryId).eq('user_id', user.id);
    },

    async clearAllMemories() {
        localStorage.removeItem('dumped_memories');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('memories').delete().eq('user_id', user.id);
    },

    async deleteAction(memoryId: string, taskId: string) {
        const localMemories = JSON.parse(localStorage.getItem('dumped_memories') || '[]');
        const updated = localMemories.map((m: any) => {
            if (m.id === memoryId) {
                return { ...m, actions: (m.actions || []).filter((a: any) => a.id !== taskId) };
            }
            return m;
        });
        localStorage.setItem('dumped_memories', JSON.stringify(updated));

        await supabase.from('actions').delete().eq('id', taskId);
    },

    // --- DUMPED v3: Items & Excerpts ---
    async pushLocalItemsToCloud(): Promise<void> {
        const localItems: Item[] = JSON.parse(localStorage.getItem('dumped_items') || '[]');
        if (localItems.length === 0) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch what's already in Supabase to avoid duplicates
        const { data: existing } = await supabase
            .from('items')
            .select('id')
            .eq('user_id', user.id);

        const remoteIds = new Set((existing || []).map((r: any) => r.id));
        const unsynced = localItems.filter(i => !remoteIds.has(i.id));
        if (unsynced.length === 0) return;

        const rows = unsynced.map(i => ({
            id: i.id,
            user_id: user.id,
            label: i.label,
            mention_count: i.mentionCount ?? 1,
            last_mentioned_at: i.lastMentionedAt ? new Date(i.lastMentionedAt).toISOString() : new Date().toISOString(),
            first_mentioned_at: i.firstMentionedAt ? new Date(i.firstMentionedAt).toISOString() : new Date().toISOString(),
            is_flagged: i.isFlagged ?? false,
            is_completed: i.isCompleted ?? false,
        }));

        const { error } = await supabase.from('items').upsert(rows, { onConflict: 'id' });
        if (error) {
            console.error('pushLocalItemsToCloud failed:', error.message);
        } else {
            console.log(`✅ Pushed ${rows.length} local items to Supabase`);
        }
    },

    async loadItems(): Promise<Item[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return JSON.parse(localStorage.getItem('dumped_items') || '[]');
        }

        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('user_id', user.id)
            .order('mention_count', { ascending: false });

        if (error) {
            console.error("Error loading v3 items:", error);
            return JSON.parse(localStorage.getItem('dumped_items') || '[]');
        }

        const remoteItems = (data || []).map(d => ({
            id: d.id,
            userId: d.user_id,
            label: d.label,
            mentionCount: d.mention_count,
            lastMentionedAt: new Date(d.last_mentioned_at).getTime(),
            firstMentionedAt: new Date(d.first_mentioned_at).getTime(),
            isFlagged: d.is_flagged,
            flagOrder: d.flag_order,
            isCompleted: d.is_completed,
            completedAt: d.completed_at ? new Date(d.completed_at).getTime() : undefined,
            fadedAt: d.faded_at ? new Date(d.faded_at).getTime() : undefined,
            createdAt: new Date(d.created_at).getTime(),
            style: d.style ?? undefined,
        }));

        // One-time migration: push any localStorage items that aren't in Supabase yet
        const localItems: Item[] = JSON.parse(localStorage.getItem('dumped_items') || '[]');
        const remoteIds = new Set(remoteItems.map(i => i.id));
        const unsynced = localItems.filter(i => !remoteIds.has(i.id) && !i.isCompleted);

        if (unsynced.length > 0) {
            const rows = unsynced.map(i => ({
                id: i.id,
                user_id: user.id,
                label: i.label,
                mention_count: i.mentionCount,
                last_mentioned_at: new Date(i.lastMentionedAt).toISOString(),
                first_mentioned_at: new Date(i.firstMentionedAt).toISOString(),
                is_flagged: i.isFlagged ?? false,
                is_completed: i.isCompleted ?? false,
            }));
            const { error: upErr } = await supabase.from('items').upsert(rows, { onConflict: 'id' });
            if (upErr) console.error('Item migration failed:', upErr.message);
        }

        // Supabase is the source of truth — overwrite localStorage with what came back.
        // Do NOT merge stale localOnly items: that causes deleted items to reappear on
        // other devices whose localStorage hasn't been cleaned up yet.
        localStorage.setItem('dumped_items', JSON.stringify(remoteItems));
        return remoteItems;
    },

    async loadItemExcerpts(itemId: string): Promise<DumpItem[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            const all: DumpItem[] = JSON.parse(localStorage.getItem('dumped_dump_items') || '[]');
            return all.filter(d => d.itemId === itemId).slice(0, 3);
        }

        const { data, error } = await supabase
            .from('dump_items')
            .select('*')
            .eq('item_id', itemId)
            .order('created_at', { ascending: false })
            .limit(3);

        if (error) return [];
        return (data || []).map(d => ({
            id: d.id,
            dumpId: d.dump_id,
            itemId: d.item_id,
            rawExcerpt: d.raw_excerpt,
            createdAt: new Date(d.created_at).getTime()
        }));
    },

    async processDumpResult(dumpId: string, results: { action: 'assign' | 'create', item_id?: string, label?: string, raw_excerpt: string }[]) {
        const { data: { user } } = await supabase.auth.getUser();

        // Bypass/local mode: save to localStorage
        if (!user) {
            const items: Item[] = JSON.parse(localStorage.getItem('dumped_items') || '[]');
            const dumpItems: DumpItem[] = JSON.parse(localStorage.getItem('dumped_dump_items') || '[]');
            const now = Date.now();

            for (const res of results) {
                let itemId = res.item_id;

                if (res.action === 'create' && res.label) {
                    const newItem: Item = {
                        id: crypto.randomUUID(),
                        userId: 'local',
                        label: res.label,
                        mentionCount: 1,
                        lastMentionedAt: now,
                        firstMentionedAt: now,
                        isFlagged: false,
                        isCompleted: false,
                        createdAt: now
                    };
                    items.push(newItem);
                    itemId = newItem.id;
                } else if (res.action === 'assign' && itemId) {
                    const existing = items.find(i => i.id === itemId);
                    if (existing) {
                        existing.mentionCount += 1;
                        existing.lastMentionedAt = now;
                    }
                }

                if (itemId) {
                    dumpItems.push({
                        id: crypto.randomUUID(),
                        dumpId,
                        itemId,
                        rawExcerpt: res.raw_excerpt,
                        createdAt: now
                    });
                }
            }

            localStorage.setItem('dumped_items', JSON.stringify(items));
            localStorage.setItem('dumped_dump_items', JSON.stringify(dumpItems));
            return;
        }

        // Also maintain localStorage mirror so tasks survive any Supabase hiccup
        const localItems: Item[] = JSON.parse(localStorage.getItem('dumped_items') || '[]');
        const localDumpItems: DumpItem[] = JSON.parse(localStorage.getItem('dumped_dump_items') || '[]');
        const now = Date.now();
        let localDirty = false;

        for (const res of results) {
            let itemId = res.item_id;

            if (res.action === 'create' && res.label) {
                const { data: newItem, error: createError } = await supabase
                    .from('items')
                    .insert({
                        user_id: user.id,
                        label: res.label,
                        mention_count: 1
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error("Error creating v3 item:", createError);
                    // Still save locally so the user sees it immediately
                    const fallbackId = crypto.randomUUID();
                    localItems.push({
                        id: fallbackId, userId: user.id, label: res.label,
                        mentionCount: 1, lastMentionedAt: now, firstMentionedAt: now,
                        isFlagged: false, isCompleted: false, createdAt: now
                    });
                    itemId = fallbackId;
                    localDirty = true;
                } else {
                    itemId = newItem.id;
                    // Mirror to localStorage
                    localItems.push({
                        id: newItem.id, userId: user.id, label: res.label,
                        mentionCount: 1, lastMentionedAt: now, firstMentionedAt: now,
                        isFlagged: false, isCompleted: false, createdAt: now
                    });
                    localDirty = true;
                }
            } else if (res.action === 'assign' && itemId) {
                const { error: updateError } = await supabase.rpc('increment_item_mention', {
                    item_id_param: itemId
                });

                if (updateError) {
                    const { data: current } = await supabase.from('items').select('mention_count').eq('id', itemId).single();
                    await supabase
                        .from('items')
                        .update({
                            mention_count: (current?.mention_count || 1) + 1,
                            last_mentioned_at: new Date().toISOString()
                        })
                        .eq('id', itemId);
                }

                // Mirror to localStorage
                const local = localItems.find(i => i.id === itemId);
                if (local) { local.mentionCount += 1; local.lastMentionedAt = now; localDirty = true; }
            }

            if (itemId) {
                await supabase.from('dump_items').insert({
                    dump_id: dumpId,
                    item_id: itemId,
                    raw_excerpt: res.raw_excerpt
                });
                localDumpItems.push({ id: crypto.randomUUID(), dumpId, itemId, rawExcerpt: res.raw_excerpt, createdAt: now });
                localDirty = true;
            }
        }

        if (localDirty) {
            localStorage.setItem('dumped_items', JSON.stringify(localItems));
            localStorage.setItem('dumped_dump_items', JSON.stringify(localDumpItems));
        }
    },

    async toggleFlag(itemId: string, isFlagged: boolean) {
        const { data: { user } } = await supabase.auth.getUser();
        // Always update localStorage so it stays consistent
        const items: Item[] = JSON.parse(localStorage.getItem('dumped_items') || '[]');
        const item = items.find(i => i.id === itemId);
        if (item) { item.isFlagged = isFlagged; localStorage.setItem('dumped_items', JSON.stringify(items)); }
        if (!user) return;
        await supabase.from('items').update({ is_flagged: isFlagged }).eq('id', itemId);
    },

    async toggleComplete(itemId: string, isCompleted: boolean) {
        const { data: { user } } = await supabase.auth.getUser();
        // Always update localStorage so it stays consistent
        const items: Item[] = JSON.parse(localStorage.getItem('dumped_items') || '[]');
        const item = items.find(i => i.id === itemId);
        if (item) {
            item.isCompleted = isCompleted;
            item.completedAt = isCompleted ? Date.now() : undefined;
            if (isCompleted) item.mentionCount = 0;
            localStorage.setItem('dumped_items', JSON.stringify(items));
        }
        if (!user) return;
        const updates: any = { is_completed: isCompleted };
        if (isCompleted) {
            updates.completed_at = new Date().toISOString();
            updates.mention_count = 0;
        } else {
            updates.completed_at = null;
        }
        await supabase.from('items').update(updates).eq('id', itemId);
    },

    async saveItemStyle(itemId: string, style: { color: string; texture: string }) {
        const items: Item[] = JSON.parse(localStorage.getItem('dumped_items') || '[]');
        const item = items.find(i => i.id === itemId);
        if (item) { item.style = style; localStorage.setItem('dumped_items', JSON.stringify(items)); }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('items').update({ style }).eq('id', itemId);
    },

    async deleteItem(itemId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        // Always update localStorage so it stays consistent
        const items: Item[] = JSON.parse(localStorage.getItem('dumped_items') || '[]');
        localStorage.setItem('dumped_items', JSON.stringify(items.filter(i => i.id !== itemId)));
        if (!user) return;
        await supabase.from('items').delete().eq('id', itemId);
    },

    async fetchDumpCalendarData(): Promise<{ date: string; count: number }[]> {
        const { data: { user } } = await supabase.auth.getUser();

        // ── Helper: turn a timestamp (ms) into a local YYYY-MM-DD string ──────
        const toLocalDate = (ms: number): string => {
            const d = new Date(ms);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        if (!user) {
            // Local mode: saveMemory writes to 'dumped_memories', one entry per dump session
            const raw = localStorage.getItem('dumped_memories') || '[]';
            const memories: Array<{ id: string; timestamp: number }> = JSON.parse(raw);
            const countsByDate: Record<string, number> = {};
            memories.forEach(m => {
                if (m.timestamp) {
                    const date = toLocalDate(m.timestamp);
                    countsByDate[date] = (countsByDate[date] || 0) + 1;
                }
            });
            return Object.entries(countsByDate).map(([date, count]) => ({ date, count }));
        }

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const countsByDate: Record<string, number> = {};

        // Always include localStorage data first (catches dumps that didn't sync to Supabase)
        const localRaw = localStorage.getItem('dumped_memories') || '[]';
        const localMemories: Array<{ id: string; timestamp: number }> = JSON.parse(localRaw);
        localMemories.forEach(m => {
            if (m.timestamp && m.timestamp >= oneYearAgo.getTime()) {
                const date = toLocalDate(m.timestamp);
                countsByDate[date] = (countsByDate[date] || 0) + 1;
            }
        });

        // Primary source: memories table (one row per dump session, timestamp is BIGINT ms)
        const { data: memData, error: memError } = await supabase
            .from('memories')
            .select('timestamp')
            .eq('user_id', user.id)
            .gte('timestamp', oneYearAgo.getTime());

        if (!memError && memData && memData.length > 0) {
            // Use a Set of dates already counted from localStorage to avoid double-counting
            const localDates = new Set(Object.keys(countsByDate));
            memData.forEach(row => {
                const date = toLocalDate(row.timestamp);
                if (!localDates.has(date)) {
                    countsByDate[date] = (countsByDate[date] || 0) + 1;
                }
            });
            return Object.entries(countsByDate).map(([date, count]) => ({ date, count }));
        }

        // If Supabase returned data from localStorage only, return that
        if (Object.keys(countsByDate).length > 0) {
            return Object.entries(countsByDate).map(([date, count]) => ({ date, count }));
        }

        // Fallback: infer from items table (first_mentioned_at / last_mentioned_at)
        // Each unique date where an item was first created counts as a dump day
        const { data: itemData } = await supabase
            .from('items')
            .select('first_mentioned_at, last_mentioned_at')
            .eq('user_id', user.id);

        if (!itemData || itemData.length === 0) return [];

        const dumpDays = new Set<string>();
        const itemCountsByDate: Record<string, number> = {};

        itemData.forEach(row => {
            if (row.first_mentioned_at) {
                const date = toLocalDate(new Date(row.first_mentioned_at).getTime());
                dumpDays.add(date);
                itemCountsByDate[date] = (itemCountsByDate[date] || 0) + 1;
            }
            // last_mentioned_at may differ from first — count it too if distinct
            if (row.last_mentioned_at) {
                const date = toLocalDate(new Date(row.last_mentioned_at).getTime());
                if (!dumpDays.has(date)) {
                    dumpDays.add(date);
                    itemCountsByDate[date] = (itemCountsByDate[date] || 0) + 1;
                }
            }
        });

        return Object.entries(itemCountsByDate).map(([date, count]) => ({ date, count }));
    },

    async fetchHabitData(): Promise<boolean[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Array(7).fill(false);

        const { data, error } = await supabase
            .from('memories')
            .select('timestamp')
            .eq('user_id', user.id)
            .gte('timestamp', Date.now() - 7 * 24 * 60 * 60 * 1000);

        if (error) return new Array(7).fill(false);

        const habitDots = new Array(7).fill(false);
        const now = new Date();
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(now);
            day.setDate(now.getDate() - i);
            const startOfDay = new Date(day.setHours(0, 0, 0, 0)).getTime();
            const endOfDay = new Date(day.setHours(23, 59, 59, 999)).getTime();

            const hadDump = data.some(d => d.timestamp >= startOfDay && d.timestamp <= endOfDay);
            habitDots[6 - i] = hadDump; // Index 6 is today, 0 is 6 days ago
        }

        return habitDots;
    }
};


