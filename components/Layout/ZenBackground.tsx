import React from 'react';
import { WarpBackground } from '../ui/background-shaders';
import AnimatedGradientBackground from '../ui/animated-gradient-background';
import { SunlightGradientBackground } from '../ui/sunlight-gradient-background';

interface ZenBackgroundProps {
    url: string | null;
    sceneId?: string;
    isZenMode: boolean;
    isFocusActive?: boolean;
}

// ─── Blue aurora gradients (default mode) ─────────────────────────────────────

const stripe = `repeating-linear-gradient(
    100deg,
    rgba(255,255,255,0.95) 0%,
    rgba(255,255,255,0.95) 7%,
    transparent 10%,
    transparent 12%,
    rgba(255,255,255,0.95) 16%
)`;

const auroraA = `repeating-linear-gradient(
    100deg,
    #bfdbfe 10%, #c7d2fe 16%,
    #bae6fd 22%, #ddd6fe 28%,
    #bfdbfe 34%
)`;

const auroraB = `repeating-linear-gradient(
    100deg,
    #ddd6fe 10%, #bfdbfe 18%,
    #a5b4fc 24%, #e0e7ff 30%,
    #ddd6fe 36%
)`;

const auroraC = `repeating-linear-gradient(
    100deg,
    #c7d2fe 0%, #bfdbfe 20%,
    #bae6fd 40%, #ddd6fe 60%,
    #a5f3fc 80%, #c7d2fe 100%
)`;

// ─── Component ─────────────────────────────────────────────────────────────────

// Static gradient strings keyed by scene — used to paint body background so
// it extends behind the iOS status bar (body background is the only reliable
// way to fill the area above env(safe-area-inset-top) on iOS PWAs).
const SCENE_BODY_BG: Record<string, string> = {
    slate:             'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    aurora:            'linear-gradient(180deg, #bfdbfe 0%, #ddd6fe 50%, #bae6fd 100%)',
    warp:              'radial-gradient(ellipse at 40% 50%, hsl(203,100%,62%) 0%, hsl(255,100%,72%) 35%, hsl(158,99%,59%) 65%, hsl(264,100%,61%) 100%)',
    gradient:          'radial-gradient(125% 125% at 50% 20%, #0A0A0A 35%, #2979FF 50%, #FF80AB 60%, #FF6D00 70%, #FFD600 80%, #00E676 90%, #3D5AFE 100%)',
    aurora_dream:      'radial-gradient(ellipse 85% 65% at 8% 8%, rgba(175,109,255,0.42), transparent 60%), radial-gradient(ellipse 75% 60% at 75% 35%, rgba(255,235,170,0.55), transparent 62%), radial-gradient(ellipse 70% 60% at 15% 80%, rgba(255,100,180,0.40), transparent 62%), linear-gradient(180deg, #f7eaff 0%, #fde2ea 100%)',
    sunlight:          'radial-gradient(125% 125% at 50% 101%, rgba(245,100,50,1) 10.5%, rgba(245,180,110,1) 25%, rgba(238,184,212,1) 40%, rgba(212,189,224,1) 65%, rgba(168,211,243,1) 100%)',
    girly_sparkles:    'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #fce7f3 100%)',
    miyazaki_meadow:   'linear-gradient(180deg, #a8d8a8 0%, #c8e6c8 100%)',
    frog_spirits_pond: 'linear-gradient(180deg, #b8d8b8 0%, #d0e8d0 100%)',
    snowy_sledding:    'linear-gradient(180deg, #e8f4f8 0%, #f0f8fc 100%)',
};

export const ZenBackground: React.FC<ZenBackgroundProps> = ({
    url, sceneId, isZenMode, isFocusActive = false,
}) => {
    const isAurora = sceneId === 'aurora';
    const isWarp = sceneId === 'warp';
    const isGradient = sceneId === 'gradient';
    const isAuroraDream = sceneId === 'aurora_dream';
    const isSunlight = sceneId === 'sunlight';

    // Paint the body background to match the active scene so it bleeds
    // behind the iOS status bar (fixed elements can't reliably reach there).
    React.useEffect(() => {
        const bg = url
            ? `url("${url}") center/cover no-repeat`
            : (SCENE_BODY_BG[sceneId ?? ''] ?? SCENE_BODY_BG.aurora_dream);
        document.body.style.background = bg;
        document.body.style.backgroundAttachment = 'fixed';
        return () => {
            document.body.style.background = '';
            document.body.style.backgroundAttachment = '';
        };
    }, [sceneId, url]);

    return (
        <div className="fixed top-0 left-0 w-[100vw] z-0 overflow-hidden pointer-events-none" style={{ height: '100dvh' }}>

            {/* Image background (Zen scenes) */}
            <div
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${url ? 'opacity-100' : 'opacity-0'}`}
                style={{
                    backgroundImage: url ? `url("${url}")` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />

            {/* Blue aurora — default mode */}
            {isAurora && (
                <div className="absolute inset-0 bg-white">
                    <div className="absolute -inset-[10px] will-change-transform" style={{ backgroundImage: `${stripe}, ${auroraA}`, backgroundSize: '300%, 200%', backgroundPosition: '50% 50%, 50% 50%', filter: 'blur(14px)', opacity: 0.9, animation: 'aurora 180s linear infinite' }} />
                    <div className="absolute -inset-[10px] will-change-transform" style={{ backgroundImage: `${stripe}, ${auroraB}`, backgroundSize: '250%, 180%', backgroundPosition: '50% 50%, 50% 50%', filter: 'blur(20px)', opacity: 0.75, mixBlendMode: 'multiply', animation: 'aurora 120s linear infinite', animationDelay: '-40s' }} />
                    <div className="absolute -inset-[10px] will-change-transform" style={{ backgroundImage: auroraC, backgroundSize: '400%, 400%', backgroundPosition: '50% 50%', filter: 'blur(40px)', opacity: 0.65, mixBlendMode: 'multiply', animation: 'aurora 300s linear infinite reverse', animationDelay: '-80s' }} />
                </div>
            )}

            {/* Warp shader */}
            {isWarp && (
                <div className="absolute inset-0">
                    <WarpBackground opacity={0.9} />
                </div>
            )}

            {/* Cosmic gradient */}
            {isGradient && (
                <div className="absolute inset-0">
                    <AnimatedGradientBackground startingGap={125} Breathing={true} breathingRange={8} animationSpeed={0.015} />
                </div>
            )}

            {/* Sunlight — warm radial sunrise with film grain noise */}
            {isSunlight && <SunlightGradientBackground />}

            {/* Aurora Dream — soft pastel corner glows */}
            {isAuroraDream && (
                <div
                    className="absolute inset-0"
                    style={{
                        background: `
                            radial-gradient(ellipse 85% 65% at 8% 8%, rgba(175, 109, 255, 0.42), transparent 60%),
                            radial-gradient(ellipse 75% 60% at 75% 35%, rgba(255, 235, 170, 0.55), transparent 62%),
                            radial-gradient(ellipse 70% 60% at 15% 80%, rgba(255, 100, 180, 0.40), transparent 62%),
                            radial-gradient(ellipse 70% 60% at 92% 92%, rgba(120, 190, 255, 0.45), transparent 62%),
                            linear-gradient(180deg, #f7eaff 0%, #fde2ea 100%)
                        `,
                    }}
                />
            )}

            {/* Tint overlay */}
            <div className={`absolute inset-0 ${isAurora ? 'bg-transparent' : 'bg-slate-50/5'} transition-colors duration-1000`} />
        </div>
    );
};
