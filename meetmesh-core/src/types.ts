export type ParticipantRole = 'Host' | 'Organizer' | 'Speaker' | 'Attendee';

export interface Participant {
  peerId:       string;
  displayName:  string;
  role:         ParticipantRole;
  isAdmitted:   boolean;
  joinedAt:     string;   // ISO 8601
  json:         string;   // free-form metadata blob
}

export interface ParticipantProfile {
  name?: string;
  linkedIn: string;
  portfolio?: string;
  github?: string;
  bio?: string;
  photo?: string; // base64 jpeg
}

export function parseProfile(json: string): ParticipantProfile | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      name: parsed.name || '',
      linkedIn: parsed.linkedIn || '',
      portfolio: parsed.portfolio,
      github: parsed.github,
      bio: parsed.bio,
      photo: parsed.photo,
    };
  } catch {
    return null;
  }
}

export interface MeetingRoom {
  meetingCode:  string;
  eventName:    string;
  subtitle?:    string;
  description?: string;
  hostPeerId:   string;
  startedAt:    string;
  waitingRoomEnabled: boolean;
  participants: Record<string, Participant>;
}

export interface WaitingPeer {
  peerId:      string;
  displayName: string;
  joinedAt:    string;
}

// ── Hub payload types ────────────────────────────────────────────────────────

export interface MeetingCreatedPayload {
  meetingCode: string;
  eventName: string;
  startedAt: string;
  hostSecret?: string;
}

export interface ParticipantJoinedPayload extends Participant {}

export interface ParticipantLeftPayload {
  peerId: string;
}

export interface RoleChangedPayload {
  peerId:  string;
  newRole: ParticipantRole;
}

export interface MetadataUpdatedPayload {
  peerId: string;
  json:   string;
}

export interface HostChangedPayload {
  newHostPeerId: string;
}

export interface ErrorPayload {
  code:   string;
  detail: string;
}

export interface HeartbeatAckPayload {
  serverTime: string;
}

// ── Connection state ──────────────────────────────────────────────────────────

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export type MeetingPhase =
  | 'idle'
  | 'waiting'    // joined but not admitted
  | 'active'     // admitted and in meeting
  | 'ended';
