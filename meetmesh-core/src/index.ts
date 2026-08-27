export { MeshClient }        from './MeshClient';
export { StateMachine }      from './StateMachine';
export {
  generateMeetingCode,
  isValidMeetingCode,
  normalizeMeetingCode,
}                            from './MeetingCodeGen';
export type {
  Participant,
  ParticipantProfile,
  MeetingRoom,
  WaitingPeer,
  ParticipantRole,
  ConnectionStatus,
  MeetingPhase,
  MeetingCreatedPayload,
  ParticipantJoinedPayload,
  ParticipantLeftPayload,
  RoleChangedPayload,
  MetadataUpdatedPayload,
  HostChangedPayload,
  ErrorPayload,
  ChatMessage,
}                            from './types';
export { parseProfile }      from './types';
export type { MachineState, MachineEvent } from './StateMachine';
