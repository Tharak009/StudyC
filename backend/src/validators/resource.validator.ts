import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { RESOURCE_CATEGORIES, RESOURCE_VISIBILITY } from "../constants/resource.js";

const objectId = z.string().refine((value) => isValidObjectId(value), "Invalid identifier");

const tags = z
  .array(z.string().trim().max(30))
  .max(10, "A maximum of 10 tags is allowed")
  .default([]);

export const communityIdParamsSchema = z.object({
  params: z.object({ communityId: objectId })
});

export const resourceIdParamsSchema = z.object({
  params: z.object({ resourceId: objectId })
});

export const listResourcesSchema = z.object({
  params: z.object({ communityId: objectId.optional() }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().trim().max(200).optional(),
    category: z.enum(RESOURCE_CATEGORIES).optional(),
    tag: z.string().trim().max(30).optional(),
    sort: z.enum(["recent", "downloads", "name"]).default("recent")
  })
});

export const createResourceSchema = z.object({
  params: z.object({ communityId: objectId }),
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().trim().max(2000).default(""),
    category: z.enum(RESOURCE_CATEGORIES),
    tags,
    visibility: z.enum([RESOURCE_VISIBILITY.COMMUNITY, RESOURCE_VISIBILITY.PUBLIC]).default(RESOURCE_VISIBILITY.COMMUNITY)
  })
});

export const updateResourceSchema = z.object({
  params: z.object({ resourceId: objectId }),
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    category: z.enum(RESOURCE_CATEGORIES).optional(),
    tags: tags.optional(),
    visibility: z.enum([RESOURCE_VISIBILITY.COMMUNITY, RESOURCE_VISIBILITY.PUBLIC]).optional()
  }).refine((data) => Object.keys(data).length > 0, "At least one field must be provided for update")
});

export const communityResourcesParamsSchema = z.object({
  params: z.object({
    communityId: objectId,
    resourceId: objectId
  })
});

export type ListResourcesQuery = z.infer<typeof listResourcesSchema>["query"];
export type CreateResourceInput = z.infer<typeof createResourceSchema>["body"];
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>["body"];
