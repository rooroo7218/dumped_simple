import React from "react";
import { cn } from "@/lib/utils";

export const HolographicTexture = ({ 
  mouseX = 50,
  mouseY = 50,
  className 
}: { 
  mouseX?: number;
  mouseY?: number;
  className?: string;
}) => {
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0", className)}>
      {/* ── Base metallic foil finish ── */}
      <div className="absolute inset-0 bg-slate-100 opacity-20" />
      
      {/* ── Shimmering Iridescence Layer ── */}
      <div 
        className="absolute inset-[-100%] transition-transform duration-[400ms] ease-out"
        style={{
          background: `
            linear-gradient(
              ${135 + (mouseX - 50) * 0.2}deg,
              transparent 0%,
              rgba(255, 0, 0, 0.1) 15%,
              rgba(255, 255, 0, 0.1) 30%,
              rgba(0, 255, 0, 0.1) 45%,
              rgba(0, 255, 255, 0.1) 60%,
              rgba(0, 0, 255, 0.1) 75%,
              rgba(255, 0, 255, 0.1) 90%,
              transparent 100%
            )
          `,
          transform: `translate(${(mouseX - 50) * 0.5}%, ${(mouseY - 50) * 0.5}%)`,
          mixBlendMode: 'color-dodge',
          opacity: 0.8
        }}
      />

      {/* ── Bright Specular Flare (Glint) ── */}
      <div 
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${mouseX}% ${mouseY}%, rgba(255,255,255,0.8) 0%, transparent 60%)`,
          mixBlendMode: 'soft-light',
          opacity: 0.6
        }}
      />

      {/* ── Foil "Diagonal Shards" Effect ── */}
      <div 
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            #fff 0px,
            #fff 2px,
            transparent 2px,
            transparent 10px
          )`,
          mixBlendMode: 'overlay'
        }}
      />

      {/* ── Fine Noise / Foil Grain ── */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply pointer-events-none">
        <svg filter='url(#noiseFilter)' className='w-full h-full'>
          <filter id='noiseFilter'>
            <feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/>
          </filter>
        </svg>
      </div>
    </div>
  );
};
