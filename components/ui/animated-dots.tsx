"use client";
import React, { useEffect, useRef } from "react";

interface AnimatedDotsProps {
  dotsNum?: number;
  dotRadius?: number;
  dotSpacing?: number;
  speedRange?: [number, number];
  backgroundColor?: string;
  opacity?: number;
  blendMode?: GlobalCompositeOperation;
  fullScreen?: boolean;
  className?: string;
  colors?: [string, number, number, number][];
}

export const AnimatedDots: React.FC<AnimatedDotsProps> = ({
  dotsNum = 60,
  dotRadius = 10,
  dotSpacing = 0,
  speedRange = [1, 4],
  backgroundColor = "transparent",
  opacity = 1,
  blendMode = "normal",
  fullScreen = true,
  className = "",
  colors = [
    ["red", 255, 69, 58],
    ["orange", 255, 149, 0],
    ["yellow", 255, 214, 10],
    ["green", 52, 199, 89],
    ["mint", 0, 199, 190],
    ["teal", 48, 176, 199],
    ["blue", 0, 122, 255],
    ["indigo", 88, 86, 214],
    ["purple", 175, 82, 222],
    ["pink", 255, 45, 85],
    ["rose", 255, 100, 130],
    ["lime", 164, 255, 46],
    ["aqua", 46, 255, 220],
    ["sky", 100, 200, 255],
    ["violet", 205, 150, 255],
    ["gold", 255, 215, 0],
  ]
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const TWO_PI = 2 * Math.PI;
    
    const requestAnimFrame =
      window.requestAnimationFrame ||
      (window as any).webkitRequestAnimationFrame ||
      (window as any).mozRequestAnimationFrame ||
      ((callback: FrameRequestCallback) => window.setTimeout(callback, 1000 / 60));

    class Dot {
      i: number;
      velocity: number;
      ranVelocity: number;
      ranColor: number;
      radius: number;
      x: number;
      y: number;

      constructor(i: number, width: number) {
        this.i = i;
        this.velocity = 0;
        this.radius = dotRadius;
        this.ranVelocity =
          Math.random() * (speedRange[1] - speedRange[0]) + speedRange[0];
        this.ranColor = Math.round(Math.random() * (colors.length - 1));
        this.x = this.radius + i * (this.radius * 2 + dotSpacing);
        this.y = -this.radius;
      }

      draw(width: number, height: number) {
        this.velocity += this.ranVelocity;
        const colorIncrement =
          255 - Math.round(this.velocity * (255 / (height + this.radius)));
        ctx.fillStyle = this.updateColors(colors[this.ranColor], colorIncrement);
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = blendMode;

        if (this.velocity >= height + this.radius) {
          this.velocity = 0;
          this.ranColor = Math.round(Math.random() * (colors.length - 1));
          this.ranVelocity =
            Math.random() * (speedRange[1] - speedRange[0]) + speedRange[0];
        }

        this.y = -this.radius + this.velocity;

        ctx.beginPath();
        ctx.arc(this.x % width, this.y, this.radius, 0, TWO_PI, false);
        ctx.fill();
      }

      updateColors(selectedColor: any, increment: number) {
        let [type, r, g, b] = selectedColor;

        if (type === "red") r = increment;
        else if (type === "green") g = increment;
        else if (type === "blue") b = increment;

        return `rgba(${r}, ${g}, ${b}, 1)`;
      }
    }

    const resizeCanvas = () => {
      const width = fullScreen ? window.innerWidth : (canvas.parentElement?.offsetWidth || canvas.offsetWidth);
      const height = fullScreen ? window.innerHeight : (canvas.parentElement?.offsetHeight || canvas.offsetHeight);
      canvas.width = width;
      canvas.height = height;
      createDots(width);
    };

    const createDots = (width: number) => {
      dotsRef.current = [];
      for (let i = 0; i < dotsNum; i++) {
        dotsRef.current.push(new Dot(i, width));
      }
    };

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      for (const dot of dotsRef.current) {
        dot.draw(width, height);
      }

      animationRef.current = requestAnimFrame(draw);
    };

    resizeCanvas();
    draw();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [
    dotsNum,
    dotRadius,
    colors,
    dotSpacing,
    speedRange,
    backgroundColor,
    opacity,
    blendMode,
    fullScreen,
  ]);

  return (
    <div
      className={`relative ${fullScreen ? "w-screen h-screen" : "w-full h-full"} ${className}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
