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

    if (socket) {
      socket.disconnect();
      socket = null;
    }

    socket = io(baseURL, {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000
    });

    socket.on("connect_error", (err) => {
      if (err.message?.includes("authentication") || err.message?.includes("401")) {
        const freshToken = tokenService.get();
        if (freshToken && socket) {
          socket.auth = { token: freshToken };
        }
      }
    });

    return socket;
  },
  get: () => socket,
  disconnect: () => {
    socket?.disconnect();
    socket = null;
  }
};
