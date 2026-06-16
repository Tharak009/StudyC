import { Router } from "express";
import { chatController } from "../controllers/chat.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { chatAttachmentUpload } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { createMessageSchema, listMessagesSchema } from "../validators/chat.validator.js";

export const chatRouter = Router({ mergeParams: true });
chatRouter.use(authenticate);

chatRouter.get(
  "/:communityId/messages",
  validate(listMessagesSchema),
  asyncHandler(chatController.history)
);

chatRouter.post(
  "/:communityId/messages",
  chatAttachmentUpload,
  validate(createMessageSchema),
  asyncHandler(chatController.create)
);
