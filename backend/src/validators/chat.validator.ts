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
    order: z.enum(["latest", "oldest"]).default("latest"),
    channelId: z.string().optional()
  })
});

export const createMessageSchema = z.object({
  params: z.object({ communityId: objectId }),
  body: z.object({
    content,
    replyTo: objectId.optional(),
    channelId: z.string().optional(),
    intent: z.enum(["chat", "question", "solution", "code"]).optional(),
    codeSnippet: z
      .object({
        language: z.string(),
        code: z.string(),
        title: z.string().optional()
      })
      .optional(),
    duration: z.coerce.number().min(0).max(3600).optional(),
    waveform: z.union([z.string(), z.array(z.number())]).optional()
  })
});

export const socketSendMessageSchema = z.object({
  communityId: objectId,
  content: z.string().trim().max(2000).default(""),
  replyTo: objectId.optional(),
  channelId: z.string().optional(),
  intent: z.enum(["chat", "question", "solution", "code"]).optional(),
  codeSnippet: z
    .object({
      language: z.string(),
      code: z.string(),
      title: z.string().optional()
    })
    .optional()
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

export const editChatMessageSchema = z.object({
  params: z.object({
    communityId: objectId,
    messageId: objectId
  }),
  body: z.object({
    content: z.string().trim().min(1).max(2000)
  })
});

export const chatReactionSchema = z.object({
  params: z.object({
    communityId: objectId,
    messageId: objectId
  }),
  body: z.object({
    emoji: z.string().min(1).max(10)
  })
});

export const chatForwardSchema = z.object({
  params: z.object({ communityId: objectId }),
  body: z.object({
    messageIds: z.array(objectId).min(1).max(50),
    targetCommunityId: objectId,
    targetChannelId: z.string().optional()
  })
});

export const chatBulkDeleteSchema = z.object({
  params: z.object({ communityId: objectId }),
  body: z.object({
    messageIds: z.array(objectId).min(1).max(100)
  })
});

export const chatBulkStarSchema = z.object({
  params: z.object({ communityId: objectId }),
  body: z.object({
    messageIds: z.array(objectId).min(1).max(100),
    star: z.boolean().default(true)
  })
});

export type ListMessagesQuery = z.infer<typeof listMessagesSchema>["query"];
export type CreateMessageInput = z.infer<typeof createMessageSchema>["body"];
export type SocketSendMessageInput = z.infer<typeof socketSendMessageSchema>;
export type SocketEditMessageInput = z.infer<typeof socketEditMessageSchema>;
export type SocketDeleteMessageInput = z.infer<typeof socketDeleteMessageSchema>;

