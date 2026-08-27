import React, { useId } from 'react';

export interface GridPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  squares?: Array<[x: number, y: number]>;
  strokeDasharray?: string;
  className?: string;
  fillColor?: string;
  strokeColor?: string;
}

export function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = '0',
  squares,
  className = '',
  fillColor = 'rgb(156 163 175 / 0.3)',
  strokeColor = 'rgba(156, 163, 175, 0.18)',
  style,
  ...props
}: GridPatternProps) {
  const id = useId();

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
      style={{
        fill: fillColor,
        stroke: strokeColor,
        ...style,
      }}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            stroke={strokeColor}
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      {squares && (
        <svg x={x} y={y} className="overflow-visible" style={{ overflow: 'visible' }}>
          {squares.map(([sqX, sqY]) => (
            <rect
              strokeWidth="0"
              key={`${sqX}-${sqY}`}
              width={width - 1}
              height={height - 1}
              x={sqX * width + 1}
              y={sqY * height + 1}
              fill={fillColor}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}

export default GridPattern;
