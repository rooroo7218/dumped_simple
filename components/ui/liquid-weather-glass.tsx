import React, { useRef, useState } from 'react';
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
    overflowVisible?: boolean;
    isAurora?: boolean;
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
    overflowVisible = false,
    isAurora = false,
    ...rest
}: LiquidGlassCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    const handleToggleExpansion = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!expandable) return;
        const target = e.target as HTMLElement;
        if (target.closest('a, button, input, select, textarea')) return;
        setIsExpanded(!isExpanded);
        onClick?.(e);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isAurora || !cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const rotateX = -(y / rect.height) * 5; 
        const rotateY = (x / rect.width) * 5; 
        setRotation({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        if (!isAurora) return;
        setIsHovered(false);
        setRotation({ x: 0, y: 0 });
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
            <motion.div
                ref={cardRef}
                className={cn(`relative ${overflowVisible ? '' : 'overflow-hidden'}`, className)}
                style={{
                    ...sharedStyle,
                    ...(isAurora ? { transformStyle: "preserve-3d", perspective: 1000 } : {})
                }}
                variants={expandable ? containerVariants : undefined}
                animate={expandable ? (isExpanded ? 'expanded' : 'collapsed') : (isAurora ? { rotateX: rotation.x, rotateY: rotation.y } : undefined)}
                onClick={expandable ? handleToggleExpansion : onClick}
                onMouseEnter={() => isAurora && setIsHovered(true)}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
                drag={motionDrag}
                dragConstraints={motionDrag ? { left: 0, right: 0, top: 0, bottom: 0 } : undefined}
                dragElastic={motionDrag ? 0.3 : undefined}
                dragTransition={motionDrag ? { bounceStiffness: 300, bounceDamping: 10, power: 0.3 } : undefined}
                whileDrag={motionDrag ? { scale: 1.02 } : undefined}
                whileHover={isAurora ? undefined : { scale: 1.005 }}
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
                
                {/* ── Aurora Specific Layers ── */}
                {isAurora && (
                    <>
                        <motion.div
                            className="absolute inset-0 z-12 pointer-events-none"
                            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.05) 100%)", borderRadius }}
                            animate={{ opacity: isHovered ? 0.7 : 0.5 }}
                            transition={{ duration: 0.4 }}
                        />
                        <div className="absolute inset-0 z-13 opacity-30 mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, borderRadius }} />
                        <div className="absolute inset-0 z-14 opacity-10 mix-blend-soft-light pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='smudge'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.01' numOctaves='3' seed='5' stitchTiles='stitch'/%3E%3CfeGaussianBlur stdDeviation='10'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23smudge)'/%3E%3C/svg%3E")`, borderRadius }} />
                        
                        <motion.div
                            className="absolute bottom-0 left-0 right-0 h-2/3 z-15 pointer-events-none overflow-hidden"
                            style={{ borderRadius, background: `radial-gradient(ellipse at bottom right, rgba(172, 92, 255, 0.4) -10%, rgba(79, 70, 229, 0) 70%), radial-gradient(ellipse at bottom left, rgba(56, 189, 248, 0.4) -10%, rgba(79, 70, 229, 0) 70%)` }}
                            animate={{ opacity: isHovered ? 0.9 : 0.6 }}
                            transition={{ duration: 0.4 }}
                        />
                        <motion.div
                            className="absolute bottom-0 left-0 right-0 h-2/3 z-16 pointer-events-none overflow-hidden"
                            style={{ borderRadius, background: `radial-gradient(circle at bottom center, rgba(161, 58, 229, 0.4) -20%, rgba(79, 70, 229, 0) 60%)` }}
                            animate={{ opacity: isHovered ? 0.85 : 0.5 }}
                            transition={{ duration: 0.4 }}
                        />
                    </>
                )}

                {/* Edge layer — inner highlights */}
                <div
                    className="absolute inset-0 z-20"
                    style={{ borderRadius, boxShadow: shadowStyles[shadowIntensity] }}
                />
                {/* Content */}
                <motion.div 
                    className="relative z-30 h-full w-full"
                    animate={isAurora ? { z: 5, rotateX: isHovered ? -rotation.x * 0.3 : 0, rotateY: isHovered ? -rotation.y * 0.3 : 0 } : undefined}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                >
                    {children}
                </motion.div>
            </motion.div>
        </>
    );
};
