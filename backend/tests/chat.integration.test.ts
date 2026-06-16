import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { io as Client, type Socket as ClientSocket } from "socket.io-client";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { COMMUNITY_ROLES } from "../src/constants/community-roles.js";
import { Community } from "../src/models/community.model.js";
import { CommunityMember } from "../src/models/community-member.model.js";
import { Message } from "../src/models/message.model.js";
import { User } from "../src/models/user.model.js";
import { initializeSockets } from "../src/sockets/index.js";
import { chatService } from "../src/services/chat.service.js";

let mongo: MongoMemoryServer;
let server: HttpServer;
let baseURL: string;

const owner = {
  fullName: "Aarav Sharma",
  rollNumber: "CS24-104",
  department: "Computer Science",
  academicYear: 2,
  email: "aarav@college.edu",
  password: "SecurePass1"
};

const member = {
  fullName: "Meera Rao",
  rollNumber: "CS24-110",
  department: "Computer Science",
  academicYear: 2,
  email: "meera@college.edu",
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
});

afterEach(async () => {
  await Promise.all([
    Message.deleteMany({}),
    Community.deleteMany({}),
    CommunityMember.deleteMany({}),
    User.deleteMany({})
  ]);
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase();
  await mongo.stop();
});

const register = async (payload: typeof owner) => {
  const response = await request(app).post("/api/auth/register").send(payload).expect(201);
  return {
    token: response.body.data.accessToken as string,
    userId: response.body.data.user._id as string
  };
};

const createCommunity = async (token: string) => {
  const response = await request(app)
    .post("/api/communities")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Cyber Security",
      description: "CTFs, secure coding, and incident response practice.",
      category: "Cyber Security",
      tags: ["ctf", "security"],
      visibility: "public"
    })
    .expect(201);
  return response.body.data._id as string;
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

describe("community chat", () => {
  it("persists messages and returns latest-first history", async () => {
    const { token } = await register(owner);
    const communityId = await createCommunity(token);

    await request(app)
      .post(`/api/communities/${communityId}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .field("content", "Welcome to the security lab")
      .expect(201);

    const history = await request(app)
      .get(`/api/communities/${communityId}/messages?order=latest`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(history.body.data.items[0].content).toBe("Welcome to the security lab");
  });

  it("prevents non-members from creating messages through the service", async () => {
    const ownerSession = await register(owner);
    const outsiderSession = await register(member);
    const communityId = await createCommunity(ownerSession.token);

    await expect(
      chatService.createMessage(
        communityId,
        outsiderSession.userId,
        { content: "Can I post?", replyTo: undefined },
        [],
        false
      )
    ).rejects.toMatchObject({ code: "CHAT_MEMBERSHIP_REQUIRED" });
  });

  it("broadcasts socket messages to joined community members", async () => {
    const ownerSession = await register(owner);
    const memberSession = await register(member);
    const communityId = await createCommunity(ownerSession.token);

    await CommunityMember.create({
      communityId,
      userId: memberSession.userId,
      role: COMMUNITY_ROLES.MEMBER
    });
    await Community.findByIdAndUpdate(communityId, { $inc: { memberCount: 1 } });

    const ownerSocket = await connectSocket(ownerSession.token);
    const memberSocket = await connectSocket(memberSession.token);

    try {
      await emitWithAck(memberSocket, "joinCommunity", { communityId });
      const received = new Promise<{ content: string }>((resolve) => {
        memberSocket.on("messageCreated", resolve);
      });
      await emitWithAck(ownerSocket, "joinCommunity", { communityId });
      await emitWithAck(ownerSocket, "sendMessage", {
        communityId,
        content: "Real-time hello"
      });

      await expect(received).resolves.toMatchObject({ content: "Real-time hello" });
    } finally {
      ownerSocket.disconnect();
      memberSocket.disconnect();
    }
  });
});
