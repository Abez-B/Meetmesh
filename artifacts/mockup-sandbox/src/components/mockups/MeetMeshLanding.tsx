import { useState } from 'react';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

.mm-root {
  font-family: 'JetBrains Mono', monospace;
  background: #090909;
  min-height: 100vh;
  color: #d4d4d4;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overflow-x: hidden;
  position: relative;
}

/* Dot grid background */
.mm-root::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 28px 28px;
  z-index: 0;
}

/* ── TOP NAV BAR ────────────────────────────── */
.mm-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(20px, 5vw, 48px);
  height: 60px;
  background: rgba(9, 9, 9, 0.85);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.mm-nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mm-nav-logo-mark {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: #000;
  letter-spacing: -0.05em;
  flex-shrink: 0;
}

.mm-nav-wordmark {
  font-size: 13px;
  font-weight: 700;
  color: #f5f5f5;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mm-nav-status {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: #666;
  letter-spacing: 0.04em;
}

.mm-nav-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 8px rgba(255,255,255,0.6);
  animation: pulse-dot 2.2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.25); }
}

/* ── PAGE WRAPPER ───────────────────────────── */
.mm-page {
  position: relative;
  z-index: 1;
  width: min(100%, 1200px);
  margin: 0 auto;
  padding: clamp(32px, 5vw, 64px) clamp(20px, 5vw, 48px) 80px;
}

/* ── HERO GRID ──────────────────────────────── */
.mm-hero {
  display: grid;
  grid-template-columns: 1fr 420px;
  grid-template-areas:
    "copy  panel"
    "visual panel";
  column-gap: clamp(32px, 5vw, 64px);
  row-gap: 36px;
  align-items: start;
}

.mm-copy   { grid-area: copy; }
.mm-visual { grid-area: visual; }
.mm-panel  { grid-area: panel; position: sticky; top: 76px; }

/* ── EYEBROW ────────────────────────────────── */
.mm-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  padding: 5px 14px;
  border-radius: 100px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.03);
  color: #888;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.mm-eyebrow-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fff;
  opacity: 0.6;
}

/* ── TITLE ──────────────────────────────────── */
.mm-title {
  font-family: 'JetBrains Mono', monospace;
  color: #f5f5f5;
  font-size: clamp(2rem, 4vw, 3.25rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0 0 20px;
  max-width: 18ch;
}

.mm-title em {
  font-style: normal;
  background: linear-gradient(90deg, #f5f5f5 0%, #888 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── SUBTITLE ───────────────────────────────── */
.mm-subtitle {
  color: #666;
  font-size: 0.9rem;
  max-width: 48ch;
  margin: 0 0 28px;
  line-height: 1.7;
}

/* ── META ROW ───────────────────────────────── */
.mm-meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.mm-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 100px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: #666;
  font-size: 10.5px;
  letter-spacing: 0.06em;
}

/* ── PROOF CARDS ────────────────────────────── */
.mm-proof-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}

.mm-proof-card {
  padding: 20px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
  transition: border-color 0.2s, background 0.2s;
  cursor: default;
}

.mm-proof-card:hover {
  border-color: rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
}

.mm-proof-val {
  display: block;
  color: #f5f5f5;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 5px;
}

.mm-proof-lbl {
  color: #555;
  font-size: 0.7rem;
  line-height: 1.35;
  letter-spacing: 0.03em;
}

/* ── HINT ───────────────────────────────────── */
.mm-hint {
  color: #444;
  font-size: 0.78rem;
  line-height: 1.6;
}

/* ══════════════════════════════════════════════
   SOLAR SYSTEM VISUAL
══════════════════════════════════════════════ */
.mm-visual-card {
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.015);
  overflow: hidden;
}

.mm-visual-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-size: 11px;
  color: #555;
  letter-spacing: 0.05em;
}

.mm-visual-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #444;
  font-size: 10px;
}

.mm-visual-live-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.5);
  animation: pulse-dot 2s ease-in-out infinite;
}

.mm-solar {
  position: relative;
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* Starfield */
.mm-star {
  position: absolute;
  border-radius: 50%;
  background: rgba(255,255,255,0.4);
  pointer-events: none;
}

/* Orbit rings */
.mm-orbit {
  position: absolute;
  left: 50%;
  top: 50%;
  border: 1px dashed rgba(255,255,255,0.08);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.mm-orbit-inner { width: 150px; height: 150px; }
.mm-orbit-outer { width: 240px; height: 240px; }

/* Sun */
.mm-sun {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle, #FFD700 0%, #F59E0B 60%, #B45309 100%);
  box-shadow: 0 0 24px rgba(255, 215, 0, 0.7), 0 0 48px rgba(255, 165, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: #000;
  z-index: 20;
  animation: sun-glow 3s ease-in-out infinite;
}

@keyframes sun-glow {
  0%, 100% { box-shadow: 0 0 24px rgba(255,215,0,0.7), 0 0 48px rgba(255,165,0,0.3); }
  50%       { box-shadow: 0 0 36px rgba(255,215,0,0.9), 0 0 72px rgba(255,165,0,0.5); }
}

/* Orbital nodes */
.mm-node {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
  z-index: 10;
  animation: orbit-spin var(--dur, 45s) linear infinite;
  animation-delay: var(--delay, 0s);
}

.mm-node-inner {
  width: 30px;
  height: 30px;
  font-size: 11px;
  margin-left: -15px;
  margin-top: -15px;
  transform: rotate(var(--angle, 0deg)) translateX(75px) rotate(calc(-1 * var(--angle, 0deg)));
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  box-shadow: 0 0 12px rgba(59,130,246,0.4);
}

.mm-node-inner.organizer {
  background: linear-gradient(135deg, #8B5CF6, #7C3AED);
  box-shadow: 0 0 12px rgba(139,92,246,0.4);
}

.mm-node-outer {
  width: 26px;
  height: 26px;
  font-size: 10px;
  margin-left: -13px;
  margin-top: -13px;
  transform: rotate(var(--angle, 0deg)) translateX(120px) rotate(calc(-1 * var(--angle, 0deg)));
  background: linear-gradient(135deg, #14B8A6, #0D9488);
  box-shadow: 0 0 8px rgba(20,184,166,0.3);
}

@keyframes orbit-spin {
  from { transform: rotate(var(--angle, 0deg)) translateX(var(--r, 75px)) rotate(calc(-1 * var(--angle, 0deg))); }
  to   { transform: rotate(calc(360deg + var(--angle, 0deg))) translateX(var(--r, 75px)) rotate(calc(-360deg - var(--angle, 0deg))); }
}

.mm-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 12px 18px 16px;
  border-top: 1px solid rgba(255,255,255,0.04);
  font-size: 10.5px;
  color: #555;
}

.mm-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.mm-legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ══════════════════════════════════════════════
   ACTION PANEL
══════════════════════════════════════════════ */
.mm-panel-card {
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.09);
  background: rgba(16, 16, 16, 0.95);
  box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
  overflow: hidden;
}

.mm-panel-top {
  padding: 24px 24px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.mm-panel-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f5f5f5;
  letter-spacing: -0.02em;
  margin: 0 0 5px;
}

.mm-panel-desc {
  color: #555;
  font-size: 0.78rem;
  line-height: 1.5;
  margin: 0;
}

.mm-instant-badge {
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 100px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: #666;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  margin-top: 2px;
}

/* ── TABS ───────────────────────────────────── */
.mm-tabs {
  display: flex;
  gap: 4px;
  padding: 16px 24px 0;
}

.mm-tab {
  flex: 1;
  padding: 9px 16px;
  border-radius: 8px 8px 0 0;
  border: 1px solid transparent;
  border-bottom: none;
  background: transparent;
  color: #555;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.18s;
}

.mm-tab.active {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
  color: #f5f5f5;
  border-bottom-color: rgba(16, 16, 16, 0.95);
}

.mm-tab:not(.active):hover {
  color: #888;
  background: rgba(255,255,255,0.02);
}

/* Tab body */
.mm-tab-body {
  padding: 20px 24px 24px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

/* ── FORM FIELDS ────────────────────────────── */
.mm-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 14px;
}

.mm-field:last-of-type {
  margin-bottom: 0;
}

.mm-label {
  color: #555;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.mm-input-upgraded {
  width: 100%;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: #f5f5f5;
  padding: 12px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  transition: border-color 0.18s, background 0.18s;
  outline: none;
  min-height: 46px;
  -webkit-appearance: none;
}

.mm-input-upgraded::placeholder {
  color: #3a3a3a;
}

.mm-input-upgraded:focus {
  border-color: rgba(255,255,255,0.22);
  background: rgba(255,255,255,0.05);
}

.mm-input-code {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-align: center;
  text-transform: uppercase;
}

.mm-textarea-upgraded {
  width: 100%;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: #f5f5f5;
  padding: 12px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  transition: border-color 0.18s, background 0.18s;
  outline: none;
  resize: none;
  min-height: 80px;
  line-height: 1.6;
  -webkit-appearance: none;
}

.mm-textarea-upgraded::placeholder {
  color: #3a3a3a;
}

.mm-textarea-upgraded:focus {
  border-color: rgba(255,255,255,0.22);
  background: rgba(255,255,255,0.05);
}

/* Two-column field row */
.mm-field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* ── PHOTO FIELD ────────────────────────────── */
.mm-photo-zone {
  border: 1.5px dashed rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255,255,255,0.01);
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s;
  min-height: 70px;
}

.mm-photo-zone:hover {
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.03);
}

.mm-photo-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 16px;
}

.mm-photo-text {
  font-size: 12px;
  color: #555;
  line-height: 1.5;
}

.mm-photo-text strong {
  color: #888;
  font-weight: 600;
}

/* ── BUTTONS ────────────────────────────────── */
.mm-btn-primary {
  width: 100%;
  padding: 14px 20px;
  background: #f5f5f5;
  color: #000;
  border: none;
  border-radius: 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.18s, transform 0.15s, opacity 0.18s;
  margin-top: 18px;
  min-height: 50px;
  -webkit-tap-highlight-color: transparent;
}

.mm-btn-primary:hover:not(:disabled) {
  background: #e8e8e8;
  transform: translateY(-1px);
}

.mm-btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.mm-btn-primary:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ── ERROR ──────────────────────────────────── */
.mm-error {
  margin-top: 12px;
  padding: 11px 14px;
  border-radius: 8px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  color: #fca5a5;
  font-size: 12px;
  line-height: 1.5;
}

/* ── FORM NOTE ──────────────────────────────── */
.mm-form-note {
  color: #3a3a3a;
  font-size: 10.5px;
  line-height: 1.6;
  margin-top: 14px;
}

/* ── BOTTOM STRIP ───────────────────────────── */
.mm-bottom-strip {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 12px 24px;
  border-top: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.01);
}

.mm-strip-tag {
  padding: 3px 9px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.06);
  color: #444;
  font-size: 9.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* ══════════════════════════════════════════════
   MOBILE RESPONSIVE  (≤ 768px)
══════════════════════════════════════════════ */
@media (max-width: 768px) {
  .mm-nav {
    height: 54px;
    padding: 0 18px;
  }

  .mm-page {
    padding: 24px 16px 80px;
  }

  .mm-hero {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .mm-copy { order: 1; }
  .mm-visual { order: 2; }
  .mm-panel { order: 3; }

  .mm-panel { position: static; }

  .mm-title {
    font-size: clamp(1.7rem, 7vw, 2.2rem);
    max-width: 100%;
  }

  .mm-subtitle {
    font-size: 0.85rem;
    max-width: 100%;
  }

  .mm-proof-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .mm-proof-card {
    padding: 14px 10px;
  }

  .mm-proof-val {
    font-size: 1.05rem;
  }

  .mm-proof-lbl {
    font-size: 0.65rem;
  }

  /* Solar system on mobile */
  .mm-solar { height: 220px; }

  .mm-node-inner {
    width: 26px;
    height: 26px;
    font-size: 10px;
    margin-left: -13px;
    margin-top: -13px;
    transform: rotate(var(--angle, 0deg)) translateX(57px) rotate(calc(-1 * var(--angle, 0deg)));
  }

  .mm-node-outer {
    width: 22px;
    height: 22px;
    font-size: 9px;
    margin-left: -11px;
    margin-top: -11px;
    transform: rotate(var(--angle, 0deg)) translateX(93px) rotate(calc(-1 * var(--angle, 0deg)));
  }

  .mm-orbit-inner { width: 116px; height: 116px; }
  .mm-orbit-outer { width: 188px; height: 188px; }

  .mm-sun {
    width: 40px;
    height: 40px;
    font-size: 11px;
  }

  /* Panel card on mobile */
  .mm-panel-card {
    border-radius: 12px;
  }

  .mm-panel-top {
    padding: 20px 18px 16px;
  }

  .mm-tab-body {
    padding: 16px 18px 20px;
  }

  .mm-tabs {
    padding: 14px 18px 0;
  }

  .mm-field-row {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .mm-input-upgraded,
  .mm-textarea-upgraded {
    font-size: 16px; /* Prevents iOS zoom */
  }

  .mm-btn-primary {
    min-height: 52px;
    font-size: 13px;
    border-radius: 12px;
  }

  .mm-bottom-strip {
    padding: 12px 18px;
    gap: 6px;
  }
}

/* ── VERY SMALL MOBILE ── */
@media (max-width: 380px) {
  .mm-title { font-size: 1.55rem; }
  .mm-proof-grid { grid-template-columns: 1fr 1fr 1fr; }
  .mm-page { padding: 20px 14px 80px; }
}

/* ── LANDSCAPE MOBILE ── */
@media (max-width: 768px) and (orientation: landscape) and (hover: none) and (pointer: coarse) {
  .mm-solar { height: 160px; }
  .mm-visual { display: none; }
}
`;

const STARS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 1.5 + 0.5,
  opacity: Math.random() * 0.35 + 0.05,
}));

const INNER_NODES = [
  { angle: '0deg', label: 'S', cls: '', dur: '42s' },
  { angle: '120deg', label: 'O', cls: 'organizer', dur: '42s' },
  { angle: '240deg', label: 'S', cls: '', dur: '42s' },
];

const OUTER_NODES = [
  { angle: '0deg',   label: 'A', dur: '60s' },
  { angle: '72deg',  label: 'A', dur: '60s' },
  { angle: '144deg', label: 'A', dur: '60s' },
  { angle: '216deg', label: 'A', dur: '60s' },
  { angle: '288deg', label: 'A', dur: '60s' },
];

export default function MeetMeshLanding() {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [eventName, setEventName] = useState('');
  const [hostName, setHostName] = useState('');
  const [hostLinkedIn, setHostLinkedIn] = useState('');
  const [hostGithub, setHostGithub] = useState('');
  const [eventSubtitle, setEventSubtitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [hostBio, setHostBio] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error] = useState('');

  return (
    <div className="mm-root">
      <style>{styles}</style>

      {/* ── NAV BAR ── */}
      <nav className="mm-nav">
        <div className="mm-nav-logo">
          <div className="mm-nav-logo-mark">MM</div>
          <span className="mm-nav-wordmark">MeetMesh</span>
        </div>
        <div className="mm-nav-status">
          <div className="mm-nav-dot" />
          <span>Relay online</span>
        </div>
      </nav>

      {/* ── MAIN PAGE ── */}
      <div className="mm-page">
        <div className="mm-hero">

          {/* ── COPY ── */}
          <section className="mm-copy">
            <div className="mm-eyebrow">
              <div className="mm-eyebrow-dot" />
              Live Professional Proximity
            </div>

            <h1 className="mm-title">
              Turn every attendee into a <em>live node.</em>
            </h1>

            <p className="mm-subtitle">
              MeetMesh turns networking into a real-time spatial mesh. Hosts launch a session, attendees join instantly, and the room becomes an animated graph of people and roles.
            </p>

            <div className="mm-meta-row">
              <div className="mm-nav-status">
                <div className="mm-nav-dot" />
                <span style={{ fontSize: 11, color: '#555', letterSpacing: '0.04em' }}>
                  Websocket mesh active
                </span>
              </div>
              <span className="mm-status-pill">
                Real-time SignalR transport
              </span>
            </div>

            <div className="mm-proof-grid">
              {([
                ['3D', 'live mesh presence'],
                ['QR', 'frictionless entry'],
                ['RT', 'role-aware updates'],
              ] as const).map(([val, lbl]) => (
                <div className="mm-proof-card" key={val}>
                  <span className="mm-proof-val">{val}</span>
                  <span className="mm-proof-lbl">{lbl}</span>
                </div>
              ))}
            </div>

            <p className="mm-hint">
              Built for founder dinners, campus events, accelerator cohorts, and sponsor-heavy conferences.
            </p>
          </section>

          {/* ── SOLAR VISUAL ── */}
          <div className="mm-visual">
            <div className="mm-visual-card">
              <div className="mm-visual-header">
                <span>Session mesh preview</span>
                <span className="mm-visual-badge">
                  <span className="mm-visual-live-dot" />
                  Live demo
                </span>
              </div>

              <div className="mm-solar">
                {/* Starfield */}
                {STARS.map(s => (
                  <div
                    key={s.id}
                    className="mm-star"
                    style={{
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      width: s.size,
                      height: s.size,
                      opacity: s.opacity,
                    }}
                  />
                ))}

                {/* Orbit rings */}
                <div className="mm-orbit mm-orbit-inner" />
                <div className="mm-orbit mm-orbit-outer" />

                {/* Sun */}
                <div className="mm-sun">H</div>

                {/* Inner nodes */}
                {INNER_NODES.map((n, i) => (
                  <div
                    key={i}
                    className={`mm-node mm-node-inner${n.cls ? ' ' + n.cls : ''}`}
                    style={{ '--angle': n.angle, '--r': '75px', '--dur': n.dur, '--delay': `${i * -14}s` } as React.CSSProperties}
                  >
                    {n.label}
                  </div>
                ))}

                {/* Outer nodes */}
                {OUTER_NODES.map((n, i) => (
                  <div
                    key={i}
                    className="mm-node mm-node-outer"
                    style={{ '--angle': n.angle, '--r': '120px', '--dur': n.dur, '--delay': `${i * -12}s` } as React.CSSProperties}
                  >
                    {n.label}
                  </div>
                ))}
              </div>

              <div className="mm-legend">
                <span className="mm-legend-item">
                  <i className="mm-legend-dot" style={{ background: '#FFD700', boxShadow: '0 0 6px rgba(255,215,0,0.5)' }} />
                  Host
                </span>
                <span className="mm-legend-item">
                  <i className="mm-legend-dot" style={{ background: '#3B82F6' }} />
                  Speaker
                </span>
                <span className="mm-legend-item">
                  <i className="mm-legend-dot" style={{ background: '#8B5CF6' }} />
                  Organizer
                </span>
                <span className="mm-legend-item">
                  <i className="mm-legend-dot" style={{ background: '#14B8A6' }} />
                  Attendee
                </span>
              </div>
            </div>
          </div>

          {/* ── ACTION PANEL ── */}
          <div className="mm-panel">
            <div className="mm-panel-card">
              <div className="mm-panel-top">
                <div>
                  <p className="mm-panel-title">Start a room</p>
                  <p className="mm-panel-desc">Create a host session or jump in with a meeting code.</p>
                </div>
                <span className="mm-instant-badge">Instant setup</span>
              </div>

              {/* Tabs */}
              <div className="mm-tabs">
                {(['create', 'join'] as const).map(t => (
                  <button
                    key={t}
                    className={`mm-tab${tab === t ? ' active' : ''}`}
                    onClick={() => setTab(t)}
                  >
                    {t === 'create' ? 'Create' : 'Join'}
                  </button>
                ))}
              </div>

              {/* Tab body */}
              <div className="mm-tab-body">
                {tab === 'create' ? (
                  <div>
                    <div className="mm-field">
                      <label className="mm-label">Event name</label>
                      <input
                        className="mm-input-upgraded"
                        placeholder="e.g. Y Combinator Demo Day"
                        value={eventName}
                        onChange={e => setEventName(e.target.value)}
                      />
                    </div>

                    <div className="mm-field">
                      <label className="mm-label">Your name</label>
                      <input
                        className="mm-input-upgraded"
                        placeholder="e.g. Alice"
                        value={hostName}
                        onChange={e => setHostName(e.target.value)}
                      />
                    </div>

                    <div className="mm-field">
                      <label className="mm-label">Host photo (optional)</label>
                      <div className="mm-photo-zone">
                        <div className="mm-photo-icon">📷</div>
                        <div className="mm-photo-text">
                          <strong>Capture from camera</strong><br />
                          Adds your photo to the mesh node
                        </div>
                      </div>
                    </div>

                    <div className="mm-field">
                      <label className="mm-label">Host LinkedIn</label>
                      <input
                        className="mm-input-upgraded"
                        placeholder="linkedin.com/in/alice-example"
                        value={hostLinkedIn}
                        onChange={e => setHostLinkedIn(e.target.value)}
                      />
                    </div>

                    <div className="mm-field-row">
                      <div className="mm-field" style={{ marginBottom: 0 }}>
                        <label className="mm-label">Event subtitle</label>
                        <input
                          className="mm-input-upgraded"
                          placeholder="Short headline"
                          value={eventSubtitle}
                          onChange={e => setEventSubtitle(e.target.value)}
                        />
                      </div>
                      <div className="mm-field" style={{ marginBottom: 0 }}>
                        <label className="mm-label">GitHub / Website</label>
                        <input
                          className="mm-input-upgraded"
                          placeholder="github.com/alice"
                          value={hostGithub}
                          onChange={e => setHostGithub(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mm-field" style={{ marginTop: 14 }}>
                      <label className="mm-label">Host event note</label>
                      <textarea
                        className="mm-textarea-upgraded"
                        placeholder="What is this room about? Stored locally for host and presentation views."
                        value={eventDescription}
                        onChange={e => setEventDescription(e.target.value)}
                      />
                    </div>

                    <div className="mm-field">
                      <label className="mm-label">Host bio</label>
                      <textarea
                        className="mm-textarea-upgraded"
                        placeholder="A short intro for your mesh profile"
                        value={hostBio}
                        onChange={e => setHostBio(e.target.value)}
                        style={{ minHeight: 70 }}
                      />
                    </div>

                    <button
                      className="mm-btn-primary"
                      disabled={!eventName.trim() || !hostName.trim()}
                    >
                      Launch Session
                    </button>

                    <p className="mm-form-note">
                      Host identity is created with the room. Event subtitle and note are stored locally for the host dashboard and presentation view.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="mm-field">
                      <label className="mm-label">Meeting code</label>
                      <input
                        className="mm-input-upgraded mm-input-code"
                        placeholder="A3B7"
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={4}
                      />
                    </div>

                    <button
                      className="mm-btn-primary"
                      disabled={!joinCode || joinCode.length < 4}
                    >
                      Enter Room
                    </button>

                    <p className="mm-form-note">
                      Join flow captures your profile details and drops you straight into the mesh.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mm-error">{error}</div>
                )}
              </div>

              <div className="mm-bottom-strip">
                <span className="mm-strip-tag">SignalR transport</span>
                <span className="mm-strip-tag">D3 simulation</span>
                <span className="mm-strip-tag">Role-aware mesh</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
