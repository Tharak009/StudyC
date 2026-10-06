import { isValidObjectId } from "mongoose";
import { z } from "zod";
import {
  ALL_COMMUNITY_VISIBILITIES,
  COMMUNITY_CATEGORIES,
  COMMUNITY_JOIN_POLICY,
  COMMUNITY_STATUS,
  COMMUNITY_TYPES,
  COMMUNITY_VISIBILITY,
  normalizeVisibility,
  type CommunityJoinPolicy,
  type CommunityStatus,
  type CommunityType
} from "../constants/community.js";

const objectId = z.string().refine((value) => isValidObjectId(value), "Invalid identifier");
const tag = z.string().trim().min(1).max(30).toLowerCase();

const tags = z
  .array(tag)
  .max(10, "A maximum of 10 tags is allowed")
  .transform((items) => [...new Set(items)]);

export const communityIdParamsSchema = z.object({
  params: z.object({ id: objectId })
});

const communityTypeValues = Object.values(COMMUNITY_TYPES) as [CommunityType, ...CommunityType[]];
const communityTypeEnum = z.enum(communityTypeValues);

const visibilityValues = ALL_COMMUNITY_VISIBILITIES as unknown as [string, ...string[]];
const communityVisibilityEnum = z
  .enum(visibilityValues)
  .transform((val) => normalizeVisibility(val));

const communityJoinPolicyValues = Object.values(COMMUNITY_JOIN_POLICY) as [
  CommunityJoinPolicy,
  ...CommunityJoinPolicy[]
];
const communityJoinPolicyEnum = z.enum(communityJoinPolicyValues);

const communityStatusValues = Object.values(COMMUNITY_STATUS) as [
  CommunityStatus,
  ...CommunityStatus[]
];
const communityStatusEnum = z.enum(communityStatusValues);

export const createCommunitySchema = z.object({
  body: z.object({
    name: z.string().trim().min(3).max(50),
    description: z.string().trim().max(1000).default(""),
    category: z.string().trim().min(1, "Category is required"),
    type: communityTypeEnum.default(COMMUNITY_TYPES.ACADEMIC),
    tags: z
      .union([tags, z.string()])
      .transform((value) =>
        typeof value === "string"
          ? [...new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))]
          : value
      )
      .pipe(tags)
      .default([]),
    visibility: communityVisibilityEnum.default(COMMUNITY_VISIBILITY.PUBLIC),
    joinPolicy: communityJoinPolicyEnum.default(COMMUNITY_JOIN_POLICY.OPEN),
    status: z
      .enum([COMMUNITY_STATUS.DRAFT, COMMUNITY_STATUS.ACTIVE] as [CommunityStatus, ...CommunityStatus[]])
      .default(COMMUNITY_STATUS.ACTIVE),
    icon: z.string().trim().max(500).optional(),
    collegeId: objectId.optional()
  })
});

export const updateCommunitySchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: z.string().trim().min(3).max(50).optional(),
      description: z.string().trim().max(1000).optional(),
      category: z.string().trim().min(1).optional(),
      type: communityTypeEnum.optional(),
      tags: z
        .union([tags, z.string()])
        .transform((value) =>
          typeof value === "string"
            ? [...new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))]
            : value
        )
        .pipe(tags)
        .optional(),
      visibility: communityVisibilityEnum.optional(),
      joinPolicy: communityJoinPolicyEnum.optional(),
      status: communityStatusEnum.optional(),
      icon: z.string().trim().max(500).optional(),
      collegeId: objectId.optional()
    })
    .refine((data) => Object.keys(data).length > 0, "At least one community field is required")
});

export const listCommunitiesSchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),
    category: z.string().trim().optional(),
    type: communityTypeEnum.optional(),
    status: communityStatusEnum.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12)
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

export const requestJoinSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      note: z.string().trim().max(300).optional()
    })
    .optional()
});

export const cancelJoinRequestSchema = z.object({
  params: z.object({ id: objectId })
});

export const joinRequestActionSchema = z.object({
  params: z.object({
    id: objectId,
    userId: objectId
  })
});

export const banMemberSchema = z.object({
  params: z.object({
    id: objectId,
    userId: objectId
  }),
  body: z
    .object({
      reason: z.string().trim().max(500).optional()
    })
    .default({})
});

export const unbanMemberSchema = z.object({
  params: z.object({
    id: objectId,
    userId: objectId
  })
});

export const suspendMemberSchema = z.object({
  params: z.object({
    id: objectId,
    userId: objectId
  }),
  body: z.object({
    durationHours: z.coerce.number().int().min(1).max(24 * 365).default(24),
    reason: z.string().trim().max(500).optional()
  })
});

export const listMembersQuerySchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.string().trim().optional()
  })
});

export const listJoinRequestsQuerySchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>["body"];
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>["body"];
export type ListCommunitiesQuery = z.infer<typeof listCommunitiesSchema>["query"];
export type RequestJoinInput = z.infer<typeof requestJoinSchema>["body"];
export type BanMemberInput = z.infer<typeof banMemberSchema>["body"];
export type SuspendMemberInput = z.infer<typeof suspendMemberSchema>["body"];
export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>["query"];
export type ListJoinRequestsQuery = z.infer<typeof listJoinRequestsQuerySchema>["query"];
