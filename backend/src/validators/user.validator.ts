import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(2).max(100).optional(),
      department: z.string().trim().min(2).max(100).optional(),
      academicYear: z.coerce.number().int().min(1).max(8).optional(),
      bio: z.string().trim().max(500).optional(),
      interests: z
        .array(z.string().trim().min(1).max(50))
        .max(20)
        .transform((items) => [...new Set(items)])
        .optional()
    })
    .refine((data) => Object.keys(data).length > 0, "At least one profile field is required")
});

export const updateMessagingProfileSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().refine((value) => Array.from(value).length >= 2 && Array.from(value).length <= 25, "Display name must contain 2 to 25 characters").optional(),
      bio: z.string().trim().refine((value) => Array.from(value).length <= 139, "About must be 139 characters or fewer").optional()
    })
    .refine((data) => Object.keys(data).length > 0, "At least one messaging profile field is required")
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>["body"];
export type UpdateMessagingProfileInput = z.infer<typeof updateMessagingProfileSchema>["body"];

export const searchUsersSchema = z.object({
  query: z.object({
    q: z.string().trim().max(100).default("")
  })
});
