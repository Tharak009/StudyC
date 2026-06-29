import { io, type Socket } from "socket.io-client";
import { env } from "../config/env";
import { tokenService } from "./token.service";

let socket: Socket | null = null;

export const socketService = {
  connect: () => {
    const token = tokenService.getAccessToken();
    if (!token) return null;
    if (socket?.connected) return socket;

    if (socket) {
      socket.disconnect();
      socket = null;
    }

    socket = io(env.SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on("connect_error", async (err) => {
      if (err.message?.includes("authentication") || err.message?.includes("401")) {
        const freshToken = tokenService.getAccessToken();
        if (freshToken && socket) {
          socket.auth = { token: freshToken };
          socket.connect();
        }
      }
    });

    return socket;
  },

  get: () => socket,

  disconnect: () => {
    socket?.disconnect();
    socket = null;
  },
};
