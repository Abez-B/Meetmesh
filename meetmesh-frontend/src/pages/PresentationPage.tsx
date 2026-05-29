import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMeetingState } from '../hooks/useMeetingState';
import { useMeshClient } from '../hooks/useMeshClient';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { QRCodeSVG } from 'qrcode.react';
import { MeshGraph } from '../components/MeshGraph';
import { PresentationSkeleton } from '../components/SkeletonPage';
import { TooltipButton } from '../components/TooltipButton';
import { Logo } from '../components/Logo';
import { v4 as uuid } from 'uuid';
import '../meetmesh-upgraded.css';

const EMPTY_SET = new Set<string>();

export default function PresentationPage() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const client   = useMeshClient();
  const state    = useMeetingState();
  const status   = useConnectionStatus();

  const [error,        setError]        = useState<string | null>(null);
  const [isAttempting, setIsAttempting] = useState(false);
  const normalizedCode = code?.toUpperCase() ?? '';
  
  const participants = useMemo(
    () => (state.room ? Object.values(state.room.participants) : []),
    [state.room?.participants]
  );

  // Debug: Log state when room changes
  useEffect(() => {
    if (state.room) {
      console.log('[PresentationPage] Room state:', {
        meetingCode: state.room.meetingCode,
        hostPeerId: state.room.hostPeerId,
        participantCount: Object.keys(state.room.participants).length,
        participants: state.room.participants
      });
    }
  }, [state.room]);

  const handleNodeClick = useCallback(() => {}, []);

  const join = useCallback(async () => {
    const isInWrongRoom = state.room && state.room.meetingCode !== normalizedCode;
    if (!normalizedCode || status !== 'connected' || isAttempting) return;
    if (state.phase !== 'idle' && !isInWrongRoom) return;

    try {
      setError(null);
      setIsAttempting(true);
      const peerId = 'present-' + uuid().split('-')[0];
      await client.joinMeeting(normalizedCode, 'Presentation View', peerId);
    } catch (err: any) {
      setError(err?.message || 'Failed to join meeting. Please check the code.');
    } finally {
      setIsAttempting(false);
    }
  }, [normalizedCode, client, status, state.phase, state.room?.meetingCode, isAttempting]);

  useEffect(() => {
    if (status === 'disconnected') {
      client.connect().catch(() => setError('Connection failed. Is the server running?'));
    }
  }, [client, status]);

  // Retry join if connection is established but we're not in a room yet
  useEffect(() => {
    if (status === 'connected' && !state.room && !isAttempting && normalizedCode) {
      // Small delay to allow reconnection logic to settle
      const timer = setTimeout(() => {
        join();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [status, state.room, isAttempting, normalizedCode, join]);

  useEffect(() => {
    join();
  }, [join]);

  useEffect(() => {
    const handleError = (payload: { code: string; detail: string }) => {
      if (payload.code === 'NOT_FOUND') {
        setError(`Meeting "${normalizedCode}" not found.`);
      } else {
        setError(payload.detail || 'An unexpected error occurred.');
      }
    };
    client.on('Error', handleError);
    return () => client.off('Error', handleError);
  }, [client, normalizedCode]);

  if (state.phase === 'ended') {
    return (
      <div className="pp-root" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
            <Logo size={48} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#f5f5f5', marginBottom: 12 }}>Meeting Ended</h2>
          <p style={{ color: '#555', marginBottom: 32 }}>This presentation session has concluded.</p>
          <TooltipButton text="Back to Home" onClick={() => navigate('/')} variant="primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pp-root" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: '4rem', marginBottom: 20 }}>⚠️</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ff4d4d', marginBottom: 12 }}>Presentation Error</h2>
          <p style={{ color: '#555', marginBottom: 32, maxWidth: 400 }}>{error}</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <TooltipButton text="Retry Connection" onClick={join} variant="success" />
            <TooltipButton text="Go Home" onClick={() => navigate('/')} />
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'waiting') {
    return (
      <div className="pp-root" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
            <div className="pp-rings-large">
               <div className="pp-ring-large" />
               <div className="pp-ring-large" />
               <div className="pp-ring-large" />
               <div style={{ fontSize: '4rem', position: 'relative', zIndex: 2 }}>📺</div>
            </div>
          </div>
          <h2 style={{ color: '#f5f5f5', marginBottom: 16, fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Screen Linked Successfully</h2>
          <p style={{ maxWidth: 480, margin: '0 auto 32px', color: '#666', fontSize: '0.95rem', lineHeight: 1.6 }}>
            To begin the presentation, the Host must <strong style={{ color: '#d4d4d4' }}>Admit</strong> the "Presentation View"
            from their dashboard.
          </p>
          <div className="pp-event-kicker" style={{ margin: 0 }}>
            <div className="pp-live-dot" />
            Waiting for admission...
          </div>
        </div>
      </div>
    );
  }

  if (!state.room || state.room.meetingCode !== normalizedCode) {
    return <PresentationSkeleton />;
  }

  const joinUrl = `${window.location.origin}/join/${normalizedCode}`;
  const displayUrl = `${window.location.host}/join/${normalizedCode}`;

  return (
    <div className="pp-root">
      <div className="pp-left">
        <div>
          <div className="pp-brand">
            <Logo size={28} />
            <span className="pp-brand-name">MeetMesh</span>
          </div>

          <div className="pp-event-kicker">
            <div className="pp-live-dot" />
            Live Session
          </div>

          <h1 className="pp-title">{state.room.eventName}</h1>
          {state.room.subtitle && (
            <p className="pp-subtitle">{state.room.subtitle}</p>
          )}

          <div className="pp-count">
            <span className="pp-count-num">{participants.length}</span>
            <div className="pp-count-label">
              Participant{participants.length !== 1 ? 's' : ''} connected
            </div>
          </div>

          <div className="pp-qr-section">
            <span className="pp-qr-label">Scan to join</span>
            <div className="pp-qr-card">
              <div className="pp-qr-box">
                <QRCodeSVG
                  value={joinUrl}
                  size={130}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  includeMargin
                />
              </div>
              <div className="pp-qr-info">
                <span className="pp-code">{normalizedCode}</span>
                <div className="pp-join-link">{displayUrl}</div>
                {state.room.description && (
                  <p className="pp-description">{state.room.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pp-right">
        <div className="pp-stats-strip">
          <div className="pp-stat">
            <span>Peers</span>
            <strong>{participants.length}</strong>
          </div>
        </div>

        <MeshGraph
          participants={participants}
          visitedNodes={EMPTY_SET}
          hostPeerId={state.room.hostPeerId}
          disableInteractions
          onNodeClick={handleNodeClick}
        />
      </div>
    </div>
  );
}
