import { io, type Socket } from "socket.io-client";
import { tokenService } from "./token.service";

const baseURL =
  import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin;

let socket: Socket | null = null;
let socketToken: string | null = null;

export const socketService = {
  connect: () => {
    const token = tokenService.get();
    if (!token) return null;
    if (socket) {
      if (socketToken !== token) {
        // Re-authenticate the same Socket instance so feature listeners remain
        // attached when an account token is refreshed or the user switches accounts.
        socket.auth = { token };
        socketToken = token;
        socket.disconnect();
        socket.connect();
        return socket;
      }
      if (socket.connected || socket.active) return socket;
      socket.auth = { token };
      socket.connect();
      return socket;
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
    socketToken = token;

    const activeSocket = socket;
    activeSocket.on("connect_error", (err) => {
      if (err.message?.includes("authentication") || err.message?.includes("401")) {
        const freshToken = tokenService.get();
        if (freshToken && socket === activeSocket) {
          activeSocket.auth = { token: freshToken };
          socketToken = freshToken;
        }
      }
    });

    if (typeof window !== "undefined") {
      (window as any)._socket = socket;
      (window as any)._tokenService = tokenService;
    }
    return socket;
  },
  get: () => {
    if (typeof window !== "undefined") {
      (window as any)._socket = socket;
    }
    return socket;
  },
  disconnect: () => {
    socket?.disconnect();
    socket = null;
    socketToken = null;
    if (typeof window !== "undefined") {
      (window as any)._socket = null;
    }
  }
};
