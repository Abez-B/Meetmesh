import { useRef } from 'react';
import { MeshClient } from 'meetmesh-core';
import { MockMeshClient } from '../mock/MockMeshClient';

const IS_MOCK = import.meta.env.VITE_MOCK_MODE === 'true';
const HUB_URL = (import.meta.env.VITE_HUB_URL as string) ?? 'http://localhost:5000/hub';

let _client: MeshClient | null = null;

function getClient(): MeshClient {
  if (!_client) {
    _client = IS_MOCK
      ? (new MockMeshClient() as unknown as MeshClient)
      : new MeshClient(HUB_URL);
  }
  return _client;
}

export function useMeshClient(): MeshClient {
  const client = useRef(getClient());
  return client.current;
}
