import React from "react";
import { cn } from "@/lib/utils";

export const SpotlightLamp = ({
  className,
  isCompact = false,
}: {
  className?: string;
  isCompact?: boolean;
}) => {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-start overflow-hidden bg-slate-950/80 backdrop-blur-[2px] z-0",
        className
      )}
    >
      {/* 
          This extracts the "Spotlight" beam logic from the user-provided code:
          - bg-gradient-to-b from-white/40 to-transparent
          - blur-lg
          - centered at the top
      */}
      <div 
        className={cn(
          "absolute top-0 left-1/2 transform -translate-x-1/2 w-[150%] max-w-[40rem] pointer-events-none transition-all duration-700 ease-out",
          isCompact ? "h-[85%] -translate-y-[45%] opacity-90" : "h-full -translate-y-1/3 opacity-100"
        )}
      >
        {/* Main soft beam */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent blur-2xl rounded-full" />
        
        {/* Bright inner core */}
        <div className="absolute inset-x-[15%] top-0 h-[70%] bg-gradient-to-b from-white to-transparent blur-xl rounded-full opacity-80" />
        
        {/* Hot spot at the very top source */}
        <div className="absolute inset-x-[30%] top-[-5%] h-[20%] bg-white blur-lg rounded-full opacity-100" />
      </div>

      {/* Floor / Bottom Glow (only for global scenery) */}
      {!isCompact && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-t from-white/20 to-transparent blur-3xl opacity-60" />
      )}
    </div>
  );
};
