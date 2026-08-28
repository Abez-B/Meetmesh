import { motion } from 'framer-motion';
import type { MeetingRoom } from 'meetmesh-core';
import { RoleBadge }        from './RoleBadge';
import { TooltipButton }    from './TooltipButton';

interface Props {
  room:       MeetingRoom;
  selfPeerId: string | null;
  onKick?:    (peerId: string) => void;
  onRole?:    (peerId: string, role: string) => void;
  onSelect?:  (peerId: string) => void;
  searchTerm?: string;
}

export function ParticipantGrid({ room, selfPeerId, onKick, onRole, onSelect, searchTerm }: Props) {
  const self   = selfPeerId ? room.participants[selfPeerId] : null;
  const isHost = self?.role === 'Host' || (Boolean(selfPeerId) && room.hostPeerId === selfPeerId);

  const peers  = Object.values(room.participants)
    .filter(p => !p.peerId.startsWith('present-') && (p.role as string) !== 'Presentation' && !p.displayName.toLowerCase().includes('presentation'))
    .filter(p => !searchTerm || p.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));

  return (
    <div className="participant-grid">
      {peers.map((p, i) => (
        <motion.div
          key={p.peerId}
          className="participant-grid-card"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.04 }}
          onClick={() => onSelect?.(p.peerId)}
          style={{ cursor: onSelect ? 'pointer' : 'default' }}
        >
          <div className="participant-grid-head">
            <span className="participant-grid-name">
              {p.displayName}
              {p.peerId === selfPeerId && <span className="you"> (you)</span>}
            </span>
            <RoleBadge role={p.role} />
          </div>

          {isHost && p.peerId !== selfPeerId && (onKick || onRole) && (
            <div className="participant-grid-actions" onClick={e => e.stopPropagation()}>
              <TooltipButton
                text="Kick"
                tooltip="Remove user"
                variant="danger"
                id={`kick-${p.peerId}`}
                onClick={(e?: any) => {
                  e?.stopPropagation?.();
                  onKick?.(p.peerId);
                }}
                style={{ '--width': '70px', '--height': '32px' } as any}
              />
              <select
                id={`role-${p.peerId}`}
                value={p.role}
                onClick={e => e.stopPropagation()}
                onChange={e => {
                  e.stopPropagation();
                  onRole?.(p.peerId, e.target.value);
                }}
                className="mm-select"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {['Organizer', 'Speaker', 'Attendee'].map(r => (
                  <option key={r} value={r} style={{ background: '#18181b', color: '#f8fafc' }}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
