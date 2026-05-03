import { useConnectionQuality } from '../hooks/useConnectionQuality';

export function ConnectionQualityIndicator() {
  const { status, latencyMs, quality } = useConnectionQuality();

  if (status === 'connected' && (quality === 'excellent' || quality === 'good')) {
    return null; // Don't show when connection is good
  }

  const getStatusText = () => {
    if (status === 'disconnected') return 'Disconnected';
    if (status === 'reconnecting') return 'Reconnecting...';
    if (quality === 'poor') return `Poor connection (${latencyMs}ms)`;
    if (quality === 'fair') return `Connection slow (${latencyMs}ms)`;
    return '';
  };

  const getStatusColor = () => {
    if (status === 'disconnected') return '#ef4444';
    if (status === 'reconnecting') return '#f59e0b';
    if (quality === 'poor') return '#ef4444';
    if (quality === 'fair') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="connection-quality-indicator" style={{ '--quality-color': getStatusColor() } as React.CSSProperties}>
      <span className="connection-quality-dot" />
      <span className="connection-quality-text">{getStatusText()}</span>
    </div>
  );
}
