import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  opacityDelta: number;
}

interface SpaceBackgroundProps {
  /** When false, renders a static starfield (no animation loop). Default: true */
  animate?: boolean;
}

const STAR_COUNT = 280;
const STAR_COLOR = 'rgba(255,255,255,';

/** GPU-composited canvas starfield — zero layout thrash, 60 fps.
 *  Pass animate={false} to draw once and stop (for static/presentation views). */
export function SpaceBackground({ animate = true }: SpaceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef  = useRef<Star[]>([]);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let W = 0, H = 0;

    function resize() {
      if (!canvas) return;
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width  = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      ctx!.scale(devicePixelRatio, devicePixelRatio);
    }

    function initStars() {
      starsRef.current = Array.from({ length: STAR_COUNT }, () => ({
        x:            Math.random() * W,
        y:            Math.random() * H,
        size:         Math.random() * 1.4 + 0.3,
        speed:        Math.random() * 0.15 + 0.03,
        opacity:      Math.random(),
        opacityDelta: (Math.random() * 0.003 + 0.001) * (Math.random() < 0.5 ? 1 : -1),
      }));
    }

    function drawStatic() {
      // Draw stars once, no animation
      ctx!.clearRect(0, 0, W, H);
      for (const s of starsRef.current) {
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx!.fillStyle = STAR_COLOR + s.opacity.toFixed(2) + ')';
        ctx!.fill();
      }
    }

    function tick() {
      ctx!.clearRect(0, 0, W, H);
      for (const s of starsRef.current) {
        // Drift upward
        s.y -= s.speed;
        if (s.y < 0) { s.y = H; s.x = Math.random() * W; }

        // Twinkle
        s.opacity += s.opacityDelta;
        if (s.opacity > 1 || s.opacity < 0.1) s.opacityDelta *= -1;

        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx!.fillStyle = STAR_COLOR + s.opacity.toFixed(2) + ')';
        ctx!.fill();
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    const ro = new ResizeObserver(() => {
      resize();
      initStars();
      if (!animate) drawStatic(); // Redraw static frame on resize
    });
    ro.observe(canvas);

    resize();
    initStars();

    if (animate) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      drawStatic();
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [animate]);

  return (
    <canvas 
      ref={canvasRef} 
      aria-hidden="true" 
      className="space-background"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, display: 'block' }} 
    />
  );
}
