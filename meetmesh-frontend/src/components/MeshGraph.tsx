import { useEffect, useLayoutEffect, useRef, useState, useCallback, memo, useId } from 'react';
import { Participant, parseProfile } from 'meetmesh-core';
import { SpaceBackground } from './SpaceBackground';
import './MeshGraph.css';

interface Props {
  participants: Participant[];
  visitedNodes: Set<string>;
  onNodeClick: (peerId: string, pos?: { x: number; y: number }) => void;
  hostPeerId?: string | null;
  searchTerm?: string;
  disableSimulation?: boolean;
  disableInteractions?: boolean;
}

/** No velocity — position is relaxed directly each frame, so it never oscillates. */
interface GraphNode {
  id: string;
  p: Participant;
  x: number;
  y: number;
  visited: boolean;
  role: ParticipantRole;
  photo?: string;
  tags: string[];
  /** Ring tier (0 = innermost). Set once on node creation. */
  ringIndex: number;
  /** Target distance from host in graph px — derived from ring tier. */
  restDist: number;
  /** How many nodes share this ring — drives angular spacing force. */
  ringCount: number;
  /** Index within this ring, for initial angular placement. */
  ringSlot: number;
}

type ParticipantRole = 'Host' | 'Organizer' | 'Speaker' | 'Attendee' | 'Presentation';

const ROLE_THEME = {
  Host:      { ring: '#FFD700', text: '#FFD700' },
  Organizer: { ring: '#8B5CF6', text: '#A78BFA' },
  Speaker:   { ring: '#3B82F6', text: '#60A5FA' },
  Attendee:  { ring: '#14B8A6', text: '#5EEAD4' },
  Presentation: { ring: '#666', text: '#666' },
};
const ROLE_PRIORITY: Record<ParticipantRole, number> = {
  Host: 0, Organizer: 1, Speaker: 2, Attendee: 3, Presentation: 4,
};

// ── Physics constants ─────────────────────────────────────────────────────────
// Reduced radii so the graph fits on small mobile screens naturally.
const RING_CAPACITY = 6;    // max non-host nodes per ring
const RING_BASE     = 120;  // inner-ring radius (px) — was 155
const RING_GAP      = 72;   // extra px added per ring level — was 90

const SPRING_STEP  = 0.08;  // fraction of radial spring error corrected per frame — was 0.055
const MIN_DIST     = 60;    // absolute minimum centre-to-centre clearance (px) — was 52
const CLUSTER_REST = 68;    // visited-cluster pull rest distance (px)
const CLUSTER_STEP = 0.04;  // fraction of cluster error corrected per frame

// Cursor repulsion
const CURSOR_DIST  = 75;
const CURSOR_DEAD  = 40;
const CURSOR_STR   = 0.038;
const DRIFT_AMP    = 0.06;

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3.5;

/** Number of warm-up physics steps run synchronously before first paint. */
const WARMUP_STEPS = 80;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Compute initial (x,y) for a node placed at ringSlot i of ringCount total on a ring of radius r. */
function ringSpawnPos(ringIndex: number, ringSlot: number, ringCount: number, restDist: number): { x: number; y: number } {
  // Offset angle per ring so rings don't align visually
  const ringOffset = ringIndex * (Math.PI / RING_CAPACITY);
  const angle = ringOffset + (ringSlot / Math.max(ringCount, 1)) * 2 * Math.PI;
  return { x: Math.cos(angle) * restDist, y: Math.sin(angle) * restDist };
}

// ── Node label ────────────────────────────────────────────────────────────────

function NodeLabel({ name, y, color }: { name: string; y: number; color: string }) {
  const maxChars = 14;
  const display  = name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
  const pillW    = Math.max(44, display.length * 6.2 + 28);
  const pillH    = 18;
  return (
    <g className="name-pill" style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <rect x={-pillW / 2} y={y - 1} width={pillW} height={pillH} rx={pillH / 2} ry={pillH / 2}
        fill="rgba(8,8,12,0.78)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      <text y={y + pillH / 2 + 4} textAnchor="middle" fontSize="10px" fontWeight="500"
        fontFamily="JetBrains Mono, monospace" fill={color} letterSpacing="0.02em">
        {display}
      </text>
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function MeshGraphInner({
  participants, visitedNodes, onNodeClick, hostPeerId,
  searchTerm = '', disableSimulation = false, disableInteractions = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const gRef         = useRef<SVGGElement>(null);
  const rafRef       = useRef<number>(0);
  const hoveredIdRef = useRef<string | null>(null);

  const nodePhotoClipId   = useId();
  const hostPhotoClipId   = useId();
  const hostSunGradientId = useId();

  // Physics state
  const nodesRef     = useRef<GraphNode[]>([]);
  // React render state
  const [nodes, setNodes] = useState<GraphNode[]>([]);

  const transformRef = useRef({ x: 300, y: 300, k: 1 });
  const dimsRef      = useRef({ width: 600, height: 600 });
  const panRef       = useRef({ active: false, lastX: 0, lastY: 0 });
  const mouseRef     = useRef<{ x: number; y: number } | null>(null);

  // Pinch-to-zoom state
  const pinchRef = useRef<{ active: false } | { active: true; dist: number; midX: number; midY: number }>({ active: false });

  const [refreshKey,     setRefreshKey]     = useState(0);
  const [containerScale, setContainerScale] = useState(1);
  const [tooltip, setTooltip] = useState<{
    name: string; role: string; color: string; x: number; y: number;
  } | null>(null);

  // ── Dynamic node radius based on container scale ───────────────────────────
  // Instead of CSS transform:scale (which breaks physics coords), we compute
  // actual SVG radii from containerScale and pass them to the rendered elements.
  const nodeR     = Math.max(18, Math.round(26 * Math.min(1, containerScale + 0.15)));
  const nodeHaloR = nodeR + 7;
  const hostR     = Math.max(28, Math.round(38 * Math.min(1, containerScale + 0.15)));
  const hostHaloR = hostR + 6;

  const applyTransform = useCallback((t: { x: number; y: number; k: number }) => {
    gRef.current?.setAttribute(
      'transform',
      `translate(${t.x.toFixed(2)},${t.y.toFixed(2)}) scale(${t.k.toFixed(4)})`,
    );
    transformRef.current = t;
  }, []);

  const flushPositions = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    const currentNodes = nodesRef.current;

    for (const node of currentNodes) {
      const el = g.querySelector<SVGGElement>(`[data-node-id="${node.id}"]`);
      if (el) el.setAttribute('transform', `translate(${node.x.toFixed(1)},${node.y.toFixed(1)})`);
    }
    const host = currentNodes.find(n => n.role === 'Host');
    for (const line of g.querySelectorAll<SVGLineElement>('[data-link-target]')) {
      const target = currentNodes.find(n => n.id === line.getAttribute('data-link-target'));
      if (host && target) {
        line.setAttribute('x1', host.x.toFixed(1)); line.setAttribute('y1', host.y.toFixed(1));
        line.setAttribute('x2', target.x.toFixed(1)); line.setAttribute('y2', target.y.toFixed(1));
      }
    }
  }, []);

  const setHoveredNode = useCallback((nodeId: string | null) => {
    hoveredIdRef.current = nodeId;
  }, []);

  const relaxStep = useCallback((): number => {
    const currentNodes = nodesRef.current;
    if (currentNodes.length === 0) return 0;
    const nonHost = currentNodes.filter(n => n.role !== 'Host');
    const visited  = nonHost.filter(n => n.visited);
    const pausedId = hoveredIdRef.current;
    let totalMov   = 0;

    const containerShort = Math.min(dimsRef.current.width, dimsRef.current.height);
    const gs = Math.max(0.28, Math.min(1.0, containerShort / 480)); // was /560 — scales up for small screens
    const sBase    = RING_BASE    * gs;
    const sGap     = RING_GAP     * gs;
    const sMin     = MIN_DIST     * gs;
    const sCluster = CLUSTER_REST * gs;
    const sCursorD = CURSOR_DIST  * gs;
    const sCursorDD= CURSOR_DEAD  * gs;

    for (let i = 0; i < nonHost.length; i++) {
      const node = nonHost[i];
      if (node.id === pausedId) continue;

      let dx = 0; let dy = 0;
      const { ringIndex, ringCount } = node;
      const scaledRest = sBase + ringIndex * sGap;
      const dist = Math.sqrt(node.x * node.x + node.y * node.y) || 0.01;
      const springErr = dist - scaledRest;
      const sc = springErr * SPRING_STEP;
      dx -= sc * (node.x / dist);
      dy -= sc * (node.y / dist);

      for (let j = 0; j < nonHost.length; j++) {
        if (i === j) continue;
        const o   = nonHost[j];
        const rdx = node.x - o.x; const rdy = node.y - o.y;
        const rd  = Math.sqrt(rdx * rdx + rdy * rdy) || 0.01;
        const sameRing    = o.ringIndex === ringIndex;
        const ringSpacing = sameRing && ringCount > 1
          ? 2 * scaledRest * Math.sin(Math.PI / ringCount) * 0.85
          : 0;
        const effectiveMin = Math.max(sMin, ringSpacing);
        if (rd < effectiveMin) {
          const push = (effectiveMin - rd) * 0.5;
          dx += push * (rdx / rd); dy += push * (rdy / rd);
        }
      }

      if (node.visited) {
        for (let j = 0; j < visited.length; j++) {
          const o = visited[j];
          if (o.id === node.id) continue;
          const cdx  = o.x - node.x; const cdy  = o.y - node.y;
          const cd   = Math.sqrt(cdx * cdx + cdy * cdy) || 0.01;
          if (cd > sCluster) {
            const pull = (cd - sCluster) * CLUSTER_STEP;
            dx += pull * (cdx / cd); dy += pull * (cdy / cd);
          }
        }
      }

      // Tag-based magnetic attraction for common interests
      if (node.tags && node.tags.length > 0) {
        for (let j = 0; j < nonHost.length; j++) {
          if (i === j) continue;
          const o = nonHost[j];
          if (!o.tags || o.tags.length === 0) continue;
          const hasCommon = node.tags.some(t => o.tags.includes(t));
          if (hasCommon) {
            const tdx = o.x - node.x; const tdy = o.y - node.y;
            const td = Math.sqrt(tdx * tdx + tdy * tdy) || 0.01;
            if (td > sMin * 1.3) {
              const tagPull = 0.012 * gs;
              dx += tagPull * (tdx / td);
              dy += tagPull * (tdy / td);
            }
          }
        }
      }

      const mouse = mouseRef.current;
      if (mouse) {
        const mdx = node.x - mouse.x; const mdy = node.y - mouse.y;
        const md  = Math.sqrt(mdx * mdx + mdy * mdy) || 0.01;
        if (md > sCursorDD && md < sCursorD) {
          const push = (sCursorD - md) * CURSOR_STR;
          dx += push * (mdx / md); dy += push * (mdy / md);
        }
      }

      const t = Date.now() * 0.00018;
      dx += Math.sin(t * 0.75 + i * 1.7321) * DRIFT_AMP;
      dy += Math.cos(t * 0.60 + i * 2.8912) * DRIFT_AMP;

      node.x += dx; node.y += dy;
      totalMov += Math.abs(dx) + Math.abs(dy);
    }

    const hostNodeInPhysics = currentNodes.find(n => n.role === 'Host');
    if (hostNodeInPhysics) { hostNodeInPhysics.x = 0; hostNodeInPhysics.y = 0; }
    return totalMov;
  }, []);

  useEffect(() => {
    const valid = participants
      .filter(p => !p.peerId?.startsWith('present-') && (p.role as string) !== 'Presentation' && !p.displayName?.toLowerCase().includes('presentation'))
      .sort((a, b) => {
        const roleA = (a.role?.charAt(0).toUpperCase() + a.role?.slice(1).toLowerCase()) as ParticipantRole;
        const roleB = (b.role?.charAt(0).toUpperCase() + b.role?.slice(1).toLowerCase()) as ParticipantRole;
        const rd = (ROLE_PRIORITY[roleA] ?? 3) - (ROLE_PRIORITY[roleB] ?? 3);
        if (rd !== 0) return rd;
        return a.displayName.localeCompare(b.displayName);
      });

    let hostParticipant = hostPeerId ? valid.find(p => p.peerId === hostPeerId) : null;
    if (!hostParticipant) {
      hostParticipant = valid.find(p => p.role?.toLowerCase() === 'host') || null;
    }

    const nonHostParticipants = valid.filter(p => p.peerId !== hostParticipant?.peerId);
    const prevById = new Map(nodesRef.current.map(n => [n.id, n]));

    // Pre-compute ring layout
    const ringData = nonHostParticipants.map((_, i) => {
      const ringIndex  = Math.floor(i / RING_CAPACITY);
      const ringStart  = ringIndex * RING_CAPACITY;
      const ringEnd    = Math.min(ringStart + RING_CAPACITY, nonHostParticipants.length);
      const ringCount  = ringEnd - ringStart;
      const ringSlot   = i - ringStart;
      const restDist   = RING_BASE + ringIndex * RING_GAP;
      return { ringIndex, ringCount, ringSlot, restDist };
    });

    const newNodes: GraphNode[] = [];
    if (hostParticipant) {
      newNodes.push({
        id: hostParticipant.peerId, p: hostParticipant,
        x: 0, y: 0,
        visited: visitedNodes.has(hostParticipant.peerId),
        role: 'Host',
        photo: parseProfile(hostParticipant.json)?.photo,
        tags: parseProfile(hostParticipant.json)?.tags || [],
        ringIndex: 0, restDist: 0, ringCount: 0, ringSlot: 0,
      });
    }

    nonHostParticipants.forEach((p, i) => {
      const prev = prevById.get(p.peerId);
      const role = (p.role?.charAt(0).toUpperCase() + p.role?.slice(1).toLowerCase()) as Exclude<ParticipantRole, 'Host'>;
      const rd = ringData[i];

      // KEY FIX: spawn at the correct ring position instead of near-origin.
      // Use previous position if the node already existed (smooth rejoins).
      let spawnX: number, spawnY: number;
      if (prev) {
        spawnX = prev.x; spawnY = prev.y;
      } else {
        const pos = ringSpawnPos(rd.ringIndex, rd.ringSlot, rd.ringCount, rd.restDist);
        // Add small jitter so nodes on the same ring don't perfectly overlap during warm-up
        spawnX = pos.x + (Math.random() - 0.5) * 8;
        spawnY = pos.y + (Math.random() - 0.5) * 8;
      }

      newNodes.push({
        id:       p.peerId,
        p,
        x:        spawnX,
        y:        spawnY,
        visited:  visitedNodes.has(p.peerId),
        role:     role || 'Attendee',
        photo:    parseProfile(p.json)?.photo,
        tags:     parseProfile(p.json)?.tags || [],
        ...rd,
      });
    });

    nodesRef.current = newNodes;

    // ── Warm-up: run physics steps synchronously before first React paint ──
    // This ensures nodes are already spread when the SVG first renders,
    // eliminating the "nodes all start clustered" visual glitch.
    for (let step = 0; step < WARMUP_STEPS; step++) {
      relaxStep();
    }

    setNodes(newNodes);
    setRefreshKey(k => k + 1);
    flushPositions();
  }, [participants, visitedNodes, relaxStep, flushPositions, hostPeerId]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (nodes.length === 0) return;
    if (disableSimulation) { relaxStep(); flushPositions(); return; }
    const tick = () => { relaxStep(); flushPositions(); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [refreshKey, nodes.length, disableSimulation, relaxStep, flushPositions]);

  // Synchronously flush positions right after React commits new nodes to DOM
  useLayoutEffect(() => {
    flushPositions();
  }, [nodes, flushPositions]);

  // Tab inactivity recovery: when tab returns to foreground or runs in background
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        for (let i = 0; i < 20; i++) {
          relaxStep();
        }
        flushPositions();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Fallback ticker for inactive/background tabs where RAF is suspended by browser
    const bgInterval = setInterval(() => {
      if (document.visibilityState !== 'visible' && nodesRef.current.length > 0) {
        relaxStep();
        flushPositions();
      }
    }, 2000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(bgInterval);
    };
  }, [relaxStep, flushPositions]);

  useEffect(() => {
    const svgEl = svgRef.current;
    const clear = () => {
      svgEl?.querySelectorAll('.constellation-node.focused').forEach(el => el.classList.remove('focused'));
      svgEl?.querySelectorAll('.line-highlight').forEach(el => el.classList.remove('line-highlight'));
    };
    if (!searchTerm.trim()) { clear(); return; }
    const t = setTimeout(() => {
      const q = searchTerm.toLowerCase();
      const target = nodesRef.current.find(n =>
        n.p.displayName.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
      clear();
      if (target) {
        svgEl?.querySelector(`[data-node-id="${target.id}"]`)?.classList.add('focused');
        svgEl?.querySelector(`[data-link-target="${target.id}"]`)?.classList.add('line-highlight');
      }
    }, 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    let raf = 0;
    const update = () => {
      const w = el.clientWidth, h = el.clientHeight;
      dimsRef.current = { width: w, height: h };
      svgRef.current?.setAttribute('viewBox', `0 0 ${w} ${h}`);
      applyTransform({ x: w / 2, y: h / 2, k: transformRef.current.k });
      const gs = Math.max(0.28, Math.min(1.0, Math.min(w, h) / 480));
      setContainerScale(gs);
      relaxStep(); flushPositions();
    };
    const throttled = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    const ro = new ResizeObserver(throttled);
    ro.observe(el);
    update();
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [applyTransform, relaxStep, flushPositions]);

  const zoomToFit = useCallback((maxScale = ZOOM_MAX) => {
    const currentNodes = nodesRef.current;
    const dims = dimsRef.current;
    if (currentNodes.length === 0) return;
    const xs = currentNodes.map(n => n.x), ys = currentNodes.map(n => n.y);
    const nW = Math.max(...xs) - Math.min(...xs), nH = Math.max(...ys) - Math.min(...ys);
    if (nW === 0 || nH === 0) { applyTransform({ x: dims.width / 2, y: dims.height / 2, k: 1 }); return; }
    // Adaptive padding — tight on mobile so nodes use maximum screen area
    const isMobileView = Math.min(dims.width, dims.height) < 560;
    // On mobile: 36px each side gives full-width graph usage; on desktop give more breathing room
    const pad = isMobileView ? 36 : (dims.width >= 1100 ? 170 : 100);
    // On mobile allow a higher effective scale so nodes render larger
    const effectiveMax = isMobileView ? Math.min(maxScale, 1.4) : maxScale;
    const scale = Math.min((dims.width - pad * 2) / nW, (dims.height - pad * 2) / nH, effectiveMax);
    applyTransform({
      x: dims.width  / 2 - ((Math.min(...xs) + Math.max(...xs)) / 2) * scale,
      y: dims.height / 2 - ((Math.min(...ys) + Math.max(...ys)) / 2) * scale,
      k: scale,
    });
  }, [applyTransform]);

  useEffect(() => {
    if (nodes.length > 0) {
      // Delay slightly to let the container resize observer measure the correct dims
      const t = setTimeout(() => zoomToFit(0.85), 120);
      return () => clearTimeout(t);
    }
  }, [nodes.length, zoomToFit]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'f' || e.key === 'F') zoomToFit(ZOOM_MAX); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [zoomToFit]);

  const zoomIn  = useCallback((e?: React.PointerEvent | React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    applyTransform({ ...transformRef.current, k: Math.min(ZOOM_MAX, transformRef.current.k * 1.15) });
  }, [applyTransform]);
  const zoomOut = useCallback((e?: React.PointerEvent | React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    applyTransform({ ...transformRef.current, k: Math.max(ZOOM_MIN, transformRef.current.k / 1.15) });
  }, [applyTransform]);
  const recenter = useCallback((e?: React.PointerEvent | React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    zoomToFit(0.92);
  }, [zoomToFit]);

  // ── Pan (pointer events) ───────────────────────────────────────────────────

  const handlePanStart = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('.constellation-node')) return;
    // Don't start pan if this is a second pointer (pinch gesture incoming)
    if (e.isPrimary === false) return;
    panRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    svgRef.current?.classList.add('is-panning');
    try {
      (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
  };
  const handlePanMove = (e: React.PointerEvent) => {
    if (!panRef.current.active || pinchRef.current.active) return;
    const dx = e.clientX - panRef.current.lastX, dy = e.clientY - panRef.current.lastY;
    panRef.current.lastX = e.clientX; panRef.current.lastY = e.clientY;
    const cur = transformRef.current;
    applyTransform({ ...cur, x: cur.x + dx, y: cur.y + dy });
  };
  const handlePanEnd = (e: React.PointerEvent) => {
    panRef.current.active = false;
    svgRef.current?.classList.remove('is-panning');
    try {
      const target = e.currentTarget as SVGElement;
      if (target?.hasPointerCapture?.(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore if pointer capture was already lost
    }
  };

  // ── Pinch-to-zoom (native touch events on the container div) ───────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t0 = e.touches[0], t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;
        pinchRef.current = { active: true, dist, midX, midY };
        panRef.current.active = false;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchRef.current.active) return;
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const pinch = pinchRef.current as { active: true; dist: number; midX: number; midY: number };
      const ratio = newDist / (pinch.dist || 1);
      const cur = transformRef.current;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();

      // Zoom around the pinch midpoint
      const cx = ((pinch.midX - rect.left) / rect.width)  * dimsRef.current.width;
      const cy = ((pinch.midY - rect.top)  / rect.height) * dimsRef.current.height;
      const newK = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cur.k * ratio));
      applyTransform({
        x: cx - (cx - cur.x) * (newK / cur.k),
        y: cy - (cy - cur.y) * (newK / cur.k),
        k: newK,
      });
      pinch.dist = newDist;
    };
    const onTouchEnd = () => {
      pinchRef.current = { active: false };
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [applyTransform]);

  const handleCursorMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const { width: svgW, height: svgH } = dimsRef.current;
    const svgX = (e.clientX - rect.left) / rect.width  * svgW;
    const svgY = (e.clientY - rect.top)  / rect.height * svgH;
    const { x: tx, y: ty, k } = transformRef.current;
    mouseRef.current = { x: (svgX - tx) / k, y: (svgY - ty) / k };
  };
  const handleCursorLeave = () => { mouseRef.current = null; };

  const handleInnerNodeClick = (node: GraphNode, event: React.MouseEvent) =>
    onNodeClick(node.id, { x: event.clientX, y: event.clientY });

  const hostNode     = nodes.find(n => n.role === 'Host');
  const nonHostNodes = nodes.filter(n => n.role !== 'Host');

  return (
    <div ref={containerRef} className="mesh-graph-container mesh-graph-container--solar">
      <SpaceBackground animate={!disableSimulation} />

      <svg
        ref={svgRef}
        className="mesh-svg"
        width="100%" height="100%"
        viewBox={`0 0 ${dimsRef.current.width} ${dimsRef.current.height}`}
        style={{ cursor: disableInteractions ? 'default' : 'grab', touchAction: 'none' }}
        onPointerDown={disableInteractions  ? undefined : handlePanStart}
        onPointerMove={disableInteractions  ? undefined : handlePanMove}
        onPointerUp={disableInteractions    ? undefined : handlePanEnd}
        onPointerLeave={disableInteractions ? undefined : handlePanEnd}
        onMouseMove={handleCursorMove}
        onMouseLeave={handleCursorLeave}
      >
        <rect width="100%" height="100%" fill="transparent" style={{ pointerEvents: 'all' }} />

        <g ref={gRef}
          transform={`translate(${transformRef.current.x},${transformRef.current.y}) scale(${transformRef.current.k})`}
        >
          <defs>
            <radialGradient id={hostSunGradientId} cx="35%" cy="35%" r="70%">
              <stop offset="0%"   stopColor="#FFE566" />
              <stop offset="45%"  stopColor="#FFD700" />
              <stop offset="100%" stopColor="#FFA500" />
            </radialGradient>
            <clipPath id={nodePhotoClipId}><circle cx="0" cy="0" r={nodeR} /></clipPath>
            <clipPath id={hostPhotoClipId}><circle cx="0" cy="0" r={hostR} /></clipPath>
          </defs>

          {(() => {
            const rings = Array.from(
              new Map(nonHostNodes.map(n => [n.ringIndex, n.restDist])).entries()
            ).sort(([a], [b]) => a - b);
            const ringColors = [
              'rgba(139,92,246,0.13)',
              'rgba(59,130,246,0.10)',
              'rgba(20,184,166,0.08)',
            ];
            return rings.map(([ringIndex, restDist]) => (
              <circle
                key={`ring-guide-${ringIndex}`}
                cx="0" cy="0"
                r={restDist * containerScale}
                fill="none"
                stroke={ringColors[ringIndex] ?? ringColors[2]}
                strokeWidth="1.5"
                strokeDasharray="4 14"
                className="ring-guide"
                style={{ animationDelay: `${ringIndex * -3}s` }}
              />
            ));
          })()}

          <g className="constellation-lines">
            {nonHostNodes.map(node => (
              <line
                key={`link-${node.id}`}
                data-link-target={node.id}
                x1={(hostNode?.x ?? 0).toFixed(1)}
                y1={(hostNode?.y ?? 0).toFixed(1)}
                x2={node.x.toFixed(1)}
                y2={node.y.toFixed(1)}
                stroke={node.visited ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.13)'}
                strokeWidth={node.visited ? 1.8 : 1}
                strokeDasharray={node.visited ? undefined : '4 7'}
              />
            ))}
          </g>

          {/* ── Non-host nodes ────────────────────────────────────────── */}
          {nonHostNodes.map(node => {
            const theme = ROLE_THEME[node.role as ParticipantRole] ?? ROLE_THEME.Attendee;
            return (
              <g
                key={node.id}
                data-node-id={node.id}
                className={`constellation-node node-${node.role.toLowerCase()}`}
                transform={`translate(${node.x.toFixed(1)},${node.y.toFixed(1)})`}
                onPointerEnter={disableInteractions ? undefined : (e) => {
                  setHoveredNode(node.id);
                  setTooltip({ name: node.p.displayName, role: node.role, color: theme.ring, x: e.clientX, y: e.clientY });
                }}
                onPointerLeave={disableInteractions ? undefined : () => {
                  setHoveredNode(null);
                  setTooltip(null);
                }}
                onClick={e => handleInnerNodeClick(node, e)}
                style={{ cursor: 'pointer', '--node-ring-color': theme.ring } as React.CSSProperties}
              >
                <circle className="node-halo" r={nodeHaloR} fill="none" stroke={theme.ring}
                  strokeWidth="2.4" opacity={node.visited ? 0.2 : 0.7} />
                {node.visited && (
                  <circle r={nodeHaloR + 3} fill="none" stroke="#6366f1" strokeWidth="1.2"
                    opacity="0.5" strokeDasharray="4 3" />
                )}
                <circle className="node-core" r={nodeR} fill="#0a0a0a"
                  stroke={node.visited ? '#4f46e5' : theme.ring} strokeWidth="1.8" />
                {node.photo
                  ? <image href={node.photo} x={-nodeR} y={-nodeR} width={nodeR * 2} height={nodeR * 2}
                      clipPath={`url(#${nodePhotoClipId})`} opacity={node.visited ? 0.5 : 1} />
                  : <text className="node-initial" dy="0.35em" textAnchor="middle" fontSize={`${Math.round(nodeR * 0.62)}px`}
                      fontFamily="JetBrains Mono, monospace" fontWeight="600"
                      fill={node.visited ? '#6366f1' : theme.text}>
                      {node.p.displayName.charAt(0).toUpperCase()}
                    </text>
                }
                <NodeLabel name={node.p.displayName} y={nodeHaloR + 14}
                  color={node.visited ? '#818cf8' : '#d4d4d4'} />
              </g>
            );
          })}

          {/* ── Host node (Rendered last = drawn on top) ───────────────── */}
          {hostNode && (
            <g
              data-node-id={hostNode.id}
              className="constellation-node node-host"
              transform={`translate(${hostNode.x.toFixed(1)},${hostNode.y.toFixed(1)})`}
              onClick={e => handleInnerNodeClick(hostNode, e)}
              style={{ cursor: 'pointer', '--node-ring-color': ROLE_THEME.Host.ring } as React.CSSProperties}
            >
              <circle className="node-halo" r={hostHaloR} fill="none" stroke={ROLE_THEME.Host.ring} strokeWidth="5" />
              <circle className="node-core host-sun-core" r={hostR} fill={`url(#${hostSunGradientId})`} stroke="#FFA500" strokeWidth="3.2" />
              {hostNode.photo
                ? <image href={hostNode.photo} x={-hostR} y={-hostR} width={hostR * 2} height={hostR * 2} clipPath={`url(#${hostPhotoClipId})`} />
                : <text className="node-initial" dy="0.35em" textAnchor="middle" fontSize={`${Math.round(hostR * 0.6)}px`}
                    fontFamily="JetBrains Mono, monospace" fontWeight="700" fill="#000">
                    {hostNode.p.displayName.charAt(0).toUpperCase()}
                  </text>
              }
              <circle className="host-ring" r={hostR + 4} fill="none" stroke="white" strokeWidth="1.7"
                strokeDasharray="6 4" opacity="0.82" />
              <path className="host-crown"
                d={`M ${-hostR * 0.39} ${-(hostR + 14)} L ${-hostR * 0.18} ${-(hostR + 3)} L 0 ${-(hostR + 14)} L ${hostR * 0.18} ${-(hostR + 3)} L ${hostR * 0.39} ${-(hostR + 14)} L ${hostR * 0.39} ${-hostR + 2} L ${-hostR * 0.39} ${-hostR + 2} Z`}
                fill={ROLE_THEME.Host.ring} stroke="#fff" strokeWidth="1" opacity="0.95" />
              <NodeLabel name={hostNode.p.displayName} y={hostHaloR + 14} color={ROLE_THEME.Host.ring} />
            </g>
          )}
        </g>
      </svg>

      {tooltip && (
        <div
          className="mesh-tooltip"
          style={{ left: tooltip.x, top: tooltip.y - 56 }}
          aria-hidden
        >
          <span className="mesh-tooltip-name">{tooltip.name}</span>
          <span className="mesh-tooltip-role" style={{ color: tooltip.color }}>
            {tooltip.role}
          </span>
        </div>
      )}

      {!disableInteractions && (
        <div className="mesh-zoom-controls">
          <button type="button" className="zoom-btn zoom-btn--fit" title="Fit all (F)"
            onPointerDown={e => { e.preventDefault(); e.stopPropagation(); recenter(e); }}>⊕</button>
          <button type="button" className="zoom-btn" title="Zoom out"
            onPointerDown={e => { e.preventDefault(); e.stopPropagation(); zoomOut(e); }}>−</button>
          <button type="button" className="zoom-btn" title="Zoom in"
            onPointerDown={e => { e.preventDefault(); e.stopPropagation(); zoomIn(e); }}>+</button>
        </div>
      )}
    </div>
  );
}

function arePropsEqual(prev: Props, next: Props): boolean {
  if (prev.participants.length !== next.participants.length) return false;
  if (prev.hostPeerId           !== next.hostPeerId)           return false;
  if (prev.searchTerm           !== next.searchTerm)           return false;
  if (prev.visitedNodes         !== next.visitedNodes)         return false;
  if (prev.disableSimulation    !== next.disableSimulation)    return false;
  if (prev.disableInteractions  !== next.disableInteractions)  return false;
  const pk = prev.participants.map(p => p.peerId + '|' + p.role).join(',');
  const nk = next.participants.map(p => p.peerId + '|' + p.role).join(',');
  return pk === nk;
}

export const MeshGraph = memo(MeshGraphInner, arePropsEqual);
