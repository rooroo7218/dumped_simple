import React, { useState } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';

interface LiquidGlassCardProps {
    children: React.ReactNode;
    className?: string;
    motionDrag?: boolean;
    expandable?: boolean;
    width?: string;
    height?: string;
    expandedWidth?: string;
    expandedHeight?: string;
    blurIntensity?: 'sm' | 'md' | 'lg' | 'xl';
    shadowIntensity?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    borderRadius?: string;
    glowIntensity?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    style?: React.CSSProperties;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
    onDragStart?: React.DragEventHandler<HTMLDivElement>;
    onDragOver?: React.DragEventHandler<HTMLDivElement>;
    onDrop?: React.DragEventHandler<HTMLDivElement>;
    onDragEnd?: React.DragEventHandler<HTMLDivElement>;
    draggable?: boolean; // HTML5 draggable attribute
}

export const LiquidGlassCard = ({
    children,
    className = '',
    motionDrag = false,
    expandable = false,
    width,
    height,
    expandedWidth,
    expandedHeight,
    blurIntensity = 'xl',
    borderRadius = '32px',
    glowIntensity = 'sm',
    shadowIntensity = 'md',
    style,
    onClick,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    draggable,
    ...rest
}: LiquidGlassCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleToggleExpansion = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!expandable) return;
        const target = e.target as HTMLElement;
        if (target.closest('a, button, input, select, textarea')) return;
        setIsExpanded(!isExpanded);
        onClick?.(e);
    };

    const blurClasses: Record<string, string> = {
        sm: 'backdrop-blur-sm',
        md: 'backdrop-blur-md',
        lg: 'backdrop-blur-lg',
        xl: 'backdrop-blur-xl',
    };

    const shadowStyles: Record<string, string> = {
        none: 'inset 0 0 0 0 rgba(255,255,255,0)',
        xs: 'inset 1px 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 1px 0 rgba(255,255,255,0.3)',
        sm: 'inset 2px 2px 2px 0 rgba(255,255,255,0.35), inset -2px -2px 2px 0 rgba(255,255,255,0.35)',
        md: 'inset 3px 3px 3px 0 rgba(255,255,255,0.45), inset -3px -3px 3px 0 rgba(255,255,255,0.45)',
        lg: 'inset 4px 4px 4px 0 rgba(255,255,255,0.5), inset -4px -4px 4px 0 rgba(255,255,255,0.5)',
        xl: 'inset 6px 6px 6px 0 rgba(255,255,255,0.55), inset -6px -6px 6px 0 rgba(255,255,255,0.55)',
    };

    const glowStyles: Record<string, string> = {
        none: '0 4px 4px rgba(0,0,0,0.05), 0 0 12px rgba(0,0,0,0.05)',
        xs: '0 4px 4px rgba(0,0,0,0.15), 0 0 12px rgba(0,0,0,0.08), 0 0 16px rgba(255,255,255,0.05)',
        sm: '0 4px 4px rgba(0,0,0,0.15), 0 0 12px rgba(0,0,0,0.08), 0 0 24px rgba(255,255,255,0.1)',
        md: '0 4px 4px rgba(0,0,0,0.15), 0 0 12px rgba(0,0,0,0.08), 0 0 32px rgba(255,255,255,0.15)',
        lg: '0 4px 4px rgba(0,0,0,0.15), 0 0 12px rgba(0,0,0,0.08), 0 0 40px rgba(255,255,255,0.2)',
        xl: '0 4px 4px rgba(0,0,0,0.15), 0 0 12px rgba(0,0,0,0.08), 0 0 48px rgba(255,255,255,0.25)',
    };

    const containerVariants = expandable ? {
        collapsed: { width: width || 'auto', height: height || 'auto', transition: { duration: 0.4, ease: [0.5, 1.5, 0.5, 1] } },
        expanded: { width: expandedWidth || 'auto', height: expandedHeight || 'auto', transition: { duration: 0.4, ease: [0.5, 1.5, 0.5, 1] } },
    } : {};

    const sharedStyle: React.CSSProperties = {
        borderRadius,
        ...(!expandable && width ? { width } : {}),
        ...(!expandable && height ? { height } : {}),
        ...style,
    };

    return (
        <>
            {/* SVG distortion filter — rendered once per card, hidden */}
            <svg className="hidden" aria-hidden>
                <defs>
                    <filter id="glass-blur" x="0" y="0" width="100%" height="100%" filterUnits="objectBoundingBox">
                        <feTurbulence type="fractalNoise" baseFrequency="0.003 0.007" numOctaves="1" result="turbulence" />
                        <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="200" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>
            </svg>

            <motion.div
                className={cn('relative overflow-hidden', className)}
                style={sharedStyle}
                variants={expandable ? containerVariants : undefined}
                animate={expandable ? (isExpanded ? 'expanded' : 'collapsed') : undefined}
                onClick={expandable ? handleToggleExpansion : onClick}
                drag={motionDrag}
                dragConstraints={motionDrag ? { left: 0, right: 0, top: 0, bottom: 0 } : undefined}
                dragElastic={motionDrag ? 0.3 : undefined}
                dragTransition={motionDrag ? { bounceStiffness: 300, bounceDamping: 10, power: 0.3 } : undefined}
                whileDrag={motionDrag ? { scale: 1.02 } : undefined}
                whileHover={{ scale: 1.005 }}
                // HTML5 drag passthrough
                draggable={draggable}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
            >
                {/* Bend layer — blur + distortion */}
                <div
                    className={cn('absolute inset-0 z-0', blurClasses[blurIntensity])}
                    style={{ borderRadius, filter: 'url(#glass-blur)' }}
                />
                {/* Face layer — outer glow */}
                <div
                    className="absolute inset-0 z-10"
                    style={{ borderRadius, boxShadow: glowStyles[glowIntensity] }}
                />
                {/* Edge layer — inner highlights */}
                <div
                    className="absolute inset-0 z-20"
                    style={{ borderRadius, boxShadow: shadowStyles[shadowIntensity] }}
                />
                {/* Content */}
                <div className="relative z-30">{children}</div>
            </motion.div>
        </>
    );
};
