import React, { useState } from 'react';
import { OnboardingData, UserPersona } from '../types';
import { processBrainDump } from '../services/geminiService';
import { databaseService } from '../services/databaseService';

// ─── Option data ──────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
    { label: 'Founder / CEO', emoji: '🚀' },
    { label: 'Executive',     emoji: '💼' },
    { label: 'Manager',       emoji: '👥' },
    { label: 'Freelancer',    emoji: '🎯' },
    { label: 'Parent',        emoji: '👨‍👩‍👧' },
    { label: 'Student',       emoji: '📚' },
    { label: 'Creative',      emoji: '🎨' },
    { label: 'Professional',  emoji: '🏢' },
    { label: 'Entrepreneur',  emoji: '💡' },
    { label: 'Caregiver',     emoji: '🤝' },
];

const LIFE_AREA_OPTIONS = [
    { label: 'Work',            emoji: '💼' },
    { label: 'Health',          emoji: '🏃' },
    { label: 'Finances',        emoji: '💰' },
    { label: 'Family',          emoji: '🏠' },
    { label: 'Relationships',   emoji: '❤️' },
    { label: 'Personal Growth', emoji: '🌱' },
    { label: 'Side Projects',   emoji: '⚡' },
    { label: 'Mental Health',   emoji: '🧠' },
    { label: 'Home & Admin',    emoji: '📋' },
    { label: 'Social Life',     emoji: '🎉' },
    { label: 'Learning',        emoji: '📖' },
    { label: 'Spirituality',    emoji: '✨' },
];

const HOURS_OPTIONS = [
    { label: '1–2 hours',   sub: 'Packed schedule',       value: '1–2 hours' },
    { label: '2–4 hours',   sub: 'Typical busy day',      value: '2–4 hours' },
    { label: '4–6 hours',   sub: 'Good focus window',     value: '4–6 hours' },
    { label: '6+ hours',    sub: 'Deep work available',   value: '6+ hours' },
];

const DEPENDENT_OPTIONS = [
    { label: 'Young kids',  emoji: '👶' },
    { label: 'Teenagers',   emoji: '🧑' },
    { label: 'A team',      emoji: '👥' },
    { label: 'Clients',     emoji: '🤝' },
    { label: 'Partner',     emoji: '❤️' },
    { label: 'Parents',     emoji: '👴' },
    { label: 'Pets',        emoji: '🐾' },
    { label: 'Just me',     emoji: '🙋' },
];

const WORK_STYLE_OPTIONS = [
    { label: 'Early bird',    sub: '5am – 9am',     value: 'Early bird (5–9am)' },
    { label: 'Morning',       sub: '9am – 12pm',    value: 'Morning (9am–12pm)' },
    { label: 'Afternoon',     sub: '12pm – 5pm',    value: 'Afternoon (12–5pm)' },
    { label: 'Evening',       sub: '5pm – 10pm',    value: 'Evening (5–10pm)' },
    { label: 'Night owl',     sub: '10pm+',         value: 'Night owl (10pm+)' },
    { label: 'Varies',        sub: 'No fixed time', value: 'Varies' },
];

// ─── Shared sub-components ────────────────────────────────────────────────────

const Label: React.FC<{ n: number; total: number }> = ({ n, total }) => (
    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 16 }}>
        {n} of {total}
    </p>
);

const Question: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 10 }}>
        {children}
    </h2>
);

const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, color: '#64748b', marginBottom: 32, lineHeight: 1.5 }}>
        {children}
    </p>
);

const TextInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; onEnter?: () => void }> = ({ value, onChange, placeholder, autoFocus, onEnter }) => (
    <input
        autoFocus={autoFocus}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter(); }}
        placeholder={placeholder}
        style={{
            width: '100%', padding: '16px 20px', fontSize: 18, fontWeight: 600,
            fontFamily: "'Plus Jakarta Sans',sans-serif", color: '#0f172a',
            background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14,
            outline: 'none', transition: 'border-color 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = '#0f172a'; }}
        onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
    />
);

const TextArea: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; autoFocus?: boolean }> = ({ value, onChange, placeholder, rows = 5, autoFocus }) => (
    <textarea
        autoFocus={autoFocus}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
            width: '100%', padding: '16px 20px', fontSize: 16, fontWeight: 500,
            fontFamily: "'Plus Jakarta Sans',sans-serif", color: '#0f172a',
            background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14,
            outline: 'none', resize: 'none', transition: 'border-color 0.2s', lineHeight: 1.6,
        }}
        onFocus={e => { e.target.style.borderColor = '#0f172a'; }}
        onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
    />
);

interface ChipProps { label: string; emoji?: string; selected: boolean; onToggle: () => void; }
const Chip: React.FC<ChipProps> = ({ label, emoji, selected, onToggle }) => (
    <button
        onClick={onToggle}
        style={{
            padding: '10px 18px', borderRadius: 100, fontSize: 14, fontWeight: 700,
            fontFamily: "'Plus Jakarta Sans',sans-serif", cursor: 'pointer',
            border: selected ? '2px solid #0f172a' : '2px solid #e2e8f0',
            background: selected ? '#0f172a' : '#fff',
            color: selected ? '#fff' : '#475569',
            transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
            transform: selected ? 'scale(1.03)' : 'scale(1)',
        }}
    >
        {emoji && <span style={{ fontSize: 16 }}>{emoji}</span>}
        {label}
    </button>
);

interface CardOptionProps { label: string; sub: string; selected: boolean; onSelect: () => void; }
const CardOption: React.FC<CardOptionProps> = ({ label, sub, selected, onSelect }) => (
    <button
        onClick={onSelect}
        style={{
            padding: '18px 20px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
            border: selected ? '2px solid #0f172a' : '2px solid #e2e8f0',
            background: selected ? '#0f172a' : '#fff',
            color: selected ? '#fff' : '#0f172a',
            transition: 'all 0.15s', transform: selected ? 'scale(1.02)' : 'scale(1)',
            boxShadow: selected ? '0 4px 20px rgba(0,0,0,0.12)' : 'none',
        }}
    >
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 800 }}>{label}</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, marginTop: 3, opacity: 0.65 }}>{sub}</div>
    </button>
);

// ─── Animated screen wrapper (must live at module level to prevent remounting) ─

interface ScreenWrapperProps { animKey: number; dir: 'forward' | 'back'; children: React.ReactNode; }
const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ animKey, dir, children }) => (
    <div key={animKey} style={{ animation: `${dir === 'forward' ? 'obSlideInRight' : 'obSlideInLeft'} 0.28s cubic-bezier(0.22,1,0.36,1) both` }}>
        {children}
    </div>
);

// ─── Build persona from onboarding answers ────────────────────────────────────

function buildPersona(data: OnboardingData): UserPersona {
    return {
        writingStyle: '',
        thoughtProcess: '',
        speakingNuances: '',
        values: data.lifeAreas,
        jobTitle: data.roles.join(', '),
        lifestyle: data.workStyle,
        customCategories: data.lifeAreas,
        longTermGoals: data.goals
            .filter(g => g.trim())
            .map((goal, i) => ({ goal, timeframe: '1-year' as const, category: data.lifeAreas[i] || data.lifeAreas[0] || 'Personal', priority: 10 - i * 2 })),
        productivityPatterns: {
            peakEnergyTime: data.workStyle,
            focusType: data.hoursPerDay,
        },
        currentConstraints: [
            `${data.hoursPerDay} of focused time available per day`,
            data.dependents.length > 0 ? `Responsible for: ${data.dependents.join(', ')}` : '',
            data.avoidances ? `Known avoidance pattern: ${data.avoidances.slice(0, 120)}` : '',
        ].filter(Boolean),
        successVision: data.successVision,
    };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OnboardingFlowProps {
    onComplete: () => void;
    initialData?: Partial<OnboardingData>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, initialData }) => {
    const TOTAL = 10;
    const [step, setStep]       = useState(0);
    const [dir, setDir]         = useState<'forward' | 'back'>('forward');
    const [animKey, setAnimKey] = useState(0);
    const [status, setStatus]   = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const [data, setData] = useState<OnboardingData>({
        name: '', roles: [], lifeAreas: [], goals: ['', '', ''],
        brainDump: '', hoursPerDay: '', dependents: [],
        avoidances: '', workStyle: '', successVision: '',
        ...initialData,
    });

    const set = <K extends keyof OnboardingData>(key: K, val: OnboardingData[K]): void =>
        setData(prev => ({ ...prev, [key]: val }));

    const toggleChip = (key: 'roles' | 'lifeAreas' | 'dependents', val: string): void => {
        setData(prev => {
            const arr = prev[key] as string[];
            return { ...prev, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
        });
    };

    const goTo = (next: number, direction: 'forward' | 'back'): void => {
        setDir(direction);
        setAnimKey(k => k + 1);
        setStep(next);
    };

    const canContinue = (): boolean => {
        switch (step) {
            case 0: return data.name.trim().length > 0;
            case 1: return data.roles.length > 0;
            case 2: return data.lifeAreas.length > 0;
            case 3: return data.goals.some(g => g.trim().length > 0);
            case 5: return data.hoursPerDay !== '';
            case 8: return data.workStyle !== '';
            default: return true;
        }
    };

    // ── Processing ──────────────────────────────────────────────────────────
    const handleFinish = async (): Promise<void> => {
        setStep(10); // processing screen
        setStatus('processing');

        try {
            const persona = buildPersona(data);

            // Before saving, merge new life areas with any existing custom categories
            const existingPersona = await databaseService.loadPersona();
            const mergedCategories = [
                ...new Set([
                    ...(existingPersona?.customCategories || []),
                    ...data.lifeAreas,
                ])
            ];
            const mergedPersona = {
                ...persona,
                customCategories: mergedCategories,
                // Preserve the user's chosen background scene — don't overwrite it with onboarding data
                brutalistBackground: existingPersona?.brutalistBackground || persona.brutalistBackground,
            };
            await databaseService.savePersona(mergedPersona);

            // Process brain dump if provided
            if (data.brainDump.trim()) {
                await processBrainDump(data.brainDump, [], mergedPersona);
            }

            setStatus('done');
            setTimeout(() => onComplete(), 900);
        } catch (e: any) {
            console.error('Onboarding processing failed:', e);
            setErrorMsg(e.message || 'Something went wrong. You can still continue.');
            setStatus('error');
        }
    };

    // ── Dot progress ────────────────────────────────────────────────────────
    const progressPct = step >= TOTAL ? 100 : Math.round((step / TOTAL) * 100);

    const wrap = (content: React.ReactNode) => (
        <ScreenWrapper animKey={animKey} dir={dir}>{content}</ScreenWrapper>
    );

    // ── Render screen content (no nav — nav lives below in the scroll container) ─
    const renderScreen = (): React.ReactNode => {
        switch (step) {
            case 0: return wrap(<>
                <Label n={1} total={TOTAL} />
                <Question>What's your name?</Question>
                <Hint>Let's make this personal.</Hint>
                <TextInput autoFocus value={data.name} onChange={v => set('name', v)} placeholder="Your first name" onEnter={() => canContinue() && goTo(1, 'forward')} />
            </>);

            case 1: return wrap(<>
                <Label n={2} total={TOTAL} />
                <Question>What best describes you?</Question>
                <Hint>Pick everything that applies — you're probably more than one thing.</Hint>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {ROLE_OPTIONS.map(o => (
                        <Chip key={o.label} label={o.label} emoji={o.emoji}
                            selected={data.roles.includes(o.label)}
                            onToggle={() => toggleChip('roles', o.label)} />
                    ))}
                </div>
            </>);

            case 2: return wrap(<>
                <Label n={3} total={TOTAL} />
                <Question>Which areas of your life feel most overwhelming right now?</Question>
                <Hint>These become your categories. Select as many as feel true.</Hint>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {LIFE_AREA_OPTIONS.map(o => (
                        <Chip key={o.label} label={o.label} emoji={o.emoji}
                            selected={data.lifeAreas.includes(o.label)}
                            onToggle={() => toggleChip('lifeAreas', o.label)} />
                    ))}
                </div>
            </>);

            case 3: return wrap(<>
                <Label n={4} total={TOTAL} />
                <Question>What are your top goals for the next 3–6 months?</Question>
                <Hint>These anchor every prioritisation decision the AI makes.</Hint>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: '#94a3b8', minWidth: 20 }}>{i + 1}.</span>
                            <TextInput
                                autoFocus={i === 0}
                                value={data.goals[i]}
                                onChange={v => { const g = [...data.goals]; g[i] = v; set('goals', g); }}
                                placeholder={['Build financial runway', 'Get my health back on track', 'Launch the product'][i]}
                            />
                        </div>
                    ))}
                </div>
            </>);

            case 4: return wrap(<>
                <Label n={5} total={TOTAL} />
                <Question>What's living rent-free in your head right now?</Question>
                <Hint>Every task, worry, obligation, idea — just get it out. Don't filter.</Hint>
                <TextArea autoFocus rows={7} value={data.brainDump} onChange={v => set('brainDump', v)}
                    placeholder={"Fix the kitchen tap\nCall accountant about Q3\nRenew car insurance\nFinish the pitch deck for Monday\nBook flights for mum's birthday..."} />
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                    The AI will extract and prioritise tasks from this automatically.
                </p>
            </>);

            case 5: return wrap(<>
                <Label n={6} total={TOTAL} />
                <Question>How many focused hours can you realistically give each day?</Question>
                <Hint>Be honest — the AI will plan around what's actually possible.</Hint>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {HOURS_OPTIONS.map(o => (
                        <CardOption key={o.value} label={o.label} sub={o.sub}
                            selected={data.hoursPerDay === o.value}
                            onSelect={() => set('hoursPerDay', o.value)} />
                    ))}
                </div>
            </>);

            case 6: return wrap(<>
                <Label n={7} total={TOTAL} />
                <Question>Who or what depends on you right now?</Question>
                <Hint>This tells the AI what you can't easily push around.</Hint>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {DEPENDENT_OPTIONS.map(o => (
                        <Chip key={o.label} label={o.label} emoji={o.emoji}
                            selected={data.dependents.includes(o.label)}
                            onToggle={() => toggleChip('dependents', o.label)} />
                    ))}
                </div>
            </>);

            case 7: return wrap(<>
                <Label n={8} total={TOTAL} />
                <Question>What do you keep putting off, even though you know it matters?</Question>
                <Hint>The AI will surface these differently — not let them disappear.</Hint>
                <TextArea autoFocus rows={5} value={data.avoidances} onChange={v => set('avoidances', v)}
                    placeholder="Sorting my finances properly, having a difficult conversation with my co-founder, actually doing the workout I keep scheduling..." />
            </>);

            case 8: return wrap(<>
                <Label n={9} total={TOTAL} />
                <Question>When do you do your best work?</Question>
                <Hint>Your peak energy window is when the hard tasks should land.</Hint>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {WORK_STYLE_OPTIONS.map(o => (
                        <CardOption key={o.value} label={o.label} sub={o.sub}
                            selected={data.workStyle === o.value}
                            onSelect={() => set('workStyle', o.value)} />
                    ))}
                </div>
            </>);

            case 9: return wrap(<>
                <Label n={10} total={TOTAL} />
                <Question>What would "everything under control" look like for you?</Question>
                <Hint>In your own words — what's the version of life you're building towards?</Hint>
                <TextArea autoFocus rows={6} value={data.successVision} onChange={v => set('successVision', v)}
                    placeholder="I wake up knowing exactly what matters today. My finances are sorted, I'm present with my family, and the business is growing without me drowning in it..." />
            </>);

            case 10: return (
                <div style={{ textAlign: 'center' }}>
                    {status === 'error' ? (<>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                        <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 24, fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>Couldn't connect to AI</h2>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, color: '#64748b', maxWidth: 400, margin: '0 auto 32px' }}>
                            {errorMsg} Your answers are saved — you can still enter the app.
                        </p>
                        <button onClick={onComplete} style={ctaStyle}>Enter anyway →</button>
                    </>) : status === 'done' ? (<>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                        <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 900, color: '#0f172a' }}>
                            You're all set, {data.name}.
                        </h2>
                    </>) : (<>
                        <div style={{ marginBottom: 32 }}><LoadingDots /></div>
                        <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>Organising your world…</h2>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, color: '#64748b' }}>Building your profile and extracting your first tasks.</p>
                    </>)}
                </div>
            );

            default: return null;
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

            {/* Progress bar */}
            {step < TOTAL && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#e2e8f0', zIndex: 20 }}>
                    <div style={{ height: '100%', background: '#0f172a', width: `${progressPct}%`, transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)' }} />
                </div>
            )}

            {/* Branding + back */}
            {step < TOTAL && (
                <div style={{ padding: '24px 32px 0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', letterSpacing: '-0.03em' }}>Dumped</span>
                    {step > 0 && (
                        <button onClick={() => goTo(step - 1, 'back')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#94a3b8', fontFamily: "'Plus Jakarta Sans',sans-serif", padding: '6px 0' }}>
                            ← Back
                        </button>
                    )}
                </div>
            )}

            {/* Scrollable content + nav together */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 580, padding: step === 10 ? '80px 24px 40px' : '40px 24px 40px' }}>

                    {renderScreen()}

                    {/* Nav buttons — right below the question content */}
                    {step < TOTAL && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 32 }}>
                            {[4, 6, 7, 9].includes(step) && (
                                <button
                                    onClick={() => step === 9 ? handleFinish() : goTo(step + 1, 'forward')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#94a3b8', fontFamily: "'Plus Jakarta Sans',sans-serif", padding: '14px 4px' }}
                                >
                                    Skip
                                </button>
                            )}
                            <button
                                onClick={() => step === 9 ? handleFinish() : goTo(step + 1, 'forward')}
                                disabled={!canContinue()}
                                style={{ ...ctaStyle, opacity: canContinue() ? 1 : 0.4, cursor: canContinue() ? 'pointer' : 'not-allowed' }}
                            >
                                {step === 9 ? `Let's go, ${data.name || 'you'} →` : 'Continue →'}
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const ctaStyle: React.CSSProperties = {
    padding: '14px 32px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 100,
    fontSize: 15,
    fontWeight: 800,
    fontFamily: "'Plus Jakarta Sans',sans-serif",
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    transition: 'background 0.15s, transform 0.15s',
    letterSpacing: '-0.01em',
};

// ─── Loading dots ─────────────────────────────────────────────────────────────

const LoadingDots: React.FC = () => (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {[0, 1, 2].map(i => (
            <div
                key={i}
                style={{
                    width: 12, height: 12, borderRadius: '50%', background: '#0f172a',
                    animation: 'obDotBounce 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                }}
            />
        ))}
    </div>
);
