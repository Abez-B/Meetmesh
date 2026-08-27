import { useRef } from 'react';
import { MeshClient, type ChatMessage } from 'meetmesh-core';
import { MockMeshClient } from '../mock/MockMeshClient';
import { chatStore } from '../mock/chatStore';
import { soundService } from '../utils/soundService';

const IS_MOCK = import.meta.env.VITE_MOCK_MODE === 'true';
const HUB_URL = (import.meta.env.VITE_HUB_URL as string) ?? 
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin);

let _client: MeshClient | null = null;

function getClient(): MeshClient {
  if (!_client) {
    _client = IS_MOCK
      ? (new MockMeshClient() as unknown as MeshClient)
      : new MeshClient(HUB_URL);

    _client.on('ChatMessageReceived', (msg: ChatMessage) => {
      chatStore.handleIncomingGlobal(msg, _client?.state.selfPeerId);
    });

    _client.on('DirectMessageReceived', (msg: ChatMessage) => {
      const currentSelf = _client?.state.selfPeerId
        || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('meetmesh_peer_id') : null)
        || (typeof localStorage !== 'undefined' ? localStorage.getItem('meetmesh_peer_id') : null);
      chatStore.handleIncomingDm(msg, currentSelf);
      if (currentSelf && msg.peerId !== currentSelf) {
        soundService.playDm();
      }
    });

    _client.on('ParticipantJoined', () => {
      soundService.playJoin();
    });

    _client.on('ReactionReceived', () => {
      soundService.playReaction();
    });

    _client.on('AnnouncementReceived', () => {
      soundService.playAnnouncement();
    });

    _client.on('ChatHistoryReceived', (messages: ChatMessage[]) => {
      chatStore.seedGlobal(messages);
    });
  }
  return _client;
}

export function useMeshClient(): MeshClient {
  const client = useRef(getClient());
  return client.current;
}
