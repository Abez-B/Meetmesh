import { useRef, useState, useEffect } from 'react';
import { TooltipButton } from './TooltipButton';

interface Props {
  onCapture: (base64Photo: string) => void;
  onSkip: () => void;
}

export function CameraCapture({ onCapture, onSkip }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream,  setStream]  = useState<MediaStream | null>(null);
  const [error,   setError]   = useState('');
  const [flash,   setFlash]   = useState(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function initCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } },
          audio: false,
        });
        activeStream = s;
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch {
        setError('Camera not available or permission denied.');
      }
    }
    initCamera();
    return () => { if (activeStream) activeStream.getTracks().forEach(t => t.stop()); };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !stream) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 220);
    const canvas = document.createElement('canvas');
    canvas.width = 200; canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 200, 200);
    const base64 = canvas.toDataURL('image/jpeg', 0.6);
    stream.getTracks().forEach(t => t.stop());
    onCapture(base64);
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Take a selfie</h2>
        <p style={{ color: '#737373', fontSize: 12 }}>Helps others recognise you in the mesh.</p>
      </div>

      {error ? (
        <div className="error-inline">{error}</div>
      ) : (
        <div style={{
          position: 'relative',
          width: 200,
          height: 200,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.15)',
          margin: '0 auto',
          background: '#0a0a0a',
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {flash && (
            <div style={{
              position: 'absolute', inset: 0,
              background: '#fff',
              animation: 'cameraFlash 220ms ease-out forwards',
            }} />
          )}
          {/* Corner bracket overlay */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.1)' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
        <TooltipButton
          text="Skip"
          onClick={onSkip}
          style={{ width: '80px', height: '35px' } as any}
        />
        {!error && (
          <TooltipButton
            text="Capture"
            tooltip="Click!"
            variant="primary"
            onClick={handleCapture}
          />
        )}
      </div>
    </div>
  );
}
