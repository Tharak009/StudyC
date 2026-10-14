import { createServer } from "node:http";
import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { initializeSockets } from "./sockets/index.js";
import { callHistoryService } from "./services/call-history.service.js";
import { studyMeetingService } from "./services/study-meeting.service.js";

const start = async (): Promise<void> => {
  await connectDatabase();
  await studyMeetingService.initialize();
  await callHistoryService.markInterruptedDirectCalls();
  await callHistoryService.markInterruptedGroupCalls();
  const server = createServer(app);
  initializeSockets(server);

  const port = Number(process.env.PORT) || env.PORT || 5000;
  const host = "0.0.0.0";

  server.listen(port, host, () => {
    console.info(`StudyConnect API listening on http://${host}:${port}`);
  });

  const shutdown = (signal: string) => {
    console.info(`${signal} received. Closing StudyConnect API.`);
    studyMeetingService.stopReconciliation();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

start().catch((error) => {
  console.error("Failed to start StudyConnect API", error);
  process.exit(1);
});
