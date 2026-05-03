import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../mock/chatStore';

interface ChatPanelProps {
  selfPeerId: string | null;
  selfName: string;
  selfAvatar?: string;
  onClose: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel({ selfPeerId, selfName, selfAvatar, onClose }: ChatPanelProps) {
  const { messages, send } = useChat();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !selfPeerId) return;
    send({
      peerId: selfPeerId,
      displayName: selfName || 'You',
      text,
      avatarUrl: selfAvatar ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${selfPeerId}`,
    });
    setDraft('');
  };

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
          Room Chat
        </span>
        <button className="chat-close" onClick={onClose} aria-label="Close chat">✕</button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => {
          const isSelf = msg.peerId === selfPeerId;
          const prevPeer = i > 0 ? messages[i - 1].peerId : null;
          const grouped = prevPeer === msg.peerId;
          return (
            <div key={msg.id} className={`chat-msg ${isSelf ? 'chat-msg-self' : ''} ${grouped ? 'chat-msg-grouped' : ''}`}>
              {!grouped && (
                <div className="chat-msg-meta">
                  <img
                    src={msg.avatarUrl ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${msg.peerId}`}
                    alt={msg.displayName}
                    className="chat-avatar"
                  />
                  <span className="chat-msg-name">{isSelf ? 'You' : msg.displayName}</span>
                  <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
              )}
              <div className="chat-bubble">{msg.text}</div>
            </div>
          );
        })}

        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              className="chat-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No messages yet. Say hi!
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="chat-input"
          placeholder="Send a message…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          maxLength={300}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!draft.trim()}
          aria-label="Send"
        >
          ↑
        </button>
      </div>
    </motion.div>
  );
}
