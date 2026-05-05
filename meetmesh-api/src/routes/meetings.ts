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
}

const meetings = new Map<string, Meeting>();
const peerToMeeting = new Map<string, string>();
const peerToParticipant = new Map<string, Participant>();

function generateCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function setupSocketIO(server: HTTPServer) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const cleanUpParticipant = (peerId: string) => {
    const meetingCode = peerToMeeting.get(peerId);
    if (meetingCode) {
      const meeting = meetings.get(meetingCode);
      if (meeting) {
        meeting.participants.delete(peerId);
        Array.from(io.sockets.sockets.values()).forEach((s: Socket) => {
          if (s.rooms.has(meetingCode) && s.data?.peerId === peerId) {
            s.leave(meetingCode);
          }
        });
        
        if (meeting.participants.size === 0) {
          meetings.delete(meetingCode);
        }
      }
      peerToMeeting.delete(peerId);
      peerToParticipant.delete(peerId);
    }
  };

  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Client connected");

    socket.on("create_meeting", async (data: { eventName: string; peerId: string; profileJson?: string; subtitle?: string; description?: string }, callback) => {
      try {
        const code = generateCode();
        const hostSecret = uuidv4();
        
        let displayName = "Host";
        try {
          const profile = JSON.parse(data.profileJson || '{}');
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
          createdAt: Date.now()
        };

        const host: Participant = {
          peerId: data.peerId,
          displayName,
          connectionId: socket.id,
          role: 'Host',
          isAdmitted: true,
          joinedAt: new Date().toISOString(),
          json: data.profileJson || '{}'
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
          subtitle: data.subtitle,
          description: data.description,
          hostPeerId: data.peerId,
          startedAt: new Date(meeting.createdAt).toISOString(),
          waitingRoomEnabled: meeting.waitingRoom,
          participants: { [data.peerId]: host }
        });

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error creating meeting");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("join_meeting", (data: { meetingCode: string; displayName: string; peerId: string; profileJson?: string }, callback) => {
      try {
        const code = data.meetingCode.toUpperCase();
        const meeting = meetings.get(code);

        if (!meeting) {
          socket.emit("Error", { code: "NOT_FOUND", detail: "Meeting not found" });
          if (callback) callback();
          return;
        }

        // Check if already in a DIFFERENT meeting
        const existingMeeting = peerToMeeting.get(data.peerId);
        if (existingMeeting && existingMeeting !== code) {
          socket.leave(existingMeeting);
          cleanUpParticipant(data.peerId);
        }

        let role: Participant['role'] = 'Attendee';
        if (data.displayName.toLowerCase().includes('present')) {
          role = 'Presentation';
        } else if (data.peerId === meeting.hostPeerId) {
          role = 'Host';
        }

        const participant: Participant = {
          peerId: data.peerId,
          displayName: data.displayName,
          connectionId: socket.id,
          role,
          isAdmitted: true,
          joinedAt: new Date().toISOString(),
          json: data.profileJson || '{}'
        };

        meeting.participants.set(data.peerId, participant);
        peerToMeeting.set(data.peerId, code);
        peerToParticipant.set(data.peerId, participant);

        socket.join(code);
        socket.data = { meetingCode: code, peerId: data.peerId };

        // Send full state to joining participant
        socket.emit("FullState", {
          meetingCode: code,
          eventName: meeting.eventName,
          subtitle: meeting.subtitle,
          description: meeting.description,
          hostPeerId: meeting.hostPeerId,
          startedAt: new Date(meeting.createdAt).toISOString(),
          waitingRoomEnabled: meeting.waitingRoom,
          participants: Object.fromEntries(meeting.participants)
        });

        // Notify others
        socket.to(code).emit("ParticipantJoined", participant);

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error joining meeting:");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("admit_participant", (data: { meetingCode: string; peerId: string }, callback) => {
      // TODO: Implement waiting room admission
      if (callback) callback();
    });

    socket.on("kick_participant", (data: { meetingCode: string; peerId: string }, callback) => {
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
        }

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error kicking participant:");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("change_role", (data: { meetingCode: string; peerId: string; newRole: string }, callback) => {
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

    socket.on("toggle_waiting_room", (data: { meetingCode: string; isEnabled: boolean }, callback) => {
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

    socket.on("update_metadata", (data: { meetingCode: string; json: string }, callback) => {
      // TODO: Implement metadata updates
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

        // Notify all participants
        io.to(code).emit("MeetingEnded");
        
        // Leave all sockets
        Array.from(io.sockets.sockets.values()).forEach((s: Socket) => {
          if (s.rooms.has(code)) {
            s.leave(code);
          }
        });

        // Clean up
        meeting.participants.forEach((participant) => {
          peerToMeeting.delete(participant.peerId);
          peerToParticipant.delete(participant.peerId);
        });
        meetings.delete(code);

        if (callback) callback();
      } catch (error: any) {
        logger.error({ error }, "Error closing meeting");
        if (callback) callback({ code: "ERROR", detail: error.message });
      }
    });

    socket.on("heartbeat", (data: { meetingCode: string }, callback) => {
      if (callback) callback();
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
          
          if (meeting.participants.size === 0) {
            meetings.delete(meetingCode);
          }
        }
        
        peerToMeeting.delete(peerId);
        peerToParticipant.delete(peerId);
      }
    });
  });
}

const router: IRouter = Router();
export default router;
