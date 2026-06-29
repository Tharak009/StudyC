import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
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

userRouter.get("/search", validate(searchUsersSchema), asyncHandler(userController.search));
