import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { GROUP_STATUS, GROUP_TYPES } from "../constants/community-group.js";

const objectId = z.string().refine((value) => isValidObjectId(value), "Invalid identifier");

export const communityGroupParamsSchema = z.object({
  params: z.object({
    communityId: objectId,
    groupId: objectId.optional()
  })
});

export const createGroupSchema = z.object({
  params: z.object({
    communityId: objectId
  }),
  body: z.object({
    name: z.string().trim().min(2, "Group name must be at least 2 characters").max(60, "Group name cannot exceed 60 characters"),
    description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional().default(""),
    type: z.enum([
      GROUP_TYPES.DISCUSSION,
      GROUP_TYPES.STUDY,
      GROUP_TYPES.PROJECT,
      GROUP_TYPES.SUBJECT
    ]).default(GROUP_TYPES.DISCUSSION),
    icon: z.string().trim().max(500).optional()
  })
});

export const attachGroupSchema = z.object({
  params: z.object({
    communityId: objectId
  }),
  body: z.object({
    name: z.string().trim().min(2, "Group name must be at least 2 characters").max(60),
    description: z.string().trim().max(500).optional().default(""),
    type: z.enum([
      GROUP_TYPES.DISCUSSION,
      GROUP_TYPES.STUDY,
      GROUP_TYPES.PROJECT,
      GROUP_TYPES.SUBJECT
    ]).default(GROUP_TYPES.DISCUSSION),
    streamChannelId: z.string().trim().min(3).max(64),
    icon: z.string().trim().max(500).optional()
  })
});

export const updateGroupSchema = z.object({
  params: z.object({
    communityId: objectId,
    groupId: objectId
  }),
  body: z.object({
    name: z.string().trim().min(2).max(60).optional(),
    description: z.string().trim().max(500).optional(),
    icon: z.string().trim().max(500).optional(),
    status: z.enum(Object.values(GROUP_STATUS) as [string, ...string[]]).optional(),
    sortOrder: z.number().int().min(0).optional()
  }).refine((data) => Object.keys(data).length > 0, "At least one field to update is required")
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>["body"];
export type AttachGroupInput = z.infer<typeof attachGroupSchema>["body"];
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>["body"];
