export function BackgroundPattern() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        backgroundColor: '#090a0f',
      }}
      aria-hidden="true"
    >
      {/* Soft top ambient illumination */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.07) 0%, rgba(59, 130, 246, 0.02) 50%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      {/* Subtle flat dot-matrix pattern — no 12deg skew */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 35%, #000 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 35%, #000 20%, transparent 80%)',
          opacity: 0.6,
        }}
      />
    </div>
  );
}

export default BackgroundPattern;
