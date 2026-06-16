import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema
} from "../validators/auth.validator.js";

export const authRouter = Router();

authRouter.post("/register", authLimiter, validate(registerSchema), asyncHandler(authController.register));
authRouter.post("/login", authLimiter, validate(loginSchema), asyncHandler(authController.login));
authRouter.post("/logout", validate(refreshTokenSchema), asyncHandler(authController.logout));
authRouter.post("/refresh-token", validate(refreshTokenSchema), asyncHandler(authController.refresh));
authRouter.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword)
);
authRouter.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);
authRouter.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);
