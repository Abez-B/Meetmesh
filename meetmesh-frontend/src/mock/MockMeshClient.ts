import type { ConnectionStatus, MeetingRoom, WaitingPeer } from 'meetmesh-core';
import type { MachineState } from 'meetmesh-core';
import { generateMeetingCode } from 'meetmesh-core';
import { MOCK_PARTICIPANTS_MAP, MOCK_WAITING_PEERS, INITIAL_CHAT_MESSAGES } from './mockData';
import { chatStore } from './chatStore';

type EventHandler = (...args: unknown[]) => void;
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const INITIAL_STATE: MachineState = {
  phase: 'idle',
  room: null,
  waitingRoom: [],
  selfPeerId: null,
  latencyMs: 12,
  hostSecret: null,
};

export class MockMeshClient {
  private _state: MachineState = { ...INITIAL_STATE };
  private _listeners: Array<(s: MachineState) => void> = [];
  private _handlers: Map<string, Set<EventHandler>> = new Map();
  private _connectionStatus: ConnectionStatus = 'disconnected';

  get state(): MachineState { return this._state; }
  get connectionStatus(): ConnectionStatus { return this._connectionStatus; }

  subscribeToState(listener: (s: MachineState) => void): () => void {
    this._listeners.push(listener);
    return () => { this._listeners = this._listeners.filter(l => l !== listener); };
  }

  async connect(): Promise<void> {
    this._setStatus('connecting');
    await delay(350);
    this._setStatus('connected');
  }

  async disconnect(): Promise<void> {
    this._setStatus('disconnected');
    this._patch({ phase: 'idle', room: null, waitingRoom: [] });
  }

  async createMeeting(eventName: string, peerId: string, profileJson = '{}'): Promise<void> {
    this._patch({ selfPeerId: peerId });
    await delay(600);

    const code = generateMeetingCode();
    const now  = new Date().toISOString();

    let profile: Record<string, unknown> = {};
    try { profile = JSON.parse(profileJson); } catch { }

    const hostParticipant = {
      peerId,
      displayName: (profile.name as string) || 'You (Host)',
      role: 'Host' as const,
      isAdmitted: true,
      joinedAt: now,
      json: profileJson,
    };

    const room: MeetingRoom = {
      meetingCode: code,
      eventName,
      hostPeerId: peerId,
      startedAt: now,
      waitingRoomEnabled: true,
      participants: { [peerId]: hostParticipant, ...MOCK_PARTICIPANTS_MAP },
    };

    chatStore.seed(INITIAL_CHAT_MESSAGES);

    this._patch({ phase: 'active', room });
    this._fire('MeetingCreated', { meetingCode: code, eventName, startedAt: now });

    setTimeout(() => {
      this._patch({ waitingRoom: MOCK_WAITING_PEERS });
    }, 2500);
  }

  async joinMeeting(meetingCode: string, displayName: string, peerId: string, profileJson = '{}'): Promise<void> {
    this._patch({ selfPeerId: peerId, phase: 'waiting' });
    await delay(1500);

    const now = new Date().toISOString();
    let profile: Record<string, unknown> = {};
    try { profile = JSON.parse(profileJson); } catch { }

    // If the joiner is the host (reconnecting to /manage), make them the room host.
    const isHost = typeof sessionStorage !== 'undefined'
      && sessionStorage.getItem('meetmesh_is_host') === 'true';
    const hostPeerId = isHost ? peerId : 'sarah-chen';

    // Build participants: start from mock map, then override host role & add self.
    const participants: Record<string, typeof MOCK_PARTICIPANTS_MAP[string]> = {
      ...MOCK_PARTICIPANTS_MAP,
    };

    if (isHost) {
      // Joining user is the host — give them the host node at the center.
      participants[peerId] = {
        peerId,
        displayName,
        role: 'Host' as const,
        isAdmitted: true,
        joinedAt: now,
        json: JSON.stringify({
          ...profile,
          photo: profile.photo ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${peerId}`,
        }),
      };
    } else {
      // Non-host join: elevate sarah-chen to Host so the graph has a center node.
      const sarah = MOCK_PARTICIPANTS_MAP['sarah-chen'];
      if (sarah) participants['sarah-chen'] = { ...sarah, role: 'Host' as const };
      // Add the joining attendee.
      participants[peerId] = {
        peerId,
        displayName,
        role: 'Attendee' as const,
        isAdmitted: true,
        joinedAt: now,
        json: JSON.stringify({
          ...profile,
          photo: profile.photo ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${peerId}`,
        }),
      };
    }

    const room: MeetingRoom = {
      meetingCode,
      eventName: 'Demo Event — MeetMesh',
      hostPeerId,
      startedAt: now,
      waitingRoomEnabled: isHost,
      participants,
    };

    chatStore.seed(INITIAL_CHAT_MESSAGES);
    this._patch({ phase: 'active', room });

    if (isHost) {
      setTimeout(() => { this._patch({ waitingRoom: MOCK_WAITING_PEERS }); }, 2500);
    }
  }

  async admitParticipant(_meetingCode: string, peerId: string): Promise<void> {
    const room = this._state.room;
    if (!room) return;
    const newWaiting = this._state.waitingRoom.filter(p => p.peerId !== peerId);
    const admitted: WaitingPeer | undefined = this._state.waitingRoom.find(p => p.peerId === peerId);
    if (admitted) {
      const newParticipant = {
        peerId: admitted.peerId,
        displayName: admitted.displayName,
        role: 'Attendee' as const,
        isAdmitted: true,
        joinedAt: admitted.joinedAt,
        json: JSON.stringify({ bio: 'Newly admitted attendee' }),
      };
      this._patch({
        waitingRoom: newWaiting,
        room: { ...room, participants: { ...room.participants, [peerId]: newParticipant } },
      });
    }
  }

  async kickParticipant(_meetingCode: string, peerId: string): Promise<void> {
    const room = this._state.room;
    if (!room) return;
    const { [peerId]: _removed, ...rest } = room.participants;
    this._patch({ room: { ...room, participants: rest } });
  }

  async changeRole(_meetingCode: string, peerId: string, newRole: string): Promise<void> {
    const room = this._state.room;
    if (!room || !room.participants[peerId]) return;
    this._patch({
      room: {
        ...room,
        participants: {
          ...room.participants,
          [peerId]: { ...room.participants[peerId], role: newRole as 'Attendee' },
        },
      },
    });
  }

  async toggleWaitingRoom(_meetingCode: string, isEnabled: boolean): Promise<void> {
    const room = this._state.room;
    if (!room) return;
    this._patch({ room: { ...room, waitingRoomEnabled: isEnabled } });
  }

  async updateMetadata(_meetingCode: string, json: string): Promise<void> {
    const room = this._state.room;
    const self = this._state.selfPeerId;
    if (!room || !self) return;
    this._patch({
      room: {
        ...room,
        participants: {
          ...room.participants,
          [self]: { ...room.participants[self], json },
        },
      },
    });
  }

  async closeMeeting(_meetingCode: string): Promise<void> {
    this._patch({ phase: 'ended', room: null, waitingRoom: [] });
  }

  async claimHost(_meetingCode: string, _peerId: string): Promise<void> { }
  async heartbeat(_meetingCode: string): Promise<void> {
    this._patch({ latencyMs: Math.round(8 + Math.random() * 20) });
  }
  async sendReaction(_meetingCode: string, _emoji: string): Promise<void> { }
  async sendChatMessage(_meetingCode: string, _text: string): Promise<void> { }
  async sendDirectMessage(_meetingCode: string, _toPeerId: string, _text: string): Promise<void> { }
  async sendAnnouncement(_meetingCode: string, message: string, hostName?: string): Promise<void> {
    this._fire('AnnouncementReceived', {
      id: Math.random().toString(36).slice(2),
      message,
      timestamp: new Date().toISOString(),
      hostName: hostName || 'Host',
    });
  }

  on(event: string, handler: EventHandler): void {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this._handlers.get(event)?.delete(handler);
  }

  private _patch(partial: Partial<MachineState>): void {
    this._state = { ...this._state, ...partial };
    this._listeners.forEach(l => l(this._state));
  }

  private _fire(event: string, ...args: unknown[]): void {
    this._handlers.get(event)?.forEach(h => h(...args));
  }

  private _setStatus(status: ConnectionStatus): void {
    this._connectionStatus = status;
    this._fire('ConnectionStatusChanged', status);
  }
}
