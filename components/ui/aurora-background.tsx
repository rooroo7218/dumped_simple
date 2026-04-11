import React, { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface AuroraBackgroundProps {
    children: ReactNode;
    className?: string;
    /** Narrows the glow to the top-right corner — good for login/hero use */
    showRadialGradient?: boolean;
}

// ─── Palette ─────────────────────────────────────────────────────────────────
// All colours are very high-lightness pastels so the result is "white light"
// with barely perceptible blue / lavender tints — no invert needed.

// Stripe mask: creates the vertical curtain banding when combined with blur
const stripe = `repeating-linear-gradient(
    100deg,
    rgba(255,255,255,0.95) 0%,
    rgba(255,255,255,0.95) 7%,
    transparent 10%,
    transparent 12%,
    rgba(255,255,255,0.95) 16%
)`;

// Layer A — blue-200 / indigo-200 / sky-200 (cool, icy)
const auroraA = `repeating-linear-gradient(
    100deg,
    #bfdbfe 10%, #c7d2fe 16%,
    #bae6fd 22%, #ddd6fe 28%,
    #bfdbfe 34%
)`;

// Layer B — violet-200 / blue-200 / indigo-300 (lavender-leaning)
const auroraB = `repeating-linear-gradient(
    100deg,
    #ddd6fe 10%, #bfdbfe 18%,
    #a5b4fc 24%, #e0e7ff 30%,
    #ddd6fe 36%
)`;

// Layer C — pure diffuse wash (slow colour cloud)
const auroraC = `repeating-linear-gradient(
    100deg,
    #c7d2fe 0%, #bfdbfe 20%,
    #bae6fd 40%, #ddd6fe 60%,
    #a5f3fc 80%, #c7d2fe 100%
)`;

// ─── Component ───────────────────────────────────────────────────────────────

export const AuroraBackground = ({
    className,
    children,
    showRadialGradient = true,
}: AuroraBackgroundProps) => {
    const maskStyle: React.CSSProperties = showRadialGradient
        ? {
            maskImage: 'radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%)',
          }
        : {};

    return (
        <div className={cn('relative flex flex-col min-h-screen items-center justify-center bg-white text-slate-950', className)}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none" style={maskStyle}>

                {/*
                  Layer 1 — primary banded curtain (cool ice blues)
                  Stripe mask + pale aurora gradient, just blur — no inversion.
                  The near-white stripes fade into the white bg; the pale colour
                  bands are all that's left → very subtle vertical tints.
                  180s = extremely slow drift.
                */}
                <div
                    className="absolute -inset-[10px] will-change-transform"
                    style={{
                        backgroundImage: `${stripe}, ${auroraA}`,
                        backgroundSize: '300%, 200%',
                        backgroundPosition: '50% 50%, 50% 50%',
                        filter: 'blur(14px)',
                        opacity: 0.9,
                        animation: 'aurora 180s linear infinite',
                    }}
                />

                {/*
                  Layer 2 — lavender curtain, offset timing
                  Multiply blend: on a white background, pale lavender × white = pale lavender.
                  Adds warmth/depth without saturating. 120s, delayed by 40s offset.
                */}
                <div
                    className="absolute -inset-[10px] will-change-transform"
                    style={{
                        backgroundImage: `${stripe}, ${auroraB}`,
                        backgroundSize: '250%, 180%',
                        backgroundPosition: '50% 50%, 50% 50%',
                        filter: 'blur(20px)',
                        opacity: 0.75,
                        mixBlendMode: 'multiply',
                        animation: 'aurora 120s linear infinite',
                        animationDelay: '-40s',
                    }}
                />

                {/*
                  Layer 3 — diffuse glow (no stripes, very soft colour cloud)
                  Heavy blur + multiply = a barely-there cool tint across the whole bg.
                  Reversed direction + long cycle → always out of phase with layers 1 & 2.
                */}
                <div
                    className="absolute -inset-[10px] will-change-transform"
                    style={{
                        backgroundImage: auroraC,
                        backgroundSize: '400%, 400%',
                        backgroundPosition: '50% 50%',
                        filter: 'blur(40px)',
                        opacity: 0.65,
                        mixBlendMode: 'multiply',
                        animation: 'aurora 300s linear infinite reverse',
                        animationDelay: '-80s',
                    }}
                />

            </div>
            {children}
        </div>
    );
};
