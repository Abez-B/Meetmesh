import { useState, useEffect } from 'react';

export interface Reaction {
  id: string;
  peerId: string;
  displayName: string;
  emoji: string;
  timestamp: number;
  avatarUrl?: string;
}

type Listener = (reactions: Reaction[]) => void;

const TTL = 4200; // ms — reaction stays visible

class ReactionStore {
  private _all: Reaction[] = [];
  private _listeners: Listener[] = [];

  get active(): Reaction[] {
    return this._all.filter(r => Date.now() - r.timestamp < TTL);
  }

  fire(r: Omit<Reaction, 'id' | 'timestamp'>) {
    const full: Reaction = {
      ...r,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: Date.now(),
    };
    this._all = [...this._all.filter(x => Date.now() - x.timestamp < TTL), full];
    this._notify();
    setTimeout(() => {
      this._all = this._all.filter(x => x.id !== full.id);
      this._notify();
    }, TTL + 300);
  }

  subscribe(fn: Listener): () => void {
    this._listeners.push(fn);
    fn(this.active);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  private _notify() { this._listeners.forEach(l => l(this.active)); }
}

export const reactionStore = new ReactionStore();

export function useReactions(): Reaction[] {
  const [reactions, setReactions] = useState<Reaction[]>(() => reactionStore.active);
  useEffect(() => reactionStore.subscribe(setReactions), []);
  return reactions;
}

// ── Mock auto-fire from other participants ────────────────────────────────────
const MOCK_EMOJIS = ['👋', '👏', '🙋', '❤️', '🎉'];

export function scheduleMockReactions(
  participants: Array<{ peerId: string; displayName: string; avatarUrl?: string }>,
  selfPeerId: string,
) {
  const others = participants.filter(p => p.peerId !== selfPeerId);
  if (!others.length) return;

  // Fire 2-4 random reactions over the next 8-20 seconds
  const count = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const delay = 3000 + Math.random() * 17000;
    setTimeout(() => {
      const p = others[Math.floor(Math.random() * others.length)];
      reactionStore.fire({
        peerId:      p.peerId,
        displayName: p.displayName,
        emoji:       MOCK_EMOJIS[Math.floor(Math.random() * MOCK_EMOJIS.length)],
        avatarUrl:   p.avatarUrl,
      });
    }, delay);
  }
}
