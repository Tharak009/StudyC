import { Router } from "express";
import { studyMeetingController } from "../controllers/study-meeting.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createStudyMeetingSchema,
  joinStudyMeetingSchema,
  meetingIdParamsSchema,
  meetingDetailsSchema,
  removeMeetingParticipantSchema,
  studyMeetingHeartbeatSchema,
  studyMeetingConnectionSchema,
  studyMeetingMediaStateSchema,
  studyMeetingListSchema,
  studyMeetingHistorySchema,
  updateStudyMeetingSchema,
  joinByCodeSchema,
  admissionDecisionBodySchema
} from "../validators/study-meeting.validator.js";

export const studyMeetingRouter = Router();
studyMeetingRouter.use(authenticate);
studyMeetingRouter.get("/history", validate(studyMeetingHistorySchema), asyncHandler(studyMeetingController.history));
studyMeetingRouter.post("/resolve-invitation", validate(joinByCodeSchema), asyncHandler(studyMeetingController.resolveInvitation));
studyMeetingRouter.get("/", validate(studyMeetingListSchema), asyncHandler(studyMeetingController.list));
studyMeetingRouter.post("/", validate(createStudyMeetingSchema), asyncHandler(studyMeetingController.create));
studyMeetingRouter.patch("/:id", validate(updateStudyMeetingSchema), asyncHandler(studyMeetingController.update));
studyMeetingRouter.post("/:id/cancel", validate(meetingIdParamsSchema), asyncHandler(studyMeetingController.cancel));
studyMeetingRouter.get("/:id/admission-requests", validate(meetingIdParamsSchema), asyncHandler(studyMeetingController.admissionRequests));
studyMeetingRouter.get("/:id/admission-status", validate(meetingIdParamsSchema), asyncHandler(studyMeetingController.admissionStatus));
studyMeetingRouter.post("/:id/admission-requests/:userId/decision", validate(admissionDecisionBodySchema), asyncHandler(studyMeetingController.decideAdmission));
studyMeetingRouter.post("/:id/admission-request/cancel", validate(meetingIdParamsSchema), asyncHandler(studyMeetingController.cancelAdmissionRequest));
studyMeetingRouter.get("/:id", validate(meetingDetailsSchema), asyncHandler(studyMeetingController.details));
studyMeetingRouter.post("/:id/join", validate(joinStudyMeetingSchema), asyncHandler(studyMeetingController.join));
studyMeetingRouter.post("/:id/connected", validate(meetingIdParamsSchema), asyncHandler(studyMeetingController.connected));
studyMeetingRouter.patch("/:id/connection-state", validate(studyMeetingConnectionSchema), asyncHandler(studyMeetingController.connectionState));
studyMeetingRouter.post("/:id/heartbeat", validate(studyMeetingHeartbeatSchema), asyncHandler(studyMeetingController.heartbeat));
studyMeetingRouter.patch("/:id/media-state", validate(studyMeetingMediaStateSchema), asyncHandler(studyMeetingController.mediaState));
studyMeetingRouter.post("/:id/leave", validate(meetingIdParamsSchema), asyncHandler(studyMeetingController.leave));
studyMeetingRouter.post("/:id/participants/remove", validate(removeMeetingParticipantSchema), asyncHandler(studyMeetingController.removeParticipant));
studyMeetingRouter.post("/:id/end", validate(meetingIdParamsSchema), asyncHandler(studyMeetingController.end));
