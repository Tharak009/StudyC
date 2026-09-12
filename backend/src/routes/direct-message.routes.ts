import { Router } from "express";
import { directMessageController } from "../controllers/direct-message.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { apiLimiter } from "../middlewares/rate-limit.middleware.js";
import { chatAttachmentUpload } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  bulkDeleteSchema,
  bulkStarSchema,
  conversationIdParamsSchema,
  createMessageSchema,
  editMessageSchema,
  forwardMessageSchema,
  listConversationsSchema,
  listMessagesSchema,
  markAsReadSchema,
  messageIdParamsSchema,
  reactionSchema,
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

directMessageRouter.patch("/conversations/:conversationId/pin", validate(conversationIdParamsSchema), asyncHandler(directMessageController.togglePin));
directMessageRouter.patch("/conversations/:conversationId/mute", validate(conversationIdParamsSchema), asyncHandler(directMessageController.toggleMute));
directMessageRouter.patch("/conversations/:conversationId/archive", validate(conversationIdParamsSchema), asyncHandler(directMessageController.toggleArchive));
directMessageRouter.post("/conversations/:conversationId/unread", validate(conversationIdParamsSchema), asyncHandler(directMessageController.markAsUnread));
directMessageRouter.post("/conversations/:conversationId/delivered", validate(conversationIdParamsSchema), asyncHandler(directMessageController.markAsDelivered));

directMessageRouter.put("/messages/:id", validate(editMessageSchema), asyncHandler(directMessageController.editMessage));
directMessageRouter.patch("/messages/:id", validate(editMessageSchema), asyncHandler(directMessageController.editMessage));
directMessageRouter.delete("/messages/:id", validate(messageIdParamsSchema), asyncHandler(directMessageController.deleteMessage));
directMessageRouter.post("/messages/:id/delete-for-me", validate(messageIdParamsSchema), asyncHandler(directMessageController.deleteMessageForMe));
directMessageRouter.post("/messages/:id/delete-for-everyone", validate(messageIdParamsSchema), asyncHandler(directMessageController.deleteMessageForEveryone));
directMessageRouter.post("/messages/:id/reaction", validate(reactionSchema), asyncHandler(directMessageController.toggleReaction));
directMessageRouter.post("/messages/:id/star", validate(messageIdParamsSchema), asyncHandler(directMessageController.toggleStar));
directMessageRouter.post("/messages/:id/pin", validate(messageIdParamsSchema), asyncHandler(directMessageController.togglePinMessage));

directMessageRouter.get("/conversations/:conversationId/starred", validate(conversationIdParamsSchema), asyncHandler(directMessageController.getStarredMessages));
directMessageRouter.get("/conversations/:conversationId/pinned", validate(conversationIdParamsSchema), asyncHandler(directMessageController.getPinnedMessages));
directMessageRouter.post("/conversations/:conversationId/messages/forward", validate(forwardMessageSchema), asyncHandler(directMessageController.forwardMessages));
directMessageRouter.post("/conversations/:conversationId/messages/bulk-delete-for-me", validate(bulkDeleteSchema), asyncHandler(directMessageController.bulkDeleteForMe));
directMessageRouter.post("/conversations/:conversationId/messages/bulk-delete-for-everyone", validate(bulkDeleteSchema), asyncHandler(directMessageController.bulkDeleteForEveryone));
directMessageRouter.post("/conversations/:conversationId/messages/bulk-star", validate(bulkStarSchema), asyncHandler(directMessageController.bulkStar));

directMessageRouter.post("/messages/forward", validate(forwardMessageSchema), asyncHandler(directMessageController.forwardMessages));
directMessageRouter.post("/messages/read", validate(markAsReadSchema), asyncHandler(directMessageController.markAsRead));

