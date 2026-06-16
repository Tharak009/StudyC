import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { COMMUNITY_CATEGORIES, COMMUNITY_VISIBILITY } from "../constants/community.js";

const objectId = z.string().refine((value) => isValidObjectId(value), "Invalid identifier");
const tag = z.string().trim().min(1).max(30).toLowerCase();

const tags = z
  .array(tag)
  .max(10, "A maximum of 10 tags is allowed")
  .transform((items) => [...new Set(items)]);

export const communityIdParamsSchema = z.object({
  params: z.object({ id: objectId })
});

export const createCommunitySchema = z.object({
  body: z.object({
    name: z.string().trim().min(3).max(50),
    description: z.string().trim().max(1000).default(""),
    category: z.enum(COMMUNITY_CATEGORIES),
    tags: z
      .union([tags, z.string()])
      .transform((value) =>
        typeof value === "string"
          ? [...new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))]
          : value
      )
      .pipe(tags),
    visibility: z.enum([COMMUNITY_VISIBILITY.PUBLIC, COMMUNITY_VISIBILITY.PRIVATE]).default("public")
  })
});

export const updateCommunitySchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: z.string().trim().min(3).max(50).optional(),
      description: z.string().trim().max(1000).optional(),
      category: z.enum(COMMUNITY_CATEGORIES).optional(),
      tags: z
        .union([tags, z.string()])
        .transform((value) =>
          typeof value === "string"
            ? [...new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))]
            : value
        )
        .pipe(tags)
        .optional(),
      visibility: z.enum([COMMUNITY_VISIBILITY.PUBLIC, COMMUNITY_VISIBILITY.PRIVATE]).optional()
    })
    .refine((data) => Object.keys(data).length > 0, "At least one community field is required")
});

export const listCommunitiesSchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),
    category: z.enum(COMMUNITY_CATEGORIES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12)
  })
});

export const moderatorParamsSchema = z.object({
  params: z.object({
    id: objectId,
    userId: objectId
  })
});

export const addModeratorSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ userId: objectId })
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>["body"];
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>["body"];
export type ListCommunitiesQuery = z.infer<typeof listCommunitiesSchema>["query"];
