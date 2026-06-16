import { io, type Socket } from "socket.io-client";
import { tokenService } from "./token.service";

const baseURL =
  import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin;

let socket: Socket | null = null;

export const socketService = {
  connect: () => {
    const token = tokenService.get();
    if (!token) return null;
    if (socket?.connected) return socket;
    socket = io(baseURL, {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true
    });
    return socket;
  },
  get: () => socket,
  disconnect: () => {
    socket?.disconnect();
    socket = null;
  }
};
