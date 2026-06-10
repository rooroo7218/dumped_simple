import React from "react";
import { cn } from "@/lib/utils";

interface PremiumHolographicProps {
  mouseX: number; // 0-100
  mouseY: number; // 0-100
  className?: string;
}

const identityMatrix = "1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1";
const maxRotate = 0.25;
const minRotate = -0.25;
const maxScale = 1;
const minScale = 0.97;

export const PremiumHolographic = ({
  mouseX = 50,
  mouseY = 50,
  className,
}: PremiumHolographicProps) => {
  // Convert percentage (0-100) to normalized (-1 to 1) offset from center
  const normalizedX = (mouseX - 50) / 50;
  const normalizedY = (mouseY - 50) / 50;

  // Calculate 3D Matrix (Matrix3D) based on mouse position
  // This logic is adapted from the 21st.dev AwardBadge by @shugar
  const getMatrixString = () => {
    const absX = Math.abs(normalizedX);
    const absY = Math.abs(normalizedY);

    const scale = [
      maxScale - (maxScale - minScale) * absX,
      maxScale - (maxScale - minScale) * absY,
      maxScale - (maxScale - minScale) * (absX + absY) / 2,
    ];

    const rotate = {
      x1: 0.25 * (-normalizedY - -normalizedX),
      x2: maxRotate - (maxRotate - minRotate) * (1 - absX),
      x3: 0,
      y0: 0,
      y2: maxRotate - (maxRotate - minRotate) * (1 - absY),
      y3: 0,
      z0: -(maxRotate - (maxRotate - minRotate) * (1 - absX)),
      z1: 0.2 - (0.2 + 0.6) * (1 - absY),
      z3: 0,
    };

    return (
      `${scale[0]}, ${rotate.y0}, ${rotate.z0}, 0, ` +
      `${rotate.x1}, ${scale[1]}, ${rotate.z1}, 0, ` +
      `${rotate.x2}, ${rotate.y2}, ${scale[2]}, 0, ` +
      `${rotate.x3}, ${rotate.y3}, ${rotate.z3}, 1`
    );
  };

  const matrix = getMatrixString();
  const firstOverlayPosition = (Math.abs(50 - mouseX) + Math.abs(50 - mouseY)) / 1.5;

  // Generate CSS keyframes for the "depth" shimmer
  const keyframes = [...Array(10).keys()]
    .map(
      (i) => `
    @keyframes premiumOverlayAnimation${i + 1} {
      0% { transform: rotate(${i * 10}deg); }
      50% { transform: rotate(${(i + 1) * 10}deg); }
      100% { transform: rotate(${i * 10}deg); }
    }
  `
    )
    .join(" ");

  const layers = [
    { color: "hsl(358, 100%, 62%)", offset: 0 },
    { color: "hsl(30, 100%, 50%)", offset: 10 },
    { color: "hsl(60, 100%, 50%)", offset: 20 },
    { color: "hsl(96, 100%, 50%)", offset: 30 },
    { color: "hsl(233, 85%, 47%)", offset: 40 },
    { color: "hsl(271, 85%, 47%)", offset: 50 },
    { color: "hsl(300, 20%, 35%)", offset: 60 },
    { color: "white", offset: 90 },
  ];

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0", className)}>
      <style>{keyframes}</style>
      
      {/* ── 3D Container ── */}
      <div
        className="absolute inset-0 transition-transform duration-200 ease-out"
        style={{
          transform: `perspective(700px) matrix3d(${matrix})`,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        {/* ── SVG Iridescence Layers ── */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full opacity-60"
        >
          <defs>
            <filter id="premiumBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
            <mask id="tileMask">
              <rect width="100" height="100" fill="white" rx="0" />
            </mask>
          </defs>

          <g style={{ mixBlendMode: "overlay" }} mask="url(#tileMask)">
            {layers.map((layer, i) => (
              <g
                key={i}
                style={{
                  transform: `rotate(${firstOverlayPosition + layer.offset}deg)`,
                  transformOrigin: "center center",
                  animation: `premiumOverlayAnimation${i + 1} 5s infinite`,
                  willChange: "transform",
                }}
              >
                <polygon
                  points="0,0 100,100 100,0 0,100"
                  fill={layer.color}
                  filter="url(#premiumBlur)"
                  opacity="0.4"
                />
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* ── Metallic Sheen Base ── */}
      <div className="absolute inset-0 bg-white/5 mix-blend-overlay" />
    </div>
  );
};
