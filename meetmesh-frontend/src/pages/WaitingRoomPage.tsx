import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetingState } from '../hooks/useMeetingState';
import { useMeshClient }   from '../hooks/useMeshClient';
import { WaitingList }      from '../components/WaitingList';
import { MeetingCodeCard }  from '../components/MeetingCodeCard';
import { ConnectionDot }    from '../components/ConnectionDot';
import { FloatingNavbar }   from '../components/FloatingNavbar';
import { MeshBackground }   from '../components/MeshBackground';
import '../meetmesh-upgraded.css';

export default function WaitingRoomPage() {
  const client   = useMeshClient();
  const state    = useMeetingState();
  const navigate = useNavigate();

  const pathCode = window.location.pathname.split('/')[2] || state.room?.meetingCode || '';
  const upperCode = pathCode.toUpperCase();

  const [isKicked, setIsKicked] = useState(() => {
    return (
      sessionStorage.getItem(`meetmesh_kicked_${upperCode}`) === 'true' ||
      localStorage.getItem(`meetmesh_kicked_${upperCode}`) === 'true'
    );
  });

  useEffect(() => {
    const onKicked = () => {
      localStorage.setItem(`meetmesh_kicked_${upperCode}`, 'true');
      sessionStorage.setItem(`meetmesh_kicked_${upperCode}`, 'true');
      setIsKicked(true);
      client.disconnect();
    };

    const onError = (payload: { code: string; detail: string }) => {
      if (payload.code === 'KICKED' || payload.code === 'REMOVED' || payload.detail?.toLowerCase().includes('removed')) {
        onKicked();
      }
    };

    client.on('Kicked', onKicked);
    client.on('Error', onError);
    return () => {
      client.off('Kicked', onKicked);
      client.off('Error', onError);
    };
  }, [client, upperCode]);

  useEffect(() => {
    if (isKicked) return;
    if (state.phase === 'active' && state.room?.meetingCode) { navigate(`/meeting/${state.room.meetingCode}`); return; }
    if (state.phase === 'idle' && client.connectionStatus === 'disconnected') {
      const peerId   = sessionStorage.getItem('meetmesh_peer_id');
      const lastName = sessionStorage.getItem('meetmesh_last_name');
      const lastJson = sessionStorage.getItem('meetmesh_last_profile_json') || '{}';
      const isHost   = sessionStorage.getItem('meetmesh_is_host') === 'true';
      if (pathCode && peerId && (lastName || isHost)) {
        client.connect().then(() => client.joinMeeting(pathCode, lastName || 'Host', peerId, lastJson).catch(console.error)).catch(console.error);
      } else {
        navigate(`/join/${pathCode}`);
      }
    }
  }, [state.phase, state.room, client.connectionStatus, navigate, client, isKicked, pathCode]);

  const isHost = state.room?.hostPeerId === state.selfPeerId;
  const admit  = (peerId: string) => { if (state.room) client.admitParticipant(state.room.meetingCode, peerId); };

  if (isKicked) {
    return (
      <div className="wr-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div style={{
          maxWidth: 440,
          width: '100%',
          background: 'rgba(18, 19, 26, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 20,
          padding: '44px 28px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
        }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#ef4444',
            fontSize: 26,
          }}>
            🚫
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            You have been removed
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 28px' }}>
            You have been removed from this room by the host.
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(`meetmesh_kicked_${upperCode}`);
              sessionStorage.removeItem(`meetmesh_kicked_${upperCode}`);
              navigate('/');
            }}
            style={{
              padding: '11px 26px',
              borderRadius: 8,
              background: '#f8fafc',
              color: '#0f172a',
              fontWeight: 600,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="wr-root">
        <FloatingNavbar variant="waiting" meetingCode={state.room?.meetingCode || window.location.pathname.split('/')[2]} />

        <div className="wr-lobby">
          <MeshBackground />
          <motion.div
            className="wr-lobby-card"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
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
              <ConnectionDot />
              <span className="wr-lobby-sep">·</span>
              <span>Connected to host</span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="wr-root">
      <FloatingNavbar variant="waiting" meetingCode={state.room?.meetingCode || window.location.pathname.split('/')[2]} />

      <motion.div
        className="wr-host"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="wr-host-head">
          <h2 className="wr-host-title">{state.room?.eventName ?? 'Waiting Room'}</h2>
          <div className="wr-nav-dot-wrap">
            <div className="wr-pulse" />
            <span style={{ fontSize: 11 }}>Live</span>
          </div>
        </div>

        {state.room && (
          <div className="wr-code-card">
            <div className="wr-code-block">
              <span className="wr-code-label">Meeting code</span>
              <div className="wr-code-value">{state.room.meetingCode}</div>
              <div className="wr-share-link">meetmesh.app/join/{state.room.meetingCode}</div>
            </div>
            <div className="wr-qr-placeholder">▦</div>
          </div>
        )}

        <div className="wr-waiting-card">
          <div className="wr-waiting-head">
            <span className="wr-waiting-title">Waiting Room</span>
            <span className="wr-waiting-count">{state.waitingRoom.length} pending</span>
          </div>

          <WaitingList waitingPeers={state.waitingRoom} onAdmit={admit} />

          <AnimatePresence>
            {state.waitingRoom.length === 0 && (
              <motion.div
                className="wr-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                No one is waiting yet. Share the code above to invite attendees.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {state.room && (
          <div style={{ marginTop: 16, display: 'none' }}>
            <MeetingCodeCard code={state.room.meetingCode} eventName={state.room.eventName} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
