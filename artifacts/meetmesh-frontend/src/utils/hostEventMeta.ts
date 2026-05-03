export interface HostEventMeta {
  subtitle?: string;
  description?: string;
}

const PENDING_KEY = 'meetmesh_pending_event_meta';

function eventKey(code: string) {
  return `meetmesh_event_meta_${code.toUpperCase()}`;
}

export function savePendingEventMeta(meta: HostEventMeta) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(meta));
}

export function commitPendingEventMeta(code: string) {
  const raw = localStorage.getItem(PENDING_KEY);
  if (!raw) return;
  localStorage.setItem(eventKey(code), raw);
  localStorage.removeItem(PENDING_KEY);
}

export function loadEventMeta(code?: string): HostEventMeta | null {
  if (!code) return null;
  const raw = localStorage.getItem(eventKey(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HostEventMeta;
  } catch {
    return null;
  }
}
