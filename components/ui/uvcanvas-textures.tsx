"use client";

import React, { memo } from "react";
import { Xenon, Novatrix, Zenitho } from "uvcanvas";
import { cn } from "@/lib/utils";

export const XenonTexture = memo(({ isCompact = false }: { isCompact?: boolean }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0">
      <div className={cn(
        "absolute",
        isCompact 
          ? "w-[180%] h-[180%] top-[-40%] left-[-40%]" 
          : "inset-0"
      )}>
        <Xenon className="w-full h-full" />
      </div>
    </div>
  );
});

export const NovatrixTexture = memo(({ isCompact = false }: { isCompact?: boolean }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0">
      <div className={cn(
        "absolute",
        isCompact 
          ? "w-[180%] h-[180%] top-[-40%] left-[-40%]" 
          : "inset-0"
      )}>
        <Novatrix className="w-full h-full" />
      </div>
    </div>
  );
});

export const ZenithoTexture = memo(({ isCompact = false }: { isCompact?: boolean }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0">
      <div className={cn(
        "absolute",
        isCompact 
          ? "w-[180%] h-[180%] top-[-40%] left-[-40%]" 
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
