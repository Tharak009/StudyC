import { Router } from "express";
import { streamController } from "../controllers/stream.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const streamRouter = Router();

// All Stream routes require an authenticated StudyConnect user session
streamRouter.use(authenticate);

// Phase 1: Stream Token & User Identity Provisioning
streamRouter.get("/token", asyncHandler(streamController.getToken.bind(streamController)));

// Phase 2: Direct Messages (DMs)
streamRouter.post("/dms", asyncHandler(streamController.createOrGetDm.bind(streamController)));

// Phase 2: Community / Study Circle Channels
streamRouter.get(
  "/communities/:communityId/channels",
  asyncHandler(streamController.getCommunityChannels.bind(streamController))
);
streamRouter.post(
  "/communities/:communityId/channels",
  asyncHandler(streamController.createCommunityChannel.bind(streamController))
);

// Phase 8: Secure SSRF-Protected Link Preview
streamRouter.post(
  "/link-preview",
  asyncHandler(streamController.getLinkPreview.bind(streamController))
);

