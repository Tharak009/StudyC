import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { searchLimiter } from "../middlewares/rate-limit.middleware.js";
import { profilePictureUpload } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { searchUsersSchema, updateProfileSchema } from "../validators/user.validator.js";

export const userRouter = Router();
userRouter.use(authenticate);

userRouter.get("/profile", asyncHandler(userController.profile));
userRouter.put("/profile", validate(updateProfileSchema), asyncHandler(userController.updateProfile));
userRouter.post(
  "/profile-picture",
  profilePictureUpload,
  asyncHandler(userController.uploadProfilePicture)
);

userRouter.get("/search", searchLimiter, validate(searchUsersSchema), asyncHandler(userController.search));
userRouter.get("/blocked", asyncHandler(userController.listBlocked));
userRouter.post("/:userId/block", asyncHandler(userController.blockUser));
userRouter.delete("/:userId/block", asyncHandler(userController.unblockUser));
userRouter.get("/:userId", asyncHandler(userController.getPublicProfile));
