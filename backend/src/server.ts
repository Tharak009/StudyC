import { createServer } from "node:http";
import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { initializeSockets } from "./sockets/index.js";

const start = async (): Promise<void> => {
  await connectDatabase();
  const server = createServer(app);
  initializeSockets(server);

  server.listen(env.PORT, () => {
    console.info(`StudyConnect API listening on port ${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.info(`${signal} received. Closing StudyConnect API.`);
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
