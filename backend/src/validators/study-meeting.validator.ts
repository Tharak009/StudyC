import { z } from "zod";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid meeting identifier");

export const meetingIdParamsSchema = z.object({ params: z.object({ id }) });
export const createStudyMeetingSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).optional().default(""),
    access: z.enum(["PUBLIC", "PRIVATE", "INVITE_ONLY"]).default("PUBLIC"),
    mediaType: z.enum(["voice", "video"]).default("voice"),
    capacity: z.coerce.number().int().min(2).max(100).default(100)
  })
});
export const joinStudyMeetingSchema = z.object({
  params: z.object({ id }),
  body: z.object({ inviteCode: z.string().max(100).optional() }).default({})
});
export const removeMeetingParticipantSchema = z.object({
  params: z.object({ id }),
  body: z.object({ userId: z.string().regex(/^[a-f\d]{24}$/i) })
});
export const studyMeetingConnectionSchema = z.object({
  params: z.object({ id }),
  body: z.object({ state: z.enum(["CONNECTED", "RECONNECTING"]) })
});
