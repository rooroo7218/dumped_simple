import { useRef, useEffect } from 'react';

function Noise({
  patternSize = 100,
  patternScaleX = 1,
  patternScaleY = 1,
  patternRefreshInterval = 1,
  patternAlpha = 50,
  intensity = 1,
}: {
  patternSize?: number;
  patternScaleX?: number;
  patternScaleY?: number;
  patternRefreshInterval?: number;
  patternAlpha?: number;
  intensity?: number;
}) {
  const grainRef = useRef<HTMLCanvasElement>(null);
  const canvasCssSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = grainRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = patternSize;
    patternCanvas.height = patternSize;
    const patternCtx = patternCanvas.getContext('2d');
    if (!patternCtx) return;
    const patternData = patternCtx.createImageData(patternSize, patternSize);
    const patternPixelDataLength = patternSize * patternSize * 4;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const newCssWidth = window.innerWidth;
      const newCssHeight = window.innerHeight;
      canvasCssSizeRef.current = { width: newCssWidth, height: newCssHeight };
      canvas.width = newCssWidth * dpr;
      canvas.height = newCssHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const updatePattern = () => {
      for (let i = 0; i < patternPixelDataLength; i += 4) {
        const value = Math.random() * 255 * intensity;
        patternData.data[i] = value;
        patternData.data[i + 1] = value;
        patternData.data[i + 2] = value;
        patternData.data[i + 3] = patternAlpha;
      }
      patternCtx.putImageData(patternData, 0, 0);
    };

    const drawGrain = () => {
      const { width: cssWidth, height: cssHeight } = canvasCssSizeRef.current;
      if (cssWidth === 0 || cssHeight === 0) return;
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.save();
      const safeX = Math.max(0.001, patternScaleX);
      const safeY = Math.max(0.001, patternScaleY);
      ctx.scale(safeX, safeY);
      const fillPattern = ctx.createPattern(patternCanvas, 'repeat');
      if (fillPattern) {
        ctx.fillStyle = fillPattern;
        ctx.fillRect(0, 0, cssWidth / safeX, cssHeight / safeY);
      }
      ctx.restore();
    };

    let animationFrameId: number;
    const loop = () => {
      if (canvasCssSizeRef.current.width > 0 && canvasCssSizeRef.current.height > 0) {
        if (frame % patternRefreshInterval === 0) {
          updatePattern();
          drawGrain();
        }
      }
      frame++;
      animationFrameId = window.requestAnimationFrame(loop);
    };

    window.addEventListener('resize', resize);
    resize();
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [patternSize, patternScaleX, patternScaleY, patternRefreshInterval, patternAlpha, intensity]);

  return <canvas className="absolute inset-0 w-full h-full pointer-events-none" ref={grainRef} />;
}

const SUNLIGHT_COLORS = [
  { color: 'rgba(245,100,50,1)',   stop: '10.5%' },
  { color: 'rgba(245,130,50,1)',   stop: '16%'   },
  { color: 'rgba(245,150,50,1)',   stop: '17.5%' },
  { color: 'rgba(245,180,110,1)',  stop: '25%'   },
  { color: 'rgba(238,184,212,1)',  stop: '40%'   },
  { color: 'rgba(212,189,224,1)',  stop: '65%'   },
  { color: 'rgba(168,211,243,1)',  stop: '100%'  },
];

export function SunlightGradientBackground() {
  const colorStops = SUNLIGHT_COLORS.map(({ color, stop }) => `${color} ${stop}`).join(', ');
  const background = `radial-gradient(125% 125% at 50% 101%, ${colorStops})`;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ background }}>
      <Noise patternAlpha={50} intensity={1} />
    </div>
  );
}
