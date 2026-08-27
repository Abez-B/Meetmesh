import { Participant, parseProfile } from 'meetmesh-core';

export interface ExportContactOptions {
  eventName?: string;
  visitedOnly?: boolean;
}

/**
 * Generates and triggers download of a .vcf (vCard) file for mobile & desktop address books
 */
export function exportContactsAsVCard(
  participants: Participant[],
  visitedNodes: Set<string>,
  options: ExportContactOptions = {}
): void {
  const targetParticipants = options.visitedOnly
    ? participants.filter(p => visitedNodes.has(p.peerId))
    : participants;

  if (targetParticipants.length === 0) {
    alert('No contacts to export yet. Visit or click attendee nodes first!');
    return;
  }

  const vcards = targetParticipants.map(p => {
    const profile = parseProfile(p.json);
    const name = p.displayName || profile?.name || 'Contact';
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${name}`,
      `N:${lastName};${firstName};;;`,
      `TITLE:${p.role || 'Attendee'}`,
    ];

    if (profile?.linkedIn) {
      const url = profile.linkedIn.startsWith('http') ? profile.linkedIn : `https://${profile.linkedIn}`;
      lines.push(`URL;TYPE=LinkedIn:${url}`);
    }

    if (profile?.github) {
      const url = profile.github.startsWith('http') ? profile.github : `https://${profile.github}`;
      lines.push(`URL;TYPE=GitHub:${url}`);
    }

    const noteSegments: string[] = [];
    if (options.eventName) noteSegments.push(`Met at: ${options.eventName}`);
    if (profile?.bio) noteSegments.push(`Bio: ${profile.bio}`);
    if (profile?.tags && profile.tags.length > 0) noteSegments.push(`Tags: ${profile.tags.join(', ')}`);

    if (noteSegments.length > 0) {
      lines.push(`NOTE:${noteSegments.join(' | ')}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
  }).join('\r\n');

  const cleanEvent = (options.eventName || 'we-inai-event').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  downloadBlob(vcards, `${cleanEvent}-contacts.vcf`, 'text/vcard;charset=utf-8;');
}

/**
 * Generates and triggers download of a .csv file
 */
export function exportContactsAsCSV(
  participants: Participant[],
  visitedNodes: Set<string>,
  options: ExportContactOptions = {}
): void {
  const targetParticipants = options.visitedOnly
    ? participants.filter(p => visitedNodes.has(p.peerId))
    : participants;

  if (targetParticipants.length === 0) {
    alert('No contacts to export yet. Visit or click attendee nodes first!');
    return;
  }

  const headers = ['Name', 'Role', 'LinkedIn', 'GitHub', 'Bio', 'Tags', 'Visited'];
  const rows = targetParticipants.map(p => {
    const profile = parseProfile(p.json);
    const escape = (str?: string) => `"${(str || '').replace(/"/g, '""')}"`;

    return [
      escape(p.displayName || profile?.name),
      escape(p.role),
      escape(profile?.linkedIn),
      escape(profile?.github),
      escape(profile?.bio),
      escape(profile?.tags?.join(', ')),
      visitedNodes.has(p.peerId) ? 'Yes' : 'No',
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const cleanEvent = (options.eventName || 'we-inai-event').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  downloadBlob(csvContent, `${cleanEvent}-contacts.csv`, 'text/csv;charset=utf-8;');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
