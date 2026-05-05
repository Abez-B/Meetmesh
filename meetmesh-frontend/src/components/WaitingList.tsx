import { motion, AnimatePresence } from 'framer-motion';
import type { WaitingPeer } from 'meetmesh-core';
import { TooltipButton } from './TooltipButton';

interface Props {
  waitingPeers: WaitingPeer[];
  onAdmit:  (peerId: string) => void;
  onReject?: (peerId: string) => void;
}

function formatJoined(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function WaitingList({ waitingPeers, onAdmit, onReject }: Props) {
  if (waitingPeers.length === 0) return null;

  return (
    <div className="waiting-list-card">
      <div className="waiting-list-head">
        Waiting for admission ({waitingPeers.length})
      </div>
      <div className="waiting-list-grid">
        <AnimatePresence>
          {waitingPeers.map(p => (
            <motion.div
              key={p.peerId}
              className="waiting-list-row"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="waiting-avatar">{p.displayName.charAt(0).toUpperCase()}</div>
              <div>
                <div className="waiting-name">{p.displayName}</div>
                <div className="waiting-time">{formatJoined(p.joinedAt)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <TooltipButton
                  text="Admit"
                  tooltip="Allow entry"
                  variant="success"
                  onClick={() => onAdmit(p.peerId)}
                  style={{ '--width': '80px', '--height': '32px' } as React.CSSProperties}
                />
                {onReject && (
                  <TooltipButton
                    text="Reject"
                    tooltip="Deny entry"
                    variant="danger"
                    onClick={() => onReject(p.peerId)}
                    style={{ '--width': '80px', '--height': '32px' } as React.CSSProperties}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
