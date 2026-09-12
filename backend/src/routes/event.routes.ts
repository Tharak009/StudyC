import { Router } from "express";
import { eventController } from "../controllers/event.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { eventImageUpload } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createEventSchema,
  eventIdParamsSchema,
  listEventsSchema,
  updateEventSchema
} from "../validators/event.validator.js";

export const eventRouter = Router();
eventRouter.use(authenticate);

eventRouter.get("/", validate(listEventsSchema), asyncHandler(eventController.list));
eventRouter.get("/:id", validate(eventIdParamsSchema), asyncHandler(eventController.details));
eventRouter.post(
  "/",
  eventImageUpload,
  validate(createEventSchema),
  asyncHandler(eventController.create)
);
eventRouter.patch(
  "/:id",
  eventImageUpload,
  validate(updateEventSchema),
  asyncHandler(eventController.update)
);
eventRouter.patch("/:id/approve", authorize("ADMIN"), validate(eventIdParamsSchema), asyncHandler(eventController.approve));
eventRouter.post("/:id/approve", authorize("ADMIN"), validate(eventIdParamsSchema), asyncHandler(eventController.approve));
eventRouter.patch("/:id/reject", authorize("ADMIN"), validate(eventIdParamsSchema), asyncHandler(eventController.reject));
eventRouter.post("/:id/reject", authorize("ADMIN"), validate(eventIdParamsSchema), asyncHandler(eventController.reject));
eventRouter.delete("/:id", validate(eventIdParamsSchema), asyncHandler(eventController.delete));
eventRouter.post("/:id/rsvp", validate(eventIdParamsSchema), asyncHandler(eventController.toggleRsvp));
