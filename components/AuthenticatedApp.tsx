import React, { useState, useEffect } from 'react';
import { ActionItem, RippleEffect, UserProfile } from '../types';

// Services & Hooks
import { useAppData } from '../hooks/useAppData';
import { useAppLogic } from '../hooks/useAppLogic';
import { useBrainDump } from '../hooks/useBrainDump';
import { useProfileUpdater } from '../hooks/useProfileUpdater';
import { databaseService } from '../services/databaseService';

// Layout Components
import { Navigation } from './Layout/Navigation';
import { ZenBackground } from './Layout/ZenBackground';
import { ZenPlayer } from './ZenPlayer';

// Modular Hubs
import { BrainDumpHub } from './BrainDumpHub';
import { MemoryGridHub } from './MemoryGridHub';

// Modals & Notifications
import { ToastList } from './Notifications/Toast';
import { ConfirmDialog } from './Notifications/ConfirmDialog';
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
    { id: 'slate', name: 'Default', url: null, preview: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' },
    { id: 'aurora', name: 'Aurora Light', url: null, preview: 'linear-gradient(100deg, #bfdbfe 0%, #e0e7ff 20%, #bae6fd 40%, #ddd6fe 60%, #c7d2fe 80%, #bfdbfe 100%)' },
    { id: 'warp', name: 'Lava', url: null, preview: 'radial-gradient(ellipse at 40% 50%, hsl(203,100%,62%) 0%, hsl(255,100%,72%) 35%, hsl(158,99%,59%) 65%, hsl(264,100%,61%) 100%)' },
    { id: 'gradient', name: 'Galaxy Twilight', url: null, preview: 'radial-gradient(125% 125% at 50% 20%, #0A0A0A 35%, #2979FF 50%, #FF80AB 60%, #FF6D00 70%, #FFD600 80%, #00E676 90%, #3D5AFE 100%)' },
    { id: 'aurora_dream', name: 'Aurora Dream', url: null, preview: 'radial-gradient(ellipse 85% 65% at 8% 8%, rgba(175,109,255,0.42), transparent 60%), radial-gradient(ellipse 75% 60% at 75% 35%, rgba(255,235,170,0.55), transparent 62%), radial-gradient(ellipse 70% 60% at 15% 80%, rgba(255,100,180,0.40), transparent 62%), linear-gradient(180deg, #f7eaff 0%, #fde2ea 100%)' },
    { id: 'sunlight', name: 'Sunlight', url: null, preview: 'radial-gradient(125% 125% at 50% 101%, rgba(245,100,50,1) 10.5%, rgba(245,180,110,1) 25%, rgba(238,184,212,1) 40%, rgba(212,189,224,1) 65%, rgba(168,211,243,1) 100%)' },
    { id: 'girly_sparkles', name: 'Girly Pop ✦', url: '/assets/bg-sparkles.png', preview: 'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #fce7f3 100%)' },
    { id: 'miyazaki_meadow', name: 'Miyazaki Meadow', url: '/assets/backgrounds/u7641654266_Breathtaking_summer_meadow_in_the_style_of_Studio_4bdaec70-cf50-492c-886f-a10d45e517bc_1.png' },
    { id: 'frog_spirits_pond', name: 'Frog Spirits Pond', url: '/assets/backgrounds/u7641654266_A_child_and_a_group_of_glowing_frog_spirits_sitti_aab274ad-9c34-4368-bd60-77354c76a6e5_2.png' },
    { id: 'snowy_sledding', name: 'Snowy Sledding', url: '/assets/backgrounds/u7641654266_A_child_wrapped_in_a_thick_scarf_sledding_down_a__0a1b5130-0102-44d3-ba3f-cb2800f485d2_0.png' },
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
    const lastAiErrorRef = React.useRef<string | null>(null);

    const { toasts, showToast, dismissToast } = useToast();
    const { confirmState, confirm, handleConfirm, handleCancel } = useConfirm();
    const player = useZenPlayer();
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
            showToast('AI thinking...', 'info', lastAiError.substring(0, 50));
        }
        if (aiStatus !== 'error') lastAiErrorRef.current = null;
    }, [aiStatus, lastAiError, showToast]);

    if (data.isDbLoading) return null;

    const bgUrl = persona.brutalistBackground;
    const selectedBackground = BACKGROUND_SCENES.find(s => s.id === bgUrl || s.url === bgUrl) || BACKGROUND_SCENES[0];

    const themeClasses = {
        bg: 'bg-transparent',
        panel: 'bg-white/70 backdrop-blur-xl border-2 border-slate-950 rounded-[32px] shadow-2xl transition-all duration-700',
        card: 'bg-white/60 backdrop-blur-md border-2 border-slate-950 rounded-2xl',
        text: 'text-slate-900',
        header: 'bg-white/40 backdrop-blur-3xl border-b-2 border-slate-950',
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
                onAddTask={data.addManualTask}
                allCategories={allCategories}
                syncStatus={data.syncStatus}
            />

            <div className={`min-h-screen ${themeClasses.text} ${themeClasses.bg} font-['Plus_Jakarta_Sans'] overflow-x-hidden transition-all duration-500 relative`}>
                <ZenBackground
                    url={selectedBackground?.url || null}
                    sceneId={selectedBackground?.id || 'slate'}
                    isZenMode={true}
                    isFocusActive={isZenMode}
                />
                
                {ripples.map(r => <div key={r.id} className="rainbow-ripple" style={{ left: r.x - 50, top: r.y - 50 }} />)}

                <main className="flex-1 px-5 md:px-16 pt-8 md:pt-16 pb-24 w-full relative z-10">
                    {activeTab === 'dump' && <BrainDumpHub {...dump} persona={persona} memories={memories} activeTab={activeTab} onUpdatePersona={p => { data.setPersona(p); databaseService.savePersona(p); }} />}
                    {activeTab === 'patterns' && (
                        <div className="space-y-8">
                            <MemoryGridHub memories={data.memories} setActiveTab={setActiveTab} />
                        </div>
                    )}
                </main>
            </div>

            <ToastList toasts={toasts} dismissToast={dismissToast} />
            {confirmState && (
                <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
            )}
        </>
    );
};
