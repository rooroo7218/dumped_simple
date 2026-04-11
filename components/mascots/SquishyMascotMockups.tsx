import React, { useRef, useCallback, useState } from 'react';
import './mascot-animations.css';

import dumpySvg from './dumpy.svg';
import prioSvg from './prio.svg';
import focoSvg from './foco.svg';
import mojiSvg from './moji.svg';
import goalieSvg from './goalie.svg';
import moodJoyfulSvg from './mood-joyful.svg';
import moodPeacefulSvg from './mood-peaceful.svg';
import moodTiredSvg from './mood-tired.svg';
import moodAnxiousSvg from './mood-anxious.svg';
import moodFrustratedSvg from './mood-frustrated.svg';
import moodElatedSvg from './mood-elated.svg';

// ── Types ────────────────────────────────────────────────────────────────────

type AnimName = 'squish' | 'jelly' | 'wiggle' | 'bounce' | 'spin-pop' | 'heartbeat' | 'pop';

interface Particle {
    id: string;
    x: number;
    y: number;
    size: number;
    tx: number;
    ty: number;
    color: string;
}

interface MascotDef {
    id: string;
    name: string;
    screen: string;
    src: string;
    anim: AnimName;
    palette: string[];
    size: number;
    accent: string;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const ANIM_CLASSES: Record<AnimName, string> = {
    squish:    'dumped-anim-squish',
    jelly:     'dumped-anim-jelly',
    wiggle:    'dumped-anim-wiggle',
    bounce:    'dumped-anim-bounce',
    'spin-pop':'dumped-anim-spin-pop',
    heartbeat: 'dumped-anim-heartbeat',
    pop:       'dumped-anim-pop',
};

const SCREEN_MASCOTS: MascotDef[] = [
    { id: 'dumpy',  name: 'Dumpy',  screen: 'Brain Dump',   src: dumpySvg,   anim: 'squish',   size: 88, palette: ['#A8E6CF','#7EE8A2','#C8F4DC'],       accent: '#7EE8A2' },
    { id: 'prio',   name: 'Prio',   screen: 'Priorities',   src: prioSvg,    anim: 'jelly',    size: 88, palette: ['#C4B0F8','#9B7FE8','#F0C674'],        accent: '#9B7FE8' },
    { id: 'foco',   name: 'Foco',   screen: 'Focus',        src: focoSvg,    anim: 'wiggle',   size: 88, palette: ['#88C8F0','#4A9FD4','#BEE2F7'],        accent: '#4A9FD4' },
    { id: 'moji',   name: 'Moji',   screen: 'Journal',      src: mojiSvg,    anim: 'bounce',   size: 88, palette: ['#F9C8A0','#F0A868','#F4A8C0'],        accent: '#F0A868' },
    { id: 'goalie', name: 'Goalie', screen: 'About Me',     src: goalieSvg,  anim: 'spin-pop', size: 88, palette: ['#F4C0D0','#E8829A','#F9DDE4'],        accent: '#E8829A' },
];

const MOOD_CHIPS: MascotDef[] = [
    { id: 'mood-joyful',     name: 'Joyful',     screen: 'Joyful',     src: moodJoyfulSvg,     anim: 'heartbeat', size: 56, palette: ['#FFF4A0','#F5C830','#F4A8C0'],  accent: '#F5C830' },
    { id: 'mood-peaceful',   name: 'Peaceful',   screen: 'Peaceful',   src: moodPeacefulSvg,   anim: 'heartbeat', size: 56, palette: ['#A8E8D0','#52C49A','#D0F5E8'],  accent: '#52C49A' },
    { id: 'mood-tired',      name: 'Tired',      screen: 'Tired',      src: moodTiredSvg,      anim: 'squish',    size: 56, palette: ['#C8CCE0','#8890B8','#B0B4C8'],  accent: '#8890B8' },
    { id: 'mood-anxious',    name: 'Anxious',    screen: 'Anxious',    src: moodAnxiousSvg,    anim: 'wiggle',    size: 56, palette: ['#FFD8A8','#F08830','#88C8F0'],  accent: '#F08830' },
    { id: 'mood-frustrated', name: 'Frustrated', screen: 'Frustrated', src: moodFrustratedSvg, anim: 'jelly',     size: 56, palette: ['#F8A8A8','#D83838','#FF8080'],  accent: '#D83838' },
    { id: 'mood-elated',     name: 'Elated',     screen: 'Elated',     src: moodElatedSvg,     anim: 'pop',       size: 56, palette: ['#F0C0FC','#C060D8','#F0C674'],  accent: '#C060D8' },
];

// ── Particle system ───────────────────────────────────────────────────────────

function useParticles() {
    const [particles, setParticles] = useState<Particle[]>([]);

    const spawnBurst = useCallback((cx: number, cy: number, palette: string[]) => {
        const COUNT = 9;
        const newParticles: Particle[] = Array.from({ length: COUNT }, (_, i) => {
            const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.5;
            const dist  = 28 + Math.random() * 22;
            return {
                id: crypto.randomUUID(),
                x:     cx,
                y:     cy,
                size:  4 + Math.random() * 5,
                tx:    Math.cos(angle) * dist,
                ty:    Math.sin(angle) * dist,
                color: palette[i % palette.length],
            };
        });
        setParticles((prev: Particle[]) => [...prev, ...newParticles]);
        setTimeout(() => {
            setParticles((prev: Particle[]) => prev.filter((p: Particle) => !newParticles.some(np => np.id === p.id)));
        }, 480);
    }, []);

    return { particles, spawnBurst };
}

// ── Single mascot card ────────────────────────────────────────────────────────

interface MascotCardProps {
    mascot: MascotDef;
    onSpawnBurst: (cx: number, cy: number, palette: string[]) => void;
}

const MascotCard: React.FC<MascotCardProps> = ({ mascot, onSpawnBurst }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleClick = useCallback(() => {
        const el = imgRef.current;
        if (!el) return;

        // Restart animation: strip all anim classes, force reflow, re-add
        Object.values(ANIM_CLASSES).forEach(cls => el.classList.remove(cls));
        void el.offsetWidth;
        const cls = ANIM_CLASSES[mascot.anim];
        el.classList.add(cls);
        setIsAnimating(true);

        el.addEventListener('animationend', () => {
            el.classList.remove(cls);
            setIsAnimating(false);
        }, { once: true });

        // Particle burst — use fixed viewport coords
        const rect = el.getBoundingClientRect();
        onSpawnBurst(
            rect.left + rect.width / 2,
            rect.top  + rect.height / 2,
            mascot.palette
        );
    }, [mascot.anim, mascot.palette, onSpawnBurst]);

    const isMood = mascot.size < 88;

    return (
        <button
            onClick={handleClick}
            className="group flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-black/5 hover:border-black/10 bg-white/60 hover:bg-white/90 transition-all active:scale-95 select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ '--accent': mascot.accent } as React.CSSProperties}
        >
            {/* Mascot image — overflow:visible so squish can bleed outside */}
            <div
                className="relative flex items-center justify-center"
                style={{ width: mascot.size + 20, height: mascot.size + 20, overflow: 'visible' }}
            >
                <img
                    ref={imgRef}
                    src={mascot.src}
                    alt={mascot.name}
                    width={mascot.size}
                    height={mascot.size}
                    draggable={false}
                    className={`dumped-mascot block ${isMood ? 'dumped-mood' : ''}`}
                    data-anim={mascot.anim}
                    style={{ display: 'block', overflow: 'visible' }}
                />

                {/* Subtle glow ring on hover */}
                <div
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                        background: `radial-gradient(circle, ${mascot.accent}30 0%, transparent 70%)`,
                        transform: 'scale(1.3)',
                    }}
                />
            </div>

            {/* Labels */}
            <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-bold tracking-tight text-slate-800">{mascot.name}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{mascot.screen}</span>
                <span
                    className="mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${mascot.accent}20`, color: mascot.accent }}
                >
                    {mascot.anim}
                </span>
            </div>

            {/* "Click me" hint */}
            <span className="text-[9px] text-slate-300 group-hover:text-slate-400 transition-colors">
                {isAnimating ? '✨ squishing...' : 'click to squish'}
            </span>
        </button>
    );
};

// ── Main mockup page ──────────────────────────────────────────────────────────

export const SquishyMascotMockups: React.FC = () => {
    const { particles, spawnBurst } = useParticles();

    return (
        <div className="min-h-screen bg-[#F7F6F2] p-8 font-['Plus_Jakarta_Sans']">

            {/* Fixed-position particle layer (viewport-relative) */}
            <div className="fixed inset-0 pointer-events-none z-50" aria-hidden>
                {particles.map((p: Particle) => (
                    <div
                        key={p.id}
                        className="dumped-particle"
                        style={{
                            position: 'fixed',
                            left: p.x,
                            top:  p.y,
                            width:  p.size,
                            height: p.size,
                            background: p.color,
                            '--tx': `${p.tx}px`,
                            '--ty': `${p.ty}px`,
                        } as React.CSSProperties}
                    />
                ))}
            </div>

            {/* Header */}
            <header className="mb-12 max-w-3xl">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dumped · Design System</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Squishy Mascots</h1>
                <p className="text-slate-500 text-sm">
                    Click any mascot to see its animation. Each one has a unique personality and bounce.
                </p>
            </header>

            {/* Screen Mascots */}
            <section className="mb-14">
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Screen Mascots</h2>
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[10px] text-slate-300">88 × 88 px</span>
                </div>
                <div className="flex flex-wrap gap-4">
                    {SCREEN_MASCOTS.map(m => (
                        <MascotCard key={m.id} mascot={m} onSpawnBurst={spawnBurst} />
                    ))}
                </div>
            </section>

            {/* Mood Chips */}
            <section className="mb-14">
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Mood Chips</h2>
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[10px] text-slate-300">56 × 56 px</span>
                </div>
                <div className="flex flex-wrap gap-4">
                    {MOOD_CHIPS.map(m => (
                        <MascotCard key={m.id} mascot={m} onSpawnBurst={spawnBurst} />
                    ))}
                </div>
            </section>

            {/* Animation reference */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Animation Reference</h2>
                    <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries({
                        squish:    { feel: 'Chunky, weighty, satisfying',    ms: 500 },
                        jelly:     { feel: 'Elastic, chaotic, energetic',    ms: 520 },
                        wiggle:    { feel: 'Nervous, playful, restless',     ms: 420 },
                        bounce:    { feel: 'Happy, light, springy',          ms: 500 },
                        'spin-pop':{ feel: 'Dramatic, confident',            ms: 520 },
                        heartbeat: { feel: 'Warm, calm, alive',              ms: 550 },
                        pop:       { feel: 'Explosive joy, surprise',        ms: 480 },
                    }).map(([name, { feel, ms }]) => (
                        <div key={name} className="p-3 rounded-xl border border-slate-200 bg-white/70">
                            <span className="text-[11px] font-black text-slate-700 block mb-0.5">{name}</span>
                            <span className="text-[10px] text-slate-400 block">{feel}</span>
                            <span className="text-[9px] font-semibold text-slate-300 mt-1 block">{ms}ms</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};
