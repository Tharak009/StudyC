import { isValidObjectId } from "mongoose";
import { z } from "zod";

const objectId = z.string().refine((value) => isValidObjectId(value), "Invalid identifier");
const content = z.string().trim().max(2000).default("");

export const startConversationSchema = z.object({
  body: z.object({
    receiverId: objectId
  })
});

export const conversationIdParamsSchema = z.object({
  params: z.object({ conversationId: objectId })
});

export const messageIdParamsSchema = z.object({
  params: z.object({ id: objectId })
});

export const listConversationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().trim().max(100).optional()
  })
});

export const listMessagesSchema = z.object({
  params: z.object({ conversationId: objectId }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(30),
    order: z.enum(["latest", "oldest"]).default("latest"),
    search: z.string().trim().max(200).optional()
  })
});

export const createMessageSchema = z.object({
  params: z.object({ conversationId: objectId }),
  body: z.object({
    content,
    replyTo: objectId.optional()
  })
});

export const editMessageSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    content: z.string().trim().min(1).max(2000)
  })
});

export const markAsReadSchema = z.object({
  body: z.object({
    conversationId: objectId
  })
});

export const socketStartConversationSchema = z.object({
  receiverId: objectId
});

export const socketConversationSchema = z.object({
  conversationId: objectId
});

export const socketSendDirectMessageSchema = z.object({
  conversationId: objectId,
  content: z.string().trim().max(2000).default(""),
  replyTo: objectId.optional()
});

export const socketEditDirectMessageSchema = z.object({
  conversationId: objectId,
  messageId: objectId,
  content: z.string().trim().min(1).max(2000)
});

export const socketDeleteDirectMessageSchema = z.object({
  conversationId: objectId,
  messageId: objectId
});

export const socketMarkAsReadSchema = z.object({
  conversationId: objectId,
  messageId: objectId.optional()
});

export type ListConversationsQuery = z.infer<typeof listConversationsSchema>["query"];
export type ListMessagesQuery = z.infer<typeof listMessagesSchema>["query"];
export type CreateMessageInput = z.infer<typeof createMessageSchema>["body"];
export type StartConversationInput = z.infer<typeof startConversationSchema>["body"];
