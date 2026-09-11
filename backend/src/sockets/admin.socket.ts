import type { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import { ROLES } from "../constants/roles.js";
import { AdminLog } from "../models/admin-log.model.js";
import type { SocketRegistry } from "./presence.socket.js";

interface BroadcastPayload {
  title: string;
  message: string;
  urgencyLevel?: "INFO" | "WARNING" | "CRITICAL";
  targetScope?: "ALL" | "DEPARTMENT";
  targetDepartment?: string;
  audioAlert?: boolean;
}

/**
 * Admin Emergency Broadcast & Campus Announcement Socket Controller
 * Dispatches real-time global banners and department-targeted audio alerts.
 */
export const registerAdminBroadcastHandlers = (
  io: Server,
  socket: Socket,
  _registry: SocketRegistry
): void => {
  socket.on(
    "admin:broadcastAnnouncement",
    async (payload: BroadcastPayload, acknowledge?: (res: unknown) => void) => {
      try {
        const user = socket.data.user;

        // Strict role validation
        if (user?.role !== ROLES.ADMIN) {
          const err = {
            success: false,
            code: "ADMIN_REQUIRED",
            message: "Only campus administrators are authorized to dispatch emergency broadcasts."
          };
          if (typeof acknowledge === "function") acknowledge(err);
          socket.emit("adminError", err);
          return;
        }

        if (!payload.title || !payload.message) {
          throw new Error("Broadcast title and message content are required.");
        }

        const broadcastId = `broadcast-${Date.now()}`;
        const broadcastData = {
          id: broadcastId,
          title: payload.title,
          message: payload.message,
          urgencyLevel: payload.urgencyLevel || "CRITICAL",
          sender: user.name || "Campus Governance",
          senderRole: user.role,
          targetScope: payload.targetScope || "ALL",
          targetDepartment: payload.targetDepartment,
          audioAlert: Boolean(payload.audioAlert),
          createdAt: new Date().toISOString()
        };

        // Dispatch routing
        if (payload.targetScope === "DEPARTMENT" && payload.targetDepartment) {
          const deptRoom = `dept:${payload.targetDepartment.toLowerCase().trim()}`;
          io.to(deptRoom).emit("globalBroadcastReceived", broadcastData);
          io.to(deptRoom).emit("admin:broadcastAnnouncement", broadcastData);
        } else {
          io.emit("globalBroadcastReceived", broadcastData);
          io.emit("admin:broadcastAnnouncement", broadcastData);
        }

        // Asynchronously log action to AdminLog collection
        setImmediate(async () => {
          try {
            await AdminLog.create({
              adminId: mongoose.isValidObjectId(socket.data.userId)
                ? new mongoose.Types.ObjectId(socket.data.userId)
                : new mongoose.Types.ObjectId(),
              adminName: user.name || user.email,
              action: "BROADCAST_SENT",
              targetType: "Broadcast",
              targetId: broadcastId,
              ipAddress: socket.handshake.address || "socket",
              details: {
                title: payload.title,
                urgencyLevel: broadcastData.urgencyLevel,
                targetScope: broadcastData.targetScope,
                targetDepartment: broadcastData.targetDepartment,
                audioAlert: broadcastData.audioAlert
              }
            });
          } catch (logErr) {
            console.error("Failed to record broadcast audit log:", logErr);
          }
        });

        if (typeof acknowledge === "function") {
          acknowledge({ success: true, broadcastId, data: broadcastData });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to emit broadcast";
        if (typeof acknowledge === "function") {
          acknowledge({ success: false, message });
        }
        socket.emit("adminError", { message });
      }
    }
  );
};
