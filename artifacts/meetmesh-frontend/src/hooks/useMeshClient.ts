import { useRef } from 'react';
import { MeshClient } from 'meetmesh-core';

const HUB_URL = import.meta.env.VITE_HUB_URL as string ?? 'http://localhost:5000/hub';

// Module-level singleton — survives React StrictMode double-mounts
let _client: MeshClient | null = null;

function getClient(): MeshClient {
  if (!_client) _client = new MeshClient(HUB_URL);
  return _client;
}

export function useMeshClient(): MeshClient {
  const client = useRef(getClient());
  return client.current;
}
