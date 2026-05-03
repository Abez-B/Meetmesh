import { useState } from 'react';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

.wr-root {
  font-family: 'JetBrains Mono', monospace;
  background: #090909;
  min-height: 100vh;
  color: #d4d4d4;
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  position: relative;
}

.wr-root::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 28px 28px;
  z-index: 0;
}

/* ── NAV ── */
.wr-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(18px, 5vw, 48px);
  height: 56px;
  background: rgba(9,9,9,0.88);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.wr-nav-brand { display: flex; align-items: center; gap: 9px; }

.wr-nav-mark {
  width: 26px; height: 26px; border-radius: 5px;
  background: #f5f5f5; display: flex; align-items: center;
  justify-content: center; font-size: 10px; font-weight: 800;
  color: #000; letter-spacing: -0.05em;
}

.wr-nav-name {
  font-size: 12px; font-weight: 700; color: #f5f5f5;
  letter-spacing: 0.1em; text-transform: uppercase;
}

.wr-nav-dot-wrap { display: flex; align-items: center; gap: 7px; font-size: 11px; color: #555; }

.wr-pulse {
  width: 7px; height: 7px; border-radius: 50%; background: #fff;
  box-shadow: 0 0 8px rgba(255,255,255,0.5);
  animation: wr-pulse 2.2s ease-in-out infinite;
}

@keyframes wr-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.3); }
}

/* ── VIEW TOGGLE ── */
.wr-toggle {
  display: flex;
  align-items: center;
  gap: 0;
  position: relative;
  z-index: 1;
  padding: 0 clamp(18px, 5vw, 48px);
  margin-top: 32px;
  margin-bottom: 24px;
}

.wr-view-btn {
  padding: 9px 20px;
  border: 1px solid rgba(255,255,255,0.08);
  background: transparent;
  color: #555;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.18s;
}

.wr-view-btn:first-child { border-radius: 8px 0 0 8px; }
.wr-view-btn:last-child  { border-radius: 0 8px 8px 0; border-left: none; }

.wr-view-btn.active {
  background: rgba(255,255,255,0.08);
  color: #f5f5f5;
  border-color: rgba(255,255,255,0.15);
}

/* ── LOBBY VIEW (attendee) ── */
.wr-lobby {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px clamp(18px, 5vw, 48px) 80px;
}

.wr-lobby-card {
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(14,14,14,0.95);
  box-shadow: 0 32px 80px rgba(0,0,0,0.6);
  padding: clamp(40px, 6vw, 64px) clamp(28px, 5vw, 64px);
  text-align: center;
  max-width: 440px;
  width: 100%;
}

.wr-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 14px;
  border-radius: 100px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  font-size: 10px;
  font-weight: 700;
  color: #666;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 32px;
}

/* Rings animation */
.wr-rings {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wr-ring {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.08);
  animation: wr-expand 2.4s ease-out infinite;
}

.wr-ring:nth-child(1) { width: 48px; height: 48px; animation-delay: 0s; }
.wr-ring:nth-child(2) { width: 72px; height: 72px; animation-delay: 0.5s; }
.wr-ring:nth-child(3) { width: 100px; height: 100px; animation-delay: 1s; }

@keyframes wr-expand {
  0%   { opacity: 0.5; transform: scale(0.85); }
  60%  { opacity: 0.2; }
  100% { opacity: 0; transform: scale(1.1); }
}

.wr-lobby-icon {
  position: relative;
  z-index: 2;
  font-size: 26px;
}

.wr-lobby-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #f5f5f5;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
}

.wr-lobby-sub {
  font-size: 0.85rem;
  color: #555;
  line-height: 1.6;
  max-width: 28ch;
  margin: 0 auto 28px;
}

.wr-lobby-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 11px;
  color: #444;
}

.wr-lobby-sep { opacity: 0.3; }

/* ── HOST VIEW ── */
.wr-host {
  position: relative;
  z-index: 1;
  width: min(100%, 900px);
  margin: 0 auto;
  padding: 0 clamp(18px, 5vw, 48px) 80px;
}

.wr-host-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.wr-host-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f5f5f5;
  letter-spacing: -0.02em;
  margin: 0;
}

/* Code card */
.wr-code-card {
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(14,14,14,0.9);
  padding: 20px 24px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.wr-code-block {
  flex: 1;
  min-width: 120px;
}

.wr-code-label {
  font-size: 9.5px;
  font-weight: 700;
  color: #555;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  display: block;
  margin-bottom: 6px;
}

.wr-code-value {
  font-size: 2.2rem;
  font-weight: 800;
  color: #f5f5f5;
  letter-spacing: 0.28em;
}

.wr-qr-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  border: 1.5px dashed rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.wr-share-link {
  font-size: 10.5px;
  color: #444;
  margin-top: 4px;
}

/* Waiting list */
.wr-waiting-card {
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(14,14,14,0.9);
  overflow: hidden;
}

.wr-waiting-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.wr-waiting-title {
  font-size: 11px;
  font-weight: 700;
  color: #888;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.wr-waiting-count {
  padding: 3px 10px;
  border-radius: 100px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  font-size: 10px;
  color: #666;
}

.wr-peer-list {
  display: flex;
  flex-direction: column;
}

.wr-peer-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.18s;
}

.wr-peer-row:last-child { border-bottom: none; }
.wr-peer-row:hover { background: rgba(255,255,255,0.02); }

.wr-peer-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  font-weight: 700;
  color: #f5f5f5;
  font-size: 12px;
}

.wr-peer-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #d4d4d4;
}

.wr-peer-time {
  font-size: 10.5px;
  color: #444;
  margin-right: 12px;
}

.wr-admit-btn {
  padding: 7px 18px;
  background: #f5f5f5;
  color: #000;
  border: none;
  border-radius: 7px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.18s, transform 0.15s;
  min-height: 34px;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

.wr-admit-btn:hover { background: #e0e0e0; transform: scale(1.02); }

.wr-empty {
  padding: 36px 20px;
  text-align: center;
  font-size: 0.8rem;
  color: #444;
  line-height: 1.6;
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .wr-toggle { margin-top: 20px; margin-bottom: 16px; }

  .wr-lobby { padding: 24px 16px 80px; }

  .wr-lobby-card {
    padding: 36px 24px;
  }

  .wr-lobby-title { font-size: 1.15rem; }

  .wr-host { padding: 0 16px 80px; }

  .wr-code-value { font-size: 1.8rem; }

  .wr-peer-time { display: none; }

  .wr-peer-row { padding: 12px 16px; }

  .wr-waiting-head { padding: 14px 16px; }

  .wr-code-card { padding: 16px 18px; gap: 14px; }
}
`;

const MOCK_PEERS = [
  { id: 1, name: 'Alice Chen', initial: 'A', time: '2m ago' },
  { id: 2, name: 'Bob Martinez', initial: 'B', time: '1m ago' },
  { id: 3, name: 'Carol Kim', initial: 'C', time: 'just now' },
];

export default function MeetMeshWaitingRoom() {
  const [view, setView] = useState<'attendee' | 'host'>('attendee');
  const [peers, setPeers] = useState(MOCK_PEERS);

  return (
    <div className="wr-root">
      <style>{styles}</style>

      <nav className="wr-nav">
        <div className="wr-nav-brand">
          <div className="wr-nav-mark">MM</div>
          <span className="wr-nav-name">MeetMesh</span>
        </div>
        <div className="wr-nav-dot-wrap">
          <div className="wr-pulse" />
          <span>Relay online</span>
        </div>
      </nav>

      <div className="wr-toggle">
        <button className={`wr-view-btn${view === 'attendee' ? ' active' : ''}`} onClick={() => setView('attendee')}>
          Attendee view
        </button>
        <button className={`wr-view-btn${view === 'host' ? ' active' : ''}`} onClick={() => setView('host')}>
          Host view
        </button>
      </div>

      {view === 'attendee' ? (
        <div className="wr-lobby">
          <div className="wr-lobby-card">
            <div className="wr-status-tag">
              <div className="wr-pulse" />
              Waiting for admission
            </div>

            <div className="wr-rings">
              <div className="wr-ring" />
              <div className="wr-ring" />
              <div className="wr-ring" />
              <div className="wr-lobby-icon">⌛</div>
            </div>

            <h2 className="wr-lobby-title">You're in the lobby</h2>
            <p className="wr-lobby-sub">The host will let you in shortly. Hang tight.</p>

            <div className="wr-lobby-meta">
              <span>Meeting A3B7</span>
              <span className="wr-lobby-sep">·</span>
              <span>SignalR connected</span>
              <span className="wr-lobby-sep">·</span>
              <span>3 in room</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="wr-host">
          <div className="wr-host-head">
            <h2 className="wr-host-title">Y Combinator Demo Day — Waiting Room</h2>
            <div className="wr-nav-dot-wrap">
              <div className="wr-pulse" />
              <span style={{ fontSize: 11 }}>Live</span>
            </div>
          </div>

          <div className="wr-code-card">
            <div className="wr-code-block">
              <span className="wr-code-label">Meeting code</span>
              <div className="wr-code-value">A3B7</div>
              <div className="wr-share-link">meetmesh.app/join/A3B7</div>
            </div>
            <div className="wr-qr-placeholder">▦</div>
          </div>

          <div className="wr-waiting-card">
            <div className="wr-waiting-head">
              <span className="wr-waiting-title">Waiting Room</span>
              <span className="wr-waiting-count">{peers.length} pending</span>
            </div>

            {peers.length === 0 ? (
              <div className="wr-empty">
                No one is waiting yet. Share the code above to invite attendees.
              </div>
            ) : (
              <div className="wr-peer-list">
                {peers.map(p => (
                  <div key={p.id} className="wr-peer-row">
                    <div className="wr-peer-avatar">{p.initial}</div>
                    <span className="wr-peer-name">{p.name}</span>
                    <span className="wr-peer-time">{p.time}</span>
                    <button
                      className="wr-admit-btn"
                      onClick={() => setPeers(ps => ps.filter(x => x.id !== p.id))}
                    >
                      Admit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
