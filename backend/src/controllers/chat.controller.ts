import type { Request, Response } from "express";
import { chatService } from "../services/chat.service.js";
import { ApiResponse } from "../utils/api-response.js";
import type { CreateMessageInput, ListMessagesQuery } from "../validators/chat.validator.js";

export class ChatController {
  async history(request: Request, response: Response) {
    const messages = await chatService.listMessages(
      param(request, "communityId"),
      request.user!.id,
      request.validated?.query as ListMessagesQuery
    );
    response.json(new ApiResponse(200, messages, "Messages retrieved"));
  }

  async create(request: Request, response: Response) {
    const message = await chatService.createMessage(
      param(request, "communityId"),
      request.user!.id,
      request.body as CreateMessageInput,
      filesFrom(request)
    );
    response.status(201).json(new ApiResponse(201, message, "Message created"));
  }

  async edit(request: Request, response: Response) {
    const message = await chatService.editMessage(
      param(request, "communityId"),
      param(request, "messageId"),
      request.user!.id,
      request.body.content
    );
    response.json(new ApiResponse(200, message, "Message edited"));
  }

  async delete(request: Request, response: Response) {
    const message = await chatService.deleteMessage(
      param(request, "communityId"),
      param(request, "messageId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, message, "Message deleted"));
  }

  async deleteForMe(request: Request, response: Response) {
    const result = await chatService.deleteMessageForMe(
      param(request, "communityId"),
      param(request, "messageId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, result, "Message deleted for me"));
  }

  async toggleReaction(request: Request, response: Response) {
    const reactions = await chatService.toggleReaction(
      param(request, "communityId"),
      param(request, "messageId"),
      request.user!.id,
      request.body.emoji
    );
    response.json(new ApiResponse(200, { reactions }, "Reaction updated"));
  }

  async toggleStar(request: Request, response: Response) {
    const result = await chatService.toggleStar(
      param(request, "communityId"),
      param(request, "messageId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, result, result.isStarred ? "Message starred" : "Message unstarred"));
  }

  async togglePin(request: Request, response: Response) {
    const result = await chatService.togglePin(
      param(request, "communityId"),
      param(request, "messageId"),
      request.user!.id
    );
    response.json(new ApiResponse(200, result, result.isPinned ? "Message pinned" : "Message unpinned"));
  }

  async listStarred(request: Request, response: Response) {
    const messages = await chatService.listStarred(
      param(request, "communityId"),
      request.user!.id,
      request.query.channelId as string | undefined
    );
    response.json(new ApiResponse(200, messages, "Starred messages retrieved"));
  }

  async listPinned(request: Request, response: Response) {
    const messages = await chatService.listPinned(
      param(request, "communityId"),
      request.user!.id,
      request.query.channelId as string | undefined
    );
    response.json(new ApiResponse(200, messages, "Pinned messages retrieved"));
  }

  async forward(request: Request, response: Response) {
    const { messageIds, targetCommunityId, targetChannelId } = request.body;
    const results = await chatService.forwardMessages(
      messageIds,
      targetCommunityId || param(request, "communityId"),
      targetChannelId,
      request.user!.id
    );
    response.status(201).json(new ApiResponse(201, results, "Messages forwarded"));
  }

  async bulkDeleteForMe(request: Request, response: Response) {
    const result = await chatService.bulkDeleteForMe(
      param(request, "communityId"),
      request.body.messageIds,
      request.user!.id
    );
    response.json(new ApiResponse(200, result, "Messages deleted for me"));
  }

  async bulkDeleteForEveryone(request: Request, response: Response) {
    const result = await chatService.bulkDeleteForEveryone(
      param(request, "communityId"),
      request.body.messageIds,
      request.user!.id
    );
    response.json(new ApiResponse(200, result, "Messages deleted for everyone"));
  }

  async bulkStar(request: Request, response: Response) {
    const result = await chatService.bulkStar(
      param(request, "communityId"),
      request.body.messageIds,
      request.user!.id,
      request.body.star ?? true
    );
    response.json(new ApiResponse(200, result, "Messages star updated"));
  }
}

const param = (request: Request, key: string): string => request.params[key] as string;

const filesFrom = (request: Request) =>
  Array.isArray(request.files) ? request.files : [];

export const chatController = new ChatController();
