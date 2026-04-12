import React, { useState, useEffect, useRef } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, DragStartEvent, DragOverEvent, DragEndEvent, CollisionDetection } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ActionItem, RippleEffect, UserProfile } from '../types';
import { getCategoryColor } from '../utils/uiUtils';
import { getCurrentTimeSlot } from '../utils/taskScoring';

// Services & Hooks
import { useAppData } from '../hooks/useAppData';
import { useAppLogic } from '../hooks/useAppLogic';
import { useBrainDump } from '../hooks/useBrainDump';
import { useProfileUpdater } from '../hooks/useProfileUpdater';
import { findDuplicateTasks } from '../services/geminiService';
import { databaseService } from '../services/databaseService';

// Onboarding (re-run from About Me)
import { OnboardingFlow } from './OnboardingFlow';

// Layout Components
import { Navigation } from './Layout/Navigation';
import { ZenBackground } from './Layout/ZenBackground';
import { ZenPlayer } from './ZenPlayer';

// Modular Hubs
import { BrainDumpHub } from './BrainDumpHub';
import { MemoryGridHub } from './MemoryGridHub';
import { SimpleDumpHub } from './SimpleDumpHub';
// Modals & Notifications
import { TaskDetailModal } from './Modals/TaskDetailModal';
import { DuplicateCleanupModal } from './DuplicateCleanupModal';
import { ToastList } from './Notifications/Toast';
import { ConfirmDialog } from './Notifications/ConfirmDialog';
import { PrioritizationReportModal } from './Modals/PrioritizationReportModal';
import { WeeklySummaryModal } from './WeeklySummaryModal';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { useZenPlayer } from '../hooks/useZenPlayer';

// Icons
import { ArrowPathIcon, Bars3Icon } from '@heroicons/react/24/outline';

export type BackgroundScene = {
    id: string;
    name: string;
    url: string | null;
    /** CSS gradient string rendered as a thumbnail in the scenery picker */
    preview?: string;
};

export const BACKGROUND_SCENES: BackgroundScene[] = [
    { id: 'slate', name: 'Default', url: null,
      preview: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' },
    { id: 'aurora', name: 'Aurora Light', url: null,
      preview: 'linear-gradient(100deg, #bfdbfe 0%, #e0e7ff 20%, #bae6fd 40%, #ddd6fe 60%, #c7d2fe 80%, #bfdbfe 100%)' },
    { id: 'warp', name: 'Lava', url: null,
      preview: 'radial-gradient(ellipse at 40% 50%, hsl(203,100%,62%) 0%, hsl(255,100%,72%) 35%, hsl(158,99%,59%) 65%, hsl(264,100%,61%) 100%)' },
    { id: 'gradient', name: 'Galaxy Twilight', url: null,
      preview: 'radial-gradient(125% 125% at 50% 20%, #0A0A0A 35%, #2979FF 50%, #FF80AB 60%, #FF6D00 70%, #FFD600 80%, #00E676 90%, #3D5AFE 100%)' },
    { id: 'aurora_dream', name: 'Aurora Dream', url: null,
      preview: 'radial-gradient(ellipse 85% 65% at 8% 8%, rgba(175,109,255,0.42), transparent 60%), radial-gradient(ellipse 75% 60% at 75% 35%, rgba(255,235,170,0.55), transparent 62%), radial-gradient(ellipse 70% 60% at 15% 80%, rgba(255,100,180,0.40), transparent 62%), linear-gradient(180deg, #f7eaff 0%, #fde2ea 100%)' },
    { id: 'sunlight', name: 'Sunlight', url: null,
      preview: 'radial-gradient(125% 125% at 50% 101%, rgba(245,100,50,1) 10.5%, rgba(245,180,110,1) 25%, rgba(238,184,212,1) 40%, rgba(212,189,224,1) 65%, rgba(168,211,243,1) 100%)' },
    { id: 'girly_sparkles', name: 'Girly Pop ✦', url: '/assets/bg-sparkles.png',
      preview: 'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #fce7f3 100%)' },
    { id: 'miyazaki_meadow', name: 'Miyazaki Meadow', url: '/assets/backgrounds/u7641654266_Breathtaking_summer_meadow_in_the_style_of_Studio_4bdaec70-cf50-492c-886f-a10d45e517bc_1.png' },
    { id: 'frog_spirits_pond', name: 'Frog Spirits Pond', url: '/assets/backgrounds/u7641654266_A_child_and_a_group_of_glowing_frog_spirits_sitti_aab274ad-9c34-4368-bd60-77354c76a6e5_2.png' },
    { id: 'snowy_sledding', name: 'Snowy Sledding', url: '/assets/backgrounds/u7641654266_A_child_wrapped_in_a_thick_scarf_sledding_down_a__0a1b5130-0102-44d3-ba3f-cb2800f485d2_0.png' },
    { id: 'autumn_forest', name: 'Autumn Forest', url: '/assets/backgrounds/u7641654266_A_mystical_enchanted_forest_in_the_style_of_Studi_f6194496-a860-40a2-9530-dced69204282_3.png' },
    { id: 'flying_raft', name: 'Flying Raft', url: '/assets/backgrounds/u7641654266_A_young_boy_standing_on_a_flying_wooden_raft_reac_58d91895-1f6e-4e0d-b66e-ea4559da43a4_1.png' },
    { id: 'bakery_witch', name: 'Bakery Witch', url: '/assets/backgrounds/u7641654266_A_young_witch-in-training_leaning_on_a_bakery_cou_828723e3-de56-40ae-91a4-fe00b606d4d4_3.png' },
    { id: 'cliffside_flight', name: 'Cliffside Flight', url: '/assets/backgrounds/u7641654266_A_boy_standing_on_a_grassy_cliff_edge_throwing_a__bf7a97d2-fdce-4eee-9e61-c67ab0d4f346_3.png' },
    { id: 'fishing_pier', name: 'Fishing Pier', url: '/assets/backgrounds/u7641654266_A_young_boy_fishing_off_a_stone_pier_in_a_Mediter_013ebbdd-cdf4-420d-bd27-972276dbb7a4_2.png' },
    { id: 'seaside_morning', name: 'Seaside Morning', url: '/assets/backgrounds/u7641654266_A_charming_Seaside_Town_in_the_style_of_Studio_Gh_9a3b73cd-0883-45d4-86b8-11d6e376ac5a_1.png' },
    { id: 'rural_night', name: 'Rural Night', url: '/assets/backgrounds/u7641654266_A_magical_starry_night_sky_over_a_quiet_rural_lan_87555f66-dda9-4c6f-b57b-f68858fab990_1.png' },
    { id: 'vegetable_garden', name: 'Vibrant Vegetable Garden', url: '/assets/backgrounds/u7641654266_A_vibrant_lush_vegetable_garden_in_the_style_of_S_8f7bcbc5-4c48-4e0a-90e1-551e6c6bdec9_2.png' },
    { id: 'cozy_attic', name: 'Cozy Attic Toys', url: '/assets/backgrounds/u7641654266_A_sunlit_attic_filled_with_wooden_toys_where_a_sm_26bd8ec4-7c03-4b87-b238-5920342c06f7_0.png' },
    { id: 'mossy_shrine', name: 'Hidden Mossy Shrine', url: '/assets/backgrounds/u7641654266_A_secluded_hidden_shrine_deep_in_a_mossy_forest_i_80ae0fa7-3e34-47d2-88d8-cc43dcc580e5_1.png' },
    { id: 'canopy_path', name: 'Swaying Canopy Path', url: '/assets/backgrounds/u7641654266_A_peaceful_forest_path_under_a_canopy_of_swaying__025c25b3-682a-4edd-b2db-96195f245230_2.png' },
    { id: 'sparkling_chase', name: 'Sparkling Meadow Chase', url: '/assets/backgrounds/u7641654266_Two_siblings_running_through_a_vast_sparkling_sum_c7290b28-265a-4793-88d1-0e716c8eaf0e_2.png' },
    { id: 'owl_porch', name: 'Midnight Owl Porch', url: '/assets/backgrounds/u7641654266_A_young_girl_and_a_wise_old_owl_sitting_on_a_wood_382edd8d-a4b3-4603-a520-2d8e67ff49f6_2.png' },
    { id: 'secret_garden', name: 'Secret Overgrown Garden', url: '/assets/backgrounds/u7641654266_A_young_girl_discovering_a_hidden_overgrown_garde_7245bd42-35c3-42bd-8158-80493d9f3c96_0.png' },
    { id: 'witch_bakery', name: 'Witch\'s Bakery', url: '/assets/backgrounds/u7641654266_A_young_witch-in-training_leaning_on_a_bakery_cou_828723e3-de56-40ae-91a4-fe00b606d4d4_1.png' },
    { id: 'cliffside_plane', name: 'Cliffside Paper Plane', url: '/assets/backgrounds/u7641654266_A_boy_standing_on_a_grassy_cliff_edge_throwing_a__6d984531-e53e-4d5b-8680-043a640bfdc9_1.png' },
    { id: 'starlit_lane', name: 'Starlit Rural Lane', url: '/assets/backgrounds/u7641654266_A_magical_starry_night_sky_over_a_quiet_rural_lan_570afb0e-a7ee-48d6-96e9-1a6ef1581420_3.png' },
    { id: 'country_bus_rain', name: 'Country Bus Stop (Rain)', url: '/assets/backgrounds/u7641654266_peaceful_rainy_day_at_a_rural_bus_stop_in_the_sty_27f55527-2979-4abb-9e12-09a5a941c323_1.png' },
    { id: 'cows_grazing', name: 'Golden Meadow Cows', url: '/assets/backgrounds/u7641654266_a_beautiful_illustration_of_cows_grazing_in_a_gol_0f7590d8-85be-4839-8f95-9f3cb647392e_2.png' },
    { id: 'coastal_red_roofs', name: 'Red-Roofed Coastal Town', url: '/assets/backgrounds/u7641654266_a_charming_coastal_town_with_red-roofed_houses_bo_447dba92-84e7-495c-a610-48e0a3a31aa8_1.png' },
    { id: 'lavender_watercolor', name: 'Enchanting Lavender Watercolor', url: '/assets/backgrounds/u7641654266_a_watercolor_illustration_of_an_enchanting_lavend_b0789833-ae93-4833-96db-d0ba7720c6ed_0.png' },
    { id: 'vibrant_landscape', name: 'Vibrant Sunlit Landscape', url: '/assets/backgrounds/u7641654266_httpss.mj.runKluaqEJi8Hs_a_vibrant_sunlit_landsca_d35172f5-0f0b-4731-aeda-c77f945c9e8f_0.png' },
    { id: 'wooden_porch_plants', name: 'Cozy Porch with Plants', url: '/assets/backgrounds/u7641654266_httpss.mj.runN51qSIINnPo_a_cozy_wooden_porch_with_f4e181de-0cb0-4c42-960e-9937666df783_1.png' },
    { id: 'fairy_tale_stream', name: 'Fairy-Tale Stream', url: '/assets/backgrounds/u4647815961_In_a_breathtaking_fairy-tale_stream_that_looks_like_64094185-31c6-4acc-9455-26d86c553778.png' },
];

interface AuthenticatedAppProps {
    user: UserProfile;
    handleSignOut: () => void;
}

export const AuthenticatedApp: React.FC<AuthenticatedAppProps> = ({ user, handleSignOut }) => {
    const [activeTab, setActiveTab] = useState<any>('dump');
    const [selectedTaskIds, setSelectedTaskIds] = useState<{ memoryId: string; taskId: string } | null>(null);
    const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
    const [ripples, setRipples] = useState<RippleEffect[]>([]);
    const [isZenMode, setIsZenMode] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [showReonboarding, setShowReonboarding] = useState(false);
    const [weeklyModalCompletions, setWeeklyModalCompletions] = useState<number | null>(null);
    const [nudgeDismissed, setNudgeDismissed] = useState(false);
    const [reengageDismissed, setReengageDismissed] = useState(false);
    const [conflictPersona, setConflictPersona] = useState<import('../types').UserPersona | null>(null);
    const hasVisitedPrioritiesRef = React.useRef(false);

    // --- Logic Hooks ---
    const { toasts, showToast, dismissToast } = useToast();
    const { confirmState, confirm, handleConfirm, handleCancel } = useConfirm();
    const player = useZenPlayer();
    const data = useAppData(user.id, confirm);

    // --- Maybe Later ---
    // Primary: parked field on task → saves to Supabase via updateTaskDetails
    // Fallback: localStorage (in case Supabase parked column hasn't been added yet)
    const PARKED_KEY = 'dumped_parked_ids';
    const addMaybeLater = (id: string) => {
        const mem = data.memories.find(m => m.actions?.some(a => a.id === id));
        if (mem) data.updateTaskDetails(mem.id, id, { parked: true });
        try {
            const ids: string[] = JSON.parse(localStorage.getItem(PARKED_KEY) || '[]');
            if (!ids.includes(id)) localStorage.setItem(PARKED_KEY, JSON.stringify([...ids, id]));
        } catch {}
    };
    const removeMaybeLater = (id: string) => {
        const mem = data.memories.find(m => m.actions?.some(a => a.id === id));
        if (mem) data.updateTaskDetails(mem.id, id, { parked: false });
        try {
            const ids: string[] = JSON.parse(localStorage.getItem(PARKED_KEY) || '[]');
            localStorage.setItem(PARKED_KEY, JSON.stringify(ids.filter((x: string) => x !== id)));
        } catch {}
    };
    const maybeLaterIds = React.useMemo(() => {
        const allTaskIds = new Set(data.memories.flatMap(m => m.actions ?? []).map(a => a.id));
        const fromDb = data.memories.flatMap(m => m.actions ?? []).filter(a => a.parked).map(a => a.id);
        const fromLocal: string[] = JSON.parse(localStorage.getItem(PARKED_KEY) || '[]');
        const validLocal = fromLocal.filter(id => allTaskIds.has(id));
        return [...new Set([...fromDb, ...validLocal])];
    }, [data.memories]);
    const groupTasksByCategory = (tasks: ActionItem[]) => {
        const counts: Record<string, number> = {};
        tasks.forEach(t => {
            if (t.category) counts[t.category] = (counts[t.category] || 0) + 1;
        });
        return counts;
    };
    const { memories, setMemories, persona, aiStatus, setAiStatus, lastAiError, setLastAiError } = data;

    const logic = useAppLogic(memories, setMemories, persona, data.diaryEntries, data.setLifeSynthesis, data.updateTaskDetails, data.addCustomCategory, data.deleteCategory, setAiStatus, setLastAiError, showToast, maybeLaterIds);

    const {
        allActiveTasks, groupedTasks, allCategories, rankedTasks,
        isProcessing, handleGlobalReprioritization,
        handleSynthesis,
        reorderTasks, deleteTask, toggleTask, clearAllTasks,
        isCheckingDuplicates, setIsCheckingDuplicates,
        setDuplicateGroups, setIsCleanupModalOpen,
    } = { ...data, ...logic };

    const profileUpdater = useProfileUpdater(memories, data.diaryEntries, persona, data.setPersona);
    const dump = useBrainDump(memories, persona, setMemories, () => setActiveTab('tasks'), handleSynthesis, logic.handleAutoReprioritize, setAiStatus, setLastAiError, showToast, profileUpdater.triggerAfterDump);

    // 3.9 — Persona conflict detection
    useEffect(() => {
        databaseService.onPersonaConflict(setConflictPersona);
        return () => { databaseService.onPersonaConflict(null); };
    }, []);

    // --- AI error toast ---
    const lastAiErrorRef = useRef<string | null>(null);
    useEffect(() => {
        if (aiStatus === 'error' && lastAiError && lastAiError !== lastAiErrorRef.current) {
            lastAiErrorRef.current = lastAiError;
            const isQuota = lastAiError.includes('429') || lastAiError.toLowerCase().includes('quota') || lastAiError.toLowerCase().includes('exhausted');
            showToast(
                isQuota ? 'AI is at capacity — try again in a moment' : 'AI unavailable — try again',
                'error',
                isQuota ? 'Usage limit reached' : lastAiError.substring(0, 80)
            );
        }
        if (aiStatus !== 'error') lastAiErrorRef.current = null;
    }, [aiStatus, lastAiError, showToast]);

    // 3.11 — Onboarding activation email: fires once after first dump + first priorities visit
    useEffect(() => {
        if (activeTab === 'priorities' && memories.length >= 1 && !hasVisitedPrioritiesRef.current) {
            hasVisitedPrioritiesRef.current = true;
            const key = 'dumped_activation_email_sent';
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, '1');
                databaseService.sendActivationEmail(user.email, user.name).catch(() => {});
            }
        }
    }, [activeTab, memories.length, user.email, user.name]);

    // --- New Designation Clearing ---
    useEffect(() => {
        if (selectedTaskIds) {
            const { memoryId, taskId } = selectedTaskIds;
            const task = allActiveTasks.find(t => t.id === taskId);
            if (task && task.isNew) {
                data.updateTaskDetails(memoryId, taskId, { isNew: false });
            }
        }
    }, [selectedTaskIds, allActiveTasks, data]);

    const toggleStep = (memoryId: string, taskId: string, stepId: string) => {
        setMemories(prev => prev.map(m => {
            if (m.id === memoryId) {
                const updatedActions = m.actions?.map(a => {
                    if (a.id === taskId) {
                        const updatedSteps = a.steps?.map(s => s.id === stepId ? { ...s, completed: !s.completed } : s);
                        return { ...a, steps: updatedSteps };
                    }
                    return a;
                });
                const updatedMem = { ...m, actions: updatedActions };
                databaseService.saveMemory(updatedMem);
                return updatedMem;
            }
            return m;
        }));
    };


    // --- DnD State ---
    const [activeDragItem, setActiveDragItem] = useState<ActionItem | null>(null);
    const [activeDragCategory, setActiveDragCategory] = useState<string | null>(null);
    const [activeDragBatchId, setActiveDragBatchId] = useState<string | null>(null);
    // Stable ref so rapid state updates during cross-column drag don't lose the dragged item
    const draggedItemRef = useRef<ActionItem | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor)
    );

    // Block all rendering until initial DB load is complete — prevents empty-state flash on login
    if (data.isDbLoading) return null;

    // --- Handlers ---
    const handleToggleTask = (e: React.MouseEvent, memoryId: string, task: ActionItem) => {
        if (!task.completed) {
            const newRipple: RippleEffect = { id: crypto.randomUUID(), x: e.clientX, y: e.clientY };
            setRipples(prev => [...prev, newRipple]);
            setTimeout(() => setRipples(prev => prev.filter(r => r.id !== newRipple.id)), 600);
            // 1.4 - goal progress echo
            const matchingGoal = (persona.longTermGoals || []).find(g =>
                g.category?.toLowerCase() === task.category?.toLowerCase()
            );
            if (matchingGoal) {
                const weekStart = Date.now() - (new Date().getDay() * 86400000);
                const doneThisWeek = memories.flatMap(m => m.actions ?? [])
                    .filter(a => a.completed && a.completedAt && a.completedAt >= weekStart && a.category?.toLowerCase() === task.category?.toLowerCase()).length + 1;
                showToast(`${task.category}: ${doneThisWeek} done this week`, 'success');
            } else {
                // 3.5 — "you've done this before" confidence moment
                const totalInCategory = memories.flatMap(m => m.actions ?? [])
                    .filter(a => a.completed && a.category?.toLowerCase() === task.category?.toLowerCase()).length;
                if (totalInCategory >= 4) {
                    showToast(`${task.category}: ${totalInCategory + 1} tasks cleared`, 'success');
                } else {
                    showToast('Task completed', 'success');
                }
            }
        }
        if (!task.completed) profileUpdater.triggerAfterTaskCompletion();
        toggleTask(e, memoryId, task, () => { });
    };

    // 1.6 + 1.7 — journal save: map mood to priority context + show toast
    const handleSaveDiaryWrapped = () => {
        if (!data.diaryInput.trim()) return;
        data.handleSaveDiary();
        profileUpdater.triggerAfterJournal();
        // 1.6: map journal mood → priorities session context so the next check-in pre-fills
        const moodMap: Record<string, string> = {
            joy: 'energized', peace: 'okay', tired: 'tired',
            anxious: 'stressed', frustrated: 'stressed', elated: 'energized'
        };
        const mappedMood = moodMap[data.diaryMood] ?? 'okay';
        try {
            const existing = JSON.parse(localStorage.getItem('dumped_session_context') || 'null');
            const ctx = { mood: mappedMood, time: existing?.time ?? '1hour', location: existing?.location ?? 'home', answeredAt: Date.now() };
            localStorage.setItem('dumped_session_context', JSON.stringify(ctx));
        } catch {}
        // 1.7: toast
        showToast("Entry saved. I'll factor this in tomorrow.", 'success');
        // 2.5: debounced synthesis trigger — only if last synthesis was >6h ago
        try {
            const lastSynth = parseInt(localStorage.getItem('dumped_last_synthesis') || '0', 10);
            if (Date.now() - lastSynth > 6 * 60 * 60 * 1000 && data.diaryEntries.length >= 3) {
                localStorage.setItem('dumped_last_synthesis', String(Date.now()));
                handleSynthesis();
            }
        } catch {}
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const dragData = active.data.current;

        if (dragData?.type === 'category') {
            setActiveDragCategory(dragData.bucket);
            return;
        }

        const task = allActiveTasks.find(t => t.id === active.id);
        if (task) {
            draggedItemRef.current = task;
            setActiveDragItem(task);
            if (task.batchId) setActiveDragBatchId(task.batchId);
        }
    };

    const customCollisionDetection: CollisionDetection = (args) => {
        const { active } = args;
        const dragData = active?.data?.current;

        return closestCorners(args);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;
        const dragData = active.data.current;

        if (dragData?.type === 'category') {
            const activeCategory = activeId;
            let overCategory = '';

            if (allCategories.includes(overId)) {
                overCategory = overId;
            } else {
                const overTask = allActiveTasks.find(t => t.id === overId);
                if (overTask) overCategory = overTask.category;
            }

            if (overCategory && activeCategory !== overCategory) {
                const oldIndex = allCategories.indexOf(activeCategory);
                const newIndex = allCategories.indexOf(overCategory);
                if (oldIndex !== -1 && newIndex !== -1) {
                    const newOrder = arrayMove(allCategories, oldIndex, newIndex);
                    data.reorderCategories(newOrder, false); // Don't persist on every move
                }
            }
            return;
        }

        if (activeTab === 'tasks') {
            const activeTask = allActiveTasks.find(t => t.id === activeId);
            if (!activeTask) return;

            let overCategory = '';
            if (over.data.current?.type === 'column') {
                overCategory = over.data.current.bucket;
            } else if (allCategories.includes(overId)) {
                overCategory = overId;
            } else {
                const overTask = allActiveTasks.find(t => t.id === overId);
                if (overTask) overCategory = overTask.category;
            }

            if (overCategory && activeTask.category !== overCategory) {
                reorderTasks([{ id: activeId }], overCategory, false, activeId);
            }
        } else if (activeTab === 'priorities') {
            const oldIndex = rankedTasks.findIndex(t => t.id === activeId);
            const newIndex = rankedTasks.findIndex(t => t.id === overId);
            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const activeTask = rankedTasks[oldIndex];
                let reorderedTasks = [...rankedTasks];

                if (activeTask.batchId) {
                    // Move the entire batch
                    const batchTasks = rankedTasks.filter(t => t.batchId === activeTask.batchId);
                    const nonBatchTasks = rankedTasks.filter(t => t.batchId !== activeTask.batchId);

                    // Insert batch at new position
                    reorderedTasks = [...nonBatchTasks];
                    const insertIdx = Math.min(newIndex, reorderedTasks.length);
                    reorderedTasks.splice(insertIdx, 0, ...batchTasks);
                } else {
                    reorderedTasks = arrayMove(rankedTasks, oldIndex, newIndex);
                }

                const updates = reorderedTasks.map((t, i) => ({
                    id: t.id,
                    urgency: Math.max(1, Math.min(10, 10 - Math.floor(i / Math.max(1, reorderedTasks.length / 10)))),
                    globalOrder: 1000 - i
                }));
                reorderTasks(updates, undefined, false, activeId);
            }
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const dragData = active.data.current;

        // Save ref before clearing — used as fallback below when rapid state updates lose the task
        const savedDraggedItem = draggedItemRef.current;
        setActiveDragItem(null);
        setActiveDragCategory(null);
        setActiveDragBatchId(null);
        draggedItemRef.current = null;

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;


        // --- Category Reordering ---
        if (dragData?.type === 'category' && activeTab === 'tasks') {
            data.reorderCategories(allCategories, true);
            return;
        }

        try {
            if (activeId !== overId) {
                if (activeTab === 'priorities') {
                    const oldIndex = rankedTasks.findIndex(t => t.id === activeId);
                    const newIndex = rankedTasks.findIndex(t => t.id === overId);
                    if (oldIndex !== -1 && newIndex !== -1) {
                        const activeTask = rankedTasks[oldIndex];
                        let reorderedTasks = [...rankedTasks];

                        if (activeTask.batchId) {
                            const batchTasks = rankedTasks.filter(t => t.batchId === activeTask.batchId);
                            const nonBatchTasks = rankedTasks.filter(t => t.batchId !== activeTask.batchId);
                            reorderedTasks = [...nonBatchTasks];
                            const insertIdx = Math.min(newIndex, reorderedTasks.length);
                            reorderedTasks.splice(insertIdx, 0, ...batchTasks);
                        } else {
                            reorderedTasks = arrayMove(rankedTasks, oldIndex, newIndex);
                        }

                        const updates = reorderedTasks.map((t, i) => ({
                            id: t.id,
                            urgency: Math.max(1, Math.min(10, 10 - Math.floor(i / Math.max(1, reorderedTasks.length / 10)))),
                            globalOrder: 1000 - i
                        }));
                        reorderTasks(updates, undefined, true, activeId);
                    }
                } else if (activeTab === 'tasks') {
                    // Use saved ref as fallback — rapid state updates can briefly lose the task in allActiveTasks
                    const activeTask = allActiveTasks.find(t => t.id === activeId) ?? savedDraggedItem;
                    const overTask = allActiveTasks.find(t => t.id === overId);

                    if (!activeTask) return;

                    const columnDrop = over.data.current?.type === 'column' ? over.data.current.bucket : null;

                    if (columnDrop) {
                        if (activeTask.category !== columnDrop) reorderTasks([{ id: activeId }], columnDrop, true, activeId);
                    } else if (allCategories.includes(overId)) {
                        if (activeTask.category !== overId) reorderTasks([{ id: activeId }], overId, true, activeId);
                    } else if (overTask) {
                        if (activeTask.category !== overTask.category) {
                            reorderTasks([{ id: activeId }], overTask.category, true, activeId);
                        } else {
                            const categoryTasks = groupedTasks[activeTask.category]?.map(g => g.task) || [];
                            const oldIndex = categoryTasks.findIndex(t => t.id === activeId);
                            const newIndex = categoryTasks.findIndex(t => t.id === overId);
                            if (oldIndex !== -1 && newIndex !== -1) {
                                const newOrder = arrayMove(categoryTasks, oldIndex, newIndex) as ActionItem[];
                                const updates = newOrder.map((t, i) => ({ id: t.id, categoryOrder: 1000 - i }));
                                reorderTasks(updates, undefined, true, activeId);
                            }
                        }
                    }
                }
            } else if (activeTab === 'tasks') {
                const task = allActiveTasks.find(t => t.id === activeId) ?? savedDraggedItem;
                if (task) reorderTasks([{ id: activeId }], task.category, true, activeId);
            } else if (activeTab === 'priorities') {
                const updates = rankedTasks.map((t, i) => ({
                    id: t.id,
                    urgency: Math.max(1, Math.min(10, 10 - Math.floor(i / Math.max(1, rankedTasks.length / 10)))),
                    globalOrder: 1000 - i
                }));
                reorderTasks(updates, undefined, true, activeId);
            }
        } catch (err) {
            console.error('Drag end error:', err);
        }
    };

    const handleDragCancel = () => {
        setActiveDragItem(null);
        setActiveDragCategory(null);
        setActiveDragBatchId(null);
    };

    const bgUrl = persona.brutalistBackground;
    const selectedBackground = BACKGROUND_SCENES.find(s => s.id === bgUrl || s.url === bgUrl) || BACKGROUND_SCENES.find(s => s.id === 'ghibli_hills_4k') || BACKGROUND_SCENES[0];
    const bgStyle = selectedBackground?.url
        ? `bg-[url("${selectedBackground.url}")] bg-cover bg-center bg-fixed shadow-inner`
        : 'bg-slate-50';

    const themeClasses = {
        bg: 'bg-transparent',
        panel: 'bg-white/70 backdrop-blur-xl border-2 border-slate-950 rounded-[32px] shadow-2xl transition-all duration-700',
        card: 'bg-white/60 backdrop-blur-md border-2 border-slate-950 rounded-2xl hover:bg-white/80 transition-all shadow-sm hover:shadow-md cursor-pointer group',
        text: 'text-slate-900',
        header: 'bg-white/40 backdrop-blur-3xl border-b-2 border-slate-950',
        nav: 'bg-white/50 backdrop-blur-lg border-2 border-slate-950 rounded-full shadow-lg px-2',
        navActive: 'bg-slate-800/90 text-white rounded-full shadow-inner',
        button: 'bg-slate-800/80 hover:bg-slate-700 backdrop-blur-sm text-white rounded-xl shadow-lg border-2 border-slate-950 transition-all active:scale-95'
    };

    return (
        <>
        <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            {/* Navigation lives OUTSIDE the overflow-x-hidden wrapper so fixed positioning works */}
            <Navigation
                activeTab={activeTab}
                setActiveTab={(tab) => {
                    setFocusTaskId(null);
                    setActiveTab(tab);
                }}
                themeClasses={themeClasses}
                isZenMode={isZenMode}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                user={user}
                handleSignOut={handleSignOut}
                persona={persona}
                updateBrutalistBackground={data.updateBrutalistBackground}
                backgroundScenes={BACKGROUND_SCENES}
                player={player}
                onAddTask={data.addManualTask}
                allCategories={allCategories}
                syncStatus={data.syncStatus}
            />
            {/* ── localStorage-only warning banner ── */}
            {data.syncStatus === 'local-only' && (
                <div className="fixed top-12 left-0 right-0 z-30 flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    Data is saving locally only — not synced to your account. Check your connection.
                </div>
            )}

            <div className={`min-h-screen ${themeClasses.text} ${themeClasses.bg} font-['Plus_Jakarta_Sans'] overflow-x-hidden transition-all duration-500 relative`}>
                <ZenBackground
                    url={selectedBackground?.url || null}
                    sceneId={selectedBackground?.id || 'slate'}
                    isZenMode={true}
                    isFocusActive={isZenMode}
                />
                {data.isDbLoading && (
                    <div className="fixed bottom-24 right-4 z-[100] flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full shadow-sm">
                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin text-slate-500" />
                        <span className="text-[11px] font-medium text-slate-500">Loading…</span>
                    </div>
                )}

                {ripples.map(r => <div key={r.id} className="rainbow-ripple" style={{ left: r.x - 50, top: r.y - 50 }} />)}

                <main className="flex-1 px-5 md:px-16 pt-8 md:pt-16 pb-24 w-full relative z-10">
                    {activeTab === 'dump' && <BrainDumpHub {...dump} persona={persona} memories={memories} activeTab={activeTab} onUpdatePersona={p => { data.setPersona(p); databaseService.savePersona(p); }} />}
                    {activeTab === 'patterns' && (
                        <div className="space-y-8">
                            <MemoryGridHub memories={data.memories} setActiveTab={setActiveTab} />
                        </div>
                    )}
                </main>

                {(() => {
                    if (!selectedTaskIds) return null;
                    const memory = memories.find(m => m.id === selectedTaskIds.memoryId);
                    const task = memory?.actions?.find(a => a.id === selectedTaskIds.taskId);
                    if (!task) return null;

                    return (
                        <TaskDetailModal
                            selectedTask={{ memoryId: selectedTaskIds.memoryId, task }}
                            setSelectedTask={setSelectedTaskIds}
                            updateTaskDetails={data.updateTaskDetails}
                            toggleTask={handleToggleTask}
                            isMaybeLater={maybeLaterIds.includes(selectedTaskIds.taskId)}
                            onMaybeLater={addMaybeLater}
                            onRestoreMaybeLater={removeMaybeLater}
                            handleDeleteTask={async (memoryId, taskId) => {
                                await deleteTask(memoryId, taskId);
                                showToast('Task deleted', 'info');
                            }}
                            toggleStep={toggleStep}
                            handleDeepBreakdown={() => logic.handleDeepBreakdown(selectedTaskIds.memoryId, task)}
                            isProcessing={isProcessing}
                            allCategories={logic.allCategories}
                            allActiveTasks={allActiveTasks}
                            onStartFocus={(taskId) => {
                                setFocusTaskId(taskId);
                                setActiveTab('focus');
                                setSelectedTaskIds(null);
                            }}
                        />
                    );
                })()}

                {logic.strategySummary && (
                    <PrioritizationReportModal
                        summary={logic.strategySummary}
                        onClose={() => logic.setStrategySummary(null)}
                        rankedTasks={logic.rankedTasks}
                    />
                )}

                {isProcessing && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full shadow-sm">
                        <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-slate-500 animate-spin rounded-full" />
                        <span className="text-[11px] font-medium text-slate-500">Re-ranking your tasks…</span>
                    </div>
                )}

                {logic.isCleanupModalOpen && (
                    <DuplicateCleanupModal
                        isOpen={logic.isCleanupModalOpen}
                        onClose={() => logic.setIsCleanupModalOpen(false)}
                        groups={logic.duplicateGroups}
                        onResolve={logic.handleResolveDuplicateGroup}
                    />
                )}

                {weeklyModalCompletions !== null && (
                    <WeeklySummaryModal
                        memories={data.memories}
                        sessionCompletions={weeklyModalCompletions}
                        onClose={() => setWeeklyModalCompletions(null)}
                    />
                )}

                {/* 3.9 — Persona conflict banner */}
                {conflictPersona && (
                    <div className="fixed top-12 left-0 right-0 z-40 flex items-center justify-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-[12px] font-semibold animate-in slide-in-from-top-2 duration-300">
                        <span>Your profile was updated on another device. Which version do you want to keep?</span>
                        <button onClick={() => { data.setPersona(conflictPersona); databaseService.savePersona(conflictPersona); setConflictPersona(null); }} className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] hover:bg-amber-600 transition-colors">Use other device</button>
                        <button onClick={() => { databaseService.savePersona(persona); setConflictPersona(null); }} className="px-2.5 py-1 rounded-full bg-white border border-amber-300 text-amber-700 text-[11px] hover:bg-amber-50 transition-colors">Keep this one</button>
                    </div>
                )}

                {/* 3.12 — Re-engagement banner */}
                {(() => {
                    if (reengageDismissed || memories.length === 0) return null;
                    const lastCompletion = memories.flatMap(m => m.actions ?? [])
                        .filter(a => a.completed && a.completedAt).reduce((max, a) => Math.max(max, a.completedAt!), 0);
                    const daysSince = lastCompletion > 0 ? Math.floor((Date.now() - lastCompletion) / 86400000) : 0;
                    if (daysSince < 3) return null;
                    const pendingCount = memories.flatMap(m => m.actions ?? []).filter(a => !a.completed).length;
                    if (pendingCount === 0) return null;
                    const topGoal = (persona.longTermGoals || [])[0];
                    return (
                        <div className="fixed top-12 left-0 right-0 z-30 flex items-center justify-center gap-3 px-4 py-2.5 bg-slate-800 text-slate-200 text-[12px] font-semibold animate-in slide-in-from-top-2 duration-300">
                            <span>
                                {topGoal
                                    ? `Your ${topGoal.goal} goal has ${pendingCount} task${pendingCount !== 1 ? 's' : ''} waiting. Whenever you're ready.`
                                    : `${pendingCount} task${pendingCount !== 1 ? 's' : ''} waiting. Whenever you're ready.`}
                            </span>
                            <button onClick={() => { setActiveTab('priorities'); setReengageDismissed(true); }} className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] transition-colors">
                                Let's go
                            </button>
                            <button onClick={() => setReengageDismissed(true)} className="text-slate-500 hover:text-white transition-colors">×</button>
                        </div>
                    );
                })()}

                {/* 1.3 — Evening journal nudge */}
                {(() => {
                    if (nudgeDismissed || activeTab === 'diary' || getCurrentTimeSlot() !== 'evening') return null;
                    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
                    const journaledToday = data.diaryEntries.some(e => e.timestamp >= todayStart.getTime());
                    if (journaledToday) return null;
                    return (
                        <div className="fixed bottom-24 right-4 z-[200] flex items-center gap-2 pl-3 pr-2 py-2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full shadow-lg text-[12px] font-semibold text-slate-700 animate-in slide-in-from-bottom-2 duration-300">
                            <span>✍️ How was today?</span>
                            <button onClick={() => { setActiveTab('diary'); setNudgeDismissed(true); }} className="px-2.5 py-1 rounded-full bg-slate-800 text-white text-[11px] hover:bg-slate-700 transition-colors">
                                Journal →
                            </button>
                            <button onClick={() => setNudgeDismissed(true)} className="p-1 text-slate-400 hover:text-slate-500 transition-colors">×</button>
                        </div>
                    );
                })()}

                <ToastList toasts={toasts} onDismiss={dismissToast} />
                {confirmState && (
                    <ConfirmDialog
                        message={confirmState.message}
                        sub={confirmState.sub}
                        onConfirm={handleConfirm}
                        onCancel={handleCancel}
                        destructive
                    />
                )}
                <DragOverlay>
                    {activeDragCategory && (
                        <div className="w-[280px] px-3 py-2.5 mx-1 flex items-center gap-2 border-2 border-black rounded-xl bg-white/85 shadow-lg cursor-grabbing opacity-90">
                            <Bars3Icon className="w-4 h-4 opacity-40" />
                            <h3 className="font-bold text-sm">{activeDragCategory}</h3>
                        </div>
                    )}

                    {activeDragItem && (
                        <div className={`w-[280px] px-3 py-2 shadow-2xl cursor-grabbing ${themeClasses.card}`}>
                            <div className="flex gap-3 h-[58px]">
                                <div className="shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded-full border-2 border-black opacity-40" />
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <span className="text-[13px] font-semibold leading-snug flex-1 min-w-0 line-clamp-2">
                                        {activeDragItem.text}
                                    </span>
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        {activeDragItem.isNew && (
                                            <span className="text-[8px] font-black shrink-0 px-1.5 py-0.5 rounded-full bg-rose-500 text-white">NEW</span>
                                        )}
                                        {activeDragItem.urgency > 8 && (
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">Urgent</span>
                                        )}
                                        {activeDragItem.contextTags?.slice(0, 2).map(tag => (
                                            <span key={tag} className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 whitespace-nowrap shrink-0">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </DragOverlay>

                <ZenPlayer player={player} />

            </div>
        </DndContext>

        {showReonboarding && (
            <OnboardingFlow
                onComplete={() => setShowReonboarding(false)}
                initialData={{
                    name: user.name?.split(' ')[0] || '',
                    roles: persona.jobTitle ? persona.jobTitle.split(', ').filter(Boolean) : [],
                    lifeAreas: persona.values?.length ? persona.values : (persona.customCategories || []),
                    goals: (() => {
                        const g = (persona.longTermGoals || []).slice(0, 3).map(lg => lg.goal);
                        while (g.length < 3) g.push('');
                        return g;
                    })(),
                    hoursPerDay: persona.productivityPatterns?.focusType || '',
                    workStyle: persona.productivityPatterns?.peakEnergyTime || '',
                    successVision: persona.successVision || '',
                    avoidances: (persona.currentConstraints || [])
                        .find(c => c.startsWith('Known avoidance pattern: '))
                        ?.replace('Known avoidance pattern: ', '') || '',
                }}
            />
        )}
        </>
    );
};
