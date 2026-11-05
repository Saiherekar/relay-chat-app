import { io, Socket } from "socket.io-client";
let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:5000", {
    auth: { token },
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
