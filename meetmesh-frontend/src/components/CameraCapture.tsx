import { useRef, useState, useEffect } from 'react';

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
    if (stream) stream.getTracks().forEach(t => t.stop());
    onCapture(base64);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200; canvas.height = 200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
        const base64 = canvas.toDataURL('image/jpeg', 0.6);
        if (stream) stream.getTracks().forEach(t => t.stop());
        onCapture(base64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Take a selfie</h2>
        <p style={{ color: '#737373', fontSize: 12 }}>Helps others recognise you in the mesh.</p>
      </div>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleUpload}
      />

      {error ? (
        <div style={{
          width: 200, height: 200, borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.1)',
          margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#666', textAlign: 'center', padding: 20
        }}>
          {error}
        </div>
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
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.1)' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onSkip}
          className="cam-action-btn cam-action-skip"
          style={{
            fontFamily: "var(--font-ui, 'Inter', sans-serif)",
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '9999px',
            padding: '7px 15px',
            cursor: 'pointer',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#a1a1aa',
            lineHeight: 1.4,
            transition: 'all 0.15s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="cam-action-btn cam-action-upload"
          style={{
            fontFamily: "var(--font-ui, 'Inter', sans-serif)",
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '9999px',
            padding: '7px 15px',
            cursor: 'pointer',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#e4e4e7',
            lineHeight: 1.4,
            transition: 'all 0.15s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Upload
        </button>
        {!error && (
          <button
            type="button"
            onClick={handleCapture}
            className="cam-action-btn cam-action-capture"
            style={{
              fontFamily: "var(--font-ui, 'Inter', sans-serif)",
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '9999px',
              padding: '7px 18px',
              cursor: 'pointer',
              border: 'none',
              background: '#ffffff',
              color: '#09090b',
              lineHeight: 1.4,
              boxShadow: '0 2px 10px rgba(255, 255, 255, 0.18)',
              transition: 'all 0.15s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Take Photo
          </button>
        )}
      </div>
    </div>
  );
}
