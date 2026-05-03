import { useEffect, useState } from 'react';
import { Participant, parseProfile } from 'meetmesh-core';
import { motion } from 'framer-motion';

const ensureUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

interface Props {
  participant: Participant;
  visited: boolean;
  position: { x: number, y: number } | null;
  onClose: () => void;
  onMarkVisited: () => void;
}

export function NodeInfoCard({ participant, visited, position, onClose, onMarkVisited }: Props) {
  const profile = parseProfile(participant.json);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const cardStyle: React.CSSProperties = isMobile ? {
    width: '100%',
    maxWidth: 'none',
    boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
    borderRadius: '20px 20px 0 0',
  } : {
    position: 'fixed',
    left: (position?.x || window.innerWidth / 2) - 110,
    top: (position?.y || window.innerHeight / 2) - 140,
    zIndex: 1001,
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    width: 220,
  };

  return (
    <motion.div
      className="nodeinfo-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={isMobile ? { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', zIndex: 2000 } : {}}
    >
      <motion.div
        className="nodeinfo-panel"
        onClick={e => e.stopPropagation()}
        style={cardStyle}
        initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.8, y: 10 }}
        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.8, y: 10 }}
        transition={{ duration: isMobile ? 0.35 : 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <button className="nodeinfo-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="nodeinfo-head">
          <div className="nodeinfo-initial" style={{ background: visited ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.06)' }}>
            {profile?.photo ? (
              <img src={profile.photo} alt={participant.displayName} className="nodeinfo-avatar" />
            ) : (
              participant.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="nodeinfo-name">{participant.displayName}</div>
            <span className={`role-badge role-badge--${participant.role.toLowerCase()}`}>{participant.role}</span>
          </div>
        </div>

        <div className="nodeinfo-bio">
          {profile?.bio || 'No description provided.'}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, color: '#fff' }}>Status:</span>
            <span style={{ color: visited ? '#10b981' : '#f59e0b' }}>
              {visited ? 'Visited' : 'New Node'}
            </span>
          </div>
        </div>

        <div className="nodeinfo-links">
          {profile?.linkedIn && (
            <a href={ensureUrl(profile.linkedIn)} target="_blank" rel="noopener noreferrer" className="nodeinfo-link">
              LinkedIn
            </a>
          )}
          {profile?.github && (
            <a href={ensureUrl(profile.github)} target="_blank" rel="noopener noreferrer" className="nodeinfo-link">
              GitHub
            </a>
          )}
        </div>

        <button
          className={`btn-${visited ? 'secondary' : 'primary'} nodeinfo-visit-btn`}
          onClick={onMarkVisited}
        >
          {visited ? 'Remove Visit' : 'Mark Visited'}
        </button>
      </motion.div>
    </motion.div>
  );
}
