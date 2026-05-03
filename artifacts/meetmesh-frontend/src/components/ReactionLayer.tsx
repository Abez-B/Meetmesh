import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { reactionStore, useReactions, scheduleMockReactions } from '../mock/reactionStore';
import type { Participant } from 'meetmesh-core';
import { parseProfile } from 'meetmesh-core';

const IS_MOCK = import.meta.env.VITE_MOCK_MODE === 'true';

const EMOJIS = [
  { emoji: '👋', label: 'Wave' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '🙋', label: 'Raise hand' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🎉', label: 'Celebrate' },
];

// ── Reaction bar ─────────────────────────────────────────────────────────────
interface ReactionBarProps {
  selfPeerId: string | null;
  selfName: string;
  selfAvatar?: string;
  participants: Participant[];
}

export function ReactionBar({ selfPeerId, selfName, selfAvatar, participants }: ReactionBarProps) {
  const [fired, setFired] = useState<string | null>(null);
  const mockSeeded = useRef(false);

  useEffect(() => {
    if (!IS_MOCK || mockSeeded.current || !selfPeerId) return;
    mockSeeded.current = true;
    const others = participants
      .filter(p => p.peerId !== selfPeerId)
      .map(p => {
        const prof = parseProfile(p.json);
        return { peerId: p.peerId, displayName: p.displayName, avatarUrl: prof?.photo };
      });
    scheduleMockReactions(others, selfPeerId);
  }, [participants, selfPeerId]);

  const handleFire = (emoji: string) => {
    if (!selfPeerId) return;
    reactionStore.fire({
      peerId:      selfPeerId,
      displayName: selfName,
      emoji,
      avatarUrl:   selfAvatar,
    });
    setFired(emoji);
    setTimeout(() => setFired(null), 600);
  };

  return (
    <div className="reaction-bar">
      {EMOJIS.map(({ emoji, label }) => (
        <button
          key={emoji}
          className={`reaction-btn${fired === emoji ? ' reaction-btn-fired' : ''}`}
          onClick={() => handleFire(emoji)}
          title={label}
          aria-label={label}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ── Floating reaction toasts ──────────────────────────────────────────────────
export function ReactionFloats() {
  const reactions = useReactions();

  return (
    <div className="reaction-floats" aria-live="polite" aria-atomic="false">
      <AnimatePresence>
        {reactions.map(r => (
          <motion.div
            key={r.id}
            className="reaction-float"
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: 1, y: -70, scale: 1 }}
            exit={{ opacity: 0, y: -110, scale: 0.8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="reaction-float-emoji">{r.emoji}</div>
            <div className="reaction-float-name">{r.displayName.split(' ')[0]}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
