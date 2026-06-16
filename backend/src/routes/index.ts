import { Router } from "express";
import { adminRouter } from "./admin.routes.js";
import { authRouter } from "./auth.routes.js";
import { chatRouter } from "./chat.routes.js";
import { communityRouter } from "./community.routes.js";
import { directMessageRouter } from "./direct-message.routes.js";
import { notificationRouter } from "./notification.routes.js";
import { globalResourceRouter, resourceRouter } from "./resource.routes.js";
import { userRouter } from "./user.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/communities", chatRouter);
apiRouter.use("/communities", communityRouter);
apiRouter.use("/communities", resourceRouter);
apiRouter.use("/", globalResourceRouter);
apiRouter.use("/direct-messages", directMessageRouter);

apiRouter.get("/future-modules", (_request, response) => {
  response.json({
    success: true,
    data: {
      communities: "active",
      chat: "active",
      directMessaging: "active",
      resources: "active",
      notifications: "active",
      admin: "active",
      calls: "planned"
    },
    message: "Future module contract"
  });
});
