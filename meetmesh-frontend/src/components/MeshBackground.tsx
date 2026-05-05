const NODES = [
  { x: 10, y: 18, d: '0s',   r: 0.7 },
  { x: 32, y:  6, d: '0.9s', r: 0.6 },
  { x: 58, y: 22, d: '1.7s', r: 0.8 },
  { x: 82, y:  9, d: '0.4s', r: 0.6 },
  { x: 94, y: 38, d: '2.1s', r: 0.7 },
  { x: 78, y: 64, d: '1.3s', r: 0.9 },
  { x: 52, y: 82, d: '0.6s', r: 0.7 },
  { x: 24, y: 74, d: '1.9s', r: 0.6 },
  { x:  4, y: 53, d: '1.0s', r: 0.8 },
  { x: 42, y: 48, d: '2.5s', r: 1.1 },
  { x: 64, y: 54, d: '0.3s', r: 0.7 },
];

const EDGES = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,0],
  [1,9],[9,5],[0,9],[9,6],[2,10],[10,5],[10,9],[3,10],
];

export function MeshBackground() {
  return (
    <svg
      className="wr-mesh-bg"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {EDGES.map(([a, b], i) => (
        <line
          key={i}
          x1={NODES[a].x} y1={NODES[a].y}
          x2={NODES[b].x} y2={NODES[b].y}
          stroke="url(#edge-grad)"
          strokeWidth="0.25"
          strokeDasharray="1.5 2.5"
          opacity="0.7"
        />
      ))}

      {NODES.map((n, i) => (
        <circle
          key={i}
          cx={n.x} cy={n.y} r={n.r}
          fill="#818cf8"
          className="wr-mesh-node"
          style={{ animationDelay: n.d } as React.CSSProperties}
        />
      ))}
    </svg>
  );
}
