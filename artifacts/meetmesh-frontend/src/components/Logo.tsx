interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 28, className }: LogoProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="MeetMesh"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
    />
  );
}
