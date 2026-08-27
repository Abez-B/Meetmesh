import { GridPattern } from './GridPattern';

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
        backgroundColor: '#06070d',
      }}
      aria-hidden="true"
    >
      {/* Ambient top glow */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.12) 0%, rgba(59, 130, 246, 0.05) 45%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />
      {/* Geometric grid pattern with illuminated squares */}
      <GridPattern
        width={40}
        height={40}
        squares={[
          [4, 4],
          [5, 1],
          [8, 2],
          [6, 6],
          [10, 5],
          [13, 3],
          [3, 8],
          [7, 12],
          [12, 9],
          [16, 4],
          [18, 11],
          [22, 6],
          [9, 16],
          [14, 18],
          [20, 14],
          [25, 8],
          [5, 19],
          [11, 22],
          [17, 21],
          [23, 17],
        ]}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '-20%',
          width: '100%',
          height: '180%',
          transform: 'skewY(12deg)',
          maskImage: 'radial-gradient(ellipse 1000px 800px at 50% 35%, #000 20%, rgba(0,0,0,0.5) 60%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 1000px 800px at 50% 35%, #000 20%, rgba(0,0,0,0.5) 60%, transparent 100%)',
        }}
        fillColor="rgb(99 102 241 / 0.25)"
        strokeColor="rgba(255, 255, 255, 0.08)"
      />
    </div>
  );
}

export default BackgroundPattern;
