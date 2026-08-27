import { Router, type IRouter } from "express";
import { Server, type Socket } from "socket.io";
import { createServer, type Server as HTTPServer } from "http";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger";
import { storage } from "../services/storage";

interface Participant {
  peerId: string;
  displayName: string;
  connectionId: string;
  role: 'Host' | 'Organizer' | 'Speaker' | 'Attendee' | 'Presentation';
  isAdmitted: boolean;
  joinedAt: string;
  json: string;
  lastHeartbeat: number;
}

interface Meeting {
  code: string;
  eventName: string;
  subtitle?: string;
  description?: string;
  hostPeerId: string;
  participants: Map<string, Participant>;
  waitingRoom: boolean;
  createdAt: number;
  messages: ChatMessage[];
  /** Timer handle for auto-expiry when all participants leave */
  expiryTimer?: ReturnType<typeof setTimeout>;
}

export interface ChatMessage {
  id: string;
  meetingCode: string;
  peerId: string;
  displayName: string;
  text: string;
  timestamp: string;
  avatarUrl?: string;
  toPeerId?: string;
}

export interface WaitingPeer {
  peerId: string;
  displayName: string;
  joinedAt: string;
}

function getWaitingPeers(meeting: Meeting): WaitingPeer[] {
  const list: WaitingPeer[] = [];
  for (const p of meeting.participants.values()) {
    if (!p.isAdmitted) {
      list.push({
        peerId: p.peerId,
        displayName: p.displayName,
        joinedAt: p.joinedAt,
      });
    }
  }
  return list;
}

const meetings        = new Map<string, Meeting>();
const peerToMeeting   = new Map<string, string>();
const peerToParticipant = new Map<string, Participant>();

// Restore meetings from persistent storage on startup
storage.loadMeetings().then((restored) => {
  for (const item of restored) {
    const participantsMap = new Map<string, Participant>();
    for (const p of item.participants) {
      participantsMap.set(p.peerId, {
        peerId: p.peerId,
        displayName: p.displayName,
        connectionId: '',
        role: p.role,
        isAdmitted: p.isAdmitted,
        joinedAt: p.joinedAt,
        json: p.json,
        lastHeartbeat: Date.now(),
      });
      peerToMeeting.set(p.peerId, item.code);
    }

    meetings.set(item.code, {
      code: item.code,
      eventName: item.eventName,
      subtitle: item.subtitle,
      description: item.description,
      hostPeerId: item.hostPeerId,
      participants: participantsMap,
      waitingRoom: item.waitingRoom,
      createdAt: item.createdAt,
      messages: item.messages || [],
    });
  }
  if (restored.length > 0) {
    logger.info({ restored: restored.length }, "Meetings restored from database/storage");
  }
}).catch((err) => {
  logger.error({ err }, "Error restoring meetings from storage");
});

// ── Rate limiting — joins per IP ───────────────────────────────────────────
const joinRateMap = new Map<string, { count: number; resetAt: number }>();
const JOIN_RATE_LIMIT  = 50;   // max joins
const JOIN_RATE_WINDOW = 10_000; // per 10 seconds

function checkJoinRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = joinRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    joinRateMap.set(ip, { count: 1, resetAt: now + JOIN_RATE_WINDOW });
    return true;
  }
  if (entry.count >= JOIN_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Disconnect buffer config ───────────────────────────────────────────────
// Attendees get a 5-minute grace period on disconnect (accidental refresh, tab switch, mobile lock).
// The host can NEVER leave / be deleted by disconnect or idle timeouts.
const DISCONNECT_BUFFER_MS = 5 * 60_000; // 5 minutes
const disconnectTimers = new Map<string, NodeJS.Timeout>();

// ── Meeting expiry ─────────────────────────────────────────────────────────
const EMPTY_MEETING_TTL_MS = 30 * 60_000; // 30 minutes

function scheduleExpiryIfEmpty(meeting: Meeting, io: Server) {
  if (meeting.participants.size > 0) return;
  clearTimeout(meeting.expiryTimer);
  meeting.expiryTimer = setTimeout(() => {
    if (meeting.participants.size === 0) {
      meetings.delete(meeting.code);
      logger.info({ code: meeting.code }, "Auto-expired empty meeting");
    }
  }, EMPTY_MEETING_TTL_MS);
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode(): string {
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return result;
}

export function setupSocketIO(server: HTTPServer) {
  const io = new Server(server, {
    cors: {
      origin: process.env["ALLOWED_ORIGIN"] || "*",
      methods: ["GET", "POST"],
    },
  });

  // ── Heartbeat watchdog (runs every 15s) ──────────────────────────────────
  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    for (const [code, meeting] of meetings) {
      for (const [peerId, participant] of meeting.participants) {
        // Never kick the meeting host due to idle or heartbeat delay
        if (peerId === meeting.hostPeerId) continue;

        // If the socket is still connected, the tab is simply idle/in background. Do NOT kick!
        const targetSocket = io.sockets.sockets.get(participant.connectionId);
        if (targetSocket && targetSocket.connected) {
          continue;
        }

        // Only kick if socket is completely disconnected AND 5-minute buffer expired
        if (now - participant.lastHeartbeat > DISCONNECT_BUFFER_MS) {
          logger.info({ peerId, code }, "Purging participant: 5-minute disconnect buffer expired");
          if (targetSocket) {
            targetSocket.emit("Kicked", { meetingCode: code, reason: "heartbeat_timeout" });
            targetSocket.leave(code);
          }
          meeting.participants.delete(peerId);
          peerToMeeting.delete(peerId);
          peerToParticipant.delete(peerId);
          io.to(code).emit("ParticipantLeft", { peerId });
        }
      }
      scheduleExpiryIfEmpty(meeting, io);
    }
  }, 15_000);

  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Client connected");
    const remoteIp = (socket.handshake.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      ?? socket.handshake.address;

    socket.on("create_meeting", async (
      data: { eventName: string; peerId: string; profileJson?: string; subtitle?: string; description?: string },
      callback?: (err?: any) => void,
    ) => {
      try {
        const code = generateCode();
        const hostSecret = uuidv4();

        let displayName = "Host";
        try {
          const profile = JSON.parse(data.profileJson || "{}");
          if (profile.name) displayName = profile.name;
        } catch {}

        const meeting: Meeting = {
          code,
          eventName: data.eventName,
          subtitle: data.subtitle,
          description: data.description,
          hostPeerId: data.peerId,
          participants: new Map(),
          waitingRoom: false,
          createdAt: Date.now(),
          messages: [],
        };

        const host: Participant = {
          peerId: data.peerId,
          displayName,
          connectionId: socket.id,
          role: "Host",
          isAdmitted: true,
          joinedAt: new Date().toISOString(),
          json: data.profileJson || "{}",
          lastHeartbeat: Date.now(),
        };

        meeting.participants.set(data.peerId, host);
        meetings.set(code, meeting);
        peerToMeeting.set(data.peerId, code);
        peerToParticipant.set(data.peerId, host);

        socket.join(code);
        socket.join(`peer:${data.peerId}`);
        socket.data = { meetingCode: code, peerId: data.peerId };

        socket.emit("MeetingCreated", { meetingCode: code, hostSecret });
        socket.emit("FullState", {
          meetingCode: code,
          eventName: data.eventName,
          hostPeerId: data.peerId,
          participants: { [data.peerId]: host },
          messages: [],
        });

        storage.scheduleSave(meetings);

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error creating meeting");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("join_meeting", (
      data: { meetingCode: string; displayName: string; peerId: string; profileJson?: string },
      callback?: (err?: any) => void,
    ) => {
      try {
        // Rate limit
        if (!checkJoinRateLimit(remoteIp)) {
          socket.emit("Error", { code: "RATE_LIMITED", detail: "Too many join requests. Please wait." });
          if (callback) callback({ code: "RATE_LIMITED" });
          return;
        }

        const code = data.meetingCode.toUpperCase();
        const meeting = meetings.get(code);

        if (!meeting) {
          socket.emit("Error", { code: "NOT_FOUND", detail: "Meeting not found" });
          if (callback) callback();
          return;
        }

        // Cancel any pending disconnect purge timer for this peer
        const timerKey = `${code}:${data.peerId}`;
        const pendingTimer = disconnectTimers.get(timerKey);
        if (pendingTimer) {
          clearTimeout(pendingTimer);
          disconnectTimers.delete(timerKey);
          logger.info({ peerId: data.peerId, code }, "Cancelled disconnect timer — peer rejoined within 5-minute buffer");
        }

        // ── Reconnect deduplication ───────────────────────────────────────
        // If the peer already exists in this meeting, just update their
        // connectionId and socket data rather than creating a duplicate entry.
        const existingParticipant = meeting.participants.get(data.peerId);
        if (existingParticipant) {
          existingParticipant.connectionId = socket.id;
          existingParticipant.lastHeartbeat = Date.now();
          if (data.displayName) existingParticipant.displayName = data.displayName;
          if (data.profileJson) existingParticipant.json = data.profileJson;
          if (data.peerId === meeting.hostPeerId) existingParticipant.role = 'Host';
          peerToParticipant.set(data.peerId, existingParticipant);

          socket.join(code);
          socket.join(`peer:${data.peerId}`);
          socket.data = { meetingCode: code, peerId: data.peerId };

          // Send full state to reconnecting participant
          socket.emit("FullState", {
            meetingCode: code,
            eventName: meeting.eventName,
            hostPeerId: meeting.hostPeerId,
            waitingRoomEnabled: meeting.waitingRoom,
            participants: Object.fromEntries(meeting.participants),
            messages: meeting.messages,
          });

          if (!existingParticipant.isAdmitted) {
            socket.emit("WaitingForAdmission", { meetingCode: code });
          } else {
            // Notify others that this peer is back (reuse ParticipantJoined)
            socket.to(code).emit("ParticipantJoined", existingParticipant);
          }

          if (existingParticipant.role === 'Host' || existingParticipant.role === 'Organizer') {
            socket.emit("WaitingRoomUpdate", getWaitingPeers(meeting));
          }

          if (callback) callback();
          return;
        }

        // Check if in a DIFFERENT meeting — clean up first
        const existingMeeting = peerToMeeting.get(data.peerId);
        if (existingMeeting && existingMeeting !== code) {
          socket.leave(existingMeeting);
          const prevMeeting = meetings.get(existingMeeting);
          if (prevMeeting) {
            prevMeeting.participants.delete(data.peerId);
            scheduleExpiryIfEmpty(prevMeeting, io);
          }
          peerToMeeting.delete(data.peerId);
          peerToParticipant.delete(data.peerId);
        }

        let role: Participant["role"] = "Attendee";
        if (data.displayName.toLowerCase().includes("present")) {
          role = "Presentation";
        } else if (data.peerId === meeting.hostPeerId) {
          role = "Host";
        }

        const isAdmitted = !meeting.waitingRoom || role !== "Attendee";

        const participant: Participant = {
          peerId: data.peerId,
          displayName: data.displayName,
          connectionId: socket.id,
          role,
          isAdmitted,
          joinedAt: new Date().toISOString(),
          json: data.profileJson || "{}",
          lastHeartbeat: Date.now(),
        };

        meeting.participants.set(data.peerId, participant);
        peerToMeeting.set(data.peerId, code);
        peerToParticipant.set(data.peerId, participant);

        socket.join(code);
        socket.join(`peer:${data.peerId}`);
        socket.data = { meetingCode: code, peerId: data.peerId };

        socket.emit("FullState", {
          meetingCode: code,
          eventName: meeting.eventName,
          hostPeerId: meeting.hostPeerId,
          waitingRoomEnabled: meeting.waitingRoom,
          participants: Object.fromEntries(meeting.participants),
          messages: meeting.messages,
        });

        if (!isAdmitted) {
          socket.emit("WaitingForAdmission", { meetingCode: code });
          io.to(code).emit("WaitingRoomUpdate", getWaitingPeers(meeting));
        } else {
          socket.to(code).emit("ParticipantJoined", participant);
        }

        if (role === 'Host') {
          socket.emit("WaitingRoomUpdate", getWaitingPeers(meeting));
        }

        storage.scheduleSave(meetings);

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error joining meeting:");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("admit_participant", (data: { meetingCode: string; peerId: string }, callback?: (err?: any) => void) => {
      try {
        const code = data.meetingCode?.toUpperCase();
        const meeting = meetings.get(code);

        if (!meeting) {
          if (callback) callback({ code: "NOT_FOUND", detail: "Meeting not found" });
          return;
        }

        // Authorization check: Only Host or Organizer can admit participants
        const callerPeerId = socket.data?.peerId;
        const caller = meeting.participants.get(callerPeerId);
        if (!caller || (caller.role !== 'Host' && caller.role !== 'Organizer')) {
          if (callback) callback({ code: "UNAUTHORIZED", detail: "Only host or organizer can admit participants" });
          return;
        }

        const participant = meeting.participants.get(data.peerId);
        if (!participant) {
          if (callback) callback({ code: "NOT_FOUND", detail: "Participant not found in meeting" });
          return;
        }

        participant.isAdmitted = true;

        const targetSocket = io.sockets.sockets.get(participant.connectionId);
        if (targetSocket) {
          targetSocket.emit("ParticipantAdmitted", { meetingCode: code, peerId: data.peerId });
          targetSocket.emit("FullState", {
            meetingCode: code,
            eventName: meeting.eventName,
            hostPeerId: meeting.hostPeerId,
            waitingRoomEnabled: meeting.waitingRoom,
            participants: Object.fromEntries(meeting.participants),
            messages: meeting.messages,
          });
        }

        io.to(code).emit("ParticipantJoined", participant);
        io.to(code).emit("WaitingRoomUpdate", getWaitingPeers(meeting));

        storage.scheduleSave(meetings);

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error admitting participant:");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("kick_participant", (data: { meetingCode: string; peerId: string }, callback?: (err?: any) => void) => {
      try {
        const code = data.meetingCode.toUpperCase();
        const meeting = meetings.get(code);

        if (!meeting || !meeting.participants.has(data.peerId)) {
          if (callback) callback({ code: "NOT_FOUND", detail: "Participant not found" });
          return;
        }

        // Authorization check: Only Host or Organizer can kick
        const callerPeerId = socket.data?.peerId;
        const caller = meeting.participants.get(callerPeerId);
        if (!caller || (caller.role !== 'Host' && caller.role !== 'Organizer')) {
          if (callback) callback({ code: "UNAUTHORIZED", detail: "Only host or organizer can kick participants" });
          return;
        }

        // Prevent kicking the meeting host
        if (data.peerId === meeting.hostPeerId) {
          if (callback) callback({ code: "FORBIDDEN", detail: "Cannot kick the meeting host" });
          return;
        }

        const participant = meeting.participants.get(data.peerId);
        if (participant) {
          const targetSocket = io.sockets.sockets.get(participant.connectionId);
          if (targetSocket) {
            targetSocket.emit("Kicked", { meetingCode: code });
            targetSocket.leave(code);
          }
          meeting.participants.delete(data.peerId);
          peerToMeeting.delete(data.peerId);
          peerToParticipant.delete(data.peerId);
          io.to(code).emit("ParticipantLeft", { peerId: data.peerId });
          io.to(code).emit("WaitingRoomUpdate", getWaitingPeers(meeting));
          scheduleExpiryIfEmpty(meeting, io);
          storage.scheduleSave(meetings);
        }

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error kicking participant:");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("change_role", (data: { meetingCode: string; peerId: string; newRole: string }, callback?: (err?: any) => void) => {
      try {
        const code = data.meetingCode.toUpperCase();
        const meeting = meetings.get(code);

        if (!meeting || !meeting.participants.has(data.peerId)) {
          if (callback) callback({ code: "NOT_FOUND", detail: "Participant not found" });
          return;
        }

        // Authorization check: Only the Host can change roles
        const callerPeerId = socket.data?.peerId;
        if (callerPeerId !== meeting.hostPeerId) {
          if (callback) callback({ code: "UNAUTHORIZED", detail: "Only the host can change participant roles" });
          return;
        }

        const participant = meeting.participants.get(data.peerId);
        if (participant) {
          participant.role = data.newRole as any;
          io.to(code).emit("RoleChanged", { peerId: data.peerId, role: data.newRole });
          storage.scheduleSave(meetings);
        }

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error changing role:");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("toggle_waiting_room", (data: { meetingCode: string; isEnabled: boolean }, callback?: (err?: any) => void) => {
      try {
        const code = data.meetingCode.toUpperCase();
        const meeting = meetings.get(code);

        if (!meeting) {
          if (callback) callback({ code: "NOT_FOUND", detail: "Meeting not found" });
          return;
        }

        // Authorization check: Only the Host can toggle waiting room
        const callerPeerId = socket.data?.peerId;
        if (callerPeerId !== meeting.hostPeerId) {
          if (callback) callback({ code: "UNAUTHORIZED", detail: "Only the host can toggle the waiting room" });
          return;
        }

        meeting.waitingRoom = data.isEnabled;
        io.to(code).emit("WaitingRoomToggled", { meetingCode: code, isEnabled: data.isEnabled });
        io.to(code).emit("WaitingRoomUpdate", getWaitingPeers(meeting));
        storage.scheduleSave(meetings);

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error toggling waiting room:");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("update_metadata", (data: { meetingCode: string; json: string }, callback?: () => void) => {
      const peerId = socket.data?.peerId;
      const code = data.meetingCode?.toUpperCase() ?? socket.data?.meetingCode;
      if (peerId && code) {
        const meeting = meetings.get(code);
        const participant = meeting?.participants.get(peerId);
        if (participant) {
          participant.json = data.json;
          io.to(code).emit("MetadataUpdated", { peerId, json: data.json });
          storage.scheduleSave(meetings);
        }
      }
      if (callback) callback();
    });

    socket.on("heartbeat", (data: { meetingCode: string }, callback?: () => void) => {
      const peerId = socket.data?.peerId;
      if (peerId) {
        const code = (data?.meetingCode ? data.meetingCode.toUpperCase() : null) || socket.data?.meetingCode;
        if (code) {
          const meeting = meetings.get(code);
          const participant = meeting?.participants.get(peerId);
          if (participant) participant.lastHeartbeat = Date.now();
        }
      }
      if (callback) callback();
    });

    socket.on("close_meeting", (data: { meetingCode: string }, callback?: (err?: any) => void) => {
      try {
        const code = data.meetingCode.toUpperCase();
        const meeting = meetings.get(code);

        if (!meeting) {
          if (callback) callback({ code: "NOT_FOUND", detail: "Meeting not found" });
          return;
        }

        // Authorization check: Only the Host can close the meeting
        const callerPeerId = socket.data?.peerId;
        if (callerPeerId !== meeting.hostPeerId) {
          if (callback) callback({ code: "UNAUTHORIZED", detail: "Only the host can close the meeting" });
          return;
        }

        io.to(code).emit("MeetingEnded");

        Array.from(io.sockets.sockets.values()).forEach((s: Socket) => {
          if (s.rooms.has(code)) s.leave(code);
        });

        clearTimeout(meeting.expiryTimer);
        meeting.participants.forEach((participant) => {
          peerToMeeting.delete(participant.peerId);
          peerToParticipant.delete(participant.peerId);
        });
        meetings.delete(code);
        storage.scheduleSave(meetings);

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error closing meeting:");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("send_reaction", (data: { meetingCode: string; emoji: string }, callback?: () => void) => {
      const peerId = socket.data?.peerId;
      const meetingCode = (data?.meetingCode || socket.data?.meetingCode)?.toUpperCase();
      if (!peerId || !meetingCode || !data?.emoji) {
        if (callback) callback();
        return;
      }

      const meeting = meetings.get(meetingCode);
      const participant = meeting?.participants.get(peerId);
      if (!participant) {
        if (callback) callback();
        return;
      }

      participant.lastHeartbeat = Date.now();

      let avatarUrl: string | undefined;
      try {
        const profile = JSON.parse(participant.json || "{}");
        if (profile.photo) avatarUrl = profile.photo;
      } catch {}

      io.to(meetingCode).emit("ReactionReceived", {
        peerId,
        displayName: participant.displayName,
        emoji: data.emoji,
        avatarUrl,
      });

      if (callback) callback();
    });

    socket.on("send_chat_message", (data: { meetingCode: string; text: string }, callback?: (res?: any) => void) => {
      try {
        const peerId = socket.data?.peerId;
        const meetingCode = (data?.meetingCode || socket.data?.meetingCode)?.toUpperCase();
        if (!peerId || !meetingCode) {
          if (callback) callback({ code: "BAD_REQUEST", detail: "Missing peerId or meetingCode" });
          return;
        }

        const text = (data?.text || "").trim();
        if (!text) {
          if (callback) callback({ code: "EMPTY_TEXT", detail: "Message cannot be empty" });
          return;
        }

        const cleanText = text.slice(0, 500);

        const meeting = meetings.get(meetingCode);
        if (!meeting) {
          if (callback) callback({ code: "NOT_FOUND", detail: "Meeting not found" });
          return;
        }

        const participant = meeting.participants.get(peerId);
        if (!participant) {
          if (callback) callback({ code: "NOT_FOUND", detail: "Participant not found in meeting" });
          return;
        }

        participant.lastHeartbeat = Date.now();

        let avatarUrl: string | undefined;
        try {
          const profile = JSON.parse(participant.json || "{}");
          if (profile.photo) avatarUrl = profile.photo;
        } catch {}

        const chatMessage: ChatMessage = {
          id: `${Date.now()}-${uuidv4().slice(0, 8)}`,
          meetingCode,
          peerId,
          displayName: participant.displayName,
          text: cleanText,
          timestamp: new Date().toISOString(),
          avatarUrl,
        };

        meeting.messages.push(chatMessage);
        if (meeting.messages.length > 100) {
          meeting.messages.shift();
        }
        storage.scheduleSave(meetings);

        io.to(meetingCode).emit("ChatMessageReceived", chatMessage);
        if (callback) callback({ status: "ok", message: chatMessage });
      } catch (err: any) {
        logger.error({ err }, "Error in send_chat_message");
        if (callback) callback({ code: "ERROR", detail: err?.message });
      }
    });

    socket.on("send_direct_message", (data: { meetingCode: string; toPeerId: string; text: string }, callback?: (res?: any) => void) => {
      try {
        const peerId = socket.data?.peerId;
        const meetingCode = (data?.meetingCode || socket.data?.meetingCode)?.toUpperCase();
        if (!peerId || !meetingCode || !data?.toPeerId) {
          if (callback) callback({ code: "BAD_REQUEST", detail: "Missing required fields" });
          return;
        }

        const text = (data?.text || "").trim();
        if (!text) {
          if (callback) callback({ code: "EMPTY_TEXT", detail: "Message cannot be empty" });
          return;
        }

        const cleanText = text.slice(0, 500);

        const meeting = meetings.get(meetingCode);
        if (!meeting) {
          if (callback) callback({ code: "NOT_FOUND", detail: "Meeting not found" });
          return;
        }

        const sender = meeting.participants.get(peerId);
        const recipient = meeting.participants.get(data.toPeerId);

        if (!sender || !recipient) {
          if (callback) callback({ code: "NOT_FOUND", detail: "Sender or recipient not in meeting" });
          return;
        }

        sender.lastHeartbeat = Date.now();

        let avatarUrl: string | undefined;
        try {
          const profile = JSON.parse(sender.json || "{}");
          if (profile.photo) avatarUrl = profile.photo;
        } catch {}

        const chatMessage: ChatMessage = {
          id: `${Date.now()}-${uuidv4().slice(0, 8)}`,
          meetingCode,
          peerId,
          displayName: sender.displayName,
          text: cleanText,
          timestamp: new Date().toISOString(),
          avatarUrl,
          toPeerId: data.toPeerId,
        };

        // Dispatch to recipient and echo back to sender
        io.to(`peer:${data.toPeerId}`).emit("DirectMessageReceived", chatMessage);
        if (data.toPeerId !== peerId) {
          socket.emit("DirectMessageReceived", chatMessage);
        }

        if (callback) callback({ status: "ok", message: chatMessage });
      } catch (err: any) {
        logger.error({ err }, "Error in send_direct_message");
        if (callback) callback({ code: "ERROR", detail: err?.message });
      }
    });

    socket.on("send_announcement", (data: { meetingCode: string; message: string; hostName?: string }, callback?: (res?: any) => void) => {
      try {
        const meetingCode = (data?.meetingCode || socket.data?.meetingCode)?.toUpperCase();
        const peerId = socket.data?.peerId;
        if (!meetingCode || !data?.message) {
          if (callback) callback({ code: "BAD_REQUEST", detail: "Missing meetingCode or message" });
          return;
        }

        const meeting = meetings.get(meetingCode);
        if (!meeting) {
          if (callback) callback({ code: "NOT_FOUND", detail: "Meeting not found" });
          return;
        }

        if (peerId !== meeting.hostPeerId && !socket.data?.isHost) {
          if (callback) callback({ code: "UNAUTHORIZED", detail: "Only the host can broadcast announcements" });
          return;
        }

        const payload = {
          id: uuidv4(),
          message: data.message.trim(),
          timestamp: new Date().toISOString(),
          hostName: data.hostName || "Host",
        };

        io.to(meetingCode).emit("AnnouncementReceived", payload);
        if (callback) callback({ status: "ok", announcement: payload });
      } catch (err: any) {
        logger.error({ err }, "Error in send_announcement");
        if (callback) callback({ code: "ERROR", detail: err?.message });
      }
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Client disconnected");

      const meetingCode = socket.data?.meetingCode;
      const peerId = socket.data?.peerId;

      if (meetingCode && peerId) {
        const meeting = meetings.get(meetingCode);
        if (meeting) {
          // ── The Host CANNOT leave at all on disconnect ─────────────────
          if (peerId === meeting.hostPeerId) {
            logger.info({ peerId, meetingCode }, "Host disconnected socket — keeping host node permanently in room");
            return;
          }

          const participant = meeting.participants.get(peerId);
          if (participant && participant.connectionId === socket.id) {
            const timerKey = `${meetingCode}:${peerId}`;
            const existingTimer = disconnectTimers.get(timerKey);
            if (existingTimer) clearTimeout(existingTimer);

            // 5-minute buffer before removing attendee from the room
            const timer = setTimeout(() => {
              disconnectTimers.delete(timerKey);
              const current = meeting.participants.get(peerId);
              if (current && current.connectionId === socket.id) {
                meeting.participants.delete(peerId);
                peerToMeeting.delete(peerId);
                peerToParticipant.delete(peerId);
                io.to(meetingCode).emit("ParticipantLeft", { peerId });
                io.to(meetingCode).emit("WaitingRoomUpdate", getWaitingPeers(meeting));
                scheduleExpiryIfEmpty(meeting, io);
                storage.scheduleSave(meetings);
                logger.info({ peerId, meetingCode }, "5-minute disconnect buffer expired — removed attendee");
              }
            }, DISCONNECT_BUFFER_MS);

            disconnectTimers.set(timerKey, timer);
          }
        }
      }
    });
  });

  // Clean up interval on server close
  server.on("close", () => clearInterval(heartbeatInterval));
}

// ── Health endpoint data helper ───────────────────────────────────────────
export function getStats() {
  let totalParticipants = 0;
  for (const m of meetings.values()) totalParticipants += m.participants.size;
  return { meetings: meetings.size, participants: totalParticipants };
}

const router: IRouter = Router();
export default router;
