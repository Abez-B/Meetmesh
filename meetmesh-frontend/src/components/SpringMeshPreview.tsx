import { useEffect, useRef } from 'react';

/* ── Node definitions ───────────────────────────────────────────────────── */
const NODE_DEFS = [
  { label: 'S', fill: '#1e3a5f', stroke: '#3B82F6', text: '#60a5fa' },
  { label: 'O', fill: '#2e1a4a', stroke: '#8B5CF6', text: '#a78bfa' },
  { label: 'S', fill: '#1e3a5f', stroke: '#3B82F6', text: '#60a5fa' },
  { label: 'A', fill: '#0d2e2b', stroke: '#14B8A6', text: '#2dd4bf' },
  { label: 'A', fill: '#0d2e2b', stroke: '#14B8A6', text: '#2dd4bf' },
  { label: 'A', fill: '#0d2e2b', stroke: '#14B8A6', text: '#2dd4bf' },
  { label: 'A', fill: '#0d2e2b', stroke: '#14B8A6', text: '#2dd4bf' },
  { label: 'A', fill: '#0d2e2b', stroke: '#14B8A6', text: '#2dd4bf' },
] as const;

const N = NODE_DEFS.length;

/* Physics constants */
const REST_DIST       = 72;
const MIN_DIST        = 28;
const SPRING_STEP     = 0.055;
const DRIFT_ANGLE_AMP = 0.20;
const DRIFT_DIST_AMP  = 9;
const CURSOR_DIST     = 70;
const CURSOR_STR      = 0.45;

interface SNode { x: number; y: number }

export function SpringMeshPreview() {
  const svgRef   = useRef<SVGSVGElement>(null);
  const gRef     = useRef<SVGGElement>(null);
  const nodesRef = useRef<SNode[]>([]);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef   = useRef(0);
  const sizeRef  = useRef({ w: 320, h: 220 });
  const readyRef = useRef(false);

  const baseAngles = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2 - Math.PI / 2);

  useEffect(() => {
    const svg = svgRef.current;
    const g   = gRef.current;
    if (!svg || !g) return;

    const resize = () => {
      const w = svg.clientWidth  || 320;
      const h = svg.clientHeight || 220;
      sizeRef.current = { w, h };
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      g.setAttribute('transform', `translate(${(w / 2).toFixed(1)},${(h / 2).toFixed(1)})`);
    };

    if (!readyRef.current) {
      readyRef.current = true;
      nodesRef.current = baseAngles.map(a => ({
        x: Math.cos(a) * REST_DIST,
        y: Math.sin(a) * REST_DIST,
      }));
    }

    const flush = () => {
      const nodes = nodesRef.current;
      for (let i = 0; i < N; i++) {
        const el = g.querySelector<SVGGElement>(`[data-sn="${i}"]`);
        if (el) el.setAttribute('transform', `translate(${nodes[i].x.toFixed(1)},${nodes[i].y.toFixed(1)})`);
        const ln = g.querySelector<SVGLineElement>(`[data-ln="${i}"]`);
        if (ln) {
          ln.setAttribute('x2', nodes[i].x.toFixed(1));
          ln.setAttribute('y2', nodes[i].y.toFixed(1));
        }
      }
    };

    const step = () => {
      const t     = Date.now() * 0.00022;
      const nodes = nodesRef.current;
      const mouse = mouseRef.current;
      const { w, h } = sizeRef.current;
      const dynamicRestDist = Math.max(40, Math.min(REST_DIST, Math.min(w, h) * 0.30));

      for (let i = 0; i < N; i++) {
        const node = nodes[i];
        let dx = 0, dy = 0;

        const driftAngle = baseAngles[i] + Math.sin(t * 0.55 + i * 1.85) * DRIFT_ANGLE_AMP;
        const driftDist  = dynamicRestDist + Math.sin(t * 0.38 + i * 2.60) * DRIFT_DIST_AMP;
        const tx = Math.cos(driftAngle) * driftDist;
        const ty = Math.sin(driftAngle) * driftDist;
        dx -= (node.x - tx) * SPRING_STEP;
        dy -= (node.y - ty) * SPRING_STEP;

        for (let j = 0; j < N; j++) {
          if (i === j) continue;
          const rdx = node.x - nodes[j].x;
          const rdy = node.y - nodes[j].y;
          const rd  = Math.sqrt(rdx * rdx + rdy * rdy) || 0.01;
          if (rd < MIN_DIST) {
            const push = (MIN_DIST - rd) * 0.5;
            dx += push * (rdx / rd);
            dy += push * (rdy / rd);
          }
        }

        if (mouse) {
          const mdx = node.x - mouse.x;
          const mdy = node.y - mouse.y;
          const md  = Math.sqrt(mdx * mdx + mdy * mdy) || 0.01;
          if (md < CURSOR_DIST) {
            const push = (CURSOR_DIST - md) * CURSOR_STR;
            dx += push * (mdx / md);
            dy += push * (mdy / md);
          }
        }

        node.x += dx;
        node.y += dy;
      }

      flush();
      rafRef.current = requestAnimationFrame(step);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(svg);
    resize();
    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toSvgCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const { w, h } = sizeRef.current;
    mouseRef.current = {
      x: ((clientX - rect.left) / rect.width) * w - w / 2,
      y: ((clientY - rect.top)  / rect.height) * h - h / 2,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) =>
    toSvgCoords(e.clientX, e.clientY);

  const handleTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 0) return;
    toSvgCoords(e.touches[0].clientX, e.touches[0].clientY);
  };

  return (
    <svg
      ref={svgRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mouseRef.current = null; }}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
      onTouchEnd={() => { mouseRef.current = null; }}
      onTouchCancel={() => { mouseRef.current = null; }}
      aria-hidden="true"
    >
      <g ref={gRef} transform="translate(160,110)">

        {NODE_DEFS.map((_, i) => (
          <line
            key={`l${i}`}
            data-ln={i}
            x1="0" y1="0" x2="0" y2="0"
            stroke="rgba(255,255,255,0.11)"
            strokeWidth="0.9"
            strokeDasharray="3 7"
          />
        ))}

        <g style={{ cursor: 'default' }}>
          <circle r="28" fill="none" stroke="#FFD700" strokeWidth="3" opacity="0.9" />
          <defs>
            <radialGradient id="smp-sun" cx="35%" cy="35%" r="65%">
              <stop offset="0%"   stopColor="#FFE566" />
              <stop offset="60%"  stopColor="#FFD700" />
              <stop offset="100%" stopColor="#F59E0B" />
            </radialGradient>
          </defs>
          <circle r="23" fill="url(#smp-sun)" />
          <circle r="26" fill="none" stroke="#FFD700" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
          <text textAnchor="middle" dy="0.35em" fontSize="13px" fontWeight="800"
            fontFamily="JetBrains Mono, monospace" fill="#000">H</text>
        </g>

        {NODE_DEFS.map((def, i) => (
          <g key={i} data-sn={i} transform="translate(0,0)">
            <circle r="18" fill="none" stroke={def.stroke} strokeWidth="1.6" opacity="0.6" />
            <circle r="14" fill={def.fill} stroke={def.stroke} strokeWidth="1.2" />
            <text textAnchor="middle" dy="0.35em" fontSize="10px" fontWeight="700"
              fontFamily="JetBrains Mono, monospace" fill={def.text}>
              {def.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
