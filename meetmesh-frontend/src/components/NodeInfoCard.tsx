import { useEffect, useState, useRef, useCallback } from 'react';
import { Participant, parseProfile } from 'meetmesh-core';
import { motion } from 'framer-motion';

const ensureUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

const ROLE_COLORS: Record<string, string> = {
  host:       'rgba(255,215,0,0.12)',
  speaker:    'rgba(59,130,246,0.12)',
  organizer:  'rgba(139,92,246,0.12)',
  attendee:   'rgba(20,184,166,0.1)',
};
const ROLE_TEXT: Record<string, string> = {
  host:       '#FFD700',
  speaker:    '#60a5fa',
  organizer:  '#a78bfa',
  attendee:   '#2dd4bf',
};
const ROLE_BORDER: Record<string, string> = {
  host:       'rgba(255,215,0,0.3)',
  speaker:    'rgba(59,130,246,0.3)',
  organizer:  'rgba(139,92,246,0.3)',
  attendee:   'rgba(20,184,166,0.25)',
};

interface Props {
  participant: Participant;
  visited: boolean;
  position: { x: number, y: number } | null;
  onClose: () => void;
  onMarkVisited: () => void;
  onMessage?: () => void;
}

export function NodeInfoCard({ participant, visited, position, onClose, onMarkVisited, onMessage }: Props) {
  const profile = parseProfile(participant.json);

  // ── Synchronous mobile detection to avoid the flash from false → true ──────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const roleKey = participant.role.toLowerCase();

  // ── Hardware back-button / browser-back to close ───────────────────────────
  useEffect(() => {
    if (!isMobile) return;
    // Push a dummy state so pressing back closes the sheet instead of navigating away
    window.history.pushState({ nodeInfoOpen: true }, '');
    const handlePop = () => onClose();
    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
      // Clean up the dummy history entry if the card is closed programmatically
      if (window.history.state?.nodeInfoOpen) {
        window.history.back();
      }
    };
  }, [isMobile, onClose]);

  // ── Swipe-down-to-dismiss for the bottom sheet ─────────────────────────────
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy < 0) return; // don't allow dragging up
    dragCurrentY.current = dy;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragStartY.current === null) return;
    const threshold = 120; // px — dismiss if dragged this far down
    if (dragCurrentY.current > threshold) {
      onClose();
    } else {
      // Snap back
      if (sheetRef.current) {
        sheetRef.current.style.transform = '';
        sheetRef.current.style.transition = '';
      }
    }
    dragStartY.current = null;
    dragCurrentY.current = 0;
  }, [onClose]);

  // ── Desktop card positioning ───────────────────────────────────────────────
  const cardStyle: React.CSSProperties = isMobile ? {
    width: '100%',
    maxWidth: 'none',
    boxShadow: '0 -16px 48px rgba(0,0,0,0.7)',
    borderRadius: '20px 20px 0 0',
  } : {
    position: 'fixed',
    left: Math.min((position?.x || window.innerWidth / 2) - 140, window.innerWidth - 296),
    top: Math.max(64, Math.min((position?.y || window.innerHeight / 2) - 160, window.innerHeight - 380)),
    zIndex: 1001,
    boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)',
    width: 280,
  };

  return (
    <motion.div
      className="nodeinfo-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={isMobile ? {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 2000,
        // On mobile, let touch events through to the overlay for tap-to-close
        touchAction: 'none',
      } : {}}
    >
      <motion.div
        ref={sheetRef}
        className="nodeinfo-panel"
        // Stop tap-on-panel from closing via overlay click
        onClick={e => e.stopPropagation()}
        // Swipe-down gesture handlers
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        style={cardStyle}
        initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.88, y: 12 }}
        animate={isMobile ? { y: 0 }   : { opacity: 1, scale: 1,    y: 0 }}
        exit={isMobile    ? { y: '100%' } : { opacity: 0, scale: 0.88, y: 12 }}
        transition={{ duration: isMobile ? 0.32 : 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ── Drag handle (mobile only) — visual affordance for swipe-down ── */}
        {isMobile && (
          <div className="nodeinfo-drag-handle" aria-hidden>
            <div className="nodeinfo-drag-pill" />
          </div>
        )}

        {/* ── Close button — large tap target on mobile ── */}
        <button
          className="nodeinfo-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* ── Avatar + name ── */}
        <div className="nodeinfo-head">
          <div
            className="nodeinfo-initial"
            style={{
              background: visited
                ? 'rgba(16,185,129,0.12)'
                : (ROLE_COLORS[roleKey] ?? 'rgba(255,255,255,0.06)'),
              borderColor: visited
                ? 'rgba(16,185,129,0.3)'
                : (ROLE_BORDER[roleKey] ?? 'rgba(255,255,255,0.1)'),
            }}
          >
            {profile?.photo ? (
              <img src={profile.photo} alt={participant.displayName} className="nodeinfo-avatar" />
            ) : (
              <span style={{ fontSize: 24, color: ROLE_TEXT[roleKey] ?? '#f5f5f5' }}>
                {participant.displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="nodeinfo-name-block">
            <div className="nodeinfo-name">{participant.displayName}</div>
            <span
              className="nodeinfo-role-pill"
              style={{
                background:   ROLE_COLORS[roleKey]  ?? 'rgba(255,255,255,0.06)',
                color:        ROLE_TEXT[roleKey]    ?? '#888',
                borderColor:  ROLE_BORDER[roleKey]  ?? 'rgba(255,255,255,0.1)',
              }}
            >
              {participant.role}
            </span>
            {visited && (
              <span className="nodeinfo-visited-badge">✓ Visited</span>
            )}
          </div>
        </div>

        {/* ── Bio ── */}
        <p className="nodeinfo-bio">
          {profile?.bio || 'No bio provided.'}
        </p>

        {/* ── Interest Tags ── */}
        {profile?.tags && profile.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '10px 0' }}>
            {profile.tags.map(t => (
              <span
                key={t}
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '10.5px',
                  fontFamily: 'monospace',
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* ── Links ── */}
        {(profile?.linkedIn || profile?.github) && (
          <div className="nodeinfo-links">
            {profile?.linkedIn && (
              <a
                href={ensureUrl(profile.linkedIn)}
                target="_blank"
                rel="noopener noreferrer"
                className="nodeinfo-link nodeinfo-link-li"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
            )}
            {profile?.github && (
              <a
                href={ensureUrl(profile.github)}
                target="_blank"
                rel="noopener noreferrer"
                className="nodeinfo-link nodeinfo-link-gh"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
            )}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="nodeinfo-actions">
          {onMessage && (
            <button
              className="nodeinfo-msg-btn"
              onClick={() => { onMessage(); onClose(); }}
            >
              💬 Message
            </button>
          )}
          <button className="nodeinfo-visit-btn" onClick={onMarkVisited}>
            {visited ? 'Remove Visit' : 'Mark as Visited'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
