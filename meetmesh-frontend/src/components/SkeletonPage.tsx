import { motion } from 'framer-motion';
import '../meetmesh-upgraded.css';

const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.25 } } };

/* ── shared shimmer block ── */
function Sk({ w, h, r = 6, mb = 0, mt = 0, style }: {
  w?: number | string; h: number; r?: number; mb?: number; mt?: number; style?: React.CSSProperties;
}) {
  return (
    <div
      className="sk-shimmer"
      style={{ width: w ?? '100%', height: h, borderRadius: r, marginBottom: mb, marginTop: mt, flexShrink: 0, ...style }}
    />
  );
}

/* ── Topbar used by MR + HP ── */
function SkTopbar({ hasActions = 2 }: { hasActions?: number }) {
  return (
    <div className="sk-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Sk w={26} h={26} r={5} />
        <Sk w={110} h={14} r={5} />
        <Sk w={56} h={20} r={4} />
        <Sk w={40} h={20} r={4} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {Array.from({ length: hasActions }).map((_, i) => (
          <Sk key={i} w={72} h={32} r={8} />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════
   MEETING ROOM SKELETON
══════════════════════════════ */
export function MeetingRoomSkeleton() {
  return (
    <motion.div className="mr-root" {...fadeIn}>
      <SkTopbar hasActions={3} />
      <div className="mr-content">
        <div className="mr-stage" style={{ background: 'rgba(255,255,255,0.003)' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              {/* Fake mesh nodes */}
              <div style={{ position: 'relative', width: 220, height: 220 }}>
                {[
                  { x: 90, y: 80 }, { x: 28, y: 140 }, { x: 155, y: 140 },
                  { x: 60, y: 30 }, { x: 140, y: 30 }, { x: 10, y: 78 }, { x: 200, y: 78 },
                ].map((pos, i) => (
                  <div
                    key={i}
                    className="sk-shimmer"
                    style={{
                      position: 'absolute',
                      left: pos.x,
                      top: pos.y,
                      width: i === 0 ? 38 : 28,
                      height: i === 0 ? 38 : 28,
                      borderRadius: '50%',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
                {/* Fake edges */}
                {[
                  { x1: 109, y1: 99, x2: 47, y2: 154 },
                  { x1: 109, y1: 99, x2: 169, y2: 154 },
                  { x1: 109, y1: 99, x2: 79, y2: 44 },
                  { x1: 109, y1: 99, x2: 159, y2: 44 },
                ].map((e, i) => {
                  const dx = e.x2 - e.x1, dy = e.y2 - e.y1;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute', left: e.x1, top: e.y1,
                        width: len, height: 1,
                        background: 'rgba(255,255,255,0.04)',
                        transformOrigin: '0 50%',
                        transform: `rotate(${angle}deg)`,
                      }}
                    />
                  );
                })}
              </div>
              <Sk w={160} h={11} r={4} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════
   HOST PANEL SKELETON
══════════════════════════════ */
export function HostPanelSkeleton() {
  return (
    <motion.div className="hp-root" {...fadeIn}>
      <SkTopbar hasActions={2} />
      <div className="hp-grid">
        {/* Sidebar */}
        <aside className="hp-sidebar">
          {/* Code card */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <Sk w={60} h={9} r={3} mb={8} />
              <Sk w={90} h={32} r={5} />
            </div>
            <Sk w={56} h={56} r={7} />
          </div>
          {/* Section: waiting */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Sk w={100} h={10} r={3} />
              <Sk w={40} h={22} r={11} />
            </div>
            <Sk h={10} r={3} mb={4} />
          </div>
          {/* Section: participants */}
          <div style={{ padding: '14px 20px' }}>
            <Sk w={120} h={10} r={3} mb={12} />
            <Sk h={32} r={7} mb={12} />
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <Sk w={28} h={28} r={14} style={{ animationDelay: `${i * 0.12}s` }} />
                <Sk h={11} r={4} style={{ flex: 1, animationDelay: `${i * 0.12 + 0.06}s` }} />
                <Sk w={42} h={22} r={5} style={{ animationDelay: `${i * 0.12 + 0.12}s` }} />
              </div>
            ))}
          </div>
        </aside>

        {/* Main mesh */}
        <main className="hp-main">
          <div className="hp-mesh-card">
            <div className="hp-mesh-head">
              <Sk w={100} h={11} r={3} />
              <Sk w={50} h={11} r={3} />
            </div>
            <div className="hp-mesh-stage" style={{ flex: 1, minHeight: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <div style={{ position: 'relative', width: 260, height: 260 }}>
                  {[
                    { x: 107, y: 95 }, { x: 36, y: 168 }, { x: 186, y: 168 },
                    { x: 78, y: 38 }, { x: 168, y: 38 }, { x: 10, y: 90 }, { x: 234, y: 90 },
                  ].map((pos, i) => (
                    <div
                      key={i}
                      className="sk-shimmer"
                      style={{
                        position: 'absolute', left: pos.x, top: pos.y,
                        width: i === 0 ? 44 : 32, height: i === 0 ? 44 : 32,
                        borderRadius: '50%', animationDelay: `${i * 0.13}s`,
                      }}
                    />
                  ))}
                </div>
                <Sk w={180} h={11} r={4} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════
   PRESENTATION SKELETON
══════════════════════════════ */
export function PresentationSkeleton() {
  return (
    <motion.div className="pp-root" {...fadeIn}>
      {/* Left panel */}
      <div className="pp-left">
        <div>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
            <Sk w={30} h={30} r={7} />
            <Sk w={90} h={14} r={4} />
          </div>

          {/* Kicker pill */}
          <Sk w={120} h={24} r={100} mb={20} />

          {/* Title */}
          <Sk h={36} r={6} mb={10} />
          <Sk w="75%" h={36} r={6} mb={28} />

          {/* Subtitle */}
          <Sk h={13} r={4} mb={6} />
          <Sk w="60%" h={13} r={4} mb={28} />

          {/* Count box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', marginBottom: 32 }}>
            <Sk w={52} h={36} r={5} />
            <div style={{ flex: 1 }}>
              <Sk h={11} r={3} mb={5} />
              <Sk w="70%" h={10} r={3} />
            </div>
          </div>

          {/* QR section */}
          <Sk w={80} h={10} r={3} mb={14} />
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <Sk w={130} h={130} r={12} />
            <div style={{ flex: 1 }}>
              <Sk h={38} r={5} mb={10} />
              <Sk h={11} r={3} mb={6} />
              <Sk w="80%" h={11} r={3} mb={16} />
              <Sk h={10} r={3} mb={5} />
              <Sk w="90%" h={10} r={3} />
            </div>
          </div>
        </div>
      </div>

      {/* Right: dark stage with shimmer stats */}
      <div className="pp-right">
        <div className="pp-stats-strip">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="sk-shimmer"
              style={{ width: 110, height: 36, borderRadius: 8, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        {/* Fake mesh nodes in right panel */}
        <div style={{ position: 'relative', width: 300, height: 300 }}>
          {[
            { x: 126, y: 120 }, { x: 46, y: 210 }, { x: 218, y: 210 },
            { x: 90, y: 50 }, { x: 196, y: 50 }, { x: 16, y: 115 }, { x: 268, y: 115 },
          ].map((pos, i) => (
            <div
              key={i}
              className="sk-shimmer"
              style={{
                position: 'absolute', left: pos.x, top: pos.y,
                width: i === 0 ? 48 : 34, height: i === 0 ? 48 : 34,
                borderRadius: '50%', animationDelay: `${i * 0.14}s`,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
