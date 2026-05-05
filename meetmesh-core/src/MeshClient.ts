import { io, Socket } from 'socket.io-client';
import { StateMachine } from './StateMachine.js';
import type { ConnectionStatus, MeetingCreatedPayload } from './types.js';

type EventMap = {
  ConnectionStatusChanged: (status: ConnectionStatus) => void;
  MeetingCreated:          (payload: MeetingCreatedPayload) => void;
  RateLimited:             (method: string) => void;
  Error:                   (payload: { code: string; detail: string }) => void;
  Kicked:                  (payload: { meetingCode: string }) => void;
};

export class MeshClient {
  private readonly _socket:   Socket;
  private readonly _machine:  StateMachine;
  private readonly _handlers: Map<string, Set<Function>> = new Map();
  private _connectionStatus:  ConnectionStatus = 'disconnected';
  private _hostSecret:        string | null = null;

  constructor(url: string, selfPeerId?: string) {
    this._machine = new StateMachine(selfPeerId ?? null);

    this._socket = io(url, {
      autoConnect:            false,
      reconnection:           true,
      reconnectionDelay:      1000,
      reconnectionDelayMax:   30_000,
      reconnectionAttempts:   Infinity,
    });

    this._registerSocketEvents();
    this._registerLifecycleEvents();
  }

  // ── State ─────────────────────────────────────────────────────────────────

  get state() { return this._machine.state; }
  get connectionStatus(): ConnectionStatus { return this._connectionStatus; }

  subscribeToState(listener: Parameters<StateMachine['subscribe']>[0]) {
    return this._machine.subscribe(listener);
  }

  // ── Connection ────────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    if (this._socket.connected) return;
    return new Promise((resolve, reject) => {
      this._setStatus('connecting');
      const onConnect      = () => { cleanup(); this._setStatus('connected'); resolve(); };
      const onConnectError = (e: Error) => { cleanup(); reject(e); };
      const cleanup        = () => {
        this._socket.off('connect',       onConnect);
        this._socket.off('connect_error', onConnectError);
      };
      this._socket.once('connect',       onConnect);
      this._socket.once('connect_error', onConnectError);
      this._socket.connect();
    });
  }

  async disconnect(): Promise<void> {
    this._socket.disconnect();
    this._setStatus('disconnected');
    this._machine.reset();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async createMeeting(eventName: string, peerId: string, profileJson = '{}'): Promise<void> {
    this._machine.setSelfPeerId(peerId);
    await this._invoke('create_meeting', { eventName, peerId, profileJson });
  }

  async joinMeeting(meetingCode: string, displayName: string, peerId: string, profileJson = '{}'): Promise<void> {
    this._machine.setSelfPeerId(peerId);
    await this._invoke('join_meeting', { meetingCode, displayName, peerId, profileJson });
  }

  async admitParticipant(meetingCode: string, peerId: string): Promise<void> {
    await this._invoke('admit_participant', { meetingCode, peerId });
  }

  async kickParticipant(meetingCode: string, peerId: string): Promise<void> {
    await this._invoke('kick_participant', { meetingCode, peerId });
  }

  async changeRole(meetingCode: string, peerId: string, newRole: string): Promise<void> {
    await this._invoke('change_role', { meetingCode, peerId, newRole });
  }

  async toggleWaitingRoom(meetingCode: string, isEnabled: boolean): Promise<void> {
    await this._invoke('toggle_waiting_room', { meetingCode, isEnabled });
  }

  async updateMetadata(meetingCode: string, json: string): Promise<void> {
    await this._invoke('update_metadata', { meetingCode, json });
  }

  async closeMeeting(meetingCode: string): Promise<void> {
    await this._invoke('close_meeting', { meetingCode });
  }

  async claimHost(meetingCode: string, peerId: string): Promise<void> {
    if (!this._hostSecret) throw new Error('No host secret available');
    const enc     = new TextEncoder();
    const keyData = enc.encode(this._hostSecret);
    const key     = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig   = await crypto.subtle.sign('HMAC', key, enc.encode(`${meetingCode}:${peerId}`));
    const proof = btoa(String.fromCharCode(...new Uint8Array(sig)));
    await this._invoke('claim_host', { meetingCode, peerId, proof });
  }

  async heartbeat(meetingCode: string): Promise<void> {
    const sentAt = Date.now();
    await this._invoke('heartbeat', { meetingCode });
    this._machine.setLatency(Date.now() - sentAt);
  }

  // ── Event emitter ─────────────────────────────────────────────────────────

  on<K extends keyof EventMap>(event: K, handler: EventMap[K]): void {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event)!.add(handler as Function);
  }

  off<K extends keyof EventMap>(event: K, handler: EventMap[K]): void {
    this._handlers.get(event)?.delete(handler as Function);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _registerSocketEvents(): void {
    const s = this._socket;

    // Server → state machine (same event names as SignalR — no page changes needed)
    s.on('FullState',           p => this._machine.apply({ type: 'FullState',           payload: p }));
    s.on('ParticipantJoined',   p => this._machine.apply({ type: 'ParticipantJoined',   payload: p }));
    s.on('ParticipantLeft',     p => this._machine.apply({ type: 'ParticipantLeft',     payload: p }));
    s.on('RoleChanged',         p => this._machine.apply({ type: 'RoleChanged',         payload: p }));
    s.on('MetadataUpdated',     p => this._machine.apply({ type: 'MetadataUpdated',     payload: p }));
    s.on('HostChanged',         p => this._machine.apply({ type: 'HostChanged',         payload: p }));
    s.on('WaitingRoomUpdate',   p => this._machine.apply({ type: 'WaitingRoomUpdate',   payload: p }));
    s.on('WaitingRoomToggled',  p => this._machine.apply({ type: 'WaitingRoomToggled',  payload: p }));
    s.on('WaitingForAdmission', p => this._machine.apply({ type: 'WaitingForAdmission', payload: p }));
    s.on('MeetingEnded',        () => this._machine.apply({ type: 'MeetingEnded' }));

    s.on('MeetingCreated', (p: MeetingCreatedPayload & { hostSecret?: string }) => {
      if (p.hostSecret) {
        this._hostSecret = p.hostSecret;
        this._machine.apply({ type: 'HostSecretSet', payload: { secret: p.hostSecret } });
      }
      this._emit('MeetingCreated', p);
    });

    s.on('Kicked',        p  => this._emit('Kicked', p));
    s.on('HeartbeatAck',  () => { /* latency measured on emit side */ });
    s.on('Error',         (p: { code: string; detail: string }) => {
      if (p.code === 'RATE_LIMITED') this._emit('RateLimited', p.detail);
      else this._emit('Error', p);
    });
  }

  private _registerLifecycleEvents(): void {
    this._socket.on('reconnect_attempt', () => this._setStatus('reconnecting'));

    this._socket.on('reconnect', async () => {
      this._setStatus('connected');
      const { room, selfPeerId } = this._machine.state;
      if (room?.meetingCode && selfPeerId) {
        const self = room.participants[selfPeerId];
        if (self) {
          await this._invoke('join_meeting', {
            meetingCode:  room.meetingCode,
            displayName:  self.displayName,
            peerId:       selfPeerId,
            profileJson:  self.json,
          });
        }
      }
    });

    this._socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') this._setStatus('disconnected');
      else this._setStatus('reconnecting');
    });
  }

  private _invoke(event: string, data: Record<string, unknown>): Promise<void> {
    return new Promise((resolve) => {
      if (!this._socket.connected) {
        console.warn(`[MeshClient] Cannot emit ${event}: not connected`);
        resolve();
        return;
      }
      this._socket.emit(event, data, () => resolve());
    });
  }

  private _emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void {
    this._handlers.get(event)?.forEach(h => (h as Function)(...args));
  }

  private _setStatus(status: ConnectionStatus): void {
    this._connectionStatus = status;
    this._emit('ConnectionStatusChanged', status);
  }
}
