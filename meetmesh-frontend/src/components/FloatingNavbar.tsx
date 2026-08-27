import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from './Logo';
import { ConnectionDot } from './ConnectionDot';
import { soundService } from '../utils/soundService';
import './FloatingNavbar.css';

interface FloatingNavbarProps {
  variant?: 'landing' | 'join' | 'waiting' | 'meeting' | 'host';
  meetingCode?: string;
  onJoinClick?: () => void;
  onCreateClick?: () => void;
}

export function FloatingNavbar({
  variant = 'landing',
  meetingCode,
  onJoinClick,
  onCreateClick,
}: FloatingNavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(() => soundService.isMuted());
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCopyCode = () => {
    if (!meetingCode) return;
    navigator.clipboard.writeText(meetingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToSection = (id: string) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.header
      className="fn-wrapper"
      initial={{ y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <nav className="fn-container" aria-label="Main Navigation">
        {/* Brand */}
        <div className="fn-brand" onClick={() => navigate('/')} role="button" tabIndex={0}>
          <div className="fn-brand-logo">
            <Logo size={isMobile ? 22 : 26} />
          </div>
          <div className="fn-brand-title">
            <span className="fn-wordmark">we-inai</span>
            <span className="fn-badge">live</span>
          </div>
        </div>

        {/* Center navigation */}
        <div className="fn-nav-items">
          {variant === 'landing' ? (
            <>
              <button
                type="button"
                className="fn-nav-btn"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Overview
              </button>
              <button
                type="button"
                className="fn-nav-btn"
                onClick={() => scrollToSection('landing-panel-section')}
              >
                Join Room
              </button>
              <button
                type="button"
                className="fn-nav-btn"
                onClick={() => scrollToSection('mesh-preview-section')}
              >
                Live Mesh
              </button>
            </>
          ) : meetingCode ? (
            <div className="fn-room-badge">
              <span>Room:</span>
              <span className="fn-room-code">{meetingCode.toUpperCase()}</span>
              <button
                type="button"
                className="fn-room-copy-btn"
                onClick={handleCopyCode}
                title="Copy Meeting Code"
                aria-label="Copy meeting code"
              >
                {copied ? (
                  <span style={{ fontSize: '11px', color: '#10b981' }}>✓ Copied</span>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          ) : null}
        </div>

        {/* Right actions */}
        <div className="fn-right">
          {variant !== 'landing' && (
            <button
              type="button"
              className="fn-sound-btn"
              onClick={() => setMuted(soundService.toggleMute())}
              title={muted ? 'Audio muted (click to unmute)' : 'Audio active (click to mute)'}
              aria-label={muted ? 'Audio muted' : 'Audio active'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
          )}

          <div className="fn-status">
            <ConnectionDot />
            {!isMobile && <span className="fn-status-text">Relay</span>}
          </div>

          {variant === 'landing' ? (
            <button
              type="button"
              className="fn-cta-btn"
              onClick={() => {
                if (onJoinClick) {
                  onJoinClick();
                } else {
                  scrollToSection('landing-panel-section');
                }
              }}
            >
              <span>{isMobile ? 'Enter' : 'Enter Code'}</span>
              <span className="fn-cta-arrow">→</span>
            </button>
          ) : (
            <button
              type="button"
              className="fn-ghost-btn"
              onClick={() => navigate('/')}
            >
              Exit
            </button>
          )}
        </div>
      </nav>
    </motion.header>
  );
}

export default FloatingNavbar;
