import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { io as Client, type Socket as ClientSocket } from "socket.io-client";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Conversation } from "../src/models/conversation.model.js";
import { DirectMessage } from "../src/models/direct-message.model.js";
import { User } from "../src/models/user.model.js";
import { initializeSockets } from "../src/sockets/index.js";
import { directMessageService } from "../src/services/direct-message.service.js";

let mongo: MongoMemoryServer;
let server: HttpServer;
let baseURL: string;

const userA = {
  fullName: "Aarav Sharma",
  rollNumber: "CS24-104",
  department: "Computer Science",
  academicYear: 2,
  email: "aarav@college.edu",
  password: "SecurePass1"
};

const userB = {
  fullName: "Meera Rao",
  rollNumber: "CS24-110",
  department: "Computer Science",
  academicYear: 2,
  email: "meera@college.edu",
  password: "SecurePass1"
};

const userC = {
  fullName: "Rohan Kapoor",
  rollNumber: "CS24-115",
  department: "Computer Science",
  academicYear: 2,
  email: "rohan@college.edu",
  password: "SecurePass1"
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  server = createServer(app);
  initializeSockets(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  baseURL = `http://127.0.0.1:${address.port}`;
}, 30_000);

afterEach(async () => {
  await Promise.all([
    DirectMessage.deleteMany({}),
    Conversation.deleteMany({}),
    User.deleteMany({})
  ]);
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase();
  await mongo.stop();
});

const register = async (payload: typeof userA) => {
  const response = await request(app).post("/api/auth/register").send(payload).expect(201);
  return {
    token: response.body.data.accessToken as string,
    userId: response.body.data.user._id as string
  };
};

const connectSocket = async (token: string) => {
  const socket = Client(baseURL, {
    auth: { token },
    transports: ["websocket"],
    forceNew: true
  });
  await new Promise<void>((resolve, reject) => {
    socket.on("connect", resolve);
    socket.on("connect_error", reject);
  });
  return socket;
};

const emitWithAck = <T>(socket: ClientSocket, event: string, payload: unknown) =>
  new Promise<T>((resolve, reject) => {
    socket.emit(event, payload, (ack: { success: boolean; data?: T; message?: string }) => {
      if (ack.success) resolve(ack.data as T);
      else reject(new Error(ack.message));
    });
  });

describe("Conversation Management API", () => {
  it("creates a new conversation between two users", async () => {
    const a = await register(userA);
    const b = await register(userB);

    const response = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);

    expect(response.body.data._id).toBeDefined();
    expect(response.body.data.participants).toHaveLength(2);
  });

  it("returns existing conversation instead of creating a duplicate", async () => {
    const a = await register(userA);
    const b = await register(userB);

    const first = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);

    const second = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId })
      .expect(201);

    expect(first.body.data._id).toBe(second.body.data._id);
  });

  it("prevents self-conversation", async () => {
    const a = await register(userA);

    await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: a.userId })
      .expect(422);
  });

  it("lists authenticated user conversations", async () => {
    const a = await register(userA);
    const b = await register(userB);
    const c = await register(userC);

    await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId });

    await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: c.userId });

    const response = await request(app)
      .get("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.total).toBe(2);
  });

  it("requires authentication for conversation access", async () => {
    await request(app)
      .post("/api/direct-messages/conversations")
      .send({ receiverId: "507f1f77bcf86cd799439011" })
      .expect(401);
  });
});

describe("Direct Message Service", () => {
  it("prevents non-participants from accessing conversation", async () => {
    const a = await register(userA);
    const b = await register(userB);
    const c = await register(userC);

    const { body } = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId });

    const conversationId = body.data._id;

    await request(app)
      .get(`/api/direct-messages/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${c.token}`)
      .expect(403);
  });

  it("sends and retrieves messages in a conversation", async () => {
    const a = await register(userA);
    const b = await register(userB);

    const { body: conv } = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId });

    const conversationId = conv.data._id;

    await request(app)
      .post(`/api/direct-messages/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .field("content", "Hey, how are you?")
      .expect(201);

    const history = await request(app)
      .get(`/api/direct-messages/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    expect(history.body.data.items).toHaveLength(1);
    expect(history.body.data.items[0].content).toBe("Hey, how are you?");
    expect(history.body.data.items[0].senderId._id).toBe(a.userId);
  });

  it("allows sender to edit their own message", async () => {
    const a = await register(userA);
    const b = await register(userB);

    const { body: conv } = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId });

    const { body: msg } = await request(app)
      .post(`/api/direct-messages/conversations/${conv.data._id}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .field("content", "Original content")
      .expect(201);

    const edited = await request(app)
      .put(`/api/direct-messages/messages/${msg.data._id}`)
      .set("Authorization", `Bearer ${a.token}`)
      .send({ content: "Edited content" })
      .expect(200);

    expect(edited.body.data.content).toBe("Edited content");
    expect(edited.body.data.edited).toBe(true);
  });

  it("prevents non-sender from editing a message", async () => {
    const a = await register(userA);
    const b = await register(userB);

    const { body: conv } = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId });

    const { body: msg } = await request(app)
      .post(`/api/direct-messages/conversations/${conv.data._id}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .field("content", "Hello")
      .expect(201);

    await request(app)
      .put(`/api/direct-messages/messages/${msg.data._id}`)
      .set("Authorization", `Bearer ${b.token}`)
      .send({ content: "Hacked" })
      .expect(403);
  });

  it("allows sender to delete their own message", async () => {
    const a = await register(userA);
    const b = await register(userB);

    const { body: conv } = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId });

    const { body: msg } = await request(app)
      .post(`/api/direct-messages/conversations/${conv.data._id}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .field("content", "Delete me")
      .expect(201);

    await request(app)
      .delete(`/api/direct-messages/messages/${msg.data._id}`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    const history = await request(app)
      .get(`/api/direct-messages/conversations/${conv.data._id}/messages`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    expect(history.body.data.items).toHaveLength(0);
  });

  it("returns paginated message history", async () => {
    const a = await register(userA);
    const b = await register(userB);

    const { body: conv } = await request(app)
      .post("/api/direct-messages/conversations")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ receiverId: b.userId });

    for (let i = 1; i <= 5; i++) {
      await request(app)
        .post(`/api/direct-messages/conversations/${conv.data._id}/messages`)
        .set("Authorization", `Bearer ${a.token}`)
        .field("content", `Message ${i}`);
    }

    const page1 = await request(app)
      .get(`/api/direct-messages/conversations/${conv.data._id}/messages?page=1&limit=2`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    expect(page1.body.data.items).toHaveLength(2);
    expect(page1.body.data.total).toBe(5);
    expect(page1.body.data.pages).toBe(3);

    const page2 = await request(app)
      .get(`/api/direct-messages/conversations/${conv.data._id}/messages?page=2&limit=2`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    expect(page2.body.data.items).toHaveLength(2);
  });
});

describe("Socket.IO - Direct Messages", () => {
  it("broadcasts sent messages to conversation room members", async () => {
    const a = await register(userA);
    const b = await register(userB);

    const aSocket = await connectSocket(a.token);
    const bSocket = await connectSocket(b.token);

    try {
      const conv = await emitWithAck<{ _id: string }>(
        aSocket,
        "startConversation",
        { receiverId: b.userId }
      );
      const conversationId = conv._id;

      await emitWithAck(bSocket, "joinConversation", { conversationId });

      const received = new Promise<{ content: string }>((resolve) => {
        bSocket.on("directMessageCreated", resolve);
      });

      await emitWithAck(aSocket, "sendDirectMessage", {
        conversationId,
        content: "Socket hello"
      });

      await expect(received).resolves.toMatchObject({ content: "Socket hello" });
    } finally {
      aSocket.disconnect();
      bSocket.disconnect();
    }
  });

  it("notifies conversation members when message is read", async () => {
    const a = await register(userA);
    const b = await register(userB);

    const aSocket = await connectSocket(a.token);
    const bSocket = await connectSocket(b.token);

    try {
      const conv = await emitWithAck<{ _id: string }>(
        aSocket,
        "startConversation",
        { receiverId: b.userId }
      );
      const conversationId = conv._id;

      await emitWithAck(bSocket, "joinConversation", { conversationId });

      await emitWithAck(aSocket, "sendDirectMessage", {
        conversationId,
        content: "Read this"
      });

      const readReceipt = new Promise<{ conversationId: string }>((resolve) => {
        aSocket.on("messageRead", resolve);
      });

      await emitWithAck(bSocket, "markAsRead", { conversationId });

      await expect(readReceipt).resolves.toMatchObject({ conversationId });
    } finally {
      aSocket.disconnect();
      bSocket.disconnect();
    }
  });

  it("allows editing messages via socket and broadcasts update", async () => {
    const a = await register(userA);
    const b = await register(userB);

    const aSocket = await connectSocket(a.token);
    const bSocket = await connectSocket(b.token);

    try {
      const conv = await emitWithAck<{ _id: string }>(
        aSocket,
        "startConversation",
        { receiverId: b.userId }
      );
      const conversationId = conv._id;

      await emitWithAck(bSocket, "joinConversation", { conversationId });

      const msg = await emitWithAck<{ _id: string }>(
        aSocket,
        "sendDirectMessage",
        { conversationId, content: "Original" }
      );

      const updateReceived = new Promise<{ content: string; edited: boolean }>((resolve) => {
        bSocket.on("directMessageUpdated", resolve);
      });

      await emitWithAck(aSocket, "editDirectMessage", {
        conversationId,
        messageId: msg._id,
        content: "Updated"
      });

      await expect(updateReceived).resolves.toMatchObject({
        content: "Updated",
        edited: true
      });
    } finally {
      aSocket.disconnect();
      bSocket.disconnect();
    }
  });

  it("notifies typing events to conversation participants", async () => {
    const a = await register(userA);
    const b = await register(userB);

    const aSocket = await connectSocket(a.token);
    const bSocket = await connectSocket(b.token);

    try {
      const conv = await emitWithAck<{ _id: string }>(
        aSocket,
        "startConversation",
        { receiverId: b.userId }
      );
      const conversationId = conv._id;

      await emitWithAck(bSocket, "joinConversation", { conversationId });

      const typingReceived = new Promise<{ conversationId: string; userId: string }>((resolve) => {
        bSocket.on("userTyping", resolve);
      });

      aSocket.emit("typingStart", { conversationId });

      await expect(typingReceived).resolves.toMatchObject({
        conversationId,
        userId: a.userId
      });
    } finally {
      aSocket.disconnect();
      bSocket.disconnect();
    }
  });

  it("prevents non-participants from joining a conversation", async () => {
    const a = await register(userA);
    const b = await register(userB);
    const c = await register(userC);

    const aSocket = await connectSocket(a.token);
    const cSocket = await connectSocket(c.token);

    try {
      const conv = await emitWithAck<{ _id: string }>(
        aSocket,
        "startConversation",
        { receiverId: b.userId }
      );

      await expect(
        emitWithAck(cSocket, "joinConversation", { conversationId: conv._id })
      ).rejects.toThrow();
    } finally {
      aSocket.disconnect();
      cSocket.disconnect();
    }
  });
});
