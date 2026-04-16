"use client";

import React, { memo } from "react";
import { Xenon, Novatrix, Zenitho } from "uvcanvas";
import { cn } from "@/lib/utils";

export const XenonTexture = memo(({ isCompact = false }: { isCompact?: boolean }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0 flex items-center justify-center">
      <div className={cn(
        "absolute w-full h-full",
        isCompact 
          ? "w-[200%] h-[200%] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.5] origin-center" 
          : "inset-0"
      )}>
        <Xenon className="w-full h-full" />
      </div>
    </div>
  );
});

export const NovatrixTexture = memo(({ isCompact = false }: { isCompact?: boolean }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0 flex items-center justify-center">
      <div className={cn(
        "absolute w-full h-full",
        isCompact 
          ? "w-[200%] h-[200%] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.5] origin-center" 
          : "inset-0"
      )}>
        <Novatrix className="w-full h-full" />
      </div>
    </div>
  );
});

export const ZenithoTexture = memo(({ isCompact = false }: { isCompact?: boolean }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0 flex items-center justify-center">
      {/* 
          Scaling the internal canvas by 250% and then downscaling the container 
          by 0.4 (via scale on the wrapper) to effectively "zoom out" the shader 
          so it fits the tile perfectly when isCompact is true.
      */}
      <div className={cn(
        "absolute w-full h-full",
        isCompact 
          ? "w-[250%] h-[250%] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.4] origin-center" 
          : "inset-0"
      )}>
        <Zenitho className="w-full h-full" />
      </div>
    </div>
  );
});

XenonTexture.displayName = "XenonTexture";
NovatrixTexture.displayName = "NovatrixTexture";
ZenithoTexture.displayName = "ZenithoTexture";
