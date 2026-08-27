import fs from 'fs/promises';
import path from 'path';
import { logger } from '../lib/logger';

export interface SerializedParticipant {
  peerId: string;
  displayName: string;
  role: 'Host' | 'Organizer' | 'Speaker' | 'Attendee' | 'Presentation';
  isAdmitted: boolean;
  joinedAt: string;
  json: string;
}

export interface SerializedMeeting {
  code: string;
  eventName: string;
  subtitle?: string;
  description?: string;
  hostPeerId: string;
  waitingRoom: boolean;
  createdAt: number;
  messages: any[];
  participants: SerializedParticipant[];
}

export class StorageService {
  private readonly dataDir: string;
  private readonly filePath: string;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), '.data');
    this.filePath = path.join(this.dataDir, 'meetings.json');
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (err) {
      logger.error({ err }, 'Failed to create data directory');
    }
  }

  async loadMeetings(): Promise<SerializedMeeting[]> {
    try {
      await this.init();
      const content = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        logger.info({ count: data.length }, 'Loaded persisted meetings from storage');
        return data;
      }
      return [];
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        logger.error({ err }, 'Error loading persisted meetings');
      }
      return [];
    }
  }

  scheduleSave(meetings: Map<string, any>): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveMeetings(meetings).catch((err) => {
        logger.error({ err }, 'Failed to persist meetings');
      });
    }, 150);
  }

  async saveMeetings(meetings: Map<string, any>): Promise<void> {
    try {
      await this.init();
      const serialized: SerializedMeeting[] = [];

      for (const meeting of meetings.values()) {
        const participants: SerializedParticipant[] = [];
        if (meeting.participants && typeof meeting.participants.values === 'function') {
          for (const p of meeting.participants.values()) {
            participants.push({
              peerId: p.peerId,
              displayName: p.displayName,
              role: p.role,
              isAdmitted: p.isAdmitted,
              joinedAt: p.joinedAt,
              json: p.json,
            });
          }
        }

        serialized.push({
          code: meeting.code,
          eventName: meeting.eventName,
          subtitle: meeting.subtitle,
          description: meeting.description,
          hostPeerId: meeting.hostPeerId,
          waitingRoom: Boolean(meeting.waitingRoom),
          createdAt: meeting.createdAt || Date.now(),
          messages: meeting.messages || [],
          participants,
        });
      }

      const tempFile = `${this.filePath}.tmp.${Date.now()}`;
      await fs.writeFile(tempFile, JSON.stringify(serialized, null, 2), 'utf-8');
      await fs.rename(tempFile, this.filePath);
      logger.debug({ count: serialized.length }, 'Persisted meetings to disk');
    } catch (err) {
      logger.error({ err }, 'Error saving persisted meetings');
    }
  }
}

export const storage = new StorageService();
