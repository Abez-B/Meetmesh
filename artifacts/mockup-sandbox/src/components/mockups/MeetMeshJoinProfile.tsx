import { useState } from 'react';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

.jp-root {
  font-family: 'JetBrains Mono', monospace;
  background: #090909;
  min-height: 100vh;
  color: #d4d4d4;
  -webkit-font-smoothing: antialiased;
  position: relative;
  overflow-x: hidden;
}

.jp-root::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 28px 28px;
  z-index: 0;
}

/* ── NAV ── */
.jp-nav {
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

.jp-nav-brand {
  display: flex;
  align-items: center;
  gap: 9px;
}

.jp-nav-mark {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: #000;
  letter-spacing: -0.05em;
  flex-shrink: 0;
}

.jp-nav-name {
  font-size: 12px;
  font-weight: 700;
  color: #f5f5f5;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.jp-nav-code {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-radius: 100px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.03);
  font-size: 11px;
  color: #888;
  letter-spacing: 0.08em;
}

.jp-nav-code strong {
  color: #f5f5f5;
  font-weight: 700;
  letter-spacing: 0.2em;
  font-size: 12px;
}

/* ── PAGE ── */
.jp-page {
  position: relative;
  z-index: 1;
  width: min(100%, 1100px);
  margin: 0 auto;
  padding: clamp(28px, 5vw, 56px) clamp(18px, 5vw, 48px) 80px;
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: clamp(24px, 4vw, 56px);
  align-items: start;
}

/* ── ASIDE ── */
.jp-aside {
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(14,14,14,0.9);
  padding: 28px;
  position: sticky;
  top: 72px;
}

.jp-aside-kicker {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 11px;
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

.jp-aside-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #f5f5f5;
  opacity: 0.5;
}

.jp-aside-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f5f5f5;
  letter-spacing: -0.02em;
  line-height: 1.3;
  margin: 0 0 12px;
}

.jp-aside-copy {
  font-size: 0.8rem;
  color: #555;
  line-height: 1.7;
  margin: 0 0 24px;
}

/* Code card */
.jp-code-card {
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.02);
  padding: 16px 18px;
  margin-bottom: 24px;
}

.jp-code-label {
  display: block;
  font-size: 9.5px;
  font-weight: 700;
  color: #555;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.jp-code-value {
  font-size: 2rem;
  font-weight: 800;
  color: #f5f5f5;
  letter-spacing: 0.25em;
  display: block;
  margin-bottom: 8px;
}

.jp-code-note {
  font-size: 10.5px;
  color: #444;
  line-height: 1.5;
}

/* Steps */
.jp-steps {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
}

.jp-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: border-color 0.2s, background 0.2s;
}

.jp-step.current {
  border-color: rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.03);
}

.jp-step.complete {
  opacity: 0.5;
}

.jp-step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #f5f5f5;
  flex-shrink: 0;
  margin-top: 1px;
}

.jp-step.current .jp-step-num {
  background: #f5f5f5;
  color: #000;
  border-color: transparent;
}

.jp-step.complete .jp-step-num {
  background: rgba(255,255,255,0.08);
}

.jp-step-title {
  font-size: 12px;
  font-weight: 600;
  color: #d4d4d4;
  margin-bottom: 3px;
}

.jp-step-copy {
  font-size: 11px;
  color: #555;
  line-height: 1.5;
}

/* Aside footer */
.jp-aside-footer {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.jp-aside-tag {
  padding: 3px 9px;
  border-radius: 100px;
  border: 1px solid rgba(255,255,255,0.06);
  color: #444;
  font-size: 9.5px;
  letter-spacing: 0.06em;
}

/* ── MAIN CARD ── */
.jp-card {
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.09);
  background: rgba(14,14,14,0.96);
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  overflow: hidden;
}

.jp-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 24px 28px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.jp-card-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f5f5f5;
  letter-spacing: -0.02em;
  margin: 0 0 5px;
}

.jp-card-sub {
  font-size: 0.78rem;
  color: #555;
  line-height: 1.5;
  margin: 0;
}

.jp-step-pill {
  padding: 4px 12px;
  border-radius: 100px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  font-size: 10px;
  font-weight: 700;
  color: #666;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── CAMERA STEP ── */
.jp-camera {
  padding: 48px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.jp-camera-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px dashed rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.jp-camera-title {
  font-size: 1rem;
  font-weight: 700;
  color: #f5f5f5;
  margin: 0 0 6px;
}

.jp-camera-sub {
  font-size: 0.8rem;
  color: #555;
  line-height: 1.6;
  max-width: 36ch;
  margin: 0 auto 4px;
}

.jp-camera-btns {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.jp-btn-primary {
  padding: 12px 28px;
  background: #f5f5f5;
  color: #000;
  border: none;
  border-radius: 9px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.18s, transform 0.15s;
  min-height: 46px;
  -webkit-tap-highlight-color: transparent;
}

.jp-btn-primary:hover {
  background: #e0e0e0;
  transform: translateY(-1px);
}

.jp-btn-ghost {
  padding: 12px 24px;
  background: transparent;
  color: #666;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 9px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.18s;
  min-height: 46px;
  -webkit-tap-highlight-color: transparent;
}

.jp-btn-ghost:hover {
  color: #d4d4d4;
  border-color: rgba(255,255,255,0.22);
}

/* ── PROFILE FORM ── */
.jp-form {
  padding: 24px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.jp-photo-preview {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.02);
}

.jp-photo-img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,0.15);
  flex-shrink: 0;
}

.jp-photo-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.jp-photo-info {
  flex: 1;
}

.jp-photo-name {
  font-size: 12px;
  color: #888;
  margin-bottom: 2px;
}

.jp-retake-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  color: #555;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 5px 12px;
  transition: all 0.18s;
}

.jp-retake-btn:hover {
  color: #d4d4d4;
  border-color: rgba(255,255,255,0.2);
}

.jp-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.jp-label {
  font-size: 9.5px;
  font-weight: 700;
  color: #555;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.jp-input {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 9px;
  color: #f5f5f5;
  padding: 12px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  outline: none;
  width: 100%;
  transition: border-color 0.18s, background 0.18s;
  min-height: 46px;
  -webkit-appearance: none;
}

.jp-input::placeholder { color: #333; }
.jp-input:focus {
  border-color: rgba(255,255,255,0.22);
  background: rgba(255,255,255,0.05);
}

.jp-input.readonly {
  color: #555;
  cursor: default;
  letter-spacing: 0.18em;
}

.jp-input-row {
  position: relative;
}

.jp-validity {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  padding: 2px 7px;
  border-radius: 4px;
}

.jp-validity.valid {
  color: #4ade80;
  background: rgba(74,222,128,0.1);
}

.jp-validity.invalid {
  color: #f87171;
  background: rgba(248,113,113,0.1);
}

.jp-field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.jp-textarea {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 9px;
  color: #f5f5f5;
  padding: 12px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  outline: none;
  width: 100%;
  resize: none;
  min-height: 88px;
  line-height: 1.6;
  transition: border-color 0.18s, background 0.18s;
  -webkit-appearance: none;
}

.jp-textarea::placeholder { color: #333; }
.jp-textarea:focus {
  border-color: rgba(255,255,255,0.22);
  background: rgba(255,255,255,0.05);
}

.jp-char-count {
  font-size: 10px;
  color: #444;
  text-align: right;
  margin-top: -8px;
}

.jp-error {
  padding: 11px 14px;
  border-radius: 8px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  color: #fca5a5;
  font-size: 12px;
}

.jp-submit-row {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.jp-submit-row .jp-btn-ghost {
  min-width: 90px;
}

.jp-submit-row .jp-btn-primary {
  flex: 1;
  width: 100%;
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .jp-page {
    grid-template-columns: 1fr;
    padding: 20px 16px 80px;
    gap: 20px;
  }

  .jp-aside {
    position: static;
    padding: 20px;
  }

  .jp-aside-title {
    font-size: 1rem;
  }

  .jp-code-value {
    font-size: 1.6rem;
  }

  .jp-card-head {
    padding: 18px 18px 16px;
    flex-direction: column;
    gap: 10px;
  }

  .jp-form {
    padding: 18px 18px 22px;
    gap: 14px;
  }

  .jp-camera {
    padding: 36px 18px;
  }

  .jp-field-row {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .jp-input, .jp-textarea {
    font-size: 16px;
  }

  .jp-btn-primary, .jp-btn-ghost {
    min-height: 50px;
    font-size: 13px;
  }

  .jp-submit-row {
    flex-direction: column;
  }

  .jp-submit-row .jp-btn-ghost {
    min-width: unset;
    order: 2;
  }

  .jp-submit-row .jp-btn-primary {
    order: 1;
  }

  .jp-camera-btns {
    flex-direction: column;
    width: 100%;
  }

  .jp-camera-btns button {
    width: 100%;
  }
}
`;

export default function MeetMeshJoinProfile() {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [github, setGithub] = useState('');
  const [bio, setBio] = useState('');
  const code = 'A3B7';

  const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?/i;
  const linkedInValidity = linkedIn.trim()
    ? linkedIn.trim().match(LINKEDIN_REGEX) ? 'valid' : 'invalid'
    : 'idle';

  return (
    <div className="jp-root">
      <style>{styles}</style>

      <nav className="jp-nav">
        <div className="jp-nav-brand">
          <div className="jp-nav-mark">MM</div>
          <span className="jp-nav-name">MeetMesh</span>
        </div>
        <div className="jp-nav-code">
          <span>Meeting</span>
          <strong>{code}</strong>
        </div>
      </nav>

      <div className="jp-page">
        {/* Aside */}
        <aside className="jp-aside">
          <div className="jp-aside-kicker">
            <div className="jp-aside-dot" />
            Attendee Check-In
          </div>
          <h1 className="jp-aside-title">Join the live mesh with a profile worth opening.</h1>
          <p className="jp-aside-copy">
            Add a recognizable face, your LinkedIn identity, and a short introduction so the room feels human the second you appear.
          </p>

          <div className="jp-code-card">
            <span className="jp-code-label">Meeting code</span>
            <span className="jp-code-value">{code}</span>
            <span className="jp-code-note">You will enter the waiting room after this step.</span>
          </div>

          <div className="jp-steps">
            <div className={`jp-step ${step === 1 ? 'current' : 'complete'}`}>
              <div className="jp-step-num">{step > 1 ? '✓' : '1'}</div>
              <div>
                <div className="jp-step-title">Capture a quick photo</div>
                <div className="jp-step-copy">Optional, but it makes the mesh recognizable.</div>
              </div>
            </div>
            <div className={`jp-step ${step === 2 ? 'current' : ''}`}>
              <div className="jp-step-num">2</div>
              <div>
                <div className="jp-step-title">Fill in your profile</div>
                <div className="jp-step-copy">Name, LinkedIn identity, and a short bio.</div>
              </div>
            </div>
          </div>

          <div className="jp-aside-footer">
            <span className="jp-aside-tag">Fresh profile setup</span>
            <span className="jp-aside-tag">SignalR session handoff</span>
          </div>
        </aside>

        {/* Main card */}
        <div className="jp-card">
          <div className="jp-card-head">
            <div>
              <p className="jp-card-title">{step === 1 ? 'Profile Setup' : 'Your Profile'}</p>
              <p className="jp-card-sub">
                {step === 1
                  ? 'Start with a clear face preview for node cards and host review.'
                  : 'This is what other attendees will see when they tap your node.'}
              </p>
            </div>
            <span className="jp-step-pill">Step {step} of 2</span>
          </div>

          {step === 1 ? (
            <div className="jp-camera">
              <div className="jp-camera-icon">📷</div>
              <div>
                <p className="jp-camera-title">Snap a quick photo</p>
                <p className="jp-camera-sub">This will appear on your mesh node card — helps people recognize you instantly.</p>
              </div>
              <div className="jp-camera-btns">
                <button className="jp-btn-primary" onClick={() => setStep(2)}>Open Camera</button>
                <button className="jp-btn-ghost" onClick={() => setStep(2)}>Skip for now</button>
              </div>
            </div>
          ) : (
            <div className="jp-form">
              <div className="jp-photo-preview">
                <div className="jp-photo-placeholder">👤</div>
                <div className="jp-photo-info">
                  <div className="jp-photo-name">No photo captured</div>
                </div>
                <button className="jp-retake-btn" onClick={() => setStep(1)}>Retake</button>
              </div>

              <div className="jp-field">
                <label className="jp-label">Full name *</label>
                <input className="jp-input" placeholder="Alice Example" value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div className="jp-field">
                <label className="jp-label">LinkedIn URL *</label>
                <div className="jp-input-row">
                  <input
                    className="jp-input"
                    placeholder="linkedin.com/in/alice-example"
                    value={linkedIn}
                    onChange={e => setLinkedIn(e.target.value)}
                    style={{ paddingRight: linkedInValidity !== 'idle' ? 52 : 14 }}
                  />
                  {linkedInValidity !== 'idle' && (
                    <span className={`jp-validity ${linkedInValidity}`}>
                      {linkedInValidity === 'valid' ? 'OK' : 'FIX'}
                    </span>
                  )}
                </div>
              </div>

              <div className="jp-field-row">
                <div className="jp-field">
                  <label className="jp-label">GitHub / Website</label>
                  <input className="jp-input" placeholder="github.com/alice" value={github} onChange={e => setGithub(e.target.value)} />
                </div>
                <div className="jp-field">
                  <label className="jp-label">Meeting code</label>
                  <input className="jp-input readonly" value={code} readOnly />
                </div>
              </div>

              <div className="jp-field">
                <label className="jp-label">Short bio ({bio.length}/140)</label>
                <textarea className="jp-textarea" placeholder="What do you do?" maxLength={140} value={bio} onChange={e => setBio(e.target.value)} />
                <div className="jp-char-count">{140 - bio.length} remaining</div>
              </div>

              <div className="jp-submit-row">
                <button className="jp-btn-ghost" onClick={() => setStep(1)}>Back</button>
                <button className="jp-btn-primary" disabled={!name.trim() || !linkedIn.trim()}>
                  Join Meeting
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
