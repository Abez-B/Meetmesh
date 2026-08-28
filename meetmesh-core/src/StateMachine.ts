import type {
  MeetingRoom,
  ParticipantJoinedPayload,
  ParticipantLeftPayload,
  RoleChangedPayload,
  MetadataUpdatedPayload,
  HostChangedPayload,
  WaitingPeer,
  MeetingPhase,
} from './types';

export type MachineEvent =
  | { type: 'FullState'; payload: MeetingRoom }
  | { type: 'ParticipantJoined'; payload: ParticipantJoinedPayload }
  | { type: 'ParticipantLeft'; payload: ParticipantLeftPayload }
  | { type: 'RoleChanged'; payload: RoleChangedPayload }
  | { type: 'MetadataUpdated'; payload: MetadataUpdatedPayload }
  | { type: 'HostChanged'; payload: HostChangedPayload }
  | { type: 'WaitingRoomUpdate'; payload: WaitingPeer[] }
  | { type: 'WaitingRoomToggled'; payload: { isEnabled: boolean } }
  | { type: 'MeetingEnded' }
  | { type: 'WaitingForAdmission'; payload: { meetingCode: string } }
  | { type: 'ParticipantAdmitted' }
  | { type: 'HostSecretSet'; payload: { secret: string } };

export interface MachineState {
  phase: MeetingPhase;
  room: MeetingRoom | null;
  waitingRoom: WaitingPeer[];
  selfPeerId: string | null;
  latencyMs: number | null;
  hostSecret: string | null;
}

const INITIAL_STATE: MachineState = {
  phase: 'idle',
  room: null,
  waitingRoom: [],
  selfPeerId: null,
  latencyMs: null,
  hostSecret: null,
};

export class StateMachine {
  private _state:     MachineState;
  private _listeners: Array<(state: MachineState) => void> = [];

  constructor(selfPeerId: string | null = null) {
    this._state = { ...INITIAL_STATE, selfPeerId };
  }

  get state(): MachineState {
    return this._state;
  }

  subscribe(listener: (state: MachineState) => void): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  apply(event: MachineEvent): void {
    this._state = this._reduce(this._state, event);
    this._listeners.forEach(l => l(this._state));
  }

  setSelfPeerId(peerId: string): void {
    this._state = { ...this._state, selfPeerId: peerId };
  }

  setLatency(ms: number): void {
    this._state = { ...this._state, latencyMs: ms };
    // NOTE: Intentionally does NOT notify listeners.
    // latencyMs is internal telemetry — notifying on every heartbeat
    // would cause a full React re-render cascade 1-2× per second.
    // Read latency directly from client.state.latencyMs if needed.
  }

  setHostSecret(secret: string): void {
    this._state = { ...this._state, hostSecret: secret };
    this._listeners.forEach(l => l(this._state));
  }

  reset(): void {
      this._state = { ...INITIAL_STATE, selfPeerId: this._state.selfPeerId, hostSecret: null };
      this._listeners.forEach(l => l(this._state));
    }

  private _reduce(state: MachineState, event: MachineEvent): MachineState {
    switch (event.type) {

      case 'FullState': {
        const pArray = event.payload.participants as any;
        const pMap = typeof pArray?.length === 'number' 
          ? pArray.reduce((acc: any, p: any) => ({ ...acc, [p.peerId]: p }), {})
          : event.payload.participants;
        
        const selfP = state.selfPeerId ? pMap[state.selfPeerId] : null;
        const isWaiting = selfP && selfP.isAdmitted === false;

        return {
          ...state,
          phase: isWaiting ? 'waiting' : 'active',
          room: {
            ...event.payload,
            participants: pMap,
          },
        };
      }

      case 'WaitingForAdmission':
        return { ...state, phase: 'waiting' };

      case 'ParticipantAdmitted':
        return { ...state, phase: 'active' };

    case 'ParticipantJoined': {
      if (!state.room) return state;
      if (!event.payload.peerId || !event.payload.displayName) return state;
      return {
        ...state,
        room: {
          ...state.room,
          participants: {
            ...state.room.participants,
            [event.payload.peerId]: event.payload,
          },
        },
      };
    }

    case 'ParticipantLeft': {
      if (!state.room) return state;
      if (!event.payload.peerId) return state;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [event.payload.peerId]: _removed, ...remaining } =
        state.room.participants;
      return {
        ...state,
        room: { ...state.room, participants: remaining },
      };
    }

    case 'RoleChanged': {
      if (!state.room) return state;
      const newRole = event.payload.newRole || (event.payload as any).role;
      if (!event.payload.peerId || !newRole) return state;
      const peer = state.room.participants[event.payload.peerId];
      if (!peer) return state;
      return {
        ...state,
        room: {
          ...state.room,
          participants: {
            ...state.room.participants,
            [event.payload.peerId]: { ...peer, role: newRole },
          },
        },
      };
    }

    case 'MetadataUpdated': {
      if (!state.room) return state;
      if (!event.payload.peerId || event.payload.json === undefined) return state;
      const peer = state.room.participants[event.payload.peerId];
      if (!peer) return state;
      return {
        ...state,
        room: {
          ...state.room,
          participants: {
            ...state.room.participants,
            [event.payload.peerId]: { ...peer, json: event.payload.json },
          },
        },
      };
    }

    case 'HostChanged': {
      if (!state.room) return state;
      if (!event.payload.newHostPeerId) return state;
      return {
        ...state,
        room: { ...state.room, hostPeerId: event.payload.newHostPeerId },
      };
    }

      case 'WaitingRoomUpdate':
        return { ...state, waitingRoom: event.payload };

    case 'WaitingRoomToggled':
      if (!state.room) return state;
      return {
        ...state,
        room: { ...state.room, waitingRoomEnabled: event.payload.isEnabled }
      };

    case 'MeetingEnded':
      return { ...state, phase: 'ended', room: null, waitingRoom: [], hostSecret: null };

    case 'HostSecretSet':
      return { ...state, hostSecret: event.payload.secret };

    default:
      return state;
    }
  }
}
