import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { chatDl } from "../dl/chatDl";
import { chatBl } from "../bl/chatBl";
import { logger } from "../utils/logger";

interface TokenPayload { userId: number; email: string }
export let io: Server | null = null;
const room = (chatId: string) => `chat:${chatId}`;
const userRoom = (userId: number) => `user:${userId}`;

export function initializeSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL?.split(",") ?? [], credentials: true },
    transports: ["websocket", "polling"]
  });
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined;
      if (!token) return next(new Error("Authentication required"));
      const payload = jwt.verify(token, process.env.JWT_SECRET ?? "") as TokenPayload;
      socket.data.user = payload;
      next();
    } catch { next(new Error("Invalid authentication token")); }
  });
  io.on("connection", (socket) => {
    const user = socket.data.user as TokenPayload;
    socket.join(userRoom(user.userId));
    void chatDl.setPresence(user.userId, true).catch(logger.error);
    socket.broadcast.emit("user_online", { userId: user.userId });
    socket.on("join_chat", async ({ chatId }: { chatId: string }) => {
      try {
        if (!(await chatDl.isMember(chatId, user.userId))) return socket.emit("socket_error", { message: "Not a chat member" });
        socket.join(room(chatId));
      } catch { socket.emit("socket_error", { message: "Unable to join chat" }); }
    });
    socket.on("leave_chat", ({ chatId }: { chatId: string }) => socket.leave(room(chatId)));
    socket.on("typing", async ({ chatId }: { chatId: string }) => {
      if (await chatDl.isMember(chatId, user.userId)) socket.to(room(chatId)).emit("user_typing", { chatId, userId: user.userId });
    });
    socket.on("stop_typing", ({ chatId }: { chatId: string }) => socket.to(room(chatId)).emit("user_stop_typing", { chatId, userId: user.userId }));
    socket.on("send_message", async (payload: { chatId: string; text: string; clientId: string }) => {
      try {
        const message = await chatBl.sendMessage(user.userId, payload.chatId, payload.text, payload.clientId);
        io?.to(room(payload.chatId)).emit("receive_message", message);
        socket.emit("message_sent", message);
      } catch (error) {
        socket.emit("socket_error", { message: error instanceof Error ? error.message : "Message failed" });
      }
    });
    socket.on("disconnect", async () => {
      const remaining = await io?.in(userRoom(user.userId)).fetchSockets();
      if (!remaining?.length) {
        await chatDl.setPresence(user.userId, false).catch(logger.error);
        io?.emit("user_offline", { userId: user.userId, lastSeen: new Date().toISOString() });
      }
    });
  });
  return io;
}
export function emitToChat(chatId: string, event: string, data: unknown): void { io?.to(room(chatId)).emit(event, data); }
export function emitToUser(userId: number, event: string, data: unknown): void { io?.to(userRoom(userId)).emit(event, data); }
