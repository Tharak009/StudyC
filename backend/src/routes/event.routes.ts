import { Router } from "express";
import { eventController } from "../controllers/event.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
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
eventRouter.post("/", validate(createEventSchema), asyncHandler(eventController.create));
eventRouter.patch("/:id", validate(updateEventSchema), asyncHandler(eventController.update));
eventRouter.delete("/:id", validate(eventIdParamsSchema), asyncHandler(eventController.delete));
eventRouter.post("/:id/rsvp", validate(eventIdParamsSchema), asyncHandler(eventController.toggleRsvp));
