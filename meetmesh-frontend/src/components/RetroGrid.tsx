import type { CSSProperties } from 'react';
import './RetroGrid.css';

interface RetroGridProps {
  className?: string;
  angle?: number;
  cellSize?: number;
  opacity?: number;
  lineColor?: string;
  glow?: boolean;
  style?: CSSProperties;
}

export function RetroGrid({
  className = '',
  angle = 68,
  cellSize = 64,
  opacity = 0.85,
  lineColor = 'rgba(255, 255, 255, 0.28)',
  glow = true,
  style,
}: RetroGridProps) {
  const rotationStyle: CSSProperties = {
    transform: `rotateX(${angle}deg)`,
  };

  const planeStyle: CSSProperties = {
    backgroundImage: `
      linear-gradient(to right, ${lineColor} 1.5px, transparent 0),
      linear-gradient(to bottom, ${lineColor} 1.5px, transparent 0)
    `,
    backgroundRepeat: 'repeat',
    backgroundSize: `${cellSize}px ${cellSize}px`,
  };

  return (
    <div
      className={`retro-grid-wrapper ${className}`}
      style={{ opacity, ...style }}
      aria-hidden="true"
    >
      <div className="retro-grid-projection">
        <div className="retro-grid-rotation" style={rotationStyle}>
          <div className="retro-grid-plane" style={planeStyle} />
        </div>
      </div>
      {glow && <div className="retro-grid-horizon-glow" />}
      <div className="retro-grid-fade-overlay" />
    </div>
  );
}

export default RetroGrid;
