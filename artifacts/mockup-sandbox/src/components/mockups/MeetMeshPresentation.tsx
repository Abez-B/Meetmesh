const styles = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

.pp-root {
  font-family: 'JetBrains Mono', monospace;
  background: #050505;
  min-height: 100vh;
  color: #d4d4d4;
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  position: relative;
}

.pp-root::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 32px 32px;
  z-index: 0;
}

/* ── LEFT PANEL ── */
.pp-left {
  position: relative;
  z-index: 1;
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(32px, 5vw, 56px) clamp(28px, 4vw, 48px);
  border-right: 1px solid rgba(255,255,255,0.05);
  background: rgba(8,8,8,0.9);
  backdrop-filter: blur(4px);
}

.pp-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 48px;
}

.pp-brand-mark {
  width: 30px; height: 30px; border-radius: 7px; background: #f5f5f5;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; color: #000;
}

.pp-brand-name {
  font-size: 12px; font-weight: 700; color: #f5f5f5;
  letter-spacing: 0.1em; text-transform: uppercase;
}

/* Event info */
.pp-event-kicker {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 12px;
  border-radius: 100px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  font-size: 9.5px;
  font-weight: 700;
  color: #666;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.pp-live-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.6);
  animation: pp-live 2s ease-in-out infinite;
}

@keyframes pp-live {
  0%, 100% { opacity: 0.7; }
  50%       { opacity: 1; }
}

.pp-title {
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  font-weight: 800;
  color: #f5f5f5;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0 0 12px;
}

.pp-subtitle {
  font-size: 0.85rem;
  color: #555;
  line-height: 1.65;
  margin: 0 0 28px;
}

/* Participant count */
.pp-count {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
}

.pp-count-num {
  font-size: 1.5rem;
  font-weight: 800;
  color: #f5f5f5;
  letter-spacing: -0.03em;
}

.pp-count-label {
  font-size: 11px;
  color: #555;
  line-height: 1.4;
}

/* QR section */
.pp-qr-section {
  margin-bottom: 28px;
}

.pp-qr-label {
  font-size: 9.5px;
  font-weight: 700;
  color: #555;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  display: block;
  margin-bottom: 14px;
}

.pp-qr-card {
  display: flex;
  gap: 20px;
  align-items: center;
}

.pp-qr-box {
  width: 130px;
  height: 130px;
  border-radius: 12px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.pp-qr-pattern {
  position: absolute;
  inset: 0;
  background: 
    repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 16px 16px,
    repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 8px 8px / 16px 16px;
  opacity: 0.85;
}

.pp-qr-center {
  position: relative;
  z-index: 1;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: #000;
}

.pp-qr-info {
  flex: 1;
  min-width: 0;
}

.pp-code {
  font-size: 2.2rem;
  font-weight: 800;
  color: #f5f5f5;
  letter-spacing: 0.28em;
  display: block;
  margin-bottom: 6px;
}

.pp-join-link {
  font-size: 11px;
  color: #444;
  word-break: break-all;
  line-height: 1.5;
}

.pp-description {
  font-size: 11px;
  color: #444;
  line-height: 1.6;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255,255,255,0.05);
}

/* ── RIGHT PANEL ── */
.pp-right {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.003);
  overflow: hidden;
}

.pp-mesh-placeholder {
  text-align: center;
  color: #1a1a1a;
  user-select: none;
}

.pp-mesh-placeholder-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
  opacity: 0.12;
}

.pp-mesh-placeholder-text {
  font-size: 12px;
  letter-spacing: 0.1em;
  color: #222;
  text-transform: uppercase;
}

/* Stats strip on right */
.pp-stats-strip {
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 5;
}

.pp-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(9,9,9,0.85);
  backdrop-filter: blur(8px);
  font-size: 11px;
  color: #555;
}

.pp-stat strong {
  color: #f5f5f5;
  font-size: 13px;
  font-weight: 700;
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .pp-root {
    flex-direction: column;
    overflow-y: auto;
  }

  .pp-left {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 28px 20px 32px;
    justify-content: flex-start;
    gap: 0;
  }

  .pp-brand { margin-bottom: 28px; }

  .pp-title { font-size: 1.6rem; }

  .pp-qr-box {
    width: 100px;
    height: 100px;
  }

  .pp-qr-center { width: 28px; height: 28px; font-size: 10px; }

  .pp-code { font-size: 1.8rem; }

  .pp-right {
    min-height: 280px;
    flex: none;
  }

  .pp-stats-strip {
    top: 12px;
    right: 12px;
  }

  .pp-stat { font-size: 10px; padding: 6px 10px; }
}

@media (max-width: 400px) {
  .pp-qr-card { flex-direction: column; align-items: flex-start; }
  .pp-qr-box { width: 120px; height: 120px; }
}
`;

export default function MeetMeshPresentation() {
  return (
    <div className="pp-root">
      <style>{styles}</style>

      {/* Left panel */}
      <div className="pp-left">
        <div>
          <div className="pp-brand">
            <div className="pp-brand-mark">MM</div>
            <span className="pp-brand-name">MeetMesh</span>
          </div>

          <div className="pp-event-kicker">
            <div className="pp-live-dot" />
            Live Session
          </div>

          <h1 className="pp-title">Y Combinator Demo Day</h1>
          <p className="pp-subtitle">Spring 2025 Batch — San Francisco, CA</p>

          <div className="pp-count">
            <span className="pp-count-num">42</span>
            <div className="pp-count-label">
              Participants connected<br />
              <span style={{ color: '#333', fontSize: 10 }}>across 3 roles</span>
            </div>
          </div>

          <div className="pp-qr-section">
            <span className="pp-qr-label">Scan to join</span>
            <div className="pp-qr-card">
              <div className="pp-qr-box">
                <div className="pp-qr-pattern" />
                <div className="pp-qr-center">MM</div>
              </div>
              <div className="pp-qr-info">
                <span className="pp-code">A3B7</span>
                <div className="pp-join-link">meetmesh.app/join/A3B7</div>
                <p className="pp-description">
                  Scan the QR code or type the code above to join the live mesh and appear as a node.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — mesh graph */}
      <div className="pp-right">
        <div className="pp-stats-strip">
          <div className="pp-stat">
            <span>Peers</span>
            <strong>42</strong>
          </div>
          <div className="pp-stat">
            <span>Hosts</span>
            <strong>1</strong>
          </div>
          <div className="pp-stat">
            <span>Speakers</span>
            <strong>3</strong>
          </div>
        </div>

        <div className="pp-mesh-placeholder">
          <span className="pp-mesh-placeholder-icon">◎</span>
          <div className="pp-mesh-placeholder-text">Live mesh graph</div>
        </div>
      </div>
    </div>
  );
}
