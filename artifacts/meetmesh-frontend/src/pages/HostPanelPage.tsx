import { useEffect, useState, useMemo, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMeetingState } from '../hooks/useMeetingState';
import { useMeshClient } from '../hooks/useMeshClient';
import { useElapsedTime } from '../hooks/useElapsedTime';
import { useToast } from '../components/ToastProvider';
import { WaitingList } from '../components/WaitingList';
import { MeetingCodeCard } from '../components/MeetingCodeCard';
import { ConnectionDot } from '../components/ConnectionDot';
import { MeshGraph } from '../components/MeshGraph';
import { NodeInfoCard } from '../components/NodeInfoCard';
import { ParticipantGrid } from '../components/ParticipantGrid';
import { HostPanelSkeleton } from '../components/SkeletonPage';
import { RockerSwitch } from '../components/RockerSwitch';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { MeetingRoom } from 'meetmesh-core';
import { v4 as uuid } from 'uuid';
import '../meetmesh-upgraded.css';

const HostTopbar = memo(function HostTopbar({
  room,
  code,
  onPresent,
  onClose,
}: {
  room: MeetingRoom;
  code: string;
  onPresent: () => void;
  onClose: () => void;
}) {
  const elapsed = useElapsedTime(room.startedAt);
  const count = Object.keys(room.participants).length;

  return (
    <div className="hp-topbar">
      <div className="hp-topbar-left">
        <div className="hp-brand">
          <div className="hp-mark">MM</div>
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

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput), 200);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (code && client.connectionStatus === 'disconnected' && state.phase === 'idle') {
      client.connect().then(() => {
        const peerId = sessionStorage.getItem('meetmesh_peer_id') || uuid();
        const lastName = sessionStorage.getItem('meetmesh_last_name') || 'Host';
        const lastJson = sessionStorage.getItem('meetmesh_last_profile_json') || '{}';
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

  const admit = (peerId: string) => client.admitParticipant(code, peerId);
  const kick = (peerId: string) => client.kickParticipant(code, peerId);
  const changeRole = (peerId: string, role: string) => client.changeRole(code, peerId, role);
  const close = () => setShowCloseConfirm(true);
  const confirmClose = () => {
    client.closeMeeting(code);
    showSuccess('Meeting ended');
    setShowCloseConfirm(false);
    navigate('/');
  };
  const selectedParticipant = selectedNodeId ? state.room.participants[selectedNodeId] : null;

  return (
    <div className="hp-root">
      <HostTopbar
        room={state.room}
        code={code}
        onPresent={() => window.open(`/present/${code}`, '_blank')}
        onClose={close}
      />

      <div className="hp-grid">
        <aside className="hp-sidebar">
          <div className="hp-code-card">
            <div className="hp-code-block">
              <span className="hp-code-label">Meeting code</span>
              <div className="hp-code-value">{code}</div>
            </div>
            <div className="hp-qr">▦</div>
          </div>

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

          <div style={{ display: 'none' }}>
            <MeetingCodeCard code={code} eventName={state.room.eventName} />
            <RockerSwitch
              checked={state.room.waitingRoomEnabled}
              onChange={() => client.toggleWaitingRoom(code, !state.room?.waitingRoomEnabled)}
            />
          </div>
        </aside>

        <main className="hp-main">
          <div className="hp-mesh-card">
            <div className="hp-mesh-head">
              <span className="hp-section-title">Live Mesh View</span>
              <span style={{ fontSize: 11, color: '#444' }}>{participants.length} nodes</span>
            </div>
            <div className="hp-mesh-stage" style={{ flex: 1, minHeight: 0 }}>
              <MeshGraph
                participants={participants}
                visitedNodes={visitedNodes}
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
    </div>
  );
}
