import { useState } from 'react';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

.hp-root {
  font-family: 'JetBrains Mono', monospace;
  background: #090909;
  min-height: 100vh;
  color: #d4d4d4;
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.hp-root::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 28px 28px;
  z-index: 0;
}

/* ── TOPBAR ── */
.hp-topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 clamp(16px, 3vw, 28px);
  height: 56px;
  background: rgba(9,9,9,0.92);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  flex-shrink: 0;
}

.hp-topbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; }

.hp-brand { display: flex; align-items: center; gap: 8px; }

.hp-mark {
  width: 26px; height: 26px; border-radius: 5px; background: #f5f5f5;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; color: #000;
}

.hp-title {
  font-size: 12px; font-weight: 700; color: #f5f5f5;
  letter-spacing: -0.01em;
}

.hp-title-sep { color: #333; margin: 0 2px; }

.hp-title-role {
  color: #555;
  font-size: 11px;
  font-weight: 500;
}

.hp-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hp-meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #555;
}

.hp-pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: #fff; box-shadow: 0 0 6px rgba(255,255,255,0.5);
  animation: hp-pulse 2.2s ease-in-out infinite;
}

@keyframes hp-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.3); }
}

.hp-elapsed {
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  font-size: 11px;
  color: #666;
  letter-spacing: 0.06em;
}

.hp-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.hp-btn-secondary {
  padding: 7px 14px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: #d4d4d4;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
  min-height: 36px;
  -webkit-tap-highlight-color: transparent;
}

.hp-btn-secondary:hover {
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.07);
}

.hp-btn-danger {
  padding: 7px 14px;
  border: 1px solid rgba(239,68,68,0.3);
  background: rgba(239,68,68,0.08);
  color: #fca5a5;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
  min-height: 36px;
  -webkit-tap-highlight-color: transparent;
}

.hp-btn-danger:hover {
  background: rgba(239,68,68,0.15);
  border-color: rgba(239,68,68,0.5);
}

/* ── GRID ── */
.hp-grid {
  position: relative;
  z-index: 1;
  flex: 1;
  display: grid;
  grid-template-columns: 320px 1fr;
  min-height: 0;
  overflow: hidden;
}

/* ── SIDEBAR ── */
.hp-sidebar {
  border-right: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  background: rgba(10,10,10,0.8);
}

.hp-sidebar::-webkit-scrollbar { width: 3px; }
.hp-sidebar::-webkit-scrollbar-track { background: transparent; }
.hp-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }

/* Code card */
.hp-code-card {
  padding: 18px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  gap: 14px;
}

.hp-code-block { flex: 1; min-width: 0; }

.hp-code-label {
  font-size: 9px;
  font-weight: 700;
  color: #555;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  display: block;
  margin-bottom: 5px;
}

.hp-code-value {
  font-size: 1.9rem;
  font-weight: 800;
  color: #f5f5f5;
  letter-spacing: 0.28em;
}

.hp-qr {
  width: 56px; height: 56px;
  border-radius: 7px;
  border: 1.5px dashed rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.02);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
}

/* Section */
.hp-section {
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.hp-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.hp-section-title {
  font-size: 9.5px;
  font-weight: 700;
  color: #666;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

/* Rocker toggle */
.hp-toggle {
  position: relative;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}

.hp-toggle input {
  opacity: 0; width: 0; height: 0; position: absolute;
}

.hp-toggle-track {
  position: absolute;
  inset: 0;
  border-radius: 11px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  transition: background 0.2s;
}

.hp-toggle input:checked ~ .hp-toggle-track {
  background: rgba(255,255,255,0.7);
}

.hp-toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #888;
  transition: transform 0.2s, background 0.2s;
  pointer-events: none;
}

.hp-toggle input:checked ~ .hp-toggle-track .hp-toggle-thumb {
  transform: translateX(18px);
  background: #141414;
}

/* Peer row */
.hp-peer-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  cursor: pointer;
  transition: background 0.15s;
}

.hp-peer-row:last-child { border-bottom: none; }

.hp-peer-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.09);
  display: flex; align-items: center; justify-content: center;
  font-size: 10.5px; font-weight: 700; color: #f5f5f5;
  flex-shrink: 0;
}

.hp-peer-name {
  flex: 1;
  font-size: 11.5px;
  font-weight: 600;
  color: #d4d4d4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hp-peer-actions {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.hp-mini-btn {
  padding: 3px 9px;
  border-radius: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 26px;
  -webkit-tap-highlight-color: transparent;
}

.hp-mini-btn-role {
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: #888;
}

.hp-mini-btn-role:hover {
  border-color: rgba(255,255,255,0.2);
  color: #d4d4d4;
}

.hp-mini-btn-kick {
  border: 1px solid rgba(239,68,68,0.2);
  background: transparent;
  color: #ef4444;
}

.hp-mini-btn-kick:hover {
  background: rgba(239,68,68,0.1);
}

.hp-admit-btn {
  padding: 5px 12px;
  background: #f5f5f5;
  color: #000;
  border: none;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.18s;
  min-height: 28px;
  flex-shrink: 0;
}

.hp-admit-btn:hover { background: #e0e0e0; }

.hp-empty {
  font-size: 11px;
  color: #3a3a3a;
  padding: 12px 0;
  text-align: center;
}

.hp-search-input {
  width: 100%;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 7px;
  color: #f5f5f5;
  padding: 8px 11px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  outline: none;
  transition: border-color 0.18s;
}

.hp-search-input::placeholder { color: #333; }
.hp-search-input:focus { border-color: rgba(255,255,255,0.16); }

/* ── MAIN ── */
.hp-main {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.hp-mesh-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hp-mesh-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
}

.hp-mesh-stage {
  flex: 1;
  position: relative;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.003);
}

.hp-mesh-label {
  text-align: center;
  color: #1e1e1e;
  font-size: 11px;
  letter-spacing: 0.08em;
  user-select: none;
}

.hp-mesh-label span {
  display: block;
  font-size: 40px;
  margin-bottom: 10px;
  opacity: 0.18;
}

/* ── MOBILE ── */
@media (max-width: 900px) {
  .hp-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    overflow-y: auto;
  }

  .hp-sidebar {
    border-right: none;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    overflow: visible;
    max-height: none;
  }

  .hp-main {
    min-height: 350px;
  }

  .hp-topbar { height: 52px; padding: 0 12px; }

  .hp-title-role { display: none; }
  .hp-title-sep  { display: none; }

  .hp-meta { display: none; }

  .hp-btn-secondary { padding: 6px 10px; font-size: 10px; }
  .hp-btn-danger     { padding: 6px 10px; font-size: 10px; }
}
`;

const WAITING = [
  { id: 'w1', name: 'Frank Lee', initial: 'F' },
  { id: 'w2', name: 'Grace Park', initial: 'G' },
];

const PARTICIPANTS = [
  { id: 'host', name: 'Alice Chen', initial: 'A', role: 'host' },
  { id: 'p1',  name: 'Bob Martinez', initial: 'B', role: 'attendee' },
  { id: 'p2',  name: 'Carol Kim', initial: 'C', role: 'speaker' },
  { id: 'p3',  name: 'Dave Singh', initial: 'D', role: 'attendee' },
];

export default function MeetMeshHostPanel() {
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [search, setSearch] = useState('');
  const [waiting, setWaiting] = useState(WAITING);

  const filtered = PARTICIPANTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="hp-root">
      <style>{styles}</style>

      {/* Topbar */}
      <div className="hp-topbar">
        <div className="hp-topbar-left">
          <div className="hp-brand">
            <div className="hp-mark">MM</div>
            <span className="hp-title">
              Host Dashboard
              <span className="hp-title-sep"> · </span>
              <span className="hp-title-role">Y Combinator Demo Day</span>
            </span>
          </div>
          <div className="hp-meta">
            <div className="hp-meta-item">
              <div className="hp-pulse" />
              <span>Live</span>
            </div>
            <span className="hp-elapsed">00:24:17</span>
            <span style={{ fontSize: 11, color: '#555' }}>{PARTICIPANTS.length} participants</span>
          </div>
        </div>
        <div className="hp-topbar-actions">
          <button className="hp-btn-secondary">Present</button>
          <button className="hp-btn-danger">End Event</button>
        </div>
      </div>

      {/* Grid */}
      <div className="hp-grid">
        {/* Sidebar */}
        <aside className="hp-sidebar">
          {/* Code card */}
          <div className="hp-code-card">
            <div className="hp-code-block">
              <span className="hp-code-label">Meeting code</span>
              <div className="hp-code-value">A3B7</div>
            </div>
            <div className="hp-qr">▦</div>
          </div>

          {/* Waiting room */}
          <div className="hp-section">
            <div className="hp-section-head">
              <span className="hp-section-title">Waiting room ({waiting.length})</span>
              <label className="hp-toggle">
                <input
                  type="checkbox"
                  checked={waitingRoom}
                  onChange={() => setWaitingRoom(!waitingRoom)}
                />
                <div className="hp-toggle-track">
                  <div className="hp-toggle-thumb" />
                </div>
              </label>
            </div>

            {waiting.length === 0 ? (
              <div className="hp-empty">Lobby is empty.</div>
            ) : (
              waiting.map(p => (
                <div key={p.id} className="hp-peer-row">
                  <div className="hp-peer-avatar">{p.initial}</div>
                  <span className="hp-peer-name">{p.name}</span>
                  <button
                    className="hp-admit-btn"
                    onClick={() => setWaiting(ws => ws.filter(w => w.id !== p.id))}
                  >
                    Admit
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Participants */}
          <div className="hp-section">
            <div className="hp-section-head">
              <span className="hp-section-title">Participants ({PARTICIPANTS.length})</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <input
                className="hp-search-input"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {filtered.map(p => (
              <div key={p.id} className="hp-peer-row">
                <div className="hp-peer-avatar">{p.initial}</div>
                <span className="hp-peer-name">{p.name}</span>
                <div className="hp-peer-actions">
                  {p.role !== 'host' && (
                    <>
                      <button className="hp-mini-btn hp-mini-btn-role">Role</button>
                      <button className="hp-mini-btn hp-mini-btn-kick">Kick</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main mesh */}
        <main className="hp-main">
          <div className="hp-mesh-card">
            <div className="hp-mesh-head">
              <span className="hp-section-title">Live Mesh View</span>
              <span style={{ fontSize: 11, color: '#444' }}>{PARTICIPANTS.length} nodes</span>
            </div>
            <div className="hp-mesh-stage">
              <div className="hp-mesh-label">
                <span>◎</span>
                D3 mesh graph renders here
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
