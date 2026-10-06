import { Router } from "express";
import { reportController } from "../controllers/report.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { reportLimiter } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createReportSchema } from "../validators/report.validator.js";
import { asyncHandler } from "../utils/async-handler.js";

export const reportRouter = Router();

reportRouter.use(authenticate);

reportRouter.post(
  "/",
  reportLimiter,
  validate(createReportSchema),
  asyncHandler(reportController.createReport.bind(reportController))
);
