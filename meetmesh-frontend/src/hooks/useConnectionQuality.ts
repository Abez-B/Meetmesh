import { useState, useEffect, useCallback } from 'react';
import { useMeshClient } from './useMeshClient';

export interface ConnectionQuality {
  status: 'connected' | 'reconnecting' | 'disconnected';
  latencyMs: number | null;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

export function useConnectionQuality(): ConnectionQuality {
  const client = useMeshClient();
  const [status, setStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>(
    client.connectionStatus as any
  );
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = client.subscribeToState((state) => {
      if (state.latencyMs !== null) {
        setLatencyMs(state.latencyMs);
      }
    });

    const onStatusChange = (newStatus: string) => {
      setStatus(newStatus as any);
    };

    client.on('ConnectionStatusChanged', onStatusChange);

    // Initial latency check
    const checkLatency = async () => {
      try {
        const before = Date.now();
        await client.heartbeat('');
        const after = Date.now();
        setLatencyMs(after - before);
      } catch {
        // Ignore errors
      }
    };

    checkLatency();
    const interval = setInterval(checkLatency, 10000);

    return () => {
      unsubscribe();
      client.off('ConnectionStatusChanged', onStatusChange);
      clearInterval(interval);
    };
  }, [client]);

  const quality = useCallback((): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' => {
    if (status !== 'connected') return 'unknown';
    if (latencyMs === null) return 'unknown';
    if (latencyMs < 50) return 'excellent';
    if (latencyMs < 100) return 'good';
    if (latencyMs < 200) return 'fair';
    return 'poor';
  }, [status, latencyMs]);

  return {
    status,
    latencyMs,
    quality: quality(),
  };
}
