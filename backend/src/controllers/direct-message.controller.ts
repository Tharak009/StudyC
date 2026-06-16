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
}

const param = (request: Request, key: string): string => request.params[key] as string;

const filesFrom = (request: Request) =>
  Array.isArray(request.files) ? request.files : [];

export const directMessageController = new DirectMessageController();
