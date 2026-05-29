import { Router, type IRouter } from "express";
import { Server, type Socket } from "socket.io";
import { createServer, type Server as HTTPServer } from "http";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger";

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
  /** Timer handle for auto-expiry when all participants leave */
  expiryTimer?: ReturnType<typeof setTimeout>;
}

const meetings        = new Map<string, Meeting>();
const peerToMeeting   = new Map<string, string>();
const peerToParticipant = new Map<string, Participant>();

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

// ── Heartbeat config ───────────────────────────────────────────────────────
const HEARTBEAT_TIMEOUT_MS = 45_000; // kick after 45s without heartbeat

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

function generateCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
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
        if (now - participant.lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
          logger.info({ peerId, code }, "Kicking participant: heartbeat timeout");
          const targetSocket = io.sockets.sockets.get(participant.connectionId);
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
        socket.data = { meetingCode: code, peerId: data.peerId };

        socket.emit("MeetingCreated", { meetingCode: code, hostSecret });
        socket.emit("FullState", {
          meetingCode: code,
          eventName: data.eventName,
          hostPeerId: data.peerId,
          participants: { [data.peerId]: host },
        });

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

        // ── Reconnect deduplication ───────────────────────────────────────
        // If the peer already exists in this meeting, just update their
        // connectionId and socket data rather than creating a duplicate entry.
        const existingParticipant = meeting.participants.get(data.peerId);
        if (existingParticipant) {
          existingParticipant.connectionId = socket.id;
          existingParticipant.lastHeartbeat = Date.now();
          peerToParticipant.set(data.peerId, existingParticipant);

          socket.join(code);
          socket.data = { meetingCode: code, peerId: data.peerId };

          // Send full state to reconnecting participant
          socket.emit("FullState", {
            meetingCode: code,
            eventName: meeting.eventName,
            hostPeerId: meeting.hostPeerId,
            participants: Object.fromEntries(meeting.participants),
          });
          // Notify others that this peer is back (reuse ParticipantJoined)
          socket.to(code).emit("ParticipantJoined", existingParticipant);

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

        const participant: Participant = {
          peerId: data.peerId,
          displayName: data.displayName,
          connectionId: socket.id,
          role,
          isAdmitted: true,
          joinedAt: new Date().toISOString(),
          json: data.profileJson || "{}",
          lastHeartbeat: Date.now(),
        };

        meeting.participants.set(data.peerId, participant);
        peerToMeeting.set(data.peerId, code);
        peerToParticipant.set(data.peerId, participant);

        socket.join(code);
        socket.data = { meetingCode: code, peerId: data.peerId };

        socket.emit("FullState", {
          meetingCode: code,
          eventName: meeting.eventName,
          hostPeerId: meeting.hostPeerId,
          participants: Object.fromEntries(meeting.participants),
        });

        socket.to(code).emit("ParticipantJoined", participant);

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error joining meeting:");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("admit_participant", (data: { meetingCode: string; peerId: string }, callback?: () => void) => {
      // TODO: waiting room admission
      if (callback) callback();
    });

    socket.on("kick_participant", (data: { meetingCode: string; peerId: string }, callback?: (err?: any) => void) => {
      try {
        const code = data.meetingCode.toUpperCase();
        const meeting = meetings.get(code);

        if (!meeting || !meeting.participants.has(data.peerId)) {
          if (callback) callback({ code: "NOT_FOUND", detail: "Participant not found" });
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
          scheduleExpiryIfEmpty(meeting, io);
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

        const participant = meeting.participants.get(data.peerId);
        if (participant) {
          participant.role = data.newRole as any;
          io.to(code).emit("RoleChanged", { peerId: data.peerId, role: data.newRole });
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

        meeting.waitingRoom = data.isEnabled;
        io.to(code).emit("WaitingRoomToggled", { meetingCode: code, isEnabled: data.isEnabled });

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error toggling waiting room:");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("update_metadata", (data: { meetingCode: string; json: string }, callback?: () => void) => {
      // TODO: implement metadata updates
      if (callback) callback();
    });

    socket.on("heartbeat", (data: { meetingCode: string }, callback?: () => void) => {
      // Update the participant's last-seen timestamp
      const peerId = socket.data?.peerId;
      if (peerId) {
        const code = data?.meetingCode?.toUpperCase() ?? socket.data?.meetingCode;
        const meeting = meetings.get(code);
        const participant = meeting?.participants.get(peerId);
        if (participant) participant.lastHeartbeat = Date.now();
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

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error closing meeting:");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("send_reaction", (data: { meetingCode: string; emoji: string }) => {
      const peerId = socket.data?.peerId;
      const meetingCode = data.meetingCode?.toUpperCase() ?? socket.data?.meetingCode;
      if (peerId && meetingCode) {
        const meeting = meetings.get(meetingCode);
        const participant = meeting?.participants.get(peerId);
        if (participant) {
          let photo = "";
          try {
            const profile = JSON.parse(participant.json || "{}");
            photo = profile.photo || "";
          } catch {}
          io.to(meetingCode).emit("ReactionReceived", {
            peerId,
            displayName: participant.displayName,
            emoji: data.emoji,
            avatarUrl: photo,
          });
        }
      }
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Client disconnected");

      const meetingCode = socket.data?.meetingCode;
      const peerId = socket.data?.peerId;

      if (meetingCode && peerId) {
        const meeting = meetings.get(meetingCode);
        if (meeting) {
          meeting.participants.delete(peerId);
          io.to(meetingCode).emit("ParticipantLeft", { peerId });
          scheduleExpiryIfEmpty(meeting, io);
        }
        peerToMeeting.delete(peerId);
        peerToParticipant.delete(peerId);
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
