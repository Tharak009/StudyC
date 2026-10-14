import { z } from "zod";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid meeting identifier");
const scheduledStartAt = z.string().datetime({ offset: true }).optional().nullable();
const duration = z.coerce.number().int().min(15).max(480).optional().nullable();

const meetingListQuery = z.object({
  status: z.enum(["WAITING", "ACTIVE", "ENDED", "CANCELLED"]).optional(),
  scope: z.enum(["all", "organized", "attending"]).default("all"),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});
export const studyMeetingListSchema = z.object({ query: meetingListQuery });
export const studyMeetingHistorySchema = z.object({ query: z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(50).default(20), search: z.string().trim().max(100).optional() }) });

export const meetingIdParamsSchema = z.object({ params: z.object({ id }) });
export const meetingDetailsSchema = z.object({ params: z.object({ id }), query: z.object({ inviteCode: z.string().trim().min(16).max(100).regex(/^[A-Za-z0-9_-]+$/).optional() }) });
export const createStudyMeetingSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(120),
    requestId: z.string().uuid().optional(),
    subject: z.string().trim().max(120).optional().default(""),
    description: z.string().trim().max(1000).optional().default(""),
    access: z.enum(["PUBLIC", "PRIVATE", "INVITE_ONLY"]).default("PUBLIC"),
    mediaType: z.enum(["voice", "video"]).default("voice"),
    capacity: z.coerce.number().int().min(2).max(100).default(100),
    scheduledStartAt,
    expectedDurationMinutes: duration,
    waitingRoomEnabled: z.boolean().optional().default(false)
  })
});
export const updateStudyMeetingSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    title: z.string().trim().min(2).max(120).optional(),
    subject: z.string().trim().max(120).optional(),
    description: z.string().trim().max(1000).optional(),
    access: z.enum(["PUBLIC", "PRIVATE", "INVITE_ONLY"]).optional(),
    capacity: z.coerce.number().int().min(2).max(100).optional(),
    scheduledStartAt: z.string().datetime({ offset: true }).optional(),
    expectedDurationMinutes: duration,
    waitingRoomEnabled: z.boolean().optional(),
    expectedUpdatedAt: z.string().datetime({ offset: true })
  }).refine((body) => Object.keys(body).some((key) => key !== "expectedUpdatedAt"), "Provide at least one meeting change")
});
export const joinStudyMeetingSchema = z.object({
  params: z.object({ id }),
  body: z.object({ inviteCode: z.string().trim().min(16).max(100).regex(/^[A-Za-z0-9_-]+$/).optional() }).default({})
});
export const joinByCodeSchema = z.object({ body: z.object({ code: z.string().trim().min(16).max(100).regex(/^[A-Za-z0-9_-]+$/, "Invalid invitation code") }) });
export const admissionDecisionSchema = z.object({ params: z.object({ id, userId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid participant identifier") }) });
export const admissionDecisionBodySchema = z.object({ params: z.object({ id, userId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid participant identifier") }), body: z.object({ decision: z.enum(["APPROVED", "REJECTED"]) }) });
export const removeMeetingParticipantSchema = z.object({
  params: z.object({ id }),
  body: z.object({ userId: z.string().regex(/^[a-f\d]{24}$/i) })
});
export const studyMeetingConnectionSchema = z.object({
  params: z.object({ id }),
  body: z.object({ state: z.enum(["CONNECTED", "RECONNECTING"]) })
});
export const studyMeetingHeartbeatSchema = z.object({
  params: z.object({ id }),
  body: z.object({}).default({})
});
export const studyMeetingMediaStateSchema = z.object({
  params: z.object({ id }),
  body: z.object({ audioEnabled: z.boolean(), videoEnabled: z.boolean() })
});
