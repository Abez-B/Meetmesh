import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Participant } from 'meetmesh-core';
import { parseProfile } from 'meetmesh-core';
import { chatStore, useChat, useDmChat, useUnreadDms, scheduleMockReply } from '../mock/chatStore';

const IS_MOCK = import.meta.env.VITE_MOCK_MODE === 'true';

interface ChatPanelProps {
  selfPeerId: string | null;
  selfName: string;
  selfAvatar?: string;
  participants?: Participant[];
  initialDmPeerId?: string | null;
  onClose: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Global chat thread ───────────────────────────────────────────────────────
function GlobalThread({ selfPeerId, selfName, selfAvatar }: {
  selfPeerId: string; selfName: string; selfAvatar?: string;
}) {
  const { messages, send } = useChat();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    send({
      peerId:      selfPeerId,
      displayName: selfName || 'You',
      text,
      avatarUrl: selfAvatar ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${selfPeerId}`,
    });
    setDraft('');
  };

  return (
    <>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">No messages yet. Say hi! 👋</div>
        )}
        {messages.map((msg, i) => {
          const isSelf  = msg.peerId === selfPeerId;
          const grouped = i > 0 && messages[i - 1].peerId === msg.peerId;
          return (
            <div key={msg.id} className={`chat-msg ${isSelf ? 'chat-msg-self' : ''} ${grouped ? 'chat-msg-grouped' : ''}`}>
              {!grouped && (
                <div className="chat-msg-meta">
                  <img
                    src={msg.avatarUrl ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${msg.peerId}`}
                    alt={msg.displayName} className="chat-avatar"
                  />
                  <span className="chat-msg-name">{isSelf ? 'You' : msg.displayName}</span>
                  <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
              )}
              <div className="chat-bubble">{msg.text}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="chat-input"
          placeholder="Message everyone…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          maxLength={300}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!draft.trim()}>↑</button>
      </div>
    </>
  );
}

// ── Single DM thread ─────────────────────────────────────────────────────────
function DmThread({ selfPeerId, selfName, selfAvatar, other, onBack }: {
  selfPeerId: string; selfName: string; selfAvatar?: string;
  other: Participant; onBack: () => void;
}) {
  const messages   = useDmChat(selfPeerId, other.peerId);
  const [draft, setDraft] = useState('');
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const otherProf  = parseProfile(other.json);
  const otherAvatar = otherProf?.photo ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${other.peerId}`;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    chatStore.postDm(selfPeerId, other.peerId, {
      peerId:      selfPeerId,
      displayName: selfName,
      text,
      avatarUrl: selfAvatar ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${selfPeerId}`,
    });
    setDraft('');
    if (IS_MOCK) {
      scheduleMockReply(other, selfPeerId, 1800 + Math.random() * 3500);
    }
  };

  const selfAv = selfAvatar ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${selfPeerId}`;

  return (
    <>
      <div className="dm-thread-header">
        <button className="dm-back-btn" onClick={onBack} aria-label="Back">←</button>
        <img src={otherAvatar} alt={other.displayName} className="dm-thread-avatar" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="dm-thread-name">{other.displayName}</div>
          <div className="dm-thread-role">{other.role}</div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty" style={{ paddingTop: 32 }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>💬</div>
            Start a conversation with {other.displayName.split(' ')[0]}
          </div>
        )}
        {messages.map((msg, i) => {
          const isSelf  = msg.peerId === selfPeerId;
          const grouped = i > 0 && messages[i - 1].peerId === msg.peerId;
          return (
            <div key={msg.id} className={`chat-msg ${isSelf ? 'chat-msg-self' : ''} ${grouped ? 'chat-msg-grouped' : ''}`}>
              {!grouped && (
                <div className="chat-msg-meta">
                  <img src={isSelf ? selfAv : otherAvatar} alt={isSelf ? 'You' : other.displayName} className="chat-avatar" />
                  <span className="chat-msg-name">{isSelf ? 'You' : other.displayName}</span>
                  <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
              )}
              <div className="chat-bubble">{msg.text}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="chat-input"
          placeholder={`Message ${other.displayName.split(' ')[0]}…`}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          maxLength={300}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!draft.trim()}>↑</button>
      </div>
    </>
  );
}

// ── DM conversation list ──────────────────────────────────────────────────────
function DmList({ selfPeerId, participants, unread, onSelect }: {
  selfPeerId: string; participants: Participant[];
  unread: Set<string>; onSelect: (p: Participant) => void;
}) {
  const others = participants.filter(p => p.peerId !== selfPeerId);

  return (
    <div className="dm-list">
      {others.length === 0 && (
        <div className="dm-empty">
          <div className="dm-empty-icon">👥</div>
          <div className="dm-empty-text">No other participants yet.</div>
        </div>
      )}
      {others.map(p => {
        const prof     = parseProfile(p.json);
        const avatar   = prof?.photo ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${p.peerId}`;
        const convKey  = [selfPeerId, p.peerId].sort().join('|');
        const msgs     = chatStore.getDmMessages(selfPeerId, p.peerId);
        const lastMsg  = msgs[msgs.length - 1];
        const hasUnread = unread.has(convKey);
        return (
          <div key={p.peerId} className="dm-item" onClick={() => onSelect(p)}>
            <img src={avatar} alt={p.displayName} className="dm-item-avatar" />
            <div className="dm-item-info">
              <div className="dm-item-name">{p.displayName}</div>
              <div className="dm-item-preview">
                {lastMsg ? lastMsg.text : <span style={{ color: '#333', fontStyle: 'italic' }}>{p.role}</span>}
              </div>
            </div>
            {hasUnread && <div className="dm-item-unread" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Main ChatPanel ────────────────────────────────────────────────────────────
export function ChatPanel({
  selfPeerId,
  selfName,
  selfAvatar,
  participants = [],
  initialDmPeerId,
  onClose,
}: ChatPanelProps) {
  const [tab, setTab] = useState<'global' | 'dms'>(initialDmPeerId ? 'dms' : 'global');
  const [activeDm, setActiveDm] = useState<Participant | null>(() =>
    initialDmPeerId ? (participants.find(p => p.peerId === initialDmPeerId) ?? null) : null
  );
  const unread = useUnreadDms();
  const hasUnread = selfPeerId
    ? [...unread].some(key => key.split('|').includes(selfPeerId))
    : false;

  useEffect(() => {
    if (initialDmPeerId) {
      const p = participants.find(pp => pp.peerId === initialDmPeerId);
      if (p) { setActiveDm(p); setTab('dms'); }
    }
  }, [initialDmPeerId, participants]);

  return (
    <motion.div
      className="chat-panel"
      initial={{ opacity: 0, x: 320 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 320 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="chat-header">
        <span className="chat-title">
          <span className="chat-live-dot" />
          Messages
        </span>
        <button className="chat-close" onClick={onClose} aria-label="Close chat">✕</button>
      </div>

      <div className="chat-tabs">
        <button
          className={`chat-tab${tab === 'global' ? ' active' : ''}`}
          onClick={() => setTab('global')}
        >
          Global
        </button>
        <button
          className={`chat-tab${tab === 'dms' ? ' active' : ''}`}
          onClick={() => setTab('dms')}
        >
          Direct
          {hasUnread && <span className="chat-tab-unread" />}
        </button>
      </div>

      {tab === 'global' && selfPeerId && (
        <GlobalThread selfPeerId={selfPeerId} selfName={selfName} selfAvatar={selfAvatar} />
      )}

      {tab === 'dms' && selfPeerId && (
        activeDm ? (
          <DmThread
            selfPeerId={selfPeerId}
            selfName={selfName}
            selfAvatar={selfAvatar}
            other={activeDm}
            onBack={() => setActiveDm(null)}
          />
        ) : (
          <DmList
            selfPeerId={selfPeerId}
            participants={participants}
            unread={unread}
            onSelect={setActiveDm}
          />
        )
      )}

      {!selfPeerId && (
        <div className="chat-empty" style={{ margin: 'auto' }}>Connecting…</div>
      )}
    </motion.div>
  );
}
