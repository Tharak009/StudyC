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
}

const param = (request: Request, key: string): string => request.params[key] as string;

const filesFrom = (request: Request) =>
  Array.isArray(request.files) ? request.files : [];

export const chatController = new ChatController();
