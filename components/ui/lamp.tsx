"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LampProps {
  children?: React.ReactNode;
  className?: string;
  isCompact?: boolean;
}

export const LampContainer = ({
  children,
  className,
  isCompact = false,
}: LampProps) => {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden bg-background z-0",
        isCompact ? "h-full min-h-0 aspect-square" : "min-h-screen",
        className
      )}
    >
      <div className={cn(
        "relative flex w-full flex-1 items-center justify-center isolate z-0",
        isCompact 
          ? "w-[250%] h-[250%] left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] scale-[0.35] origin-center" 
          : "scale-y-125 w-full top-0"
      )}>
        {/* Main glow */}
        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-[-30%] rounded-full bg-primary/60 opacity-80 blur-3xl" />

        {/* Lamp effect pulse */}
        <motion.div
            initial={{ width: "8rem" }}
            viewport={{ once: true }}
            transition={{ ease: "easeInOut", delay: 0.3, duration: 0.8 }}
            whileInView={{ width: "16rem" }}
            className="absolute top-0 z-30 h-36 -translate-y-[20%] rounded-full bg-primary/60 blur-2xl"
        />

        {/* Top line */}
        <motion.div
            initial={{ width: "15rem" }}
            viewport={{ once: true }}
            transition={{ ease: "easeInOut", delay: 0.3, duration: 0.8 }}
            whileInView={{ width: "30rem" }}
            className="absolute inset-auto z-50 h-0.5 -translate-y-[-10%] bg-primary/60"
        />

        {/* Left gradient cone */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className={cn(
            "absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] bg-gradient-conic from-primary/60 via-transparent to-transparent [--conic-position:from_70deg_at_center_top]"
          )}
        >
          <div className="absolute w-[100%] left-0 bg-background h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-40 h-[100%] left-0 bg-background bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>

        {/* Right gradient cone */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className={cn(
            "absolute inset-auto left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-primary/60 [--conic-position:from_290deg_at_center_top]"
          )}
        >
          <div className="absolute w-40 h-[100%] right-0 bg-background bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute w-[100%] right-0 bg-background h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>
        
        {/* Backdrop blur overlay */}
        <div className="absolute top-0 z-50 h-48 w-screen bg-transparent opacity-10 backdrop-blur-md" />
      </div>

      <div className={cn(
        "relative z-50 flex flex-col items-center px-5",
        isCompact ? "hidden" : "-translate-y-80"
      )}>
        {children}
      </div>
    </div>
  );
};
