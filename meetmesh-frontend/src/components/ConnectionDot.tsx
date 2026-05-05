import { useConnectionStatus } from '../hooks/useConnectionStatus';

const CONFIG = {
  connected:    { color: '#1D9E75', label: 'Connected' },
  connecting:   { color: '#EF9F27', label: 'Connecting…' },
  reconnecting: { color: '#EF9F27', label: 'Reconnecting…' },
  disconnected: { color: '#E24B4A', label: 'Disconnected' },
} as const;

export function ConnectionDot() {
  const status = useConnectionStatus();
  const cfg    = CONFIG[status];

  return (
    <div className={`connection-dot connection-dot--${status}`}>
      <span className="connection-dot__indicator" />
      <span>{cfg.label}</span>
    </div>
  );
}
