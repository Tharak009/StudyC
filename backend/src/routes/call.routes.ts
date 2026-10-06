import { Router, type Request, type Response } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { iceConfigService } from "../services/ice-config.service.js";
import { callHistoryService } from "../services/call-history.service.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import type { CallLogStatus, CallLogType } from "../models/call-log.model.js";

export const callRouter = Router();

/**
 * GET /api/calls/ice-servers
 * Returns secure ICE configuration (STUN/TURN) for the authenticated user's WebRTC peer connections.
 */
callRouter.get(
  "/ice-servers",
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const iceServers = iceConfigService.getIceServers();
    res.json(new ApiResponse(200, { iceServers }, "ICE servers retrieved successfully"));
  })
);

/**
 * GET /api/calls/history
 * Returns paginated call history for the authenticated user with direction, status, and peer metadata.
 */
callRouter.get(
  "/history",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = String((req as any).user?._id || "");
    if (!userId) {
      throw new ApiError(401, "User context missing from request");
    }

    const page = parseInt(String(req.query.page || "1"), 10);
    const limit = parseInt(String(req.query.limit || "20"), 10);
    const status = req.query.status as CallLogStatus | undefined;
    const type = req.query.type as CallLogType | undefined;

    const history = await callHistoryService.getUserCallHistory(userId, {
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 20 : limit,
      status,
      type
    });

    res.json(new ApiResponse(200, history, "Call history retrieved successfully"));
  })
);

/**
 * GET /api/calls/history/:callId
 * Returns full call metadata and participant log for a specific call session.
 */
callRouter.get(
  "/history/:callId",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = String((req as any).user?._id || "");
    const callId = String(req.params.callId || "");

    if (!callId) {
      throw new ApiError(400, "callId parameter is required");
    }

    const call = await callHistoryService.getCallDetails(callId, userId);
    if (!call) {
      throw new ApiError(404, "Call record not found or access denied");
    }

    res.json(new ApiResponse(200, { call }, "Call details retrieved successfully"));
  })
);
