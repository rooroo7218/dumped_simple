import React, { useState, useEffect } from 'react';
import { ActionItem, RippleEffect, UserProfile } from '../types';

// Services & Hooks
import { useAppData } from '../hooks/useAppData';
import { useAppLogic } from '../hooks/useAppLogic';
import { useBrainDump } from '../hooks/useBrainDump';
import { useProfileUpdater } from '../hooks/useProfileUpdater';
import { useSubscription } from '../hooks/useSubscription';
import { databaseService } from '../services/databaseService';

// Layout Components
import { Navigation } from './Layout/Navigation';
import { ZenBackground } from './Layout/ZenBackground';
import { ZenPlayer } from './ZenPlayer';

// Modular Hubs
import { BrainDumpHub } from './BrainDumpHub';
import { TilesHub } from './TilesHub';
import { PatternHub } from './PatternHub';
import { PersonaEditor } from './Persona/PersonaEditor';
import { RhythmCalendar } from './RhythmCalendar';

// Modals & Notifications
import { ToastList } from './Notifications/Toast';
import { ConfirmDialog } from './Notifications/ConfirmDialog';
import { ErrorBoundary } from './ErrorBoundary';
import { PaywallModal } from './PaywallModal';
import { Onboarding, shouldShowOnboarding } from './Onboarding';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { useZenPlayer } from '../hooks/useZenPlayer';

// Icons
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export type BackgroundScene = {
    id: string;
    name: string;
    url: string | null;
    preview?: string;
};

export const BACKGROUND_SCENES: BackgroundScene[] = [
    { id: 'aurora', name: 'Aurora', url: null, preview: 'bg-gradient-to-br from-blue-400 to-indigo-600' },
    { id: 'gradient', name: 'Cosmic', url: null, preview: 'bg-gradient-to-br from-purple-900 via-slate-900 to-black' },
    { id: 'sunlight', name: 'Sunlight', url: null, preview: 'bg-gradient-to-br from-amber-200 to-orange-400' },
    { id: 'matrix', name: 'Digital Rain', url: null, preview: 'bg-black text-[#00ff00]' },
    { id: 'shadow', name: 'Ethereal Shadow', url: null, preview: 'bg-slate-800' },
    { id: 'rays', name: 'God Rays', url: null, preview: 'bg-blue-900' },
    { id: 'warp', name: 'Warp Drive', url: null, preview: 'bg-black opacity-90' },
    { id: 'aurora_dream', name: 'Aurora Dream', url: null, preview: 'radial-gradient(ellipse 85% 65% at 8% 8%, rgba(175,109,255,0.42), transparent 60%), radial-gradient(ellipse 75% 60% at 75% 35%, rgba(255,235,170,0.55), transparent 62%), radial-gradient(ellipse 70% 60% at 15% 80%, rgba(255,100,180,0.40), transparent 62%), linear-gradient(180deg, #f7eaff 0%, #fde2ea 100%)' },
    { id: 'peachy', name: 'Peachy Sunrise', url: null, preview: 'linear-gradient(180deg, rgba(255,247,237,1) 0%, rgba(255,237,213,0.8) 50%, rgba(249,115,22,0.3) 100%)' },
    { id: 'shader', name: 'Deep Shader', url: null, preview: 'linear-gradient(135deg, #000000 0%, #06b6d4 50%, #f97316 100%)' },
    { id: 'xenon', name: 'Xenon Pulse', url: null, preview: 'linear-gradient(135deg, #000000 0%, #39ff14 50%, #00ffff 100%)' },
    { id: 'novatrix', name: 'Novatrix Flow', url: null, preview: 'linear-gradient(135deg, #1a1a1a 0%, #ff00ff 50%, #0000ff 100%)' },
    { id: 'zenitho', name: 'Zenitho Aura', url: null, preview: 'linear-gradient(135deg, #000000 0%, #ff7e5f 50%, #feb47b 100%)' },
    { id: 'neon', name: 'Neon City', url: null, preview: 'bg-fuchsia-950' },
    { id: 'lamp', name: 'Studio Lamp', url: null, preview: 'bg-slate-900' },
];

interface AuthenticatedAppProps {
    user: UserProfile;
    handleSignOut: () => void;
}

export const AuthenticatedApp: React.FC<AuthenticatedAppProps> = ({ user, handleSignOut }) => {
    const [activeTab, setActiveTab] = useState<any>('dump');
    const [ripples, ] = useState<RippleEffect[]>([]);
    const [isZenMode, ] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(() => {
        const local = shouldShowOnboarding();
        // If user already has the flag in metadata, don't show it even if local is empty
        const meta = (user as any).onboarding_completed;
        if (meta === true) return false;
        return local;
    });
    const lastAiErrorRef = React.useRef<string | null>(null);

    const { toasts, showToast, dismissToast } = useToast();
    const { confirmState, confirm, handleConfirm, handleCancel } = useConfirm();
    const player = useZenPlayer();
    const subscription = useSubscription(user.id);
    const [isOptimisticallyPaid, setIsOptimisticallyPaid] = useState(false);

    // Detect Stripe checkout redirect and show toast
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const checkout = params.get('checkout');
        if (checkout === 'success') {
            showToast('You\'re all set!', 'success', 'Welcome to Dumped.');
            setIsOptimisticallyPaid(true);
            subscription.refresh(); // Attempt to get the latest status
            window.history.replaceState({}, '', window.location.pathname);
        } else if (checkout === 'canceled') {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [subscription.refresh, showToast]);
    
    // Migration: If we just logged in and have local guest data, push it to Supabase
    useEffect(() => {
        const isRealUser = user.id && user.id !== '00000000-0000-0000-0000-000000000000';
        const hasLocalStorage = localStorage.getItem('dumped_memories') || localStorage.getItem('dumped_items');
        
        if (isRealUser && hasLocalStorage) {
            console.log("🔄 [Migration] Migrating guest data to user account...");
            databaseService.pushLocalMemoriesToCloud();
            databaseService.pushLocalItemsToCloud();
            // Once pushed, we'll let the next load() from TilesHub sync everything back
        }
    }, [user.id]);
    const data = useAppData(user.id, confirm);

    const maybeLaterIds = React.useMemo(() => {
        const allTaskIds = new Set(data.memories.flatMap(m => m.actions ?? []).map(a => a.id));
        const fromDb = data.memories.flatMap(m => m.actions ?? []).filter(a => a.parked).map(a => a.id);
        const fromLocal: string[] = JSON.parse(localStorage.getItem('dumped_parked') || '[]');
        return [...new Set([...fromDb, ...fromLocal.filter(id => allTaskIds.has(id))])];
    }, [data.memories]);

    const { memories, setMemories, persona, aiStatus, setAiStatus, lastAiError, setLastAiError } = data;

    const logic = useAppLogic(memories, setMemories, persona, [], () => {}, () => {}, () => {}, () => {}, setAiStatus, setLastAiError, showToast, maybeLaterIds);

    const { allCategories } = { ...data, ...logic };

    const profileUpdater = useProfileUpdater(memories, [], persona, data.setPersona);
    const dump = useBrainDump(memories, persona, setMemories, () => setActiveTab('patterns'), setAiStatus, setLastAiError, showToast, profileUpdater.triggerAfterDump);

    useEffect(() => {
        if (aiStatus === 'error' && lastAiError && lastAiError !== lastAiErrorRef.current) {
            lastAiErrorRef.current = lastAiError;
            showToast('Your dump was saved', 'info', 'AI is temporarily unavailable — tiles will appear once it recovers.');
        }
        if (aiStatus !== 'error') lastAiErrorRef.current = null;
    }, [aiStatus, lastAiError, showToast]);

    // ── Daily Ritual Reminders ──
    useEffect(() => {
        const settings = persona.reminderSettings;
        if (!settings?.enabled) return;

        const checkReminder = () => {
            const [hour, minute] = settings.time.split(':').map(Number);
            const now = new Date();
            
            // Only proceed if it's the right hour/minute window
            if (now.getHours() !== hour || now.getMinutes() < minute) return;

            const lastSent = settings.lastReminderSent || 0;
            const twelveHours = 12 * 60 * 60 * 1000;
            if (now.getTime() - lastSent < twelveHours) return;

            // Check if we already dumped today - optimize by looking from the end of the array
            // since memories are likely sorted by timestamp or at least recent ones are at the end.
            const startOfDay = new Date();
            startOfDay.setHours(0,0,0,0);
            const startOfDayTime = startOfDay.getTime();
            
            let hasDumpedToday = false;
            for (let i = memories.length - 1; i >= 0; i--) {
                if (memories[i].timestamp >= startOfDayTime) {
                    hasDumpedToday = true;
                    break;
                }
                // If we encounter an old memory, we can stop if they are sorted
                if (memories[i].timestamp < startOfDayTime - 86400000) break; 
            }
            
            if (hasDumpedToday) return;

            showToast(
                `Time for your ${settings.timeOfDay} ritual!`, 
                'info', 
                `Don't forget to do your ${settings.timeOfDay} brain dump.`
            );
            data.handleUpdatePersona({ 
                reminderSettings: { ...settings, lastReminderSent: now.getTime() } 
            });
        };

        // Check every 2 minutes instead of 1 to reduce background noise
        const interval = setInterval(checkReminder, 120000); 
        checkReminder();
        return () => clearInterval(interval);
    }, [persona.reminderSettings, memories, showToast, data.handleUpdatePersona]);

    if (data.isDbLoading) return null;

    const bgUrl = persona.brutalistBackground;
    const selectedBackground = BACKGROUND_SCENES.find(s => s.id === bgUrl || s.url === bgUrl) || BACKGROUND_SCENES[0];


    const themeClasses = {
        bg: 'bg-transparent',
        panel: 'bg-white/70 backdrop-blur-xl border-2 border-white/20 rounded-[32px] shadow-2xl transition-all duration-700',
        card: 'bg-white/60 backdrop-blur-md border-2 border-white/20 rounded-2xl',
        text: 'text-slate-900',
        header: 'bg-white/40 backdrop-blur-3xl border-b border-white/10',
        navActive: 'bg-slate-950 text-white shadow-lg',
    };

    return (
        <>
            <Navigation
                activeTab={activeTab}
                setActiveTab={setActiveTab}
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
                onAddTask={data.handleAddManualTask}
                allCategories={allCategories}
                onUpdatePersona={data.handleUpdatePersona}
                syncStatus={data.syncStatus}
                subscription={subscription}
            />

            <div className={`${themeClasses.text} ${themeClasses.bg} overflow-x-hidden transition-all duration-500 relative z-10`} style={{ minHeight: '100dvh' }}>
                <ZenBackground
                    url={selectedBackground?.url || null}
                    sceneId={selectedBackground?.id || 'slate'}
                    isZenMode={true}
                    isFocusActive={isZenMode}
                />
                
                {activeTab === 'patterns' && (
                    <main className="main-content-pad-top flex-1 w-full relative z-10 px-5 md:px-16 pb-48">
                        <div className="space-y-8">
                            <ErrorBoundary inline>
                                <TilesHub 
                                    setActiveTab={setActiveTab} 
                                    aiStatus={aiStatus} 
                                    thinkingCopy={dump.thinkingCopy}
                                    persona={persona}
                                    user={user}
                                />
                            </ErrorBoundary>
                        </div>
                    </main>
                )}

                {activeTab === 'rhythm' && (
                    <main className="main-content-pad-top flex-1 w-full relative z-10 px-5 md:px-16 pb-48">
                        <ErrorBoundary inline>
                            <RhythmCalendar 
                                persona={persona} 
                                onUpdatePersona={data.handleUpdatePersona} 
                            />
                        </ErrorBoundary>
                    </main>
                )}

                {activeTab === 'streak' && (
                    <main className="main-content-pad-top flex-1 w-full relative z-10 px-5 md:px-16" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
                        <ErrorBoundary inline>
                            <PatternHub />
                        </ErrorBoundary>
                    </main>
                )}

                {activeTab === 'persona' && (
                    <main className="main-content-pad-top flex-1 w-full relative z-10 px-5 md:px-16" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
                        <ErrorBoundary inline>
                            <PersonaEditor 
                                persona={persona} 
                                onSave={data.handleUpdatePersona}
                                onReprioritize={async (p) => {
                                    setAiStatus('processing');
                                    try { 
                                        // Logic for reprioritization would go here or in useAppLogic
                                        // For now, mirroring existing behavior if any
                                    } finally {
                                        setAiStatus('idle');
                                    }
                                }}
                                isProcessing={aiStatus === 'processing'}
                            />
                        </ErrorBoundary>
                    </main>
                )}

                {/* Dump screen renders outside the scrollable layout — it owns the full viewport */}
                {activeTab === 'dump' && (
                    <ErrorBoundary inline>
                        <BrainDumpHub
                            {...dump}
                            onNavigateToGrid={() => setActiveTab('patterns')}
                            isGuest={(user as any).isGuest === true}
                        />
                    </ErrorBoundary>
                )}
            </div>

            <ZenPlayer player={player} />
            <ToastList toasts={toasts} dismissToast={dismissToast} />
            {confirmState && (
                <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
            )}
            {showOnboarding && (!subscription.isBlocked || isOptimisticallyPaid) && (
                <Onboarding 
                    userId={user.id}
                    onDone={() => setShowOnboarding(false)} 
                />
            )}
            {subscription.isBlocked && !isOptimisticallyPaid && (
                <PaywallModal reason={subscription.status} />
            )}
        </>
    );
};

