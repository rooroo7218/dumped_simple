"use client"

import React from "react"
import { GodRays, MeshGradient } from "@paper-design/shaders-react"
import { cn } from "@/lib/utils"

interface GodRaysBackgroundProps {
  className?: string;
  colors?: string[];
  rayIntensity?: number;
}

export const GodRaysBackground: React.FC<GodRaysBackgroundProps> = ({ 
  className,
  colors = ["#1d4ed8", "#1e40af", "#172554", "#1e3a8a"], // Enterprise Blue palette
  rayIntensity = 0.5 
}) => {
  return (
    <div className={cn("absolute inset-0 w-full h-full overflow-hidden bg-zinc-950", className)}>
      {/* Mesh Gradient Layer */}
      <div className="absolute inset-0 z-0">
        <MeshGradient
          speed={0.6}
          colors={colors}
          distortion={0.8}
          swirl={0.1}
          grainMixer={0.15}
          grainOverlay={0}
          style={{ height: "100%", width: "100%" }}
        />
      </div>

      {/* GodRays Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-60">
        <GodRays
          colorBack="#00000000"
          colors={["#a1a1aa40", "#e4e4e740", "#71717a40", "#52525b40"]}
          colorBloom="#a1a1aa"
          offsetX={0.85}
          offsetY={-1}
          intensity={rayIntensity}
          spotty={0.45}
          midSize={10}
          midIntensity={0}
          density={0.38}
          bloom={0.3}
          speed={0.5}
          scale={1.6}
          style={{
            height: "100%",
            width: "100%",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />
      </div>
      
      {/* Subtle vignette/overlay */}
      <div className="absolute inset-0 z-20 bg-gradient-to-b from-transparent via-transparent to-black/20" />
    </div>
  )
}
