import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetingState } from '../hooks/useMeetingState';
import { useMeshClient } from '../hooks/useMeshClient';
import { ConnectionDot } from '../components/ConnectionDot';
import { MeshGraph } from '../components/MeshGraph';
import { NodeInfoCard } from '../components/NodeInfoCard';
import { MeetingRoomSkeleton } from '../components/SkeletonPage';
import { ParticipantGrid } from '../components/ParticipantGrid';
import { Logo } from '../components/Logo';
import { ChatPanel } from '../components/ChatPanel';
import { ReactionBar, ReactionFloats } from '../components/ReactionLayer';
import { reactionStore } from '../mock/reactionStore';
import { useUnreadDms, useUnreadGlobal } from '../mock/chatStore';
import { parseProfile } from 'meetmesh-core';
import { exportContactsAsVCard, exportContactsAsCSV } from '../utils/contactExport';
import '../meetmesh-upgraded.css';
import '../chat.css';

export default function MeetingRoomPage() {
  const client = useMeshClient();
  const state = useMeetingState();
  const navigate = useNavigate();
  const unreadDms = useUnreadDms();
  const unreadGlobal = useUnreadGlobal();

  const [visitedNodes, setVisitedNodes] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodePos, setSelectedNodePos] = useState<{ x: number, y: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSidebar, setSidebarOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [dmPeerId, setDmPeerId] = useState<string | null>(null);
  const [activeAnnouncement, setActiveAnnouncement] = useState<{ id: string; message: string; hostName: string } | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const fitRef = useRef<(() => void) | null>(null);

  const pathCode = state.room?.meetingCode || window.location.pathname.split('/').pop() || '';
  const upperCode = pathCode.toUpperCase();

  const [isKicked, setIsKicked] = useState(() => {
    return (
      sessionStorage.getItem(`meetmesh_kicked_${upperCode}`) === 'true' ||
      localStorage.getItem(`meetmesh_kicked_${upperCode}`) === 'true'
    );
  });

  const checkMobile = useCallback(() => setIsMobile(window.innerWidth < 768), []);
  useEffect(() => {
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [checkMobile]);

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
    if (state.phase === 'ended') { navigate('/'); return; }
    if (!state.room || state.phase === 'idle') {
      if (!upperCode) return;

      const isHost = sessionStorage.getItem('meetmesh_is_host') === 'true'
        || Boolean(localStorage.getItem(`meetmesh_host_${upperCode}`));
      const hostPeerForRoom = localStorage.getItem(`meetmesh_host_${upperCode}`);
      const peerId = sessionStorage.getItem('meetmesh_peer_id')
        || (isHost ? hostPeerForRoom : null)
        || localStorage.getItem(`meetmesh_peer_${upperCode}`)
        || localStorage.getItem('meetmesh_peer_id');
      const lastName = sessionStorage.getItem('meetmesh_last_name')
        || localStorage.getItem(`meetmesh_name_${upperCode}`)
        || localStorage.getItem('meetmesh_last_name')
        || (isHost ? 'Host' : '');
      const lastJson = sessionStorage.getItem('meetmesh_last_profile_json')
        || localStorage.getItem(`meetmesh_profile_${upperCode}`)
        || localStorage.getItem('meetmesh_last_profile_json')
        || '{}';

      if (peerId && (lastName || isHost)) {
        let cancelled = false;
        sessionStorage.setItem('meetmesh_peer_id', peerId);
        if (isHost) sessionStorage.setItem('meetmesh_is_host', 'true');

        const reconnect = async () => {
          try {
            await client.connect();
            if (cancelled) return;
            await client.joinMeeting(upperCode, lastName || 'Host', peerId, lastJson);
          } catch (err) {
            console.warn('[MeetingRoomPage] Reconnect failed:', err);
            if (!cancelled) navigate(`/join/${upperCode}`);
          }
        };
        reconnect();

        const timeout = setTimeout(() => {
          if (!cancelled && !state.room) navigate(`/join/${upperCode}`);
        }, 12000);

        return () => {
          cancelled = true;
          clearTimeout(timeout);
        };
      } else {
        const timeout = setTimeout(() => {
          if (!state.room) navigate(`/join/${upperCode}`);
        }, 1200);
        return () => clearTimeout(timeout);
      }
    }
  }, [state.phase, state.room, navigate, client, isKicked, upperCode]);

  // Prevent accidental tab closure for host
  useEffect(() => {
    const isHost = state.room?.hostPeerId === state.selfPeerId;
    if (!isHost) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You are the host of this event. Leaving will pause your session.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [state.room?.hostPeerId, state.selfPeerId]);

  // Tab visibility recovery: keep connection alive and recover instantly from background tab sleep
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const code = state.room?.meetingCode;
        if (code) {
          client.heartbeat(code).catch(() => {
            // Reconnect if socket dropped during mobile sleep or background throttling
            client.connect().catch(console.error);
          });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [client, state.room?.meetingCode]);

  useEffect(() => {
    const handleReaction = (payload: { peerId: string; displayName: string; emoji: string; avatarUrl?: string }) => {
      if (payload.peerId === state.selfPeerId) return;
      reactionStore.fire({
        peerId: payload.peerId,
        displayName: payload.displayName,
        emoji: payload.emoji,
        avatarUrl: payload.avatarUrl,
      });
    };

    client.on('ReactionReceived', handleReaction);
    return () => {
      client.off('ReactionReceived', handleReaction);
    };
  }, [client, state.selfPeerId]);

  useEffect(() => {
    const handleAnnouncement = (payload: { id: string; message: string; hostName: string }) => {
      setActiveAnnouncement(payload);
    };
    client.on('AnnouncementReceived', handleAnnouncement);
    return () => {
      client.off('AnnouncementReceived', handleAnnouncement);
    };
  }, [client]);

  // Hoist useMemo above the early return — hooks must be called unconditionally.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const participantsList = useMemo(
    () =>
      state.room
        ? Object.values(state.room.participants).filter(
            p => !p.peerId.startsWith('present-') && (p.role as string) !== 'Presentation' && !p.displayName?.toLowerCase().includes('presentation')
          )
        : [],
    [state.room?.participants]
  );

  if (isKicked) {
    return (
      <div className="mr-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
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
              transition: 'background 0.2s',
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!state.room) {
    return <MeetingRoomSkeleton />;
  }

  const isHost = state.room.hostPeerId === state.selfPeerId;
  const count = participantsList.length;
  const code = state.room.meetingCode;

  const selfParticipant = state.selfPeerId ? state.room.participants[state.selfPeerId] : null;
  const selfName = selfParticipant?.displayName ?? 'You';
  const selfAvatar = selfParticipant ? parseProfile(selfParticipant.json)?.photo : undefined;

  const selectedParticipant = selectedNodeId ? state.room.participants[selectedNodeId] : null;
  const hasUnread = unreadGlobal > 0 || (state.selfPeerId ? [...unreadDms].some(key => key.split('|').includes(state.selfPeerId!)) : false);

  return (
    <div className="mr-root">
      <AnimatePresence>
        {activeAnnouncement && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: isMobile ? 'calc(62px + var(--safe-area-inset-top, 0px))' : 72,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              width: 'min(92%, 580px)',
              background: 'rgba(15, 17, 26, 0.92)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              boxShadow: '0 12px 36px rgba(0,0,0,0.85), 0 0 24px rgba(245, 158, 11, 0.25)',
              borderRadius: 14,
              padding: isMobile ? '10px 14px' : '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M22 8.5c0 2.5-2.5 4.5-5 6.5l-5 3-5-3c-2.5-2-5-4-5-6.5C2 5.5 4.5 3 8 3c1.5 0 2.9.5 4 1.5C13.1 3.5 14.5 3 16 3c3.5 0 6 2.5 6 5.5z"/>
                <path d="M12 17.5v4"/>
                <path d="M8 21.5h8"/>
              </svg>
              <div>
                <div style={{ fontSize: 10.5, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {activeAnnouncement.hostName} · Announcement
                </div>
                <div style={{ fontSize: 13.5, color: '#f8fafc', fontWeight: 500, marginTop: 2 }}>
                  {activeAnnouncement.message}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveAnnouncement(null)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
                fontSize: 14,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                lineHeight: 1,
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mr-topbar">
        <div className="mr-topbar-left">
          <Logo size={22} />
          <span className="mr-event-name">{state.room.eventName}</span>
          <div className="mr-meta">
            <div className="mr-meta-item">
              <ConnectionDot />
              <span>Connected</span>
            </div>
            <span className="mr-code-chip">{code}</span>
            <span style={{ fontSize: 11, color: '#555' }}>{count} peer{count !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="mr-topbar-actions">
          <button
            className={`mr-btn-secondary${showChat ? ' mr-btn-active' : ''}`}
            onClick={() => setShowChat(!showChat)}
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chat
            {hasUnread && !showChat && <span className="mr-chat-unread-dot" />}
          </button>
          <button
            className="mr-btn-secondary"
            onClick={() => setSidebarOpen(!showSidebar)}
          >
            {showSidebar ? 'Hide List' : 'Show List'}
          </button>
          {isHost && (
            <button
              className="mr-btn-secondary"
              onClick={() => window.open(`/manage/${code}`, '_blank')}
            >
              Dashboard
            </button>
          )}
          <button
            className="mr-btn-danger"
            onClick={() => { client.disconnect(); navigate('/'); }}
          >
            Leave
          </button>
        </div>
      </div>

      <div className="mr-content">
        <div className="mr-stage" style={{ marginRight: isMobile ? 0 : ((showSidebar ? 300 : 0) + (showChat ? 320 : 0)) }}>
          <MeshGraph
            participants={participantsList}
            visitedNodes={visitedNodes}
            hostPeerId={state.room.hostPeerId}
            searchTerm={searchTerm}
            onNodeClick={(peerId, pos) => {
              setSelectedNodeId(peerId);
              if (pos) setSelectedNodePos(pos);
            }}
          />
        </div>

        <AnimatePresence>
          {showChat && (
            <ChatPanel
              meetingCode={code}
              selfPeerId={state.selfPeerId}
              selfName={selfName}
              selfAvatar={selfAvatar}
              participants={participantsList}
              initialDmPeerId={dmPeerId}
              onClose={() => { setShowChat(false); setDmPeerId(null); }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSidebar && (
            <motion.div
              className="mr-sidebar"
              style={{ right: showChat && !isMobile ? 320 : 0 }}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mr-sidebar-head">
                <span className="mr-sidebar-title">Participants ({count})</span>
                <button className="mr-sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>
              </div>
              <div className="mr-search">
                <input
                  type="search"
                  placeholder="Search nodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mr-search-input"
                />
              </div>
              <div className="mr-participant-list">
                <ParticipantGrid
                  room={state.room}
                  selfPeerId={state.selfPeerId}
                  searchTerm={searchTerm}
                  onSelect={(peerId) => setSelectedNodeId(peerId)}
                />
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8, background: 'rgba(255,255,255,0.02)' }}>
                <button
                  type="button"
                  onClick={() => exportContactsAsVCard(participantsList, visitedNodes, { eventName: state.room?.eventName })}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    background: 'rgba(56, 189, 248, 0.08)',
                    color: '#38bdf8',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  title="Export vCard to Apple/Google Contacts"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h8"/>
                  </svg>
                  <span>vCard</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportContactsAsCSV(participantsList, visitedNodes, { eventName: state.room?.eventName })}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                  title="Download CSV spreadsheet"
                >
                  CSV
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ReactionFloats />

      {/* ── Mobile bottom nav (hidden on desktop via CSS) ─────────── */}
      <div className="mr-mobile-nav">
        <button
          className={`mr-mobile-nav-btn${showChat ? ' active' : ''}`}
          onClick={() => setShowChat(!showChat)}
          aria-label="Chat"
          style={{ position: 'relative' }}
        >
          <span className="mr-mobile-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </span>
          <span className="mr-mobile-nav-label">Chat</span>
          {hasUnread && !showChat && <span className="mr-chat-unread-dot" />}
        </button>
        <button
          className={`mr-mobile-nav-btn${showSidebar ? ' active' : ''}`}
          onClick={() => setSidebarOpen(!showSidebar)}
          aria-label="Participants"
        >
          <span className="mr-mobile-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
          <span className="mr-mobile-nav-label">People</span>
        </button>
        <button
          className="mr-mobile-nav-btn mr-mobile-nav-btn--fit"
          aria-label="Fit all nodes"
          onClick={() => fitRef.current?.()}
        >
          <span className="mr-mobile-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </span>
          <span className="mr-mobile-nav-label">Fit</span>
        </button>
        <button
          className="mr-mobile-nav-btn mr-mobile-nav-btn--danger"
          onClick={() => { client.disconnect(); navigate('/'); }}
          aria-label="Leave"
        >
          <span className="mr-mobile-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          <span className="mr-mobile-nav-label">Leave</span>
        </button>
      </div>

      <ReactionBar
        selfPeerId={state.selfPeerId}
        selfName={selfName}
        selfAvatar={selfAvatar}
        participants={participantsList}
        onFire={(emoji) => {
          if (state.room?.meetingCode) {
            client.sendReaction(state.room.meetingCode, emoji);
          }
        }}
      />

      <AnimatePresence>
        {selectedParticipant && (
          <NodeInfoCard
            participant={selectedParticipant}
            visited={visitedNodes.has(selectedParticipant.peerId)}
            position={selectedNodePos}
            onClose={() => {
              setSelectedNodeId(null);
              setSelectedNodePos(null);
            }}
            onMarkVisited={() => {
              const newSet = new Set(visitedNodes);
              if (newSet.has(selectedParticipant.peerId)) newSet.delete(selectedParticipant.peerId);
              else newSet.add(selectedParticipant.peerId);
              setVisitedNodes(newSet);
            }}
            onMessage={
              selectedParticipant.peerId !== state.selfPeerId
                ? () => {
                    setDmPeerId(selectedParticipant.peerId);
                    setShowChat(true);
                    setSelectedNodeId(null);
                    setSelectedNodePos(null);
                  }
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
