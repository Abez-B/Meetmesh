import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMeetingState } from '../hooks/useMeetingState';
import { useMeshClient } from '../hooks/useMeshClient';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { QRCodeSVG } from 'qrcode.react';
import { MeshGraph } from '../components/MeshGraph';
import { PresentationSkeleton } from '../components/SkeletonPage';
import { TooltipButton } from '../components/TooltipButton';
import { loadEventMeta }     from '../utils/hostEventMeta';
import { v4 as uuid }        from 'uuid';
import '../meetmesh-upgraded.css';

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

  const join = useCallback(async () => {
    if (!normalizedCode || status !== 'connected' || state.phase !== 'idle' || isAttempting) return;

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
  }, [normalizedCode, client, status, state.phase, isAttempting]);

  useEffect(() => {
    if (status === 'disconnected') {
      client.connect().catch(() => setError('Connection failed. Is the server running?'));
    }
  }, [client, status]);

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
      <div className="presentation-loading">
        <div>
          <h2>Meeting Ended</h2>
          <p>This presentation session has concluded.</p>
          <div style={{ marginTop: 24 }}>
            <TooltipButton text="Back to Home" onClick={() => navigate('/')} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="presentation-loading">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#ff4d4d', marginBottom: 8 }}>Presentation Error</h2>
          <p style={{ opacity: 0.7, marginBottom: 24, maxWidth: 400 }}>{error}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
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
          <div style={{ fontSize: '3rem', marginBottom: 20 }}>📺</div>
          <h2 style={{ color: '#f5f5f5', marginBottom: 12, fontFamily: 'JetBrains Mono, monospace' }}>Screen Linked Successfully</h2>
          <p style={{ maxWidth: 450, margin: '0 auto', color: '#555', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', lineHeight: 1.6 }}>
            To begin the presentation, the Host must <strong style={{ color: '#d4d4d4' }}>Admit</strong> the "Presentation View"
            from their dashboard.
          </p>
          <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100, fontSize: 11, color: '#666', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em' }}>
            Waiting for admission...
          </div>
        </div>
      </div>
    );
  }

  if (!state.room || !normalizedCode) {
    return <PresentationSkeleton />;
  }

  const joinUrl   = `${window.location.origin}/join/${normalizedCode}`;
  const eventMeta = loadEventMeta(normalizedCode);

  return (
    <div className="pp-root">
      <div className="pp-left">
        <div>
          <div className="pp-brand">
            <div className="pp-brand-mark">MM</div>
            <span className="pp-brand-name">MeetMesh</span>
          </div>

          <div className="pp-event-kicker">
            <div className="pp-live-dot" />
            Live Session
          </div>

          <h1 className="pp-title">{state.room.eventName}</h1>
          {eventMeta?.subtitle && (
            <p className="pp-subtitle">{eventMeta.subtitle}</p>
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
                <div className="pp-join-link">meetmesh.app/join/{normalizedCode}</div>
                {eventMeta?.description && (
                  <p className="pp-description">{eventMeta.description}</p>
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
          visitedNodes={new Set()}
          disableInteractions
          onNodeClick={() => {}}
        />
      </div>
    </div>
  );
}
