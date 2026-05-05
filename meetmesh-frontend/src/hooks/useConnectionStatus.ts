import { useState, useEffect } from 'react';
import type { ConnectionStatus } from 'meetmesh-core';
import { useMeshClient }     from './useMeshClient';

export function useConnectionStatus(): ConnectionStatus {
  const client = useMeshClient();
  const [status, setStatus] = useState<ConnectionStatus>(client.connectionStatus);

  useEffect(() => {
    setStatus(client.connectionStatus);
    const handler = (newStatus: ConnectionStatus) => setStatus(newStatus);
    client.on('ConnectionStatusChanged', handler);
    return () => client.off('ConnectionStatusChanged', handler);
  }, [client]);

  return status;
}
