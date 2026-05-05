import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeshClient } from '../hooks/useMeshClient';
import { CameraCapture } from '../components/CameraCapture';
import { TooltipButton } from '../components/TooltipButton';
import { isValidMeetingCode } from 'meetmesh-core';
import { Logo } from '../components/Logo';
import '../meetmesh-upgraded.css';

const LINKEDIN_PEER_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?/i;

export default function JoinProfilePage() {
  const { code } = useParams<{ code?: string }>();
  const client   = useMeshClient();
  const navigate = useNavigate();

  const [step,      setStep]      = useState<1 | 2>(1);
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState('');
  const [photo,     setPhoto]     = useState<string | undefined>();
  const [name,      setName]      = useState('');
  const [linkedIn,  setLinkedIn]  = useState('');
  const [github,    setGithub]    = useState('');
  const [bio,       setBio]       = useState('');

  useEffect(() => {
    try {
      const cached = localStorage.getItem('meetmesh_profile_cache');
      if (cached) {
        const p = JSON.parse(cached);
        if (p.name)      setName(p.name);
        if (p.linkedIn)  setLinkedIn(p.linkedIn);
        if (p.github || p.portfolio) setGithub(p.github || p.portfolio);
        if (p.bio)       setBio(p.bio);
        if (p.photo)     { setPhoto(p.photo); setStep(2); }
      }
    } catch {}
  }, []);

  useEffect(() => {
    client.connect().catch((err) => {
      console.error('[JoinProfilePage] Connection failed:', err);
      setError(`Relay connection failed: ${err?.message || 'Check if API is running at localhost:5000'}`);
    });
    const onError = ({ detail }: { detail: string }) => { setError(detail); setBusy(false); };
    client.on('Error', onError);
    return () => client.off('Error', onError);
  }, [client]);

  const handleCapture     = (base64: string) => { setPhoto(base64); setStep(2); };
  const handleSkipCapture = () => { setPhoto('SKIP'); setStep(2); };
  const handleRetake      = () => { setPhoto(undefined); setStep(1); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !isValidMeetingCode(code)) { setError('Invalid meeting code.'); return; }
    if (!name.trim())    { setError('Name is required.'); return; }
    if (!linkedIn.trim()) { setError('LinkedIn URL is required.'); return; }

    setBusy(true); setError('');

    const photoToSave = photo === 'SKIP' ? undefined : photo;
    const profileJsonObj = {
      linkedIn:  linkedIn.trim(),
      github:    github.trim() || undefined,
      bio:       bio.trim() || undefined,
      photo:     photoToSave,
    };
    const profileJson = JSON.stringify(profileJsonObj);

    localStorage.setItem('meetmesh_profile_cache', JSON.stringify({ name: name.trim(), ...profileJsonObj }));

    const linkedInRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?/i;
    const match = linkedIn.trim().match(linkedInRegex);
    if (!match) {
      setError('Please enter a valid LinkedIn URL (e.g., linkedin.com/in/username)');
      setBusy(false);
      return;
    }
    const peerId = match[1].toLowerCase();
    sessionStorage.setItem('meetmesh_peer_id', peerId);
    localStorage.setItem('meetmesh_peer_id', peerId);
    sessionStorage.setItem('meetmesh_last_name', name.trim());
    sessionStorage.setItem('meetmesh_last_profile_json', profileJson);

    try {
      await client.joinMeeting(code, name.trim(), peerId, profileJson);
      navigate(`/join/${code}/waiting`);
    } catch {
      setError('Failed to join meeting.');
      setBusy(false);
    }
  };

  const linkedInMatch    = linkedIn.trim().match(LINKEDIN_PEER_REGEX);
  const linkedInValidity = linkedIn.trim() ? (linkedInMatch ? 'valid' : 'invalid') : 'idle';
  const normalizedCode   = code?.toUpperCase() ?? '----';
  const hasCachedProfile = Boolean(name || linkedIn || github || bio || photo);

  return (
    <div className="jp-root">
      <nav className="jp-nav">
        <div className="jp-nav-brand">
          <Logo size={24} />
          <span className="jp-nav-name">MeetMesh</span>
        </div>
        <div className="jp-nav-code">
          <span>Meeting</span>
          <strong>{normalizedCode}</strong>
        </div>
      </nav>

      <div className="jp-page">
        <motion.aside
          className="jp-aside"
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
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
            <span className="jp-code-value">{normalizedCode}</span>
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
            <span className="jp-aside-tag">{hasCachedProfile ? 'Saved profile detected' : 'Fresh profile setup'}</span>
            <span className="jp-aside-tag">SignalR session handoff</span>
          </div>
        </motion.aside>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              className="jp-card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="jp-card-head">
                <div>
                  <p className="jp-card-title">Profile Setup</p>
                  <p className="jp-card-sub">Start with a clear face preview for node cards and host review.</p>
                </div>
                <span className="jp-step-pill">Step 1 of 2</span>
              </div>
              <div className="jp-camera">
                <div className="jp-camera-icon">📷</div>
                <div>
                  <p className="jp-camera-title">Snap a quick photo</p>
                  <p className="jp-camera-sub">This will appear on your mesh node card — helps people recognize you instantly.</p>
                </div>
                <CameraCapture onCapture={handleCapture} onSkip={handleSkipCapture} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              className="jp-card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="jp-card-head">
                <div>
                  <p className="jp-card-title">Your Profile</p>
                  <p className="jp-card-sub">This is what other attendees will see when they tap your node.</p>
                </div>
                <span className="jp-step-pill">Step 2 of 2</span>
              </div>

              <form onSubmit={handleSubmit} className="jp-form">
                {photo && photo !== 'SKIP' ? (
                  <div className="jp-photo-preview">
                    <img src={photo} alt="Selfie" className="jp-photo-img" />
                    <div className="jp-photo-info">
                      <div className="jp-photo-name">Photo captured</div>
                    </div>
                    <button type="button" className="jp-retake-btn" onClick={handleRetake}>Retake</button>
                  </div>
                ) : photo === 'SKIP' ? (
                  <div className="jp-photo-preview">
                    <div className="jp-photo-placeholder">👤</div>
                    <div className="jp-photo-info">
                      <div className="jp-photo-name">Photo skipped</div>
                    </div>
                    <button type="button" className="jp-retake-btn" onClick={handleRetake}>Add photo</button>
                  </div>
                ) : (
                  <div className="jp-photo-preview">
                    <div className="jp-photo-placeholder">👤</div>
                    <div className="jp-photo-info">
                      <div className="jp-photo-name">No photo captured</div>
                    </div>
                    <button type="button" className="jp-retake-btn" onClick={handleRetake}>Add photo</button>
                  </div>
                )}

                <div className="jp-field">
                  <label className="jp-label">Full Name *</label>
                  <input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Alice Example"
                    className="jp-input"
                  />
                </div>

                <div className="jp-field">
                  <label className="jp-label">LinkedIn URL *</label>
                  <div className="jp-input-row">
                    <input
                      required
                      type="text"
                      value={linkedIn}
                      onChange={e => setLinkedIn(e.target.value)}
                      placeholder="linkedin.com/in/alice-example"
                      className="jp-input"
                      style={{ paddingRight: linkedInValidity !== 'idle' ? 52 : 14 }}
                    />
                    <AnimatePresence>
                      {linkedInValidity !== 'idle' && (
                        <motion.span
                          className={`jp-validity ${linkedInValidity}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          {linkedInValidity === 'valid' ? 'OK' : 'FIX'}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="jp-field-row">
                  <div className="jp-field">
                    <label className="jp-label">GitHub URL</label>
                    <input
                      type="text"
                      value={github}
                      onChange={e => setGithub(e.target.value)}
                      placeholder="github.com/alice"
                      className="jp-input"
                    />
                  </div>
                  <div className="jp-field">
                    <label className="jp-label">Meeting code</label>
                    <input value={normalizedCode} className="jp-input readonly" readOnly />
                  </div>
                </div>

                <div className="jp-field">
                  <label className="jp-label">Short bio ({bio.length}/140)</label>
                  <textarea
                    maxLength={140}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="What do you do?"
                    className="jp-textarea"
                  />
                  <div className="jp-char-count">{140 - bio.length} remaining</div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="jp-error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="jp-submit-row">
                  <button type="button" className="jp-btn-ghost" onClick={() => setStep(1)}>Back</button>
                  <TooltipButton
                    text={busy ? 'Joining...' : 'Join Meeting'}
                    tooltip="Enter"
                    variant="primary"
                    type="submit"
                    disabled={busy}
                    style={{ width: '100%', '--width': '100%' } as React.CSSProperties}
                  />
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
