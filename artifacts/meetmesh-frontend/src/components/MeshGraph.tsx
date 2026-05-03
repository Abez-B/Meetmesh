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

interface PhysicsNode {
  id: string;
  p: Participant;
  x: number;
  y: number;
  vx: number;
  vy: number;
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

// ── Physics constants ────────────────────────────────────────────────────────
const REST_DIST    = 165;     // natural distance from host (px)
const K_SPRING     = 0.00011; // spring to REST_DIST from host (px/ms² per px offset)
const K_REPULSE    = 550;     // inter-node repulsion strength (px³/ms²)
const MIN_DIST     = 54;      // min distance for repulsion calc (≈ 2× node radius)
const K_CLUSTER    = 0.00019; // visited→visited cluster spring (px/ms² per px offset)
const CLUSTER_REST = 78;      // rest distance within visited cluster (px)
const DAMPING      = 0.90;    // velocity damping applied each frame
const MAX_VEL      = 3.2;     // max velocity cap (px/ms)
// ─────────────────────────────────────────────────────────────────────────────

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3;
const TWO_PI   = Math.PI * 2;

/** Pill-shaped name label — always upright because node groups only translate(). */
function NodeLabel({ name, y, color }: { name: string; y: number; color: string }) {
  const maxChars = 14;
  const display = name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
  const pillW = Math.max(44, display.length * 6.2 + 28);
  const pillH = 18;
  return (
    <g className="name-pill" style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <rect
        x={-pillW / 2} y={y - 1}
        width={pillW} height={pillH}
        rx={pillH / 2} ry={pillH / 2}
        fill="rgba(8,8,12,0.78)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"
      />
      <text
        y={y + pillH / 2 + 4}
        textAnchor="middle"
        fontSize="10px" fontWeight="500"
        fontFamily="JetBrains Mono, monospace"
        fill={color} letterSpacing="0.02em"
      >
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
  const lastTsRef    = useRef<number>(0);
  const hoveredIdRef = useRef<string | null>(null);

  const nodePhotoClipId   = useId();
  const hostPhotoClipId   = useId();
  const hostSunGradientId = useId();

  const nodesRef     = useRef<PhysicsNode[]>([]);
  const transformRef = useRef({ x: 300, y: 300, k: 1 });
  const dimsRef      = useRef({ width: 600, height: 600 });
  const panRef       = useRef({ active: false, lastX: 0, lastY: 0 });

  const [nodeCount, setNodeCount] = useState(0);

  // ── Transform helpers ──────────────────────────────────────────────────────
  const applyTransform = useCallback((t: { x: number; y: number; k: number }) => {
    gRef.current?.setAttribute(
      'transform',
      `translate(${t.x.toFixed(2)},${t.y.toFixed(2)}) scale(${t.k.toFixed(4)})`,
    );
    transformRef.current = t;
  }, []);

  // ── DOM flush ─────────────────────────────────────────────────────────────
  const flushPositions = useCallback(() => {
    const g = gRef.current;
    if (!g) return;

    const host = nodesRef.current.find(n => n.role === 'Host');

    for (const node of nodesRef.current) {
      const el = g.querySelector<SVGGElement>(`[data-node-id="${node.id}"]`);
      if (el) el.setAttribute('transform', `translate(${node.x.toFixed(1)},${node.y.toFixed(1)})`);
    }

    // Update all host→node connection lines
    for (const line of g.querySelectorAll<SVGLineElement>('[data-link-target]')) {
      const targetNode = nodesRef.current.find(n => n.id === line.getAttribute('data-link-target'));
      if (host && targetNode) {
        line.setAttribute('x1', host.x.toFixed(1));
        line.setAttribute('y1', host.y.toFixed(1));
        line.setAttribute('x2', targetNode.x.toFixed(1));
        line.setAttribute('y2', targetNode.y.toFixed(1));
      }
    }
  }, []);

  // ── Hover: just track which node is frozen ────────────────────────────────
  const setHoveredNode = useCallback((nodeId: string | null) => {
    hoveredIdRef.current = nodeId;
    // Dampen velocity when hover starts so node settles on release
    if (nodeId !== null) {
      const node = nodesRef.current.find(n => n.id === nodeId);
      if (node) { node.vx *= 0.1; node.vy *= 0.1; }
    }
  }, []);

  // ── Physics step ──────────────────────────────────────────────────────────
  const stepPhysics = useCallback((deltaMs: number) => {
    const dtMs      = Math.min(deltaMs, 64);
    const pausedId  = hoveredIdRef.current;
    const nodes     = nodesRef.current;
    const nonHost   = nodes.filter(n => n.role !== 'Host');
    const visited   = nonHost.filter(n => n.visited);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Host stays at origin
      if (node.role === 'Host') { node.x = 0; node.y = 0; continue; }

      // Hovered node is frozen
      if (node.id === pausedId) continue;

      let fx = 0;
      let fy = 0;

      // 1. Spring toward REST_DIST from host (origin)
      const dist = Math.max(0.1, Math.sqrt(node.x * node.x + node.y * node.y));
      const springMag = K_SPRING * (dist - REST_DIST);
      fx -= springMag * (node.x / dist);
      fy -= springMag * (node.y / dist);

      // 2. Repulsion from every other non-host node
      for (let j = 0; j < nonHost.length; j++) {
        const other = nonHost[j];
        if (other.id === node.id) continue;
        const rdx   = node.x - other.x;
        const rdy   = node.y - other.y;
        const rdist = Math.max(MIN_DIST, Math.sqrt(rdx * rdx + rdy * rdy));
        if (rdist > 350) continue; // skip distant pairs for performance
        const repMag = K_REPULSE / (rdist * rdist);
        fx += repMag * (rdx / rdist);
        fy += repMag * (rdy / rdist);
      }

      // 3. Visited-cluster attraction: pull toward other visited nodes
      if (node.visited) {
        for (let j = 0; j < visited.length; j++) {
          const other = visited[j];
          if (other.id === node.id) continue;
          const cdx   = other.x - node.x;
          const cdy   = other.y - node.y;
          const cdist = Math.max(0.1, Math.sqrt(cdx * cdx + cdy * cdy));
          if (cdist > CLUSTER_REST) {
            const clusterMag = K_CLUSTER * (cdist - CLUSTER_REST);
            fx += clusterMag * (cdx / cdist);
            fy += clusterMag * (cdy / cdist);
          }
        }
      }

      // Integrate velocity with damping
      node.vx = (node.vx + fx * dtMs) * DAMPING;
      node.vy = (node.vy + fy * dtMs) * DAMPING;

      // Clamp max speed
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > MAX_VEL) {
        node.vx = (node.vx / speed) * MAX_VEL;
        node.vy = (node.vy / speed) * MAX_VEL;
      }

      node.x += node.vx * dtMs;
      node.y += node.vy * dtMs;
    }
  }, []);

  // ── Rebuild node list when participants or visited set changes ─────────────
  useEffect(() => {
    const valid = participants
      .filter(p => !p.peerId.startsWith('present-'))
      .sort((a, b) => {
        const rd = ROLE_PRIORITY[a.role as ParticipantRole] - ROLE_PRIORITY[b.role as ParticipantRole];
        if (rd !== 0) return rd;
        const nd = a.displayName.localeCompare(b.displayName);
        if (nd !== 0) return nd;
        return a.peerId.localeCompare(b.peerId);
      });

    const host    = valid.find(p => p.role === 'Host');
    const nonHost = valid.filter(p => p.role !== 'Host');
    const prevById = new Map(nodesRef.current.map(n => [n.id, n]));
    const total    = nonHost.length;

    const nodes: PhysicsNode[] = [];

    if (host) {
      nodes.push({
        id: host.peerId, p: host,
        x: 0, y: 0, vx: 0, vy: 0,
        visited: visitedNodes.has(host.peerId),
        role: 'Host',
        photo: parseProfile(host.json)?.photo,
      });
    }

    nonHost.forEach((p, i) => {
      const prev     = prevById.get(p.peerId);
      const angle    = (i / Math.max(1, total)) * TWO_PI - Math.PI / 2;
      const jitter   = (Math.random() - 0.5) * 20;
      nodes.push({
        id:      p.peerId,
        p,
        x:       prev?.x  ?? (Math.cos(angle) * (REST_DIST + jitter)),
        y:       prev?.y  ?? (Math.sin(angle) * (REST_DIST + jitter)),
        vx:      prev?.vx ?? 0,
        vy:      prev?.vy ?? 0,
        visited: visitedNodes.has(p.peerId),
        role:    p.role as Exclude<ParticipantRole, 'Host'>,
        photo:   parseProfile(p.json)?.photo,
      });
    });

    nodesRef.current = nodes;
    stepPhysics(0);
    flushPositions();
    setNodeCount(nodes.length);
  }, [participants, visitedNodes, stepPhysics, flushPositions]);

  // ── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (nodeCount === 0) return;

    if (disableSimulation) {
      lastTsRef.current = 0;
      stepPhysics(0);
      flushPositions();
      return;
    }

    const tick = (timestamp: number) => {
      const prev    = lastTsRef.current || timestamp;
      const deltaMs = Math.min(64, Math.max(0, timestamp - prev));
      lastTsRef.current = timestamp;
      stepPhysics(deltaMs);
      flushPositions();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [nodeCount, disableSimulation, stepPhysics, flushPositions]);

  // ── Search highlight ──────────────────────────────────────────────────────
  useEffect(() => {
    const svgEl = svgRef.current;
    const clearHighlights = () => {
      svgEl?.querySelectorAll<Element>('.constellation-node.focused').forEach(el => el.classList.remove('focused'));
      svgEl?.querySelectorAll<Element>('.line-highlight').forEach(el => el.classList.remove('line-highlight'));
    };
    if (!searchTerm.trim()) { clearHighlights(); return; }
    const timer = setTimeout(() => {
      const query  = searchTerm.toLowerCase();
      const target = nodesRef.current.find(n =>
        n.p.displayName.toLowerCase().includes(query) || n.id.toLowerCase().includes(query));
      clearHighlights();
      if (target) {
        svgEl?.querySelector(`[data-node-id="${target.id}"]`)?.classList.add('focused');
        svgEl?.querySelector(`[data-link-target="${target.id}"]`)?.classList.add('line-highlight');
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Resize observer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const element = containerRef.current;
    let raf = 0;
    const update = () => {
      const { clientWidth: w, clientHeight: h } = element;
      dimsRef.current = { width: w, height: h };
      svgRef.current?.setAttribute('viewBox', `0 0 ${w} ${h}`);
      applyTransform({ x: w / 2, y: h / 2, k: transformRef.current.k });
      stepPhysics(0);
      flushPositions();
    };
    const throttled = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    const ro = new ResizeObserver(throttled);
    ro.observe(element);
    update();
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [applyTransform, stepPhysics, flushPositions]);

  // ── Zoom to fit ───────────────────────────────────────────────────────────
  const zoomToFit = useCallback((maxScale = ZOOM_MAX) => {
    const nodes = nodesRef.current;
    const dims  = dimsRef.current;
    if (nodes.length === 0) return;
    const xs   = nodes.map(n => n.x);
    const ys   = nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const nW = maxX - minX, nH = maxY - minY;
    if (nW === 0 || nH === 0) { applyTransform({ x: dims.width / 2, y: dims.height / 2, k: 1 }); return; }
    const pad   = dims.width >= 1100 ? 170 : 110;
    const scale = Math.min((dims.width - pad * 2) / nW, (dims.height - pad * 2) / nH, maxScale);
    applyTransform({
      x: dims.width  / 2 - ((minX + maxX) / 2) * scale,
      y: dims.height / 2 - ((minY + maxY) / 2) * scale,
      k: scale,
    });
  }, [applyTransform]);

  useEffect(() => {
    if (nodeCount > 0) {
      const t = setTimeout(() => zoomToFit(0.88), 150);
      return () => clearTimeout(t);
    }
  }, [nodeCount, zoomToFit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'f' || e.key === 'F') zoomToFit(ZOOM_MAX); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomToFit]);

  // ── Zoom / pan controls ───────────────────────────────────────────────────
  const zoomIn = useCallback((e?: React.MouseEvent | React.PointerEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    applyTransform({ ...transformRef.current, k: Math.min(ZOOM_MAX, transformRef.current.k * 1.08) });
  }, [applyTransform]);

  const zoomOut = useCallback((e?: React.MouseEvent | React.PointerEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    applyTransform({ ...transformRef.current, k: Math.max(ZOOM_MIN, transformRef.current.k / 1.08) });
  }, [applyTransform]);

  const recenter = useCallback((e?: React.MouseEvent | React.PointerEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    const { width, height } = dimsRef.current;
    applyTransform({ x: width / 2, y: height / 2, k: 1 });
  }, [applyTransform]);

  const handleViewportPanStart = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('.constellation-node')) return;
    panRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    svgRef.current?.classList.add('is-panning');
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
  };
  const handleViewportPanMove = (e: React.PointerEvent) => {
    if (!panRef.current.active) return;
    const dx = e.clientX - panRef.current.lastX;
    const dy = e.clientY - panRef.current.lastY;
    panRef.current.lastX = e.clientX;
    panRef.current.lastY = e.clientY;
    const cur = transformRef.current;
    applyTransform({ ...cur, x: cur.x + dx, y: cur.y + dy });
  };
  const handleViewportPanEnd = (e: React.PointerEvent) => {
    panRef.current.active = false;
    svgRef.current?.classList.remove('is-panning');
    (e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
  };

  const handleNodeClick = (node: PhysicsNode, event: React.MouseEvent) => {
    onNodeClick(node.id, { x: event.clientX, y: event.clientY });
  };

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
        onPointerDown={disableInteractions ? undefined : handleViewportPanStart}
        onPointerMove={disableInteractions ? undefined : handleViewportPanMove}
        onPointerUp={disableInteractions   ? undefined : handleViewportPanEnd}
        onPointerLeave={disableInteractions ? undefined : handleViewportPanEnd}
      >
        <rect width="100%" height="100%" fill="transparent" style={{ pointerEvents: 'all' }} />

        <g
          ref={gRef}
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

          {/* ── Lines: host → every node ───────────────────────────────── */}
          <g className="constellation-lines">
            {nonHostNodes.map(node => (
              <line
                key={`link-${node.id}`}
                data-link-target={node.id}
                x1="0" y1="0" x2="0" y2="0"
                stroke={node.visited ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.07)'}
                strokeWidth={node.visited ? 1.6 : 0.8}
                strokeDasharray={node.visited ? undefined : '3 6'}
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
              {hostNode.photo ? (
                <image href={hostNode.photo} x="-38" y="-38" width="76" height="76" clipPath={`url(#${hostPhotoClipId})`} />
              ) : (
                <text className="node-initial" dy="0.35em" textAnchor="middle" fontSize="23px" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill="#000">
                  {hostNode.p.displayName.charAt(0).toUpperCase()}
                </text>
              )}
              <circle className="host-ring" r="42" fill="none" stroke="white" strokeWidth="1.7" strokeDasharray="6 4" opacity="0.82" />
              <path className="host-crown" d="M -15 -50 L -7 -39 L 0 -50 L 7 -39 L 15 -50 L 15 -33 L -15 -33 Z" fill={ROLE_THEME.Host.ring} stroke="#fff" strokeWidth="1" opacity="0.95" />
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
                {/* Outer ring — dimmer when visited (in the cluster) */}
                <circle className="node-halo" r="33" fill="none" stroke={theme.ring} strokeWidth="2.4" opacity={node.visited ? 0.2 : 0.7} />
                {/* Visited nodes get a soft indigo glow ring */}
                {node.visited && (
                  <circle r="36" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.45" strokeDasharray="4 3" />
                )}
                <circle className="node-core" r="26" fill="#0a0a0a" stroke={node.visited ? '#4f46e5' : theme.ring} strokeWidth="1.8" />
                {node.photo ? (
                  <image href={node.photo} x="-24" y="-24" width="48" height="48" clipPath={`url(#${nodePhotoClipId})`} opacity={node.visited ? 0.5 : 1} />
                ) : (
                  <text className="node-initial" dy="0.35em" textAnchor="middle" fontSize="16px" fontFamily="JetBrains Mono, monospace" fontWeight="600" fill={node.visited ? '#6366f1' : theme.text}>
                    {node.p.displayName.charAt(0).toUpperCase()}
                  </text>
                )}
                <NodeLabel name={node.p.displayName} y={47} color={node.visited ? '#818cf8' : '#d4d4d4'} />
              </g>
            );
          })}
        </g>
      </svg>

      {!disableInteractions && (
        <div className="mesh-zoom-controls">
          <button type="button" className="zoom-btn" title="Recenter" onPointerDown={e => { e.preventDefault(); e.stopPropagation(); recenter(e); }}>⊕</button>
          <button type="button" className="zoom-btn" title="Zoom out" onPointerDown={e => { e.preventDefault(); e.stopPropagation(); zoomOut(e);  }}>−</button>
          <button type="button" className="zoom-btn" title="Zoom in"  onPointerDown={e => { e.preventDefault(); e.stopPropagation(); zoomIn(e);   }}>+</button>
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
  const prevKey = prev.participants.map(p => p.peerId + '|' + p.role).join(',');
  const nextKey = next.participants.map(p => p.peerId + '|' + p.role).join(',');
  return prevKey === nextKey;
}

export const MeshGraph = memo(MeshGraphInner, arePropsEqual);
