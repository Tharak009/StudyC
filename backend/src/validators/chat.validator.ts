import { isValidObjectId } from "mongoose";
import { z } from "zod";

const objectId = z.string().refine((value) => isValidObjectId(value), "Invalid identifier");
const content = z.string().trim().max(2000).default("");

export const communityMessagesParamsSchema = z.object({
  params: z.object({ communityId: objectId })
});

export const messageParamsSchema = z.object({
  params: z.object({
    communityId: objectId,
    messageId: objectId
  })
});

export const listMessagesSchema = z.object({
  params: z.object({ communityId: objectId }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(30),
    order: z.enum(["latest", "oldest"]).default("latest")
  })
});

export const createMessageSchema = z.object({
  params: z.object({ communityId: objectId }),
  body: z.object({
    content,
    replyTo: objectId.optional()
  })
});

export const socketSendMessageSchema = z.object({
  communityId: objectId,
  content: z.string().trim().min(1).max(2000),
  replyTo: objectId.optional()
});

export const socketEditMessageSchema = z.object({
  communityId: objectId,
  messageId: objectId,
  content: z.string().trim().min(1).max(2000)
});

export const socketDeleteMessageSchema = z.object({
  communityId: objectId,
  messageId: objectId
});

export const socketCommunitySchema = z.object({
  communityId: objectId
});

export type ListMessagesQuery = z.infer<typeof listMessagesSchema>["query"];
export type CreateMessageInput = z.infer<typeof createMessageSchema>["body"];
export type SocketSendMessageInput = z.infer<typeof socketSendMessageSchema>;
export type SocketEditMessageInput = z.infer<typeof socketEditMessageSchema>;
export type SocketDeleteMessageInput = z.infer<typeof socketDeleteMessageSchema>;
