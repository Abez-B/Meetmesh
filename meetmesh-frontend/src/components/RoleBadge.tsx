import type { ParticipantRole } from 'meetmesh-core';

const CLASS_BY_ROLE: Record<ParticipantRole, string> = {
  Host: 'role-badge--host',
  Organizer: 'role-badge--organizer',
  Speaker: 'role-badge--speaker',
  Attendee: 'role-badge--attendee',
};

export function RoleBadge({ role }: { role: ParticipantRole }) {
  return (
    <span className={`role-badge ${CLASS_BY_ROLE[role]}`}>
      {role}
    </span>
  );
}
