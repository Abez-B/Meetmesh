import { useState, useEffect } from 'react';
import type { Participant, ChatMessage } from 'meetmesh-core';

export type { ChatMessage };

type Listener<T> = (val: T) => void;

function convKey(a: string, b: string) {
  return [a, b].sort().join('|');
}

class ChatStore {
  private _global: ChatMessage[] = [];
  private _dms    = new Map<string, ChatMessage[]>();
  private _globalListeners: Array<Listener<ChatMessage[]>> = [];
  private _dmListeners     = new Map<string, Array<Listener<ChatMessage[]>>>();
  private _unreadDms       = new Set<string>();
  private _unreadListeners : Array<Listener<Set<string>>> = [];
  private _unreadGlobalCount = 0;
  private _unreadGlobalListeners: Array<Listener<number>> = [];
  private _isChatOpen = false;

  get globalMessages() { return this._global; }
  get unreadDms()      { return this._unreadDms; }
  get unreadGlobalCount() { return this._unreadGlobalCount; }

  getDmMessages(a: string, b: string): ChatMessage[] {
    return this._dms.get(convKey(a, b)) ?? [];
  }

  setChatOpen(isOpen: boolean) {
    this._isChatOpen = isOpen;
    if (isOpen) {
      this._unreadGlobalCount = 0;
      this._notifyUnreadGlobal();
    }
  }

  handleIncomingGlobal(msg: ChatMessage, selfPeerId?: string | null) {
    if (this._global.some(m => m.id === msg.id)) return;
    this._global = [...this._global, msg];
    if (selfPeerId && msg.peerId !== selfPeerId && !this._isChatOpen) {
      this._unreadGlobalCount++;
      this._notifyUnreadGlobal();
    }
    this._notifyGlobal();
  }

  handleIncomingDm(msg: ChatMessage, selfPeerId?: string | null) {
    const targetPeer = msg.toPeerId || ((msg.peerId === selfPeerId) ? '' : msg.peerId);
    if (!targetPeer) return;
    const key = convKey(msg.peerId, targetPeer);
    const msgs = this._dms.get(key) ?? [];
    if (msgs.some(m => m.id === msg.id)) return;
    this._dms.set(key, [...msgs, msg]);
    this._notifyDm(key);
    if (selfPeerId && msg.peerId !== selfPeerId) {
      this._unreadDms = new Set(this._unreadDms).add(key);
      this._notifyUnread();
    }
  }

  seedGlobal(messages: ChatMessage[]) {
    const globalList: ChatMessage[] = [];
    for (const m of messages) {
      if (m.toPeerId) {
        const key = convKey(m.peerId, m.toPeerId);
        const existing = this._dms.get(key) ?? [];
        if (!existing.some(x => x.id === m.id)) {
          this._dms.set(key, [...existing, m]);
        }
      } else {
        globalList.push(m);
      }
    }
    const map = new Map<string, ChatMessage>();
    for (const m of this._global) map.set(m.id, m);
    for (const m of globalList) map.set(m.id, m);
    this._global = Array.from(map.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    this._notifyGlobal();
    this._dms.forEach((_, k) => this._notifyDm(k));
  }

  subscribeGlobal(fn: Listener<ChatMessage[]>): () => void {
    this._globalListeners.push(fn);
    fn(this._global);
    return () => { this._globalListeners = this._globalListeners.filter(l => l !== fn); };
  }

  subscribeDm(a: string, b: string, fn: Listener<ChatMessage[]>): () => void {
    const key = convKey(a, b);
    if (!this._dmListeners.has(key)) this._dmListeners.set(key, []);
    this._dmListeners.get(key)!.push(fn);
    fn(this.getDmMessages(a, b));
    return () => {
      const arr = this._dmListeners.get(key) ?? [];
      this._dmListeners.set(key, arr.filter(l => l !== fn));
    };
  }

  subscribeUnread(fn: Listener<Set<string>>): () => void {
    this._unreadListeners.push(fn);
    fn(this._unreadDms);
    return () => { this._unreadListeners = this._unreadListeners.filter(l => l !== fn); };
  }

  subscribeUnreadGlobal(fn: Listener<number>): () => void {
    this._unreadGlobalListeners.push(fn);
    fn(this._unreadGlobalCount);
    return () => { this._unreadGlobalListeners = this._unreadGlobalListeners.filter(l => l !== fn); };
  }

  markDmRead(a: string, b: string) {
    const key = convKey(a, b);
    if (this._unreadDms.has(key)) {
      const next = new Set(this._unreadDms);
      next.delete(key);
      this._unreadDms = next;
      this._notifyUnread();
    }
  }

  postGlobal(msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const full = this._make(msg);
    this._global = [...this._global, full];
    this._notifyGlobal();
    return full;
  }

  postDm(
    from: string,
    to: string,
    msg: Omit<ChatMessage, 'id' | 'timestamp'>,
    markUnread = false,
  ): ChatMessage {
    const key  = convKey(from, to);
    const full = this._make(msg);
    this._dms.set(key, [...(this._dms.get(key) ?? []), full]);
    this._notifyDm(key);
    if (markUnread) {
      this._unreadDms = new Set(this._unreadDms).add(key);
      this._notifyUnread();
    }
    return full;
  }

  private _make(msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    return {
      ...msg,
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
  }
  private _notifyGlobal() { this._globalListeners.forEach(l => l(this._global)); }
  private _notifyDm(key: string) {
    const msgs = this._dms.get(key) ?? [];
    (this._dmListeners.get(key) ?? []).forEach(l => l(msgs));
  }
  private _notifyUnread() { this._unreadListeners.forEach(l => l(this._unreadDms)); }
  private _notifyUnreadGlobal() { this._unreadGlobalListeners.forEach(l => l(this._unreadGlobalCount)); }

  // Legacy shim — keeps MockMeshClient working unchanged
  get messages() { return this._global; }
  seed(messages: ChatMessage[]) { this.seedGlobal(messages); }
  send(msg: Omit<ChatMessage, 'id' | 'timestamp'>) { return this.postGlobal(msg); }
  subscribe(fn: Listener<ChatMessage[]>) { return this.subscribeGlobal(fn); }
}

export const chatStore = new ChatStore();

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(chatStore.globalMessages);
  useEffect(() => chatStore.subscribeGlobal(setMessages), []);
  return {
    messages,
    send: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => chatStore.postGlobal(msg),
  };
}

export function useDmChat(selfId: string, otherId: string): ChatMessage[] {
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => chatStore.getDmMessages(selfId, otherId),
  );
  useEffect(() => {
    chatStore.markDmRead(selfId, otherId);
    return chatStore.subscribeDm(selfId, otherId, (msgs) => {
      setMessages(msgs);
      chatStore.markDmRead(selfId, otherId);
    });
  }, [selfId, otherId]);
  return messages;
}

export function useUnreadDms(): Set<string> {
  const [unread, setUnread] = useState<Set<string>>(() => chatStore.unreadDms);
  useEffect(() => chatStore.subscribeUnread(setUnread), []);
  return unread;
}

export function useUnreadGlobal(): number {
  const [count, setCount] = useState<number>(() => chatStore.unreadGlobalCount);
  useEffect(() => chatStore.subscribeUnreadGlobal(setCount), []);
  return count;
}

// ── Mock auto-reply ──────────────────────────────────────────────────────────

const MOCK_REPLIES = [
  'Hey! Happy to connect 👋',
  'Great to meet you at this event!',
  "Thanks for reaching out! What are you working on?",
  "Definitely — let's chat more after the session.",
  "Cool! I'd love to hear more about what you're building.",
  "Interesting! Let's connect on LinkedIn too 🚀",
  "Absolutely, sounds great!",
  "Nice to meet you! What brings you to this event?",
];

export function scheduleMockReply(from: Participant, toId: string, delayMs: number) {
  setTimeout(() => {
    let photo = `https://api.dicebear.com/7.x/thumbs/svg?seed=${from.peerId}`;
    try {
      const p = JSON.parse(from.json ?? '{}');
      if (p.photo) photo = p.photo as string;
    } catch { /* noop */ }
    chatStore.postDm(
      from.peerId,
      toId,
      {
        peerId:      from.peerId,
        displayName: from.displayName,
        text:        MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)],
        avatarUrl:   photo,
      },
      true, // markUnread — triggers the red dot
    );
  }, delayMs);
}
