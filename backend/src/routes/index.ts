import { Router } from "express";
import { adminRouter } from "./admin.routes.js";
import { authRouter } from "./auth.routes.js";
import { communityRouter } from "./community.routes.js";
import { notificationRouter } from "./notification.routes.js";
import { eventRouter } from "./event.routes.js";
import { friendshipRouter } from "./friendship.routes.js";
import { globalResourceRouter, resourceRouter } from "./resource.routes.js";
import { userRouter } from "./user.routes.js";
import { reportRouter } from "./report.routes.js";
import { streamRouter } from "./stream.routes.js";
import { callRouter } from "./call.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/friends", friendshipRouter);
apiRouter.use("/events", eventRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/communities", communityRouter);
apiRouter.use("/communities", resourceRouter);
apiRouter.use("/", globalResourceRouter);
apiRouter.use("/reports", reportRouter);
apiRouter.use("/stream", streamRouter);
apiRouter.use("/calls", callRouter);

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
