import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { RESOURCE_CATEGORIES, RESOURCE_VISIBILITY } from "../constants/resource.js";

const objectId = z.string().refine((value) => isValidObjectId(value), "Invalid identifier");
const communityIdOrSlug = z.string().trim().min(1, "Community identifier is required").max(100);

const categoryEnum = z.preprocess(
  (val) => (typeof val === "string" ? val.toUpperCase() : val),
  z.enum(RESOURCE_CATEGORIES)
);

const visibilityEnum = z.preprocess(
  (val) => (typeof val === "string" ? val.toUpperCase() : val),
  z.enum([RESOURCE_VISIBILITY.COMMUNITY, RESOURCE_VISIBILITY.PUBLIC])
).default(RESOURCE_VISIBILITY.COMMUNITY);

const tags = z
  .array(z.string().trim().max(30))
  .max(10, "A maximum of 10 tags is allowed")
  .default([]);

export const communityIdParamsSchema = z.object({
  params: z.object({ communityId: communityIdOrSlug })
});

export const resourceIdParamsSchema = z.object({
  params: z.object({ resourceId: objectId })
});

export const listResourcesSchema = z.object({
  params: z.object({ communityId: communityIdOrSlug.optional() }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().trim().max(200).optional(),
    category: z.string().trim().max(50).optional(),
    department: z.string().trim().max(100).optional(),
    dept: z.string().trim().max(100).optional(),
    semester: z.string().trim().max(50).optional(),
    format: z.string().trim().max(50).optional(),
    tag: z.string().trim().max(30).optional(),
    sort: z.enum(["recent", "downloads", "rating", "name"]).default("recent")
  })
});

export const createResourceSchema = z.object({
  params: z.object({ communityId: communityIdOrSlug.optional() }),
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().trim().max(2000).default(""),
    category: categoryEnum,
    department: z.string().trim().max(100).optional(),
    semester: z.string().trim().max(50).optional(),
    subjectCode: z.string().trim().max(50).optional(),
    tags,
    visibility: visibilityEnum
  })
});

export const updateResourceSchema = z.object({
  params: z.object({ resourceId: objectId }),
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    category: categoryEnum.optional(),
    tags: tags.optional(),
    visibility: visibilityEnum.optional()
  }).refine((data) => Object.keys(data).length > 0, "At least one field must be provided for update")
});

export const communityResourcesParamsSchema = z.object({
  params: z.object({
    communityId: communityIdOrSlug,
    resourceId: objectId
  })
});

export const initiateUploadSchema = z.object({
  params: z.object({ communityId: communityIdOrSlug.optional() }),
  body: z.object({
    fileName: z.string().trim().min(1, "File name is required").max(255),
    fileSize: z.number().int().positive("File size must be positive").max(1024 * 1024 * 1024, "File size exceeds 1 GB cap"),
    mimeType: z.string().trim().min(1, "MIME type is required").max(128),
    totalParts: z.number().int().min(1, "Total parts must be at least 1").max(1000, "Total parts cannot exceed 1000"),
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().trim().max(2000).default(""),
    category: categoryEnum,
    department: z.string().trim().max(100).optional(),
    semester: z.string().trim().max(50).optional(),
    subjectCode: z.string().trim().max(50).optional(),
    tags,
    visibility: visibilityEnum
  })
});

export const getPartUrlsSchema = z.object({
  params: z.object({ sessionId: objectId }),
  query: z.object({
    parts: z.string().min(1, "Parts query parameter is required")
  })
});

export const completeUploadSchema = z.object({
  params: z.object({ sessionId: objectId }),
  body: z.object({
    completedParts: z
      .array(
        z.object({
          partNumber: z.number().int().min(1),
          etag: z.string().min(1)
        })
      )
      .min(1, "At least one completed part is required")
  })
});

export const uploadSessionParamsSchema = z.object({
  params: z.object({ sessionId: objectId })
});

export const rateResourceSchema = z.object({
  params: z.object({ resourceId: objectId }),
  body: z.object({
    rating: z.number().min(1).max(5),
    reviewText: z.string().max(1000).optional()
  })
});

export type ListResourcesQuery = z.infer<typeof listResourcesSchema>["query"];
export type CreateResourceInput = z.infer<typeof createResourceSchema>["body"];
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>["body"];
export type InitiateUploadInput = z.infer<typeof initiateUploadSchema>["body"];
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>["body"];



