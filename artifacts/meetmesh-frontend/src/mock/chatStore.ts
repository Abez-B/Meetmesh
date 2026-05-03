import { useState, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  peerId: string;
  displayName: string;
  text: string;
  timestamp: string;
  avatarUrl?: string;
}

type ChatListener = (messages: ChatMessage[]) => void;

class ChatStore {
  private _messages: ChatMessage[] = [];
  private _listeners: ChatListener[] = [];

  get messages(): ChatMessage[] { return this._messages; }

  seed(messages: ChatMessage[]): void {
    this._messages = messages;
  }

  subscribe(listener: ChatListener): () => void {
    this._listeners.push(listener);
    listener(this._messages);
    return () => { this._listeners = this._listeners.filter(l => l !== listener); };
  }

  send(msg: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    const full: ChatMessage = {
      ...msg,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this._messages = [...this._messages, full];
    this._listeners.forEach(l => l(this._messages));
  }
}

export const chatStore = new ChatStore();

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(chatStore.messages);
  useEffect(() => chatStore.subscribe(setMessages), []);
  return {
    messages,
    send: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => chatStore.send(msg),
  };
}
