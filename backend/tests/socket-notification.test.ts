import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { io as ioc } from "socket.io-client";
import type { Socket } from "socket.io-client";
import request from "supertest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Notification } from "../src/models/notification.model.js";
import { User } from "../src/models/user.model.js";
import { notificationService } from "../src/services/notification.service.js";
import { notificationBus } from "../src/services/notification-bus.service.js";
import { initializeSockets } from "../src/sockets/index.js";

let mongo: MongoMemoryServer;
let httpServer: HttpServer;
let clientSocket: Socket | null;
let port: number;

const userData = {
  fullName: "Aarav Sharma",
  rollNumber: "CS24-104",
  department: "Computer Science",
  academicYear: 2,
  email: "aarav@college.edu",
  password: "SecurePass1"
};

let token: string;
let userId: string;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  httpServer = createServer(app);
  initializeSockets(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  port = (httpServer.address() as AddressInfo).port;

  const response = await request(app)
    .post("/api/auth/register")
    .send(userData)
    .expect(201);
  token = response.body.data.accessToken as string;
  userId = response.body.data.user._id as string;
}, 30_000);

afterEach(async () => {
  clientSocket?.disconnect();
  clientSocket = null;
  await Notification.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await disconnectDatabase();
  await mongo.stop();
});

describe("Notification Socket.IO events", () => {
  const connect = async () => {
    const socket = ioc(`http://127.0.0.1:${port}`, {
      auth: { token },
      transports: ["websocket"],
      forceNew: true
    });
    await new Promise<void>((resolve, reject) => {
      socket.on("connect", () => {
        socket.emit("subscribeNotifications", resolve);
      });
      socket.on("connect_error", reject);
    });
    return socket;
  };

  it("receives notificationCreated event via user room", async () => {
    clientSocket = await connect();
    const notificationPromise = new Promise<unknown>((resolve) => {
      clientSocket!.on("notificationCreated", resolve);
    });

    await notificationService.createNotification({
      userId, type: "SYSTEM", title: "Socket Test", message: "Delivered via socket"
    });

    const notification = await notificationPromise;
    expect(notification).toBeDefined();
  });

  it("receives unreadCountUpdate event", async () => {
    clientSocket = await connect();
    const countPromise = new Promise<number>((resolve) => {
      clientSocket!.on("unreadCountUpdate", (payload: { count: number }) => {
        resolve(payload.count);
      });
    });

    await notificationService.createNotification({
      userId, type: "SYSTEM", title: "Count test", message: "Testing count update"
    });

    const count = await countPromise;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("receives notificationDeleted event", async () => {
    clientSocket = await connect();
    const deletePromise = new Promise<void>((resolve) => {
      clientSocket!.on("notificationDeleted", () => resolve());
    });

    const delNotif = await notificationService.createNotification({
      userId, type: "SYSTEM", title: "To delete", message: "Will be deleted"
    });

    await notificationService.deleteNotification(delNotif.id, userId);
    await deletePromise;
  });
});

describe("Notification bus", () => {
  it("notificationBus.notificationCreated triggers handler", async () => {
    let captured: { userId: string; notification: Record<string, unknown> } | null = null;
    notificationBus.onCreated((uid, notif) => {
      captured = { userId: uid, notification: notif };
    });

    const n = await notificationService.createNotification({
      userId, type: "SYSTEM", title: "Bus Test", message: "Via bus"
    });

    expect(captured).not.toBeNull();
    expect(captured!.userId).toBe(userId);
  });

  it("notificationBus.notificationUpdated triggers handler", async () => {
    let captured = false;
    notificationBus.onUpdated(() => { captured = true; });

    const n = await notificationService.createNotification({
      userId, type: "SYSTEM", title: "Bus Upd", message: "Will update"
    });
    await notificationService.markAsRead(n.id, userId);

    expect(captured).toBe(true);
  });
});
