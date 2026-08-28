import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeshClient } from '../hooks/useMeshClient';
import { normalizeMeetingCode, isValidMeetingCode } from 'meetmesh-core';
import { ConnectionDot } from '../components/ConnectionDot';
import { TooltipButton } from '../components/TooltipButton';
import { CameraCapture } from '../components/CameraCapture';
import { commitPendingEventMeta, savePendingEventMeta } from '../utils/hostEventMeta';
import { v4 as uuid } from 'uuid';
import { FloatingNavbar } from '../components/FloatingNavbar';
import { SpringMeshPreview } from '../components/SpringMeshPreview';
import './MeshVisual.css';
import '../meetmesh-upgraded.css';

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: 'easeOut' as const } };
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?/i;


export default function LandingPage() {
  const client = useMeshClient();
  const navigate = useNavigate();
  const { code } = useParams<{ code?: string }>();

  const [tab, setTab] = useState<'create' | 'join'>(() => {
    if (code) return 'join';
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'join' : 'create';
  });
  const [eventName, setEventName] = useState('');
  const [hostName, setHostName] = useState('');
  const [hostLinkedIn, setHostLinkedIn] = useState('');
  const [hostGithub, setHostGithub] = useState('');
  const [eventSubtitle, setEventSubtitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [hostBio, setHostBio] = useState('');
  const [hostPhoto, setHostPhoto] = useState<string | undefined>();
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const cached = localStorage.getItem('meetmesh_host_setup_cache');
      if (!cached) return;
      const parsed = JSON.parse(cached);
      if (parsed.hostName) setHostName(parsed.hostName);
      if (parsed.hostLinkedIn) setHostLinkedIn(parsed.hostLinkedIn);
      if (parsed.hostGithub) setHostGithub(parsed.hostGithub);
      if (parsed.hostBio) setHostBio(parsed.hostBio);
      if (parsed.eventSubtitle) setEventSubtitle(parsed.eventSubtitle);
      if (parsed.eventDescription) setEventDescription(parsed.eventDescription);
    } catch { }
  }, []);

  useEffect(() => {
    client.connect().catch((err) => {
      console.error('[LandingPage] Connection failed:', err);
      setError(`Relay connection failed: ${err?.message || 'Is the API running at localhost:5000?'}\nCheck console for CORS errors.`);
    });

    const onCreated = (payload: { meetingCode: string }) => {
      commitPendingEventMeta(payload.meetingCode);
      const hId = sessionStorage.getItem('meetmesh_peer_id') || localStorage.getItem('meetmesh_peer_id');
      if (hId) localStorage.setItem(`meetmesh_host_${payload.meetingCode}`, hId);
      navigate(`/manage/${payload.meetingCode}`);
    };
    const onError = ({ detail }: { detail: string }) => { setError(detail); setBusy(false); };

    client.on('MeetingCreated', onCreated);
    client.on('Error', onError);
    return () => { client.off('MeetingCreated', onCreated); client.off('Error', onError); };
  }, [client, navigate]);

  const handleCreate = async () => {
    if (!eventName.trim()) { setError('Enter an event name'); return; }
    if (!hostName.trim()) { setError('Enter your name'); return; }
    if (hostLinkedIn.trim() && !hostLinkedIn.trim().match(LINKEDIN_REGEX)) { setError('Use a valid LinkedIn URL for the host profile'); return; }

    setBusy(true);
    setError('');

    const peerId = sessionStorage.getItem('meetmesh_peer_id') ?? localStorage.getItem('meetmesh_peer_id') ?? uuid();
    const photoToSave = hostPhoto === 'SKIP' ? undefined : hostPhoto;
    const profileJson = JSON.stringify({
      name: hostName.trim() || undefined,
      linkedIn: hostLinkedIn.trim() || undefined,
      github: hostGithub.trim() || undefined,
      bio: hostBio.trim() || undefined,
      photo: photoToSave,
    });

    localStorage.setItem('meetmesh_host_setup_cache', JSON.stringify({
      hostName: hostName.trim(),
      hostLinkedIn: hostLinkedIn.trim(),
      hostGithub: hostGithub.trim(),
      hostBio: hostBio.trim(),
      eventSubtitle: eventSubtitle.trim(),
      eventDescription: eventDescription.trim(),
      hostPhoto: photoToSave,
    }));

    savePendingEventMeta({ subtitle: eventSubtitle.trim() || undefined, description: eventDescription.trim() || undefined });

    sessionStorage.setItem('meetmesh_peer_id', peerId);
    localStorage.setItem('meetmesh_peer_id', peerId);
    sessionStorage.setItem('meetmesh_is_host', 'true');
    sessionStorage.setItem('meetmesh_last_name', hostName.trim());
    localStorage.setItem('meetmesh_last_name', hostName.trim());
    sessionStorage.setItem('meetmesh_last_profile_json', profileJson);
    localStorage.setItem('meetmesh_last_profile_json', profileJson);

    try {
      await client.createMeeting(eventName.trim(), peerId, profileJson, eventSubtitle.trim(), eventDescription.trim());
    } catch {
      setError('Failed to create meeting — is the server running?');
      setBusy(false);
    }
  };

  const handleJoin = () => {
    const normalized = normalizeMeetingCode(joinCode);
    if (!isValidMeetingCode(normalized)) { setError('Invalid meeting code (4 characters, letters and digits)'); return; }
    navigate(`/join/${normalized}`);
  };

  return (
    <div className="mm-root">
      <FloatingNavbar
        variant="landing"
        onJoinClick={() => {
          setTab('join');
          setTimeout(() => {
            const el = document.getElementById('join-input-code');
            el?.focus();
            el?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }}
      />

        <div className="mm-page">
          <div className="mm-hero">

            <motion.section className="mm-copy" {...fade}>
              <div className="mm-eyebrow">
                <div className="mm-eyebrow-dot" />
                Live event directory
              </div>

              <h1 className="mm-title">
                Connect with everyone <em>in the room.</em>
              </h1>

              <p className="mm-subtitle">
                we-inai gives your event an interactive participant directory. Attendees enter a 4-letter code or scan a QR to view profiles, roles, and contacts in real time.
              </p>

              <div className="mm-meta-row">
                <ConnectionDot />
                <span className="mm-status-pill">Live directory active</span>
              </div>

              <div className="mm-proof-grid mm-desktop-proof">
                {([
                  ['No app', 'Works in any browser'],
                  ['~2 seconds', 'Code or QR entry'],
                  ['Real time', 'Profiles, roles & chat'],
                ] as const).map(([val, lbl]) => (
                  <div className="mm-proof-card" key={val}>
                    <span className="mm-proof-val">{val}</span>
                    <span className="mm-proof-lbl">{lbl}</span>
                  </div>
                ))}
              </div>

              <p className="mm-hint mm-desktop-proof">
                Built for meetups, founder dinners, conferences, and demo days.
              </p>
            </motion.section>

            <div className="mm-visual" id="mesh-preview-section">
              <div className="mm-visual-card">
                <div className="mm-visual-header">
                  <span>Interactive attendee radar</span>
                  <span className="mm-visual-badge">
                    <span className="mm-visual-live-dot" />
                    Interactive
                  </span>
                </div>

                <div className="mm-solar" style={{ position: 'relative' }}>
                  <SpringMeshPreview />
                </div>

                <div className="mm-legend">
                  <span className="mm-legend-item">
                    <i className="mm-legend-dot" style={{ background: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.4)' }} />
                    Host
                  </span>
                  <span className="mm-legend-item">
                    <i className="mm-legend-dot" style={{ background: '#3b82f6' }} />
                    Speaker
                  </span>
                  <span className="mm-legend-item">
                    <i className="mm-legend-dot" style={{ background: '#8b5cf6' }} />
                    Organizer
                  </span>
                  <span className="mm-legend-item">
                    <i className="mm-legend-dot" style={{ background: '#10b981' }} />
                    Attendee
                  </span>
                </div>
              </div>
            </div>

            <div className="mm-panel" id="landing-panel-section">
              <div className="mm-panel-card">
                <div className="mm-panel-top">
                  <div>
                    <p className="mm-panel-title">Enter or Host a Room</p>
                    <p className="mm-panel-desc">Join an active event or create a new room for attendees.</p>
                  </div>
                  <span className="mm-instant-badge">No app needed</span>
                </div>

                <div className="mm-tabs">
                  {(['join', 'create'] as const).map(t => (
                    <button
                      key={t}
                      className={`mm-tab${tab === t ? ' active' : ''}`}
                      onClick={() => setTab(t)}
                    >
                      {t === 'join' ? 'Join Room' : 'Host Room'}
                    </button>
                  ))}
                </div>

                <div className="mm-tab-body">
                  <AnimatePresence mode="wait">
                    {tab === 'create' ? (
                      <motion.div
                        key="create"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="mm-field">
                          <label className="mm-label">Event name</label>
                          <input
                            className="mm-input-upgraded"
                            placeholder="e.g. Y Combinator Demo Day"
                            value={eventName}
                            onChange={e => { setEventName(e.target.value); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                          />
                        </div>

                        <div className="mm-field">
                          <label className="mm-label">Your name</label>
                          <input
                            className="mm-input-upgraded"
                            placeholder="e.g. Alice"
                            value={hostName}
                            onChange={e => { setHostName(e.target.value); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                          />
                        </div>

                        <div className="mm-field">
                          <label className="mm-label">Host photo (optional)</label>
                          {hostPhoto && hostPhoto !== 'SKIP' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
                                <img src={hostPhoto} alt="Host" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <TooltipButton text="Retake" onClick={() => setHostPhoto(undefined)} variant="default" />
                            </div>
                          ) : hostPhoto === 'SKIP' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ 
                                width: 56, height: 56, borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', background: 'rgba(255,255,255,0.03)'
                              }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                                  <circle cx="12" cy="7" r="4"/>
                                </svg>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Photo skipped.</div>
                                <TooltipButton text="Add Photo" onClick={() => setHostPhoto(undefined)} variant="default" />
                              </div>
                            </div>
                          ) : (
                            <CameraCapture onCapture={setHostPhoto} onSkip={() => setHostPhoto('SKIP')} />
                          )}
                        </div>

                        <div className="mm-field">
                          <label className="mm-label">Host LinkedIn</label>
                          <input
                            className="mm-input-upgraded"
                            placeholder="linkedin.com/in/alice-example"
                            value={hostLinkedIn}
                            onChange={e => { setHostLinkedIn(e.target.value); setError(''); }}
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

                        <TooltipButton
                          id="create-meeting-btn"
                          text={busy ? 'Creating...' : 'Launch Session'}
                          tooltip="Start Event"
                          variant="primary"
                          onClick={handleCreate}
                          disabled={!eventName || !hostName || busy}
                          style={{ width: '100%', marginTop: 18, minHeight: 44 } as React.CSSProperties}
                        />

                        <p className="mm-form-note">
                          Host identity is created with the room. Event subtitle and note are stored locally for the host dashboard and presentation view.
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="join"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="mm-field">
                          <label className="mm-label">Meeting code</label>
                          <input
                            id="join-input-code"
                            className="mm-input-upgraded mm-input-code"
                            placeholder="A3B7"
                            value={joinCode}
                            onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
                            maxLength={4}
                            inputMode="text"
                            autoCapitalize="characters"
                            autoCorrect="off"
                            spellCheck={false}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                          />
                        </div>

                        <TooltipButton
                          text={busy ? 'Joining...' : 'Enter Room'}
                          tooltip="Connect"
                          variant="primary"
                          onClick={handleJoin}
                          disabled={!joinCode || joinCode.length < 4 || busy}
                          style={{ width: '100%', marginTop: 18, minHeight: 44 } as React.CSSProperties}
                        />

                        <p className="mm-form-note">
                          Join flow captures your profile details and drops you straight into the mesh.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && (
                    <motion.div
                      className="mm-error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      {error}
                    </motion.div>
                  )}
                </div>

                <div className="mm-bottom-strip">
                  <span className="mm-strip-tag">Instant QR Code</span>
                  <span className="mm-strip-tag">vCard (.vcf) Export</span>
                  <span className="mm-strip-tag">Real-Time Chat</span>
                </div>
              </div>

              <div className="mm-mobile-stats">
                {([
                  ['Zero', 'App installs'],
                  ['< 3s', 'Instant entry'],
                  ['Live', 'Profiles & chat'],
                ] as const).map(([val, lbl]) => (
                  <div className="mm-proof-card" key={val}>
                    <span className="mm-proof-val">{val}</span>
                    <span className="mm-proof-lbl">{lbl}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
  );
}
