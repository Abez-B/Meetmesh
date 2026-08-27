import { useEffect, useState, useMemo, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useMeetingState } from '../hooks/useMeetingState';
import { useMeshClient } from '../hooks/useMeshClient';
import { useElapsedTime } from '../hooks/useElapsedTime';
import { useToast } from '../components/ToastProvider';
import { WaitingList } from '../components/WaitingList';
import { ConnectionDot } from '../components/ConnectionDot';
import { MeshGraph } from '../components/MeshGraph';
import { NodeInfoCard } from '../components/NodeInfoCard';
import { ParticipantGrid } from '../components/ParticipantGrid';
import { HostPanelSkeleton } from '../components/SkeletonPage';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ChatPanel } from '../components/ChatPanel';
import type { MeetingRoom } from 'meetmesh-core';
import { parseProfile } from 'meetmesh-core';
import { Logo } from '../components/Logo';
import { v4 as uuid } from 'uuid';
import { copyToClipboard } from '../utils/clipboard';
import { useUnreadDms, useUnreadGlobal } from '../mock/chatStore';
import '../meetmesh-upgraded.css';
import '../chat.css';

const HostTopbar = memo(function HostTopbar({
  room,
  code,
  onPresent,
  onClose,
  onChat,
  chatActive,
  chatHasUnread,
}: {
  room: MeetingRoom;
  code: string;
  onPresent: () => void;
  onClose: () => void;
  onChat: () => void;
  chatActive: boolean;
  chatHasUnread: boolean;
}) {
  const elapsed = useElapsedTime(room.startedAt);
  const count = Object.keys(room.participants).length;

  return (
    <div className="hp-topbar">
      <div className="hp-topbar-left">
        <div className="hp-brand">
          <Logo size={24} />
          <span className="hp-title">
            Host Dashboard
            <span className="hp-title-sep"> · </span>
            <span className="hp-title-role">{room.eventName}</span>
          </span>
        </div>
        <div className="hp-meta">
          <div className="hp-meta-item">
            <ConnectionDot />
            <span>Live</span>
          </div>
          <span className="hp-elapsed">{elapsed}</span>
          <span style={{ fontSize: 11, color: '#555' }}>{count} participant{count !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="hp-topbar-actions">
        <button
          className={`hp-btn-secondary hp-chat-btn${chatActive ? ' hp-btn-active' : ''}`}
          onClick={onChat}
          style={{ position: 'relative' }}
        >
          💬 Chat
          {chatHasUnread && <span className="hp-chat-unread-dot" />}
        </button>
        <button className="hp-btn-secondary" onClick={() => window.open(`/meeting/${code}`, '_blank')}>Stage View</button>
        <button className="hp-btn-secondary" onClick={onPresent}>Present</button>
        <button className="hp-btn-danger" onClick={onClose}>End Event</button>
      </div>
    </div>
  );
});

export default function HostPanelPage() {
  const { code } = useParams<{ code?: string }>();
  const client = useMeshClient();
  const state = useMeetingState();
  const navigate = useNavigate();
  const { success: showSuccess } = useToast();
  const [visitedNodes, setVisitedNodes] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodePos, setSelectedNodePos] = useState<{ x: number, y: number } | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatDmPeerId, setChatDmPeerId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const unreadDms = useUnreadDms();
  const unreadGlobal = useUnreadGlobal();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput), 200);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (code && client.connectionStatus === 'disconnected' && state.phase === 'idle') {
      client.connect().then(() => {
        const hostPeerForRoom = localStorage.getItem(`meetmesh_host_${code}`);
        const peerId = sessionStorage.getItem('meetmesh_peer_id')
          || hostPeerForRoom
          || localStorage.getItem('meetmesh_peer_id')
          || uuid();
        const lastName = sessionStorage.getItem('meetmesh_last_name')
          || localStorage.getItem('meetmesh_last_name')
          || 'Host';
        const lastJson = sessionStorage.getItem('meetmesh_last_profile_json')
          || localStorage.getItem('meetmesh_last_profile_json')
          || '{}';

        sessionStorage.setItem('meetmesh_peer_id', peerId);
        sessionStorage.setItem('meetmesh_is_host', 'true');
        sessionStorage.setItem('meetmesh_last_name', lastName);
        sessionStorage.setItem('meetmesh_last_profile_json', lastJson);

        client.joinMeeting(code, lastName, peerId, lastJson).catch(console.error);
      }).catch(console.error);
    }
  }, [code, client, state.phase]);

  useEffect(() => {
    if (state.room && state.room.hostPeerId !== state.selfPeerId && state.selfPeerId) {
      navigate(`/meeting/${code}`);
    }
  }, [state.room, state.selfPeerId, navigate, code]);

  const participants = useMemo(
    () => Object.values(state.room?.participants ?? {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.room?.participants]
  );

  if (!state.room || !code) {
    return <HostPanelSkeleton />;
  }

  const admit      = (peerId: string) => client.admitParticipant(code, peerId);
  const kick       = (peerId: string) => client.kickParticipant(code, peerId);
  const changeRole = (peerId: string, role: string) => client.changeRole(code, peerId, role);
  const close      = () => setShowCloseConfirm(true);
  const confirmClose = async () => {
    try {
      await client.closeMeeting(code);
      showSuccess('Meeting ended');
    } catch (err) {
      console.error('Failed to end meeting:', err);
    } finally {
      setShowCloseConfirm(false);
      navigate('/');
    }
  };

  const selectedParticipant = selectedNodeId ? state.room.participants[selectedNodeId] : null;
  const joinUrl = `${window.location.origin}/join/${code}`;

  const selfParticipant = state.selfPeerId ? state.room.participants[state.selfPeerId] : null;
  const selfName   = selfParticipant?.displayName ?? 'Host';
  const selfAvatar = selfParticipant ? parseProfile(selfParticipant.json)?.photo : undefined;

  const hasUnreadDms = state.selfPeerId
    ? [...unreadDms].some(key => key.split('|').includes(state.selfPeerId!))
    : false;
  const hasUnread = unreadGlobal > 0 || hasUnreadDms;

  const roleCounts = useMemo(() =>
    participants.reduce<Record<string, number>>((acc, p) => {
      acc[p.role] = (acc[p.role] || 0) + 1;
      return acc;
    }, {}),
    [participants]
  );

  const ROLE_COLORS: Record<string, string> = {
    Host: '#FFD700', Organizer: '#A78BFA', Speaker: '#60A5FA', Attendee: '#2DD4BF',
  };

  return (
    <div className="hp-root">
      <HostTopbar
        room={state.room}
        code={code}
        onPresent={() => window.open(`/present/${code}`, '_blank')}
        onClose={close}
        onChat={() => { setShowChat(v => !v); if (showChat) setChatDmPeerId(null); }}
        chatActive={showChat}
        chatHasUnread={hasUnread}
      />

      <div className="hp-grid" style={{ marginRight: (showChat && !isMobile) ? 320 : 0 }}>
        <aside className="hp-sidebar">
          <div className="hp-code-card">
            <div className="hp-code-block">
              <span className="hp-code-label">Meeting code</span>
              <div className="hp-code-value">{code}</div>
              <button
                className="hp-copy-link-btn"
                onClick={() => { copyToClipboard(joinUrl); showSuccess('Join link copied'); }}
                title="Copy join link"
              >
                Copy link
              </button>
            </div>
            <div
              className="hp-qr"
              style={{ background: '#fff', borderRadius: 6, padding: 5, cursor: 'pointer', border: 'none' }}
              onClick={() => window.open(joinUrl, '_blank')}
              title="Open join page"
            >
              <QRCodeSVG value={joinUrl} size={46} bgColor="#ffffff" fgColor="#000000" level="M" />
            </div>
          </div>

          <button
            type="button"
            className="hp-broadcast-btn"
            onClick={() => setShowBroadcastModal(true)}
            style={{
              width: '100%',
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#f59e0b',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span>📢</span>
            <span>Broadcast Announcement</span>
          </button>

          <div className="hp-section">
            <div className="hp-section-head">
              <span className="hp-section-title">Waiting room ({state.waitingRoom.length})</span>
              <label className="hp-toggle">
                <input
                  type="checkbox"
                  checked={state.room.waitingRoomEnabled}
                  onChange={() => client.toggleWaitingRoom(code, !state.room?.waitingRoomEnabled)}
                />
                <div className="hp-toggle-track">
                  <div className="hp-toggle-thumb" />
                </div>
              </label>
            </div>
            <WaitingList waitingPeers={state.waitingRoom} onAdmit={admit} />
            {state.waitingRoom.length === 0 && (
              <div className="hp-empty">Lobby is empty.</div>
            )}
          </div>

          <div className="hp-section">
            <div className="hp-section-head">
              <span className="hp-section-title">Participants ({participants.length})</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <input
                type="search"
                placeholder="Search..."
                className="hp-search-input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <ParticipantGrid
              room={state.room}
              selfPeerId={state.selfPeerId}
              searchTerm={searchTerm}
              onKick={kick}
              onRole={changeRole}
              onSelect={(peerId: string) => {
                setSelectedNodeId(peerId);
                setSelectedNodePos(null);
              }}
            />
          </div>
        </aside>

        <main className="hp-main">
          <div className="hp-mesh-card">
            <div className="hp-mesh-head">
              <span className="hp-section-title">Live Mesh View</span>
              <div className="hp-role-stats">
                {(['Host', 'Organizer', 'Speaker', 'Attendee'] as const)
                  .filter(r => roleCounts[r] > 0)
                  .map(role => (
                    <span key={role} className="hp-role-stat" style={{ color: ROLE_COLORS[role] }}>
                      {roleCounts[role]}&thinsp;{role}{roleCounts[role] > 1 && role !== 'Host' ? 's' : ''}
                    </span>
                  ))}
              </div>
            </div>
            <div className="hp-mesh-stage" style={{ flex: 1, minHeight: 0 }}>
              <MeshGraph
                participants={participants}
                visitedNodes={visitedNodes}
                hostPeerId={state.room.hostPeerId}
                searchTerm={searchTerm}
                onNodeClick={(peerId, pos) => {
                  setSelectedNodeId(peerId);
                  if (pos) setSelectedNodePos(pos);
                }}
              />
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showChat && (
          <ChatPanel
            meetingCode={code}
            selfPeerId={state.selfPeerId}
            selfName={selfName}
            selfAvatar={selfAvatar}
            participants={participants}
            initialDmPeerId={chatDmPeerId}
            onClose={() => { setShowChat(false); setChatDmPeerId(null); }}
          />
        )}
      </AnimatePresence>

      {selectedParticipant && (
        <NodeInfoCard
          participant={selectedParticipant}
          visited={visitedNodes.has(selectedParticipant.peerId)}
          position={selectedNodePos}
          onClose={() => { setSelectedNodeId(null); setSelectedNodePos(null); }}
          onMarkVisited={() => {
            const newSet = new Set(visitedNodes);
            if (newSet.has(selectedParticipant.peerId)) newSet.delete(selectedParticipant.peerId);
            else newSet.add(selectedParticipant.peerId);
            setVisitedNodes(newSet);
          }}
          onMessage={
            selectedParticipant.peerId !== state.selfPeerId
              ? () => {
                  setChatDmPeerId(selectedParticipant.peerId);
                  setShowChat(true);
                  setSelectedNodeId(null);
                  setSelectedNodePos(null);
                }
              : undefined
          }
        />
      )}

      <ConfirmDialog
        isOpen={showCloseConfirm}
        title="End Meeting"
        message="Are you sure you want to end this meeting? All participants will be disconnected immediately."
        confirmText="End Meeting"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmClose}
        onCancel={() => setShowCloseConfirm(false)}
      />

      {showBroadcastModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowBroadcastModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#12131a',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 14,
              padding: isMobile ? '20px 16px' : 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>📢</span>
              <h3 style={{ margin: 0, fontSize: 18, color: '#f8fafc', fontFamily: 'monospace' }}>
                Broadcast Announcement
              </h3>
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
              This alert will instantly pop up on every attendee's phone/screen with a notification chime.
            </p>
            <textarea
              autoFocus
              value={broadcastText}
              onChange={e => setBroadcastText(e.target.value)}
              placeholder="e.g. 🍕 Pizza is served! or ⚡ Lightning talks starting in 5 mins on Stage A."
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '14px',
                resize: 'none',
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!broadcastText.trim() || broadcasting}
                onClick={async () => {
                  if (!broadcastText.trim() || !code) return;
                  setBroadcasting(true);
                  try {
                    await client.sendAnnouncement(code, broadcastText.trim(), selfName);
                    showSuccess('Announcement broadcasted!');
                    setBroadcastText('');
                    setShowBroadcastModal(false);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setBroadcasting(false);
                  }
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#f59e0b',
                  color: '#000',
                  fontWeight: 600,
                  cursor: broadcastText.trim() ? 'pointer' : 'not-allowed',
                  opacity: broadcastText.trim() ? 1 : 0.5,
                }}
              >
                {broadcasting ? 'Sending...' : '📢 Send to All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
