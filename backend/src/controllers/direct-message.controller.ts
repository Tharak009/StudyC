import type { Request, Response } from "express";
import { directMessageService } from "../services/direct-message.service.js";
import { ApiResponse } from "../utils/api-response.js";
import type { CreateMessageInput, ListConversationsQuery, ListMessagesQuery, StartConversationInput } from "../validators/direct-message.validator.js";

export class DirectMessageController {
  async startConversation(request: Request, response: Response) {
    const { receiverId } = request.body as StartConversationInput;
    const conversation = await directMessageService.startConversation(
      request.user!.id,
      receiverId
    );
    response.status(201).json(new ApiResponse(201, conversation, "Conversation started"));
  }

  async listConversations(request: Request, response: Response) {
    const conversations = await directMessageService.listConversations(
      request.user!.id,
      request.validated?.query as ListConversationsQuery
    );
    response.json(new ApiResponse(200, conversations, "Conversations retrieved"));
  }

  async getConversation(request: Request, response: Response) {
    const conversation = await directMessageService.getConversation(
      param(request, "conversationId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, conversation, "Conversation retrieved"));
  }

  async getMessages(request: Request, response: Response) {
    const messages = await directMessageService.getMessages(
      param(request, "conversationId"),
      request.user!.id,
      request.validated?.query as ListMessagesQuery
    );
    response.json(new ApiResponse(200, messages, "Messages retrieved"));
  }

  async sendMessage(request: Request, response: Response) {
    const { message } = await directMessageService.sendMessage(
      param(request, "conversationId"),
      request.user!.id,
      request.body as CreateMessageInput,
      filesFrom(request)
    );
    response.status(201).json(new ApiResponse(201, message, "Message sent"));
  }

  async editMessage(request: Request, response: Response) {
    const message = await directMessageService.editMessage(
      param(request, "id"),
      request.user!.id,
      request.body.content
    );
    response.json(new ApiResponse(200, message, "Message edited"));
  }

  async deleteMessage(request: Request, response: Response) {
    const message = await directMessageService.deleteMessage(
      param(request, "id"),
      request.user!.id
    );
    response.json(new ApiResponse(200, message, "Message deleted"));
  }

  async deleteMessageForMe(request: Request, response: Response) {
    const result = await directMessageService.deleteMessageForMe(
      param(request, "id"),
      request.user!.id
    );
    response.json(new ApiResponse(200, result, "Message deleted for me"));
  }

  async deleteMessageForEveryone(request: Request, response: Response) {
    const message = await directMessageService.deleteMessageForEveryone(
      param(request, "id"),
      request.user!.id,
      request.user!.role === "ADMIN"
    );
    response.json(new ApiResponse(200, message, "Message deleted for everyone"));
  }

  async toggleReaction(request: Request, response: Response) {
    const reactions = await directMessageService.toggleReaction(
      param(request, "id"),
      request.user!.id,
      request.body.emoji,
      request.body.category
    );
    response.json(new ApiResponse(200, { reactions }, "Reaction updated"));
  }

  async toggleStar(request: Request, response: Response) {
    const result = await directMessageService.toggleStar(
      param(request, "id"),
      request.user!.id
    );
    response.json(new ApiResponse(200, result, result.isStarred ? "Message starred" : "Message unstarred"));
  }

  async togglePinMessage(request: Request, response: Response) {
    const result = await directMessageService.togglePinMessage(
      param(request, "id"),
      request.user!.id
    );
    response.json(new ApiResponse(200, result, result.isPinned ? "Message pinned" : "Message unpinned"));
  }

  async getStarredMessages(request: Request, response: Response) {
    const messages = await directMessageService.getStarredMessages(
      param(request, "conversationId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, messages, "Starred messages retrieved"));
  }

  async getPinnedMessages(request: Request, response: Response) {
    const messages = await directMessageService.getPinnedMessages(
      param(request, "conversationId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, messages, "Pinned messages retrieved"));
  }

  async forwardMessages(request: Request, response: Response) {
    const { messageIds, targetConversationIds } = request.body;
    const results = await directMessageService.forwardMessages(
      messageIds,
      targetConversationIds,
      request.user!.id
    );
    response.status(201).json(new ApiResponse(201, results, "Messages forwarded"));
  }

  async bulkDeleteForMe(request: Request, response: Response) {
    const result = await directMessageService.bulkDeleteForMe(
      param(request, "conversationId"),
      request.body.messageIds,
      request.user!.id
    );
    response.json(new ApiResponse(200, result, "Messages deleted for me"));
  }

  async bulkDeleteForEveryone(request: Request, response: Response) {
    const result = await directMessageService.bulkDeleteForEveryone(
      param(request, "conversationId"),
      request.body.messageIds,
      request.user!.id,
      request.user!.role === "ADMIN"
    );
    response.json(new ApiResponse(200, result, "Messages deleted for everyone"));
  }

  async bulkStar(request: Request, response: Response) {
    const result = await directMessageService.bulkStar(
      param(request, "conversationId"),
      request.body.messageIds,
      request.user!.id,
      request.body.star ?? true
    );
    response.json(new ApiResponse(200, result, "Messages star updated"));
  }

  async markAsRead(request: Request, response: Response) {
    await directMessageService.markAsRead(
      request.body.conversationId,
      request.user!.id
    );
    response.json(new ApiResponse(200, null, "Messages marked as read"));
  }

  async unreadCount(request: Request, response: Response) {
    const count = await directMessageService.getUnreadCount(request.user!.id);
    response.json(new ApiResponse(200, { count }, "Unread count retrieved"));
  }

  async togglePin(request: Request, response: Response) {
    const isPinned = await directMessageService.togglePin(
      param(request, "conversationId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, { isPinned }, isPinned ? "Conversation pinned" : "Conversation unpinned"));
  }

  async toggleMute(request: Request, response: Response) {
    const isMuted = await directMessageService.toggleMute(
      param(request, "conversationId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, { isMuted }, isMuted ? "Conversation muted" : "Conversation unmuted"));
  }

  async toggleArchive(request: Request, response: Response) {
    const isArchived = await directMessageService.toggleArchive(
      param(request, "conversationId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, { isArchived }, isArchived ? "Conversation archived" : "Conversation unarchived"));
  }

  async markAsUnread(request: Request, response: Response) {
    await directMessageService.markAsUnread(
      param(request, "conversationId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, null, "Conversation marked as unread"));
  }

  async markAsDelivered(request: Request, response: Response) {
    await directMessageService.markAsDelivered(
      param(request, "conversationId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, null, "Messages marked as delivered"));
  }
}

const param = (request: Request, key: string): string => request.params[key] as string;

const filesFrom = (request: Request) =>
  Array.isArray(request.files) ? request.files : [];

export const directMessageController = new DirectMessageController();
