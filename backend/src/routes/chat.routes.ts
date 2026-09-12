import { Router } from "express";
import { chatController } from "../controllers/chat.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { chatAttachmentUpload } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  chatBulkDeleteSchema,
  chatBulkStarSchema,
  chatForwardSchema,
  chatReactionSchema,
  communityMessagesParamsSchema,
  createMessageSchema,
  editChatMessageSchema,
  listMessagesSchema,
  messageParamsSchema
} from "../validators/chat.validator.js";

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

chatRouter.put(
  "/:communityId/messages/:messageId",
  validate(editChatMessageSchema),
  asyncHandler(chatController.edit)
);

chatRouter.patch(
  "/:communityId/messages/:messageId",
  validate(editChatMessageSchema),
  asyncHandler(chatController.edit)
);

chatRouter.delete(
  "/:communityId/messages/:messageId",
  validate(messageParamsSchema),
  asyncHandler(chatController.delete)
);

chatRouter.post(
  "/:communityId/messages/:messageId/delete-for-me",
  validate(messageParamsSchema),
  asyncHandler(chatController.deleteForMe)
);

chatRouter.post(
  "/:communityId/messages/:messageId/reaction",
  validate(chatReactionSchema),
  asyncHandler(chatController.toggleReaction)
);

chatRouter.post(
  "/:communityId/messages/:messageId/star",
  validate(messageParamsSchema),
  asyncHandler(chatController.toggleStar)
);

chatRouter.post(
  "/:communityId/messages/:messageId/pin",
  validate(messageParamsSchema),
  asyncHandler(chatController.togglePin)
);

chatRouter.get(
  "/:communityId/starred",
  validate(communityMessagesParamsSchema),
  asyncHandler(chatController.listStarred)
);

chatRouter.get(
  "/:communityId/pinned",
  validate(communityMessagesParamsSchema),
  asyncHandler(chatController.listPinned)
);

chatRouter.post(
  "/:communityId/messages/forward",
  validate(chatForwardSchema),
  asyncHandler(chatController.forward)
);

chatRouter.post(
  "/:communityId/messages/bulk-delete-for-me",
  validate(chatBulkDeleteSchema),
  asyncHandler(chatController.bulkDeleteForMe)
);

chatRouter.post(
  "/:communityId/messages/bulk-delete-for-everyone",
  validate(chatBulkDeleteSchema),
  asyncHandler(chatController.bulkDeleteForEveryone)
);

chatRouter.post(
  "/:communityId/messages/bulk-star",
  validate(chatBulkStarSchema),
  asyncHandler(chatController.bulkStar)
);

