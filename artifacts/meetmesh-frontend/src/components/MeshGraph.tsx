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

interface ConstellationNode {
  id: string;
  p: Participant;
  x: number;
  y: number;
  visited: boolean;
  role: ParticipantRole;
  orbitIndex: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  photo?: string;
}

type ParticipantRole = 'Host' | 'Organizer' | 'Speaker' | 'Attendee';

const ROLE_THEME = {
  Host: { ring: '#FFD700', text: '#FFD700' },
  Organizer: { ring: '#8B5CF6', text: '#A78BFA' },
  Speaker: { ring: '#3B82F6', text: '#60A5FA' },
  Attendee: { ring: '#14B8A6', text: '#5EEAD4' },
};

const ROLE_PRIORITY: Record<ParticipantRole, number> = {
  Host: 0,
  Organizer: 1,
  Speaker: 2,
  Attendee: 3,
};

const ORBIT_PI2 = Math.PI * 2;
const ORBIT_CAPACITY = 7;
const ORBIT_BASE_RADIUS = 148;
const ORBIT_RADIUS_STEP = 72;
const ORBIT_BASE_SPEED = 0.0002;
const ORBIT_MIN_SPEED = 0.000055;

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3;

/** Pill-shaped name label — always upright because node groups only translate(), never rotate(). */
function NodeLabel({ name, y, color }: { name: string; y: number; color: string }) {
  const maxChars = 14;
  const display = name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
  // Approximate pill width: ~6.2px per character + 14px padding each side
  const pillW = Math.max(44, display.length * 6.2 + 28);
  const pillH = 18;
  return (
    <g className="name-pill" style={{ pointerEvents: 'none', userSelect: 'none' }}>
      {/* Dark background pill */}
      <rect
        x={-pillW / 2}
        y={y - 1}
        width={pillW}
        height={pillH}
        rx={pillH / 2}
        ry={pillH / 2}
        fill="rgba(8,8,12,0.78)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="0.8"
      />
      {/* Name text centered in pill */}
      <text
        y={y + pillH / 2 + 4}
        textAnchor="middle"
        fontSize="10px"
        fontWeight="500"
        fontFamily="JetBrains Mono, monospace"
        fill={color}
        letterSpacing="0.02em"
      >
        {display}
      </text>
    </g>
  );
}

function MeshGraphInner({ participants, visitedNodes, onNodeClick, searchTerm = '', disableSimulation = false, disableInteractions = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const rafRef = useRef<number>(0);
  const lastOrbitTsRef = useRef<number>(0);
  const hoveredNodeIdRef = useRef<string | null>(null);

  const nodePhotoClipId = useId();
  const hostPhotoClipId = useId();
  const hostSunGradientId = useId();

  const nodesRef = useRef<ConstellationNode[]>([]);
  const transformRef = useRef({ x: 300, y: 300, k: 1 });
  const dimsRef = useRef({ width: 600, height: 600 });
  const panRef = useRef({ active: false, lastX: 0, lastY: 0 });

  const [nodeCount, setNodeCount] = useState(0);

  const applyTransform = useCallback((t: { x: number; y: number; k: number }) => {
    if (gRef.current) {
      gRef.current.setAttribute('transform', `translate(${t.x.toFixed(2)},${t.y.toFixed(2)}) scale(${t.k.toFixed(4)})`);
    }
    transformRef.current = t;
  }, []);

  const flushPositions = useCallback(() => {
    const g = gRef.current;
    if (!g) return;

    for (const node of nodesRef.current) {
      const el = g.querySelector<SVGGElement>(`[data-node-id="${node.id}"]`);
      if (el) el.setAttribute('transform', `translate(${node.x.toFixed(1)},${node.y.toFixed(1)})`);
    }

    const lines = g.querySelectorAll<SVGLineElement>('[data-link-target]');
    const host = nodesRef.current.find((node) => node.p.role === 'Host');
    for (const line of lines) {
      const targetId = line.getAttribute('data-link-target');
      const targetNode = nodesRef.current.find((node) => node.id === targetId);
      if (host && targetNode) {
        line.setAttribute('x1', host.x.toFixed(1));
        line.setAttribute('y1', host.y.toFixed(1));
        line.setAttribute('x2', targetNode.x.toFixed(1));
        line.setAttribute('y2', targetNode.y.toFixed(1));
      }
    }
  }, []);

  const setHoveredNode = useCallback((nodeId: string | null) => {
    hoveredNodeIdRef.current = nodeId;
  }, []);

  const positionNodesByDelta = useCallback((deltaMs: number) => {
    const pausedNodeId = hoveredNodeIdRef.current;
    for (const node of nodesRef.current) {
      if (node.role === 'Host') {
        node.x = 0;
        node.y = 0;
        continue;
      }
      if (node.id !== pausedNodeId) {
        node.orbitAngle += deltaMs * node.orbitSpeed;
      }
      node.x = Math.cos(node.orbitAngle) * node.orbitRadius;
      node.y = Math.sin(node.orbitAngle) * node.orbitRadius;
    }
  }, []);

  useEffect(() => {
    const valid = participants
      .filter((participant) => !participant.peerId.startsWith('present-'))
      .sort((a, b) => {
        const roleDelta = ROLE_PRIORITY[a.role as ParticipantRole] - ROLE_PRIORITY[b.role as ParticipantRole];
        if (roleDelta !== 0) return roleDelta;
        const nameDelta = a.displayName.localeCompare(b.displayName);
        if (nameDelta !== 0) return nameDelta;
        return a.peerId.localeCompare(b.peerId);
      });

    const host = valid.find((participant) => participant.role === 'Host');
    const nonHost = valid.filter((participant) => participant.role !== 'Host');

    const previousNodesById = new Map(nodesRef.current.map((node) => [node.id, node]));
    const nodes: ConstellationNode[] = [];
    if (host) {
      nodes.push({
        id: host.peerId,
        p: host,
        x: 0,
        y: 0,
        visited: visitedNodes.has(host.peerId),
        role: 'Host',
        orbitIndex: -1,
        orbitRadius: 0,
        orbitSpeed: 0,
        orbitAngle: 0,
        photo: parseProfile(host.json)?.photo,
      });
    }

    const orbitCount = Math.ceil(nonHost.length / ORBIT_CAPACITY);

    for (let orbitIndex = 0; orbitIndex < orbitCount; orbitIndex += 1) {
      const sliceStart = orbitIndex * ORBIT_CAPACITY;
      const orbitParticipants = nonHost.slice(sliceStart, sliceStart + ORBIT_CAPACITY);
      if (orbitParticipants.length === 0) continue;

      const radius = ORBIT_BASE_RADIUS + orbitIndex * ORBIT_RADIUS_STEP;

      const direction = orbitIndex % 2 === 0 ? 1 : -1;
      const speedScalar = 1 / (1 + orbitIndex * 0.24);
      const speed = direction * Math.max(ORBIT_MIN_SPEED, ORBIT_BASE_SPEED * speedScalar);
      const slots = orbitParticipants.length;
      const startAngle = -Math.PI / 2;

      orbitParticipants.forEach((participant, slotIndex) => {
        const initialAngle = startAngle + (slotIndex / slots) * ORBIT_PI2;
        const previousNode = previousNodesById.get(participant.peerId);
        nodes.push({
          id: participant.peerId,
          p: participant,
          x: Math.cos(initialAngle) * radius,
          y: Math.sin(initialAngle) * radius,
          visited: visitedNodes.has(participant.peerId),
          role: participant.role as Exclude<ParticipantRole, 'Host'>,
          orbitIndex,
          orbitRadius: radius,
          orbitSpeed: speed,
          orbitAngle: previousNode?.orbitAngle ?? initialAngle,
          photo: parseProfile(participant.json)?.photo,
        });
      });
    }

    nodesRef.current = nodes;
    positionNodesByDelta(0);
    flushPositions();
    setNodeCount(nodes.length);
  }, [participants, visitedNodes, positionNodesByDelta, flushPositions]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (nodeCount === 0) return;

    if (disableSimulation) {
      lastOrbitTsRef.current = 0;
      positionNodesByDelta(0);
      flushPositions();
      return;
    }

    const tick = (timestamp: number) => {
      const previousTimestamp = lastOrbitTsRef.current || timestamp;
      const deltaMs = Math.min(64, Math.max(0, timestamp - previousTimestamp));
      lastOrbitTsRef.current = timestamp;
      positionNodesByDelta(deltaMs);
      flushPositions();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [nodeCount, disableSimulation, positionNodesByDelta, flushPositions]);

  useEffect(() => {
    const svgEl = svgRef.current;
    const clearHighlights = () => {
      svgEl?.querySelectorAll<Element>('.constellation-node.focused').forEach((el) => el.classList.remove('focused'));
      svgEl?.querySelectorAll<Element>('.line-highlight').forEach((el) => el.classList.remove('line-highlight'));
    };

    if (!searchTerm.trim()) {
      clearHighlights();
      return;
    }

    const timer = setTimeout(() => {
      const query = searchTerm.toLowerCase();
      const target = nodesRef.current.find((node) =>
        node.p.displayName.toLowerCase().includes(query) || node.id.toLowerCase().includes(query)
      );
      clearHighlights();
      if (target) {
        svgEl?.querySelector(`[data-node-id="${target.id}"]`)?.classList.add('focused');
        svgEl?.querySelector(`[data-link-target="${target.id}"]`)?.classList.add('line-highlight');
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!containerRef.current) return;
    const element = containerRef.current;
    let resizeRaf = 0;

    const update = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      dimsRef.current = { width, height };
      svgRef.current?.setAttribute('viewBox', `0 0 ${width} ${height}`);
      const next = { x: width / 2, y: height / 2, k: transformRef.current.k };
      applyTransform(next);
      positionNodesByDelta(0);
      flushPositions();
    };

    const throttledUpdate = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(update);
    };

    const resizeObserver = new ResizeObserver(throttledUpdate);
    resizeObserver.observe(element);
    update();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(resizeRaf);
    };
  }, [applyTransform, positionNodesByDelta, flushPositions]);

  const zoomToFit = useCallback((maxScale = ZOOM_MAX) => {
    const nodes = nodesRef.current;
    const dims = dimsRef.current;
    if (nodes.length === 0) return;

    const xs = nodes.map((node) => node.x);
    const ys = nodes.map((node) => node.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const nW = maxX - minX;
    const nH = maxY - minY;

    if (nW === 0 || nH === 0) {
      applyTransform({ x: dims.width / 2, y: dims.height / 2, k: 1 });
      return;
    }

    const isDesktop = dims.width >= 1100;
    const padding = isDesktop ? 170 : 110;
    const scale = Math.min((dims.width - padding * 2) / nW, (dims.height - padding * 2) / nH, maxScale);
    applyTransform({
      x: dims.width / 2 - ((minX + maxX) / 2) * scale,
      y: dims.height / 2 - ((minY + maxY) / 2) * scale,
      k: scale,
    });
  }, [applyTransform]);

  useEffect(() => {
    if (nodeCount > 0) {
      const timer = setTimeout(() => zoomToFit(0.88), 150);
      return () => clearTimeout(timer);
    }
  }, [nodeCount, zoomToFit]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'f' || event.key === 'F') zoomToFit(ZOOM_MAX);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomToFit]);

  const zoomIn = useCallback((e?: React.MouseEvent | React.PointerEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const next = { ...transformRef.current, k: Math.min(ZOOM_MAX, transformRef.current.k * 1.08) };
    applyTransform(next);
  }, [applyTransform]);

  const zoomOut = useCallback((e?: React.MouseEvent | React.PointerEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const next = { ...transformRef.current, k: Math.max(ZOOM_MIN, transformRef.current.k / 1.08) };
    applyTransform(next);
  }, [applyTransform]);

  const recenter = useCallback((e?: React.MouseEvent | React.PointerEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const { width, height } = dimsRef.current;
    applyTransform({ x: width / 2, y: height / 2, k: 1 });
  }, [applyTransform]);

  const handleViewportPanStart = (event: React.PointerEvent) => {
    if ((event.target as Element).closest('.constellation-node')) return;
    panRef.current = { active: true, lastX: event.clientX, lastY: event.clientY };
    svgRef.current?.classList.add('is-panning');
    (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
  };

  const handleViewportPanMove = (event: React.PointerEvent) => {
    if (!panRef.current.active) return;
    const dx = event.clientX - panRef.current.lastX;
    const dy = event.clientY - panRef.current.lastY;
    panRef.current.lastX = event.clientX;
    panRef.current.lastY = event.clientY;
    const current = transformRef.current;
    applyTransform({ ...current, x: current.x + dx, y: current.y + dy });
  };

  const handleViewportPanEnd = (event: React.PointerEvent) => {
    panRef.current.active = false;
    svgRef.current?.classList.remove('is-panning');
    (event.currentTarget as SVGElement).releasePointerCapture(event.pointerId);
  };

  const handleNodeClick = (node: ConstellationNode, event: React.MouseEvent) => {
    onNodeClick(node.id, { x: event.clientX, y: event.clientY });
  };

  const hostNode = nodesRef.current.find((node) => node.p.role === 'Host');
  const visitedLinks = nodesRef.current.filter((node) => node.visited && node.id !== hostNode?.id);

  return (
    <div ref={containerRef} className="mesh-graph-container mesh-graph-container--solar">
      <SpaceBackground animate={!disableSimulation} />

      <svg
        ref={svgRef}
        className="mesh-svg"
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimsRef.current.width} ${dimsRef.current.height}`}
        style={{ cursor: disableInteractions ? 'default' : 'grab' }}
        onPointerDown={disableInteractions ? undefined : handleViewportPanStart}
        onPointerMove={disableInteractions ? undefined : handleViewportPanMove}
        onPointerUp={disableInteractions ? undefined : handleViewportPanEnd}
        onPointerLeave={disableInteractions ? undefined : handleViewportPanEnd}
      >
        <rect width="100%" height="100%" fill="transparent" style={{ pointerEvents: 'all' }} />

        <g
          ref={gRef}
          transform={`translate(${transformRef.current.x},${transformRef.current.y}) scale(${transformRef.current.k})`}
        >
          <defs>
            <radialGradient id={hostSunGradientId} cx="35%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#FFE566" />
              <stop offset="45%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#FFA500" />
            </radialGradient>
            <clipPath id={nodePhotoClipId}>
              <circle cx="0" cy="0" r="24" />
            </clipPath>
            <clipPath id={hostPhotoClipId}>
              <circle cx="0" cy="0" r="30" />
            </clipPath>
          </defs>

          <g className="constellation-lines">
            {visitedLinks.map((node) => (
              <line
                key={`link-${node.id}`}
                data-link-target={node.id}
                x1="0"
                y1="0"
                x2="0"
                y2="0"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1.5"
              />
            ))}
          </g>

          {hostNode && (
            <g
              data-node-id={hostNode.id}
              className="constellation-node node-host"
              transform="translate(0,0)"
              onClick={(event) => handleNodeClick(hostNode, event)}
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
              {/* Name pill — y=58: halo r=44 + 14px clearance below */}
              <NodeLabel name={hostNode.p.displayName} y={58} color={ROLE_THEME.Host.ring} />
            </g>
          )}

          {nodesRef.current
            .filter((node) => node.p.role !== 'Host')
            .map((node) => {
              const theme = ROLE_THEME[node.p.role as ParticipantRole] ?? ROLE_THEME.Attendee;
              return (
                <g
                  key={node.id}
                  data-node-id={node.id}
                  className={`constellation-node node-${node.p.role.toLowerCase()}`}
                  transform="translate(0,0)"
                  onPointerEnter={disableInteractions ? undefined : () => setHoveredNode(node.id)}
                  onPointerLeave={disableInteractions ? undefined : () => setHoveredNode(null)}
                  onClick={(event) => handleNodeClick(node, event)}
                  style={{ cursor: 'pointer', '--node-ring-color': theme.ring } as React.CSSProperties}
                >
                  <circle className="node-halo" r="33" fill="none" stroke={theme.ring} strokeWidth="2.4" opacity={node.visited ? 0.2 : 0.7} />
                  <circle className="node-core" r="26" fill="#0a0a0a" stroke={node.visited ? '#333333' : theme.ring} strokeWidth="1.8" />
                  {node.photo ? (
                    <image href={node.photo} x="-24" y="-24" width="48" height="48" clipPath={`url(#${nodePhotoClipId})`} opacity={node.visited ? 0.35 : 1} />
                  ) : (
                    <text className="node-initial" dy="0.35em" textAnchor="middle" fontSize="16px" fontFamily="JetBrains Mono, monospace" fontWeight="600" fill={node.visited ? '#404040' : theme.text}>
                      {node.p.displayName.charAt(0).toUpperCase()}
                    </text>
                  )}
                  {/* Name pill — always upright (node group only uses translate, never rotate) */}
                  <NodeLabel
                    name={node.p.displayName}
                    y={47}          /* halo r=33 + 14px gap */
                    color={node.visited ? '#555' : '#d4d4d4'}
                  />
                </g>
              );
            })}
        </g>
      </svg>

      {!disableInteractions && (
        <div className="mesh-zoom-controls">
          <button type="button" className="zoom-btn" title="Recenter (reset view)" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); recenter(e); }}>⊕</button>
          <button type="button" className="zoom-btn" title="Zoom out (−8%)" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); zoomOut(e); }}>−</button>
          <button type="button" className="zoom-btn" title="Zoom in (+8%)" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); zoomIn(e); }}>+</button>
        </div>
      )}
    </div>
  );
}

function arePropsEqual(prev: Props, next: Props): boolean {
  if (prev.participants.length !== next.participants.length) return false;
  if (prev.searchTerm !== next.searchTerm) return false;
  if (prev.visitedNodes !== next.visitedNodes) return false;
  if (prev.disableSimulation !== next.disableSimulation) return false;
  if (prev.disableInteractions !== next.disableInteractions) return false;
  const prevKey = prev.participants.map((participant) => participant.peerId + '|' + participant.role).join(',');
  const nextKey = next.participants.map((participant) => participant.peerId + '|' + participant.role).join(',');
  return prevKey === nextKey;
}

export const MeshGraph = memo(MeshGraphInner, arePropsEqual);
