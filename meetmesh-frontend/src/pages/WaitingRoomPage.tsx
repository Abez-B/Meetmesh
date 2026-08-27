import { useEffect } from 'react';
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

  useEffect(() => {
    if (state.phase === 'active' && state.room?.meetingCode) { navigate(`/meeting/${state.room.meetingCode}`); return; }
    if (state.phase === 'idle' && client.connectionStatus === 'disconnected') {
      const pathCode = window.location.pathname.split('/')[2];
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
  }, [state.phase, state.room, client.connectionStatus, navigate, client]);

  const isHost = state.room?.hostPeerId === state.selfPeerId;
  const admit  = (peerId: string) => { if (state.room) client.admitParticipant(state.room.meetingCode, peerId); };

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
              <span>SignalR connected</span>
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
