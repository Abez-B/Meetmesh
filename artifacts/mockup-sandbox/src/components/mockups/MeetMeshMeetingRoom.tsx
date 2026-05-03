import { useState } from 'react';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

.mr-root {
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

.mr-root::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 28px 28px;
  z-index: 0;
}

/* ── TOPBAR ── */
.mr-topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 clamp(14px, 3vw, 28px);
  height: 56px;
  background: rgba(9,9,9,0.92);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  flex-shrink: 0;
}

.mr-topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.mr-event-name {
  font-size: 13px;
  font-weight: 700;
  color: #f5f5f5;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.mr-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.mr-meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #555;
}

.mr-pulse {
  width: 6px; height: 6px; border-radius: 50%; background: #fff;
  box-shadow: 0 0 6px rgba(255,255,255,0.5);
  animation: mr-pulse 2.2s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes mr-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.3); }
}

.mr-code-chip {
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  font-size: 11px;
  color: #888;
  letter-spacing: 0.14em;
}

.mr-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mr-btn-secondary {
  padding: 7px 14px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: #d4d4d4;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
  min-height: 36px;
  -webkit-tap-highlight-color: transparent;
}

.mr-btn-secondary:hover {
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.07);
}

.mr-btn-danger {
  padding: 7px 14px;
  border: 1px solid rgba(239,68,68,0.3);
  background: rgba(239,68,68,0.08);
  color: #fca5a5;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
  min-height: 36px;
  -webkit-tap-highlight-color: transparent;
}

.mr-btn-danger:hover {
  background: rgba(239,68,68,0.15);
  border-color: rgba(239,68,68,0.5);
}

/* ── CONTENT ── */
.mr-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Mesh stage */
.mr-stage {
  flex: 1;
  position: relative;
  background: rgba(255,255,255,0.005);
  overflow: hidden;
  min-height: 400px;
}

/* Simulated mesh nodes for preview */
.mr-mesh-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mr-mesh-label {
  text-align: center;
  color: #2a2a2a;
  font-size: 11px;
  letter-spacing: 0.08em;
  user-select: none;
}

.mr-mesh-label span {
  display: block;
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.3;
}

/* Sidebar */
.mr-sidebar {
  width: 300px;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  border-left: 1px solid rgba(255,255,255,0.06);
  background: rgba(9,9,9,0.94);
  display: flex;
  flex-direction: column;
  z-index: 10;
  backdrop-filter: blur(8px);
}

.mr-sidebar-head {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mr-sidebar-title {
  font-size: 10.5px;
  font-weight: 700;
  color: #888;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.mr-sidebar-close {
  background: transparent;
  border: none;
  color: #555;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  transition: color 0.18s;
}

.mr-sidebar-close:hover { color: #d4d4d4; }

.mr-search {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.mr-search-input {
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 7px;
  color: #f5f5f5;
  padding: 9px 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  outline: none;
  transition: border-color 0.18s;
}

.mr-search-input::placeholder { color: #333; }
.mr-search-input:focus { border-color: rgba(255,255,255,0.18); }

.mr-participant-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.mr-participant-list::-webkit-scrollbar { width: 3px; }
.mr-participant-list::-webkit-scrollbar-track { background: transparent; }
.mr-participant-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

.mr-peer-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.mr-peer-row:hover { background: rgba(255,255,255,0.03); }

.mr-peer-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #f5f5f5;
  flex-shrink: 0;
}

.mr-peer-info { flex: 1; min-width: 0; }

.mr-peer-name {
  font-size: 12px;
  font-weight: 600;
  color: #d4d4d4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mr-peer-role {
  font-size: 9.5px;
  color: #555;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-top: 2px;
}

.mr-role-badge {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 3px;
  white-space: nowrap;
}

.mr-role-host {
  color: #f5f5f5;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
}

.mr-role-attendee {
  color: #555;
  border: 1px solid rgba(255,255,255,0.07);
}

/* Node info card */
.mr-node-card {
  position: fixed;
  bottom: 80px;
  right: clamp(12px, 3vw, 28px);
  width: 300px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(14,14,14,0.98);
  box-shadow: 0 20px 60px rgba(0,0,0,0.7);
  z-index: 60;
  overflow: hidden;
}

.mr-node-card-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.mr-node-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #f5f5f5;
  flex-shrink: 0;
}

.mr-node-name {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  color: #f5f5f5;
  margin-bottom: 3px;
}

.mr-node-close {
  background: transparent;
  border: none;
  color: #555;
  font-size: 14px;
  cursor: pointer;
  padding: 2px;
  transition: color 0.18s;
}

.mr-node-close:hover { color: #d4d4d4; }

.mr-node-body {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mr-node-link {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: #666;
}

.mr-node-link-icon { font-size: 13px; }

.mr-node-actions {
  display: flex;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.mr-node-btn {
  flex: 1;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: #d4d4d4;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.18s;
  text-align: center;
}

.mr-node-btn:hover {
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.07);
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .mr-topbar { height: 52px; padding: 0 12px; }

  .mr-event-name { max-width: 120px; font-size: 12px; }

  .mr-meta { display: none; }

  .mr-btn-secondary { padding: 6px 10px; font-size: 10.5px; }
  .mr-btn-danger     { padding: 6px 10px; font-size: 10.5px; }

  .mr-stage { min-height: 300px; }

  .mr-sidebar {
    position: fixed;
    top: 52px;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .mr-node-card {
    bottom: 16px;
    right: 12px;
    left: 12px;
    width: auto;
  }
}
`;

const PARTICIPANTS = [
  { id: 'host', name: 'Alice Chen', role: 'host', initial: 'A' },
  { id: 'p1', name: 'Bob Martinez', role: 'attendee', initial: 'B' },
  { id: 'p2', name: 'Carol Kim', role: 'attendee', initial: 'C' },
  { id: 'p3', name: 'Dave Singh', role: 'attendee', initial: 'D' },
  { id: 'p4', name: 'Eva Torres', role: 'attendee', initial: 'E' },
];

export default function MeetMeshMeetingRoom() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<typeof PARTICIPANTS[0] | null>(null);
  const [search, setSearch] = useState('');

  const filtered = PARTICIPANTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mr-root">
      <style>{styles}</style>

      {/* Topbar */}
      <div className="mr-topbar">
        <div className="mr-topbar-left">
          <span className="mr-event-name">Y Combinator Demo Day</span>
          <div className="mr-meta">
            <div className="mr-meta-item">
              <div className="mr-pulse" />
              <span>Connected</span>
            </div>
            <span className="mr-code-chip">A3B7</span>
            <span style={{ fontSize: 11, color: '#555' }}>{PARTICIPANTS.length} peers</span>
          </div>
        </div>
        <div className="mr-topbar-actions">
          <button className="mr-btn-secondary" onClick={() => setShowSidebar(!showSidebar)}>
            {showSidebar ? 'Hide List' : 'Show List'}
          </button>
          <button className="mr-btn-secondary">Dashboard</button>
          <button className="mr-btn-danger">Leave</button>
        </div>
      </div>

      {/* Content */}
      <div className="mr-content">
        <div className="mr-stage" style={{ marginRight: showSidebar ? 300 : 0 }}>
          <div className="mr-mesh-bg">
            <div className="mr-mesh-label">
              <span>◎</span>
              Live mesh graph renders here
            </div>
          </div>
        </div>

        {showSidebar && (
          <div className="mr-sidebar">
            <div className="mr-sidebar-head">
              <span className="mr-sidebar-title">Participants ({PARTICIPANTS.length})</span>
              <button className="mr-sidebar-close" onClick={() => setShowSidebar(false)}>✕</button>
            </div>
            <div className="mr-search">
              <input
                className="mr-search-input"
                placeholder="Search nodes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="mr-participant-list">
              {filtered.map(p => (
                <div key={p.id} className="mr-peer-row" onClick={() => setSelectedPeer(p)}>
                  <div className="mr-peer-avatar">{p.initial}</div>
                  <div className="mr-peer-info">
                    <div className="mr-peer-name">{p.name}</div>
                    <div className="mr-peer-role">{p.role}</div>
                  </div>
                  <span className={`mr-role-badge ${p.role === 'host' ? 'mr-role-host' : 'mr-role-attendee'}`}>
                    {p.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Node info card */}
      {selectedPeer && (
        <div className="mr-node-card">
          <div className="mr-node-card-top">
            <div className="mr-node-avatar">{selectedPeer.initial}</div>
            <div style={{ flex: 1 }}>
              <div className="mr-node-name">{selectedPeer.name}</div>
              <span className={`mr-role-badge ${selectedPeer.role === 'host' ? 'mr-role-host' : 'mr-role-attendee'}`}>
                {selectedPeer.role}
              </span>
            </div>
            <button className="mr-node-close" onClick={() => setSelectedPeer(null)}>✕</button>
          </div>
          <div className="mr-node-body">
            <div className="mr-node-link">
              <span className="mr-node-link-icon">in</span>
              <span>linkedin.com/in/{selectedPeer.name.toLowerCase().replace(' ', '-')}</span>
            </div>
            <div className="mr-node-link">
              <span className="mr-node-link-icon">⌥</span>
              <span>github.com/{selectedPeer.name.split(' ')[0].toLowerCase()}</span>
            </div>
          </div>
          <div className="mr-node-actions">
            <button className="mr-node-btn">Mark visited</button>
            <button className="mr-node-btn">Open LinkedIn</button>
          </div>
        </div>
      )}
    </div>
  );
}
