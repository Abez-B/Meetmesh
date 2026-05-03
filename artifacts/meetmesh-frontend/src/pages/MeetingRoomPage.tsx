import { useEffect, useState, useMemo } from 'react';
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
import '../meetmesh-upgraded.css';
import '../chat.css';

export default function MeetingRoomPage() {
  const client = useMeshClient();
  const state = useMeetingState();
  const navigate = useNavigate();

  const [visitedNodes, setVisitedNodes] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodePos, setSelectedNodePos] = useState<{ x: number, y: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSidebar, setSidebarOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [dmPeerId, setDmPeerId] = useState<string | null>(null);

  useEffect(() => {
    if (state.phase === 'ended') { navigate('/'); return; }
    if (state.phase === 'idle' && client.connectionStatus === 'disconnected') {
      const pathCode = state.room?.meetingCode || window.location.pathname.split('/').pop();
      const peerId = sessionStorage.getItem('meetmesh_peer_id');
      const lastName = sessionStorage.getItem('meetmesh_last_name');
      const lastJson = sessionStorage.getItem('meetmesh_last_profile_json') || '{}';
      const isHost = sessionStorage.getItem('meetmesh_is_host') === 'true';
      if (pathCode && peerId && (lastName || isHost)) {
        client.connect().then(() => client.joinMeeting(pathCode, lastName || 'Host', peerId, lastJson).catch(console.error)).catch(console.error);
      } else {
        navigate(`/join/${pathCode}`);
      }
    }
  }, [state.phase, client.connectionStatus, navigate, state.room?.meetingCode, client]);

  if (!state.room) {
    return <MeetingRoomSkeleton />;
  }

  const isHost = state.room.hostPeerId === state.selfPeerId;
  const count = Object.keys(state.room.participants).length;
  const code = state.room.meetingCode;

  const selfParticipant = state.selfPeerId ? state.room.participants[state.selfPeerId] : null;
  const selfName = selfParticipant?.displayName ?? 'You';
  let selfAvatar: string | undefined;
  try {
    const p = JSON.parse(selfParticipant?.json ?? '{}');
    selfAvatar = p.photo as string | undefined;
  } catch { }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const participantsList = useMemo(
    () => Object.values(state.room!.participants),
    [state.room?.participants]
  );

  const selectedParticipant = selectedNodeId ? state.room.participants[selectedNodeId] : null;

  return (
    <div className="mr-root">
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
          >
            💬 Chat
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
        <div className="mr-stage" style={{ marginRight: (showSidebar ? 300 : 0) + (showChat ? 320 : 0) }}>
          <MeshGraph
            participants={participantsList}
            visitedNodes={visitedNodes}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
