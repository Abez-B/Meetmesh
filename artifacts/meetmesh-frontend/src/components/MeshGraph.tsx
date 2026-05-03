import { useEffect, useRef, useState, useCallback, memo, useId } from 'react';
import { Participant, parseProfile } from 'meetmesh-core';
import { SpaceBackground } from './SpaceBackground';
import './MeshGraph.css';

interface Props {
  participants: Participant[];
  visitedNodes: Set<string>;
  onNodeClick: (peerId: string, pos?: { x: number; y: number }) => void;
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
}

type ParticipantRole = 'Host' | 'Organizer' | 'Speaker' | 'Attendee';

const ROLE_THEME = {
  Host:      { ring: '#FFD700', text: '#FFD700' },
  Organizer: { ring: '#8B5CF6', text: '#A78BFA' },
  Speaker:   { ring: '#3B82F6', text: '#60A5FA' },
  Attendee:  { ring: '#14B8A6', text: '#5EEAD4' },
};
const ROLE_PRIORITY: Record<ParticipantRole, number> = {
  Host: 0, Organizer: 1, Speaker: 2, Attendee: 3,
};

// ── Relaxation constants ──────────────────────────────────────────────────────
const REST_DIST    = 160;   // natural distance from host (px)
const SPRING_STEP  = 0.055; // fraction of spring error corrected each frame (no overshoot)
const MIN_DIST     = 56;    // minimum centre-to-centre distance between nodes (px)
const CLUSTER_REST = 76;    // rest distance within visited cluster (px)
const CLUSTER_STEP = 0.04;  // fraction of cluster error corrected each frame
// ─────────────────────────────────────────────────────────────────────────────

// Settle: stop RAF when total movement per frame drops below this (px)
const SETTLE_THRESHOLD  = 0.3;
const SETTLE_FRAMES_REQ = 8;

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3;
const TWO_PI   = Math.PI * 2;

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

function MeshGraphInner({
  participants, visitedNodes, onNodeClick,
  searchTerm = '', disableSimulation = false, disableInteractions = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const gRef         = useRef<SVGGElement>(null);
  const rafRef       = useRef<number>(0);
  const hoveredIdRef = useRef<string | null>(null);
  const settleRef    = useRef(0); // consecutive settled frames

  const nodePhotoClipId   = useId();
  const hostPhotoClipId   = useId();
  const hostSunGradientId = useId();

  const nodesRef     = useRef<GraphNode[]>([]);
  const transformRef = useRef({ x: 300, y: 300, k: 1 });
  const dimsRef      = useRef({ width: 600, height: 600 });
  const panRef       = useRef({ active: false, lastX: 0, lastY: 0 });

  // refreshKey bumps any time the node list or visited state changes,
  // so the animation loop restarts from any settled state.
  const [nodeCount,   setNodeCount]   = useState(0);
  const [refreshKey,  setRefreshKey]  = useState(0);

  // ── Transform ──────────────────────────────────────────────────────────────
  const applyTransform = useCallback((t: { x: number; y: number; k: number }) => {
    gRef.current?.setAttribute(
      'transform',
      `translate(${t.x.toFixed(2)},${t.y.toFixed(2)}) scale(${t.k.toFixed(4)})`,
    );
    transformRef.current = t;
  }, []);

  // ── DOM flush (imperative, runs every animation frame) ─────────────────────
  const flushPositions = useCallback(() => {
    const g    = gRef.current;
    if (!g)    return;
    const host = nodesRef.current.find(n => n.role === 'Host');

    for (const node of nodesRef.current) {
      const el = g.querySelector<SVGGElement>(`[data-node-id="${node.id}"]`);
      if (el) el.setAttribute('transform', `translate(${node.x.toFixed(1)},${node.y.toFixed(1)})`);
    }
    for (const line of g.querySelectorAll<SVGLineElement>('[data-link-target]')) {
      const target = nodesRef.current.find(n => n.id === line.getAttribute('data-link-target'));
      if (host && target) {
        line.setAttribute('x1', host.x.toFixed(1)); line.setAttribute('y1', host.y.toFixed(1));
        line.setAttribute('x2', target.x.toFixed(1)); line.setAttribute('y2', target.y.toFixed(1));
      }
    }
  }, []);

  // ── Hover: freeze node in place ────────────────────────────────────────────
  const setHoveredNode = useCallback((nodeId: string | null) => {
    hoveredIdRef.current = nodeId;
    // Wake the animation loop if it settled while a node was hovered
    if (nodeId === null) {
      settleRef.current = 0;
      rafRef.current = requestAnimationFrame(function tick(ts) {
        const mov = relaxStep();
        flushPositions();
        if (mov > SETTLE_THRESHOLD) { settleRef.current = 0; }
        else if (++settleRef.current < SETTLE_FRAMES_REQ) {
          rafRef.current = requestAnimationFrame(tick);
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Position relaxation ────────────────────────────────────────────────────
  // Returns total movement this step (used to detect settling).
  // IMPORTANT: no velocity — each correction is ≤ SPRING_STEP × error,
  // so the system provably converges without oscillation.
  const relaxStep = useCallback((): number => {
    const nodes   = nodesRef.current;
    const nonHost = nodes.filter(n => n.role !== 'Host');
    const visited  = nonHost.filter(n => n.visited);
    const pausedId = hoveredIdRef.current;
    let totalMov   = 0;

    for (let i = 0; i < nonHost.length; i++) {
      const node = nonHost[i];
      if (node.id === pausedId) continue;

      let dx = 0;
      let dy = 0;

      // 1. Spring toward REST_DIST from host (origin)
      const dist = Math.sqrt(node.x * node.x + node.y * node.y) || 0.01;
      const springErr = dist - REST_DIST;
      // Move a small fraction of the error — no overshoot possible
      const sc = springErr * SPRING_STEP;
      dx -= sc * (node.x / dist);
      dy -= sc * (node.y / dist);

      // 2. Repulsion: hard push-apart if closer than MIN_DIST
      for (let j = 0; j < nonHost.length; j++) {
        if (i === j) continue;
        const o    = nonHost[j];
        const rdx  = node.x - o.x;
        const rdy  = node.y - o.y;
        const rd   = Math.sqrt(rdx * rdx + rdy * rdy) || 0.01;
        if (rd < MIN_DIST) {
          // Split the correction between the two nodes (each moves half)
          const push = (MIN_DIST - rd) * 0.5;
          dx += push * (rdx / rd);
          dy += push * (rdy / rd);
        }
      }

      // 3. Cluster: visited nodes gently pull toward each other
      if (node.visited) {
        for (let j = 0; j < visited.length; j++) {
          const o = visited[j];
          if (o.id === node.id) continue;
          const cdx  = o.x - node.x;
          const cdy  = o.y - node.y;
          const cd   = Math.sqrt(cdx * cdx + cdy * cdy) || 0.01;
          if (cd > CLUSTER_REST) {
            const pull = (cd - CLUSTER_REST) * CLUSTER_STEP;
            dx += pull * (cdx / cd);
            dy += pull * (cdy / cd);
          }
        }
      }

      node.x += dx;
      node.y += dy;
      totalMov += Math.abs(dx) + Math.abs(dy);
    }

    // Host is always at origin
    const host = nodes.find(n => n.role === 'Host');
    if (host) { host.x = 0; host.y = 0; }

    return totalMov;
  }, []);

  // ── Rebuild nodes when participants or visited changes ─────────────────────
  useEffect(() => {
    const valid = participants
      .filter(p => !p.peerId.startsWith('present-'))
      .sort((a, b) => {
        const rd = ROLE_PRIORITY[a.role as ParticipantRole] - ROLE_PRIORITY[b.role as ParticipantRole];
        if (rd !== 0) return rd;
        const nd = a.displayName.localeCompare(b.displayName);
        return nd !== 0 ? nd : a.peerId.localeCompare(b.peerId);
      });

    const host    = valid.find(p => p.role === 'Host');
    const nonHost = valid.filter(p => p.role !== 'Host');
    const total   = nonHost.length;
    const prevById = new Map(nodesRef.current.map(n => [n.id, n]));

    const nodes: GraphNode[] = [];
    if (host) {
      nodes.push({
        id: host.peerId, p: host,
        x: 0, y: 0,
        visited: visitedNodes.has(host.peerId),
        role: 'Host',
        photo: parseProfile(host.json)?.photo,
      });
    }

    nonHost.forEach((p, i) => {
      const prev  = prevById.get(p.peerId);
      const angle = (i / Math.max(1, total)) * TWO_PI - Math.PI / 2;
      // New nodes: spread evenly around the circle with a small jitter
      const jitter = prev ? 0 : (((i * 7919) % 31) - 15); // deterministic jitter
      nodes.push({
        id:      p.peerId,
        p,
        x:       prev?.x ?? Math.cos(angle) * (REST_DIST + jitter),
        y:       prev?.y ?? Math.sin(angle) * (REST_DIST + jitter),
        visited: visitedNodes.has(p.peerId),
        role:    p.role as Exclude<ParticipantRole, 'Host'>,
        photo:   parseProfile(p.json)?.photo,
      });
    });

    nodesRef.current = nodes;
    relaxStep();
    flushPositions();
    setNodeCount(nodes.length);
    setRefreshKey(k => k + 1); // wake animation loop
  }, [participants, visitedNodes, relaxStep, flushPositions]);

  // ── Animation loop — auto-stops when settled ───────────────────────────────
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    settleRef.current = 0;
    if (nodeCount === 0) return;

    if (disableSimulation) {
      relaxStep(); flushPositions(); return;
    }

    const tick = () => {
      const mov = relaxStep();
      flushPositions();

      if (mov < SETTLE_THRESHOLD) {
        if (++settleRef.current >= SETTLE_FRAMES_REQ) return; // fully settled — stop
      } else {
        settleRef.current = 0;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [refreshKey, disableSimulation, relaxStep, flushPositions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search highlight ───────────────────────────────────────────────────────
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

  // ── Resize observer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    let raf = 0;
    const update = () => {
      const w = el.clientWidth, h = el.clientHeight;
      dimsRef.current = { width: w, height: h };
      svgRef.current?.setAttribute('viewBox', `0 0 ${w} ${h}`);
      applyTransform({ x: w / 2, y: h / 2, k: transformRef.current.k });
      relaxStep(); flushPositions();
    };
    const throttled = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    const ro = new ResizeObserver(throttled);
    ro.observe(el);
    update();
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [applyTransform, relaxStep, flushPositions]);

  // ── Zoom to fit ────────────────────────────────────────────────────────────
  const zoomToFit = useCallback((maxScale = ZOOM_MAX) => {
    const nodes = nodesRef.current;
    const dims  = dimsRef.current;
    if (nodes.length === 0) return;
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    const nW = Math.max(...xs) - Math.min(...xs), nH = Math.max(...ys) - Math.min(...ys);
    if (nW === 0 || nH === 0) { applyTransform({ x: dims.width / 2, y: dims.height / 2, k: 1 }); return; }
    const pad   = dims.width >= 1100 ? 170 : 110;
    const scale = Math.min((dims.width - pad * 2) / nW, (dims.height - pad * 2) / nH, maxScale);
    applyTransform({
      x: dims.width  / 2 - ((Math.min(...xs) + Math.max(...xs)) / 2) * scale,
      y: dims.height / 2 - ((Math.min(...ys) + Math.max(...ys)) / 2) * scale,
      k: scale,
    });
  }, [applyTransform]);

  useEffect(() => {
    if (nodeCount > 0) { const t = setTimeout(() => zoomToFit(0.88), 150); return () => clearTimeout(t); }
  }, [nodeCount, zoomToFit]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'f' || e.key === 'F') zoomToFit(ZOOM_MAX); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [zoomToFit]);

  // ── Zoom / pan ─────────────────────────────────────────────────────────────
  const zoomIn  = useCallback((e?: React.PointerEvent | React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    applyTransform({ ...transformRef.current, k: Math.min(ZOOM_MAX, transformRef.current.k * 1.08) });
  }, [applyTransform]);
  const zoomOut = useCallback((e?: React.PointerEvent | React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    applyTransform({ ...transformRef.current, k: Math.max(ZOOM_MIN, transformRef.current.k / 1.08) });
  }, [applyTransform]);
  const recenter = useCallback((e?: React.PointerEvent | React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    const { width, height } = dimsRef.current;
    applyTransform({ x: width / 2, y: height / 2, k: 1 });
  }, [applyTransform]);

  const handlePanStart = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('.constellation-node')) return;
    panRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    svgRef.current?.classList.add('is-panning');
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
  };
  const handlePanMove = (e: React.PointerEvent) => {
    if (!panRef.current.active) return;
    const dx = e.clientX - panRef.current.lastX, dy = e.clientY - panRef.current.lastY;
    panRef.current.lastX = e.clientX; panRef.current.lastY = e.clientY;
    const cur = transformRef.current;
    applyTransform({ ...cur, x: cur.x + dx, y: cur.y + dy });
  };
  const handlePanEnd = (e: React.PointerEvent) => {
    panRef.current.active = false;
    svgRef.current?.classList.remove('is-panning');
    (e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
  };

  const handleNodeClick = (node: GraphNode, event: React.MouseEvent) =>
    onNodeClick(node.id, { x: event.clientX, y: event.clientY });

  const hostNode    = nodesRef.current.find(n => n.role === 'Host');
  const nonHostNodes = nodesRef.current.filter(n => n.role !== 'Host');

  return (
    <div ref={containerRef} className="mesh-graph-container mesh-graph-container--solar">
      <SpaceBackground animate={!disableSimulation} />

      <svg
        ref={svgRef}
        className="mesh-svg"
        width="100%" height="100%"
        viewBox={`0 0 ${dimsRef.current.width} ${dimsRef.current.height}`}
        style={{ cursor: disableInteractions ? 'default' : 'grab' }}
        onPointerDown={disableInteractions  ? undefined : handlePanStart}
        onPointerMove={disableInteractions  ? undefined : handlePanMove}
        onPointerUp={disableInteractions    ? undefined : handlePanEnd}
        onPointerLeave={disableInteractions ? undefined : handlePanEnd}
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
            <clipPath id={nodePhotoClipId}><circle cx="0" cy="0" r="24" /></clipPath>
            <clipPath id={hostPhotoClipId}><circle cx="0" cy="0" r="30" /></clipPath>
          </defs>

          {/* ── Host → node lines (all nodes) ─────────────────────────── */}
          <g className="constellation-lines">
            {nonHostNodes.map(node => (
              <line
                key={`link-${node.id}`}
                data-link-target={node.id}
                x1="0" y1="0" x2="0" y2="0"
                stroke={node.visited ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.13)'}
                strokeWidth={node.visited ? 1.8 : 1}
                strokeDasharray={node.visited ? undefined : '4 7'}
              />
            ))}
          </g>

          {/* ── Host node ─────────────────────────────────────────────── */}
          {hostNode && (
            <g
              data-node-id={hostNode.id}
              className="constellation-node node-host"
              transform="translate(0,0)"
              onClick={e => handleNodeClick(hostNode, e)}
              style={{ cursor: 'pointer', '--node-ring-color': ROLE_THEME.Host.ring } as React.CSSProperties}
            >
              <circle className="node-halo" r="44" fill="none" stroke={ROLE_THEME.Host.ring} strokeWidth="5" />
              <circle className="node-core host-sun-core" r="38" fill={`url(#${hostSunGradientId})`} stroke="#FFA500" strokeWidth="3.2" />
              {hostNode.photo
                ? <image href={hostNode.photo} x="-38" y="-38" width="76" height="76" clipPath={`url(#${hostPhotoClipId})`} />
                : <text className="node-initial" dy="0.35em" textAnchor="middle" fontSize="23px"
                    fontFamily="JetBrains Mono, monospace" fontWeight="700" fill="#000">
                    {hostNode.p.displayName.charAt(0).toUpperCase()}
                  </text>
              }
              <circle className="host-ring" r="42" fill="none" stroke="white" strokeWidth="1.7"
                strokeDasharray="6 4" opacity="0.82" />
              <path className="host-crown" d="M -15 -50 L -7 -39 L 0 -50 L 7 -39 L 15 -50 L 15 -33 L -15 -33 Z"
                fill={ROLE_THEME.Host.ring} stroke="#fff" strokeWidth="1" opacity="0.95" />
              <NodeLabel name={hostNode.p.displayName} y={58} color={ROLE_THEME.Host.ring} />
            </g>
          )}

          {/* ── Non-host nodes ────────────────────────────────────────── */}
          {nonHostNodes.map(node => {
            const theme = ROLE_THEME[node.role as ParticipantRole] ?? ROLE_THEME.Attendee;
            return (
              <g
                key={node.id}
                data-node-id={node.id}
                className={`constellation-node node-${node.role.toLowerCase()}`}
                transform="translate(0,0)"
                onPointerEnter={disableInteractions ? undefined : () => setHoveredNode(node.id)}
                onPointerLeave={disableInteractions ? undefined : () => setHoveredNode(null)}
                onClick={e => handleNodeClick(node, e)}
                style={{ cursor: 'pointer', '--node-ring-color': theme.ring } as React.CSSProperties}
              >
                <circle className="node-halo" r="33" fill="none" stroke={theme.ring}
                  strokeWidth="2.4" opacity={node.visited ? 0.2 : 0.7} />
                {node.visited && (
                  <circle r="36" fill="none" stroke="#6366f1" strokeWidth="1.2"
                    opacity="0.5" strokeDasharray="4 3" />
                )}
                <circle className="node-core" r="26" fill="#0a0a0a"
                  stroke={node.visited ? '#4f46e5' : theme.ring} strokeWidth="1.8" />
                {node.photo
                  ? <image href={node.photo} x="-24" y="-24" width="48" height="48"
                      clipPath={`url(#${nodePhotoClipId})`} opacity={node.visited ? 0.5 : 1} />
                  : <text className="node-initial" dy="0.35em" textAnchor="middle" fontSize="16px"
                      fontFamily="JetBrains Mono, monospace" fontWeight="600"
                      fill={node.visited ? '#6366f1' : theme.text}>
                      {node.p.displayName.charAt(0).toUpperCase()}
                    </text>
                }
                <NodeLabel name={node.p.displayName} y={47}
                  color={node.visited ? '#818cf8' : '#d4d4d4'} />
              </g>
            );
          })}
        </g>
      </svg>

      {!disableInteractions && (
        <div className="mesh-zoom-controls">
          <button type="button" className="zoom-btn" title="Recenter"
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
  if (prev.searchTerm          !== next.searchTerm)          return false;
  if (prev.visitedNodes        !== next.visitedNodes)        return false;
  if (prev.disableSimulation   !== next.disableSimulation)   return false;
  if (prev.disableInteractions !== next.disableInteractions) return false;
  const pk = prev.participants.map(p => p.peerId + '|' + p.role).join(',');
  const nk = next.participants.map(p => p.peerId + '|' + p.role).join(',');
  return pk === nk;
}

export const MeshGraph = memo(MeshGraphInner, arePropsEqual);
