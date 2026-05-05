import type { Participant, ParticipantRole, WaitingPeer } from 'meetmesh-core';
import type { ChatMessage } from './chatStore';

const NOW = new Date().toISOString();
const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();

export interface MockPersonData {
  peerId: string;
  displayName: string;
  role: ParticipantRole;
  bio: string;
  linkedIn: string;
  github?: string;
  avatar: string;
}

export const MOCK_PEOPLE: MockPersonData[] = [
  {
    peerId: 'sarah-chen',
    displayName: 'Sarah Chen',
    role: 'Organizer',
    bio: 'Product designer at Figma. Previously at Notion. Passionate about design systems.',
    linkedIn: 'linkedin.com/in/sarah-chen',
    github: 'github.com/sarah-chen',
    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=sarah-chen&backgroundColor=b6e3f4',
  },
  {
    peerId: 'marcus-rodriguez',
    displayName: 'Marcus Rodriguez',
    role: 'Speaker',
    bio: 'Founder @ DevFlow. YC S23. Building dev tools for the next billion programmers.',
    linkedIn: 'linkedin.com/in/marcus-rodriguez',
    github: 'github.com/mrodriguez',
    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=marcus&backgroundColor=c0aede',
  },
  {
    peerId: 'emily-watson',
    displayName: 'Emily Watson',
    role: 'Attendee',
    bio: 'Partner at a16z. Focused on dev tools, AI infra, and the future of work.',
    linkedIn: 'linkedin.com/in/emily-watson',
    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=emily&backgroundColor=d1f4d1',
  },
  {
    peerId: 'james-kim',
    displayName: 'James Kim',
    role: 'Attendee',
    bio: 'ML engineer at OpenAI. Working on GPT inference optimization at scale.',
    linkedIn: 'linkedin.com/in/james-kim',
    github: 'github.com/jkim',
    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=james&backgroundColor=ffd5dc',
  },
  {
    peerId: 'priya-patel',
    displayName: 'Priya Patel',
    role: 'Attendee',
    bio: "Co-founder @ LayerStack. Stanford CS '22. Prev Apple.",
    linkedIn: 'linkedin.com/in/priya-patel',
    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=priya&backgroundColor=ffe4b5',
  },
  {
    peerId: 'alex-johnson',
    displayName: 'Alex Johnson',
    role: 'Attendee',
    bio: 'CTO at Relay. Building real-time collaboration infra. 10x scaling enthusiast.',
    linkedIn: 'linkedin.com/in/alex-johnson',
    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=alex&backgroundColor=e8d5f5',
  },
  {
    peerId: 'nina-foster',
    displayName: 'Nina Foster',
    role: 'Speaker',
    bio: 'AI researcher. "Efficient attention in production." NeurIPS \'24. MIT PhD.',
    linkedIn: 'linkedin.com/in/nina-foster',
    avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=nina&backgroundColor=d5e8f5',
  },
];

export function toParticipant(p: MockPersonData, joinedAt = NOW): Participant {
  return {
    peerId: p.peerId,
    displayName: p.displayName,
    role: p.role,
    isAdmitted: true,
    joinedAt,
    json: JSON.stringify({
      linkedIn: p.linkedIn,
      github: p.github,
      bio: p.bio,
      photo: p.avatar,
    }),
  };
}

export const MOCK_PARTICIPANTS_MAP: Record<string, Participant> =
  Object.fromEntries(MOCK_PEOPLE.map(p => [p.peerId, toParticipant(p)]));

export const MOCK_WAITING_PEERS: WaitingPeer[] = [
  { peerId: 'david-park',  displayName: 'David Park',  joinedAt: new Date().toISOString() },
  { peerId: 'lena-nguyen', displayName: 'Lena Nguyen', joinedAt: new Date().toISOString() },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  { id: '1', peerId: 'sarah-chen',       displayName: 'Sarah Chen',       text: 'Hey everyone! Welcome to the session 👋',                      timestamp: ago(5), avatarUrl: MOCK_PEOPLE[0].avatar },
  { id: '2', peerId: 'marcus-rodriguez', displayName: 'Marcus Rodriguez', text: 'Thanks for organizing this. Really excited for today!',          timestamp: ago(4), avatarUrl: MOCK_PEOPLE[1].avatar },
  { id: '3', peerId: 'emily-watson',     displayName: 'Emily Watson',     text: 'Love the real-time mesh visualization. Is this open source?',   timestamp: ago(3), avatarUrl: MOCK_PEOPLE[2].avatar },
  { id: '4', peerId: 'james-kim',        displayName: 'James Kim',        text: 'The mesh graph is 🔥 — how many people can this handle?',       timestamp: ago(2), avatarUrl: MOCK_PEOPLE[3].avatar },
  { id: '5', peerId: 'sarah-chen',       displayName: 'Sarah Chen',       text: 'Targeting ~500 per room with the Redis adapter setup 🚀',       timestamp: ago(1), avatarUrl: MOCK_PEOPLE[0].avatar },
];
