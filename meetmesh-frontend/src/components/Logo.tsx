interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 28, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0, display: 'block' }}
      aria-label="we-inai"
    >
      <defs>
        <radialGradient id="mm-logo-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </radialGradient>
        <radialGradient id="mm-logo-glow" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect width="32" height="32" rx="8" fill="url(#mm-logo-bg)" />
      <rect width="32" height="32" rx="8" fill="url(#mm-logo-glow)" />

      {/* mesh edges */}
      <line x1="16" y1="7" x2="25" y2="14" stroke="#c7d2fe" strokeWidth="1.1" strokeOpacity="0.6" />
      <line x1="16" y1="7" x2="7" y2="14" stroke="#c7d2fe" strokeWidth="1.1" strokeOpacity="0.6" />
      <line x1="7" y1="14" x2="10" y2="24" stroke="#c7d2fe" strokeWidth="1.1" strokeOpacity="0.6" />
      <line x1="25" y1="14" x2="22" y2="24" stroke="#c7d2fe" strokeWidth="1.1" strokeOpacity="0.6" />
      <line x1="10" y1="24" x2="22" y2="24" stroke="#c7d2fe" strokeWidth="1.1" strokeOpacity="0.6" />
      <line x1="7" y1="14" x2="25" y2="14" stroke="#c7d2fe" strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="2 2" />
      <line x1="10" y1="24" x2="16" y2="7" stroke="#c7d2fe" strokeWidth="0.8" strokeOpacity="0.25" strokeDasharray="2 2" />

      {/* outer nodes */}
      <circle cx="16" cy="7" r="2.8" fill="#e0e7ff" />
      <circle cx="7" cy="14" r="2.4" fill="#a5b4fc" />
      <circle cx="25" cy="14" r="2.4" fill="#a5b4fc" />
      <circle cx="10" cy="24" r="2.2" fill="#818cf8" />
      <circle cx="22" cy="24" r="2.2" fill="#818cf8" />

      {/* center hub */}
      <circle cx="16" cy="16" r="3.8" fill="#6366f1" stroke="#e0e7ff" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="1.6" fill="#fff" />

      <line x1="16" y1="7" x2="16" y2="16" stroke="#c7d2fe" strokeWidth="0.9" strokeOpacity="0.5" />
      <line x1="7" y1="14" x2="16" y2="16" stroke="#c7d2fe" strokeWidth="0.9" strokeOpacity="0.5" />
      <line x1="25" y1="14" x2="16" y2="16" stroke="#c7d2fe" strokeWidth="0.9" strokeOpacity="0.5" />
      <line x1="10" y1="24" x2="16" y2="16" stroke="#c7d2fe" strokeWidth="0.9" strokeOpacity="0.5" />
      <line x1="22" y1="24" x2="16" y2="16" stroke="#c7d2fe" strokeWidth="0.9" strokeOpacity="0.5" />
    </svg>
  );
}

export default Logo;
