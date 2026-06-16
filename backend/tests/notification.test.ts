import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Notification } from "../src/models/notification.model.js";
import { User } from "../src/models/user.model.js";
import { notificationService } from "../src/services/notification.service.js";

let mongo: MongoMemoryServer;
let server: HttpServer;

const userData = {
  fullName: "Aarav Sharma",
  rollNumber: "CS24-104",
  department: "Computer Science",
  academicYear: 2,
  email: "aarav@college.edu",
  password: "SecurePass1"
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
}, 30_000);

afterEach(async () => {
  await Notification.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase();
  await mongo.stop();
});

const register = async () => {
  const response = await request(app).post("/api/auth/register").send(userData).expect(201);
  return {
    token: response.body.data.accessToken as string,
    userId: response.body.data.user._id as string
  };
};

describe("Notification Service", () => {
  it("creates a notification", async () => {
    const { userId } = await register();
    const notification = await notificationService.createNotification({
      userId,
      type: "SYSTEM",
      title: "Welcome",
      message: "Welcome to StudyConnect"
    });
    expect(notification).toBeDefined();
    expect(notification.title).toBe("Welcome");
    expect(notification.isRead).toBe(false);
  });

  it("lists notifications with pagination", async () => {
    const { userId } = await register();
    for (let i = 0; i < 5; i++) {
      await notificationService.createNotification({
        userId,
        type: "SYSTEM",
        title: `Notification ${i}`,
        message: `Message ${i}`
      });
    }
    const result = await notificationService.listNotifications(userId, { page: 1, limit: 3 });
    expect(result.items.length).toBe(3);
    expect(result.total).toBe(5);
    expect(result.pages).toBe(2);
  });

  it("returns unread count", async () => {
    const { userId } = await register();
    await notificationService.createNotification({
      userId, type: "SYSTEM", title: "Test", message: "Test"
    });
    const { count } = await notificationService.getUnreadCount(userId);
    expect(count).toBe(1);
  });

  it("marks notification as read", async () => {
    const { userId } = await register();
    const n = await notificationService.createNotification({
      userId, type: "SYSTEM", title: "Test", message: "Test"
    });
    const updated = await notificationService.markAsRead(n.id, userId);
    expect(updated).not.toBeNull();
    expect(updated!.isRead).toBe(true);
    expect(updated!.readAt).not.toBeNull();
  });

  it("marks all notifications as read", async () => {
    const { userId } = await register();
    for (let i = 0; i < 3; i++) {
      await notificationService.createNotification({
        userId, type: "SYSTEM", title: `N${i}`, message: `M${i}`
      });
    }
    const { count } = await notificationService.markAllAsRead(userId);
    expect(count).toBe(3);
    const unread = await notificationService.getUnreadCount(userId);
    expect(unread.count).toBe(0);
  });

  it("deletes a notification", async () => {
    const { userId } = await register();
    const n = await notificationService.createNotification({
      userId, type: "SYSTEM", title: "Test", message: "Test"
    });
    const deleted = await notificationService.deleteNotification(n.id, userId);
    expect(deleted).not.toBeNull();
    const result = await notificationService.listNotifications(userId, { page: 1, limit: 10 });
    expect(result.total).toBe(0);
  });

  it("prevents cross-user access", async () => {
    const { userId: u1 } = await register();
    const u2Data = { ...userData, email: "other@college.edu", rollNumber: "CS24-111" };
    const r2 = await request(app).post("/api/auth/register").send(u2Data).expect(201);
    const u2Id = r2.body.data.user._id as string;

    const n = await notificationService.createNotification({
      userId: u1, type: "SYSTEM", title: "Private", message: "For u1"
    });

    const result = await notificationService.getNotification(n.id, u2Id);
    expect(result).toBeNull();
  });
});

describe("Notification API", () => {
  it("GET /api/notifications - lists notifications", async () => {
    const { token, userId } = await register();
    await notificationService.createNotification({
      userId, type: "SYSTEM", title: "Test", message: "Test"
    });
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.items.length).toBe(1);
  });

  it("GET /api/notifications/unread-count - returns count", async () => {
    const { token, userId } = await register();
    await notificationService.createNotification({
      userId, type: "SYSTEM", title: "Test", message: "Test"
    });
    const res = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.count).toBe(1);
  });

  it("PATCH /api/notifications/:id/read - marks as read", async () => {
    const { token, userId } = await register();
    const n = await notificationService.createNotification({
      userId, type: "SYSTEM", title: "Test", message: "Test"
    });
    const res = await request(app)
      .patch(`/api/notifications/${n.id}/read`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.isRead).toBe(true);
  });

  it("PATCH /api/notifications/read-all - marks all read", async () => {
    const { token, userId } = await register();
    for (let i = 0; i < 3; i++) {
      await notificationService.createNotification({
        userId, type: "SYSTEM", title: `N${i}`, message: `M${i}`
      });
    }
    const res = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.count).toBe(3);
  });

  it("DELETE /api/notifications/:id - deletes notification", async () => {
    const { token, userId } = await register();
    const n = await notificationService.createNotification({
      userId, type: "SYSTEM", title: "Test", message: "Test"
    });
    await request(app)
      .delete(`/api/notifications/${n.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const result = await notificationService.listNotifications(userId, { page: 1, limit: 10 });
    expect(result.total).toBe(0);
  });

  it("DELETE /api/notifications - clears all", async () => {
    const { token, userId } = await register();
    for (let i = 0; i < 3; i++) {
      await notificationService.createNotification({
        userId, type: "SYSTEM", title: `N${i}`, message: `M${i}`
      });
    }
    await request(app)
      .delete("/api/notifications")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const result = await notificationService.listNotifications(userId, { page: 1, limit: 10 });
    expect(result.total).toBe(0);
  });

  it("requires authentication", async () => {
    await request(app).get("/api/notifications").expect(401);
  });
});
