import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export const HolographicTexture = ({ 
  className 
}: { 
  className?: string 
}) => {
  // Generate the 10 rotation keyframes for the holographic effect
  const overlayAnimations = useMemo(() => {
    return [...Array(10).keys()].map((e) => (
      `@keyframes holoLoop${e + 1} {
        0% { transform: rotate(${e * 10}deg); }
        50% { transform: rotate(${(e + 1) * 10}deg); }
        100% { transform: rotate(${e * 10}deg); }
      }`
    )).join("\n");
  }, []);

  const hslColors = [
    "hsl(358, 100%, 62%)",
    "hsl(30, 100%, 50%)",
    "hsl(60, 100%, 50%)",
    "hsl(96, 100%, 50%)",
    "hsl(233, 85%, 47%)",
    "hsl(271, 85%, 47%)",
    "hsl(300, 20%, 35%)",
    "transparent",
    "transparent",
    "white"
  ];

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0", className)}>
      <style>{overlayAnimations}</style>
      
      <svg 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none" 
        className="w-full h-full opacity-60 mix-blend-overlay"
      >
        <defs>
          <filter id="holoBlur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
        </defs>
        
        <g filter="url(#holoBlur)">
          {hslColors.map((color, i) => (
            <g 
              key={i}
              style={{
                transformOrigin: "center center",
                animation: `holoLoop${i + 1} 5s infinite ease-in-out`,
                animationDelay: `${i * -0.5}s`
              }}
            >
              <polygon 
                points="0,0 100,100 100,0 0,100" 
                fill={color} 
                opacity="0.4" 
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};
