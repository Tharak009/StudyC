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
    search: z.string().trim().max(100).optional(),
    archived: z.coerce.boolean().optional()
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
    replyTo: objectId.optional(),
    clientMessageId: z.string().trim().max(100).optional(),
    duration: z.coerce.number().min(0).max(3600).optional(),
    waveform: z.union([z.string(), z.array(z.number())]).optional()
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
  replyTo: objectId.optional(),
  clientMessageId: z.string().trim().max(100).optional()
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

export const conversationMessageParamsSchema = z.object({
  params: z.object({
    conversationId: objectId,
    messageId: objectId
  })
});

export const reactionSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    emoji: z.string().min(1).max(10),
    category: z.enum(["STANDARD", "CAMPUS_CUSTOM"]).default("STANDARD")
  })
});

export const forwardMessageSchema = z.object({
  body: z.object({
    messageIds: z.array(objectId).min(1).max(50),
    targetConversationIds: z.array(objectId).min(1).max(20)
  })
});

export const bulkDeleteSchema = z.object({
  params: z.object({ conversationId: objectId }),
  body: z.object({
    messageIds: z.array(objectId).min(1).max(100)
  })
});

export const bulkStarSchema = z.object({
  params: z.object({ conversationId: objectId }),
  body: z.object({
    messageIds: z.array(objectId).min(1).max(100),
    star: z.boolean().default(true)
  })
});

export type ListConversationsQuery = z.infer<typeof listConversationsSchema>["query"];
export type ListMessagesQuery = z.infer<typeof listMessagesSchema>["query"];
export type CreateMessageInput = z.infer<typeof createMessageSchema>["body"];
export type StartConversationInput = z.infer<typeof startConversationSchema>["body"];
export type ForwardMessageInput = z.infer<typeof forwardMessageSchema>["body"];

