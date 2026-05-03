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
  const isHost = self?.role === 'Host';

  const peers  = Object.values(room.participants)
    .filter(p => !p.peerId.startsWith('present-'))
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
            <div className="participant-grid-actions">
              <TooltipButton
                text="Kick"
                tooltip="Remove user"
                variant="danger"
                id={`kick-${p.peerId}`}
                onClick={() => onKick?.(p.peerId)}
                style={{ '--width': '70px', '--height': '32px' } as any}
              />
              <select
                id={`role-${p.peerId}`}
                value={p.role}
                onChange={e => onRole?.(p.peerId, e.target.value)}
                className="mm-select"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#d4d4d4', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}
              >
                {['Organizer', 'Speaker', 'Attendee'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
