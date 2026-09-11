import { Router } from "express";
import { friendshipController } from "../controllers/friendship.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { targetUserIdParamsSchema } from "../validators/friendship.validator.js";

export const friendshipRouter = Router();
friendshipRouter.use(authenticate);

friendshipRouter.get("/", asyncHandler(friendshipController.listFriends));
friendshipRouter.get("/requests", asyncHandler(friendshipController.listRequests));
friendshipRouter.get("/status/:userId", validate(targetUserIdParamsSchema), asyncHandler(friendshipController.getStatus));
friendshipRouter.post("/request/:userId", validate(targetUserIdParamsSchema), asyncHandler(friendshipController.sendRequest));
friendshipRouter.delete("/request/:userId", validate(targetUserIdParamsSchema), asyncHandler(friendshipController.cancelRequest));
friendshipRouter.post("/accept/:userId", validate(targetUserIdParamsSchema), asyncHandler(friendshipController.acceptRequest));
friendshipRouter.post("/decline/:userId", validate(targetUserIdParamsSchema), asyncHandler(friendshipController.declineRequest));
friendshipRouter.delete("/:userId", validate(targetUserIdParamsSchema), asyncHandler(friendshipController.removeFriend));
