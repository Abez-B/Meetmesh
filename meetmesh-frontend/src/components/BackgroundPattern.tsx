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
          top: '-30%',
          width: '100%',
          height: '200%',
          transform: 'skewY(12deg)',
          maskImage: 'radial-gradient(ellipse 900px 700px at 50% 35%, #000 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 900px 700px at 50% 35%, #000 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
        }}
        fillColor="rgb(156 163 175 / 0.3)"
        strokeColor="rgba(156, 163, 175, 0.18)"
      />
    </div>
  );
}

export default BackgroundPattern;
