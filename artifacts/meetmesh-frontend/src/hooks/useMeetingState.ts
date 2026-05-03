import { useState, useEffect } from 'react';
import type { MachineState } from 'meetmesh-core';
import { useMeshClient }     from './useMeshClient';

export function useMeetingState(): MachineState {
  const client          = useMeshClient();
  const [state, setState] = useState<MachineState>(client.state);

  useEffect(() => {
    return client.subscribeToState(setState);
  }, [client]);

  return state;
}
