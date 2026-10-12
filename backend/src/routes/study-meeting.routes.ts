import { Router } from "express";
import { studyMeetingController } from "../controllers/study-meeting.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createStudyMeetingSchema,
  joinStudyMeetingSchema,
  meetingIdParamsSchema,
  removeMeetingParticipantSchema,
  studyMeetingConnectionSchema
} from "../validators/study-meeting.validator.js";

export const studyMeetingRouter = Router();
studyMeetingRouter.use(authenticate);
studyMeetingRouter.get("/", asyncHandler(studyMeetingController.list));
studyMeetingRouter.post("/", validate(createStudyMeetingSchema), asyncHandler(studyMeetingController.create));
studyMeetingRouter.get("/:id", validate(meetingIdParamsSchema), asyncHandler(studyMeetingController.details));
studyMeetingRouter.post("/:id/join", validate(joinStudyMeetingSchema), asyncHandler(studyMeetingController.join));
studyMeetingRouter.post("/:id/connected", validate(meetingIdParamsSchema), asyncHandler(studyMeetingController.connected));
studyMeetingRouter.patch("/:id/connection-state", validate(studyMeetingConnectionSchema), asyncHandler(studyMeetingController.connectionState));
studyMeetingRouter.post("/:id/leave", validate(meetingIdParamsSchema), asyncHandler(studyMeetingController.leave));
studyMeetingRouter.post("/:id/participants/remove", validate(removeMeetingParticipantSchema), asyncHandler(studyMeetingController.removeParticipant));
studyMeetingRouter.post("/:id/end", validate(meetingIdParamsSchema), asyncHandler(studyMeetingController.end));
