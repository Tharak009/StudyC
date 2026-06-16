import { Router } from "express";
import { directMessageController } from "../controllers/direct-message.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { apiLimiter } from "../middlewares/rate-limit.middleware.js";
import { chatAttachmentUpload } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  conversationIdParamsSchema,
  createMessageSchema,
  editMessageSchema,
  listConversationsSchema,
  listMessagesSchema,
  markAsReadSchema,
  messageIdParamsSchema,
  startConversationSchema
} from "../validators/direct-message.validator.js";

export const directMessageRouter = Router();

directMessageRouter.use(authenticate);
directMessageRouter.use(apiLimiter);

directMessageRouter.post("/conversations", validate(startConversationSchema), asyncHandler(directMessageController.startConversation));
directMessageRouter.get("/conversations", validate(listConversationsSchema), asyncHandler(directMessageController.listConversations));
directMessageRouter.get("/conversations/unread", asyncHandler(directMessageController.unreadCount));
directMessageRouter.get("/conversations/:conversationId", validate(conversationIdParamsSchema), asyncHandler(directMessageController.getConversation));

directMessageRouter.get("/conversations/:conversationId/messages", validate(listMessagesSchema), asyncHandler(directMessageController.getMessages));
directMessageRouter.post("/conversations/:conversationId/messages", chatAttachmentUpload, validate(createMessageSchema), asyncHandler(directMessageController.sendMessage));

directMessageRouter.put("/messages/:id", validate(editMessageSchema), asyncHandler(directMessageController.editMessage));
directMessageRouter.delete("/messages/:id", validate(messageIdParamsSchema), asyncHandler(directMessageController.deleteMessage));

directMessageRouter.post("/messages/read", validate(markAsReadSchema), asyncHandler(directMessageController.markAsRead));
