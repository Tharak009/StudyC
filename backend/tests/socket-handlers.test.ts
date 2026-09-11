import { describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import {
  isSocketRateLimited
} from "../src/sockets/index.js";
import { registerPresenceHandlers, type VoicePeer } from "../src/sockets/presence.socket.js";
import { registerVoiceHandlers } from "../src/sockets/voice.socket.js";
import { registerAdminBroadcastHandlers } from "../src/sockets/admin.socket.js";
import { ROLES } from "../src/constants/roles.js";

// Mock socket generator
const createMockSocket = (userId: string, socketId: string, role: string = ROLES.STUDENT, name = "Test Student", department = "CSE") => {
  const emitter = new EventEmitter();
  const rooms = new Set<string>();

  const socket = {
    id: socketId,
    data: {
      userId,
      role,
      user: {
        id: userId,
        name,
        email: `${userId}@college.edu`,
        role,
        department,
        rollNumber: `CS-${userId}`
      }
    },
    handshake: {
      address: "127.0.0.1",
      auth: { token: "fake-token" },
      headers: {}
    },
    join: vi.fn(async (room: string) => { rooms.add(room); }),
    leave: vi.fn(async (room: string) => { rooms.delete(room); }),
    emit: vi.fn(),
    broadcast: {
      emit: vi.fn()
    },
    to: vi.fn((_room: string) => ({
      emit: vi.fn()
    })),
    on: emitter.on.bind(emitter),
    trigger: emitter.emit.bind(emitter)
  };

  return { socket, rooms };
};

// Mock io server generator
const createMockIo = () => {
  const broadcastRooms = new Map<string, { event: string; payload: unknown }[]>();
  return {
    emit: vi.fn(),
    to: vi.fn((room: string) => ({
      emit: vi.fn((event: string, payload: unknown) => {
        const list = broadcastRooms.get(room) ?? [];
        list.push({ event, payload });
        broadcastRooms.set(room, list);
      })
    })),
    in: vi.fn((_room: string) => ({
      fetchSockets: vi.fn(async () => [{}, {}])
    })),
    broadcastRooms
  };
};

describe("Socket.IO Rate Limiter", () => {
  it("enforces rate limits within the window", () => {
    const testId = `sock-test-${Date.now()}`;
    for (let i = 0; i < 15; i++) {
      expect(isSocketRateLimited(testId)).toBe(false);
    }
    // 16th event exceeds max (15)
    expect(isSocketRateLimited(testId)).toBe(true);
  });
});

describe("Peer Presence Controller (presence.socket.ts)", () => {
  it("manages multi-tab connections and emits friendOnline / friendOffline", () => {
    const registry = {
      onlineUsersMap: new Map<string, Set<string>>(),
      activeVoiceRooms: new Map<string, Set<VoicePeer>>()
    };
    const mockIo = createMockIo() as any;

    const { socket: tab1 } = createMockSocket("u-100", "sock-1");
    registerPresenceHandlers(mockIo, tab1 as any, registry);

    // Tab 1 connects -> First tab online -> broadcasts friendOnline
    expect(registry.onlineUsersMap.get("u-100")?.has("sock-1")).toBe(true);
    expect(tab1.broadcast.emit).toHaveBeenCalledWith("friendOnline", { userId: "u-100" });

    // Tab 2 connects for the same user -> Multi-tab tracking -> Should NOT re-broadcast friendOnline
    const { socket: tab2 } = createMockSocket("u-100", "sock-2");
    registerPresenceHandlers(mockIo, tab2 as any, registry);
    expect(registry.onlineUsersMap.get("u-100")?.size).toBe(2);
    expect(tab2.broadcast.emit).not.toHaveBeenCalled();

    // Tab 1 closes -> Still has tab 2 -> Should NOT emit friendOffline
    tab1.trigger("disconnect");
    expect(registry.onlineUsersMap.get("u-100")?.size).toBe(1);
    expect(tab1.broadcast.emit).not.toHaveBeenCalledWith("friendOffline", expect.anything());

    // Tab 2 closes -> Last tab closes -> Emits friendOffline and removes user from registry
    tab2.trigger("disconnect");
    expect(registry.onlineUsersMap.has("u-100")).toBe(false);
    expect(tab2.broadcast.emit).toHaveBeenCalledWith("friendOffline", expect.objectContaining({ userId: "u-100" }));
  });

  it("handles presence:getOnlineUsers and presence:heartbeat", () => {
    const registry = {
      onlineUsersMap: new Map<string, Set<string>>([
        ["u-1", new Set(["sock-1"])],
        ["u-2", new Set(["sock-2"])]
      ]),
      activeVoiceRooms: new Map<string, Set<VoicePeer>>()
    };
    const mockIo = createMockIo() as any;
    const { socket } = createMockSocket("u-1", "sock-1");
    registerPresenceHandlers(mockIo, socket as any, registry);

    const rosterAck = vi.fn();
    socket.trigger("presence:getOnlineUsers", rosterAck);
    expect(rosterAck).toHaveBeenCalledWith({ onlineUserIds: ["u-1", "u-2"] });

    const hbAck = vi.fn();
    socket.trigger("presence:heartbeat", hbAck);
    expect(hbAck).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe("WebRTC Voice Stage Signaling (voice.socket.ts)", () => {
  it("allows joining, signaling, speaking state, mute state, and clean leaving", async () => {
    const registry = {
      onlineUsersMap: new Map<string, Set<string>>(),
      activeVoiceRooms: new Map<string, Set<VoicePeer>>()
    };
    const mockIo = createMockIo() as any;
    const { socket } = createMockSocket("u-voice-1", "sock-v1", ROLES.STUDENT, "Voice Student");

    registerVoiceHandlers(mockIo, socket as any, registry);

    // 1. Join voice stage
    const joinAck = vi.fn();
    await socket.trigger("voice:joinStage", { stageId: "stage-algorithms" }, joinAck);

    expect(socket.join).toHaveBeenCalledWith("voice:stage-algorithms");
    expect(registry.activeVoiceRooms.get("stage-algorithms")?.size).toBe(1);
    expect(joinAck).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      stageId: "stage-algorithms"
    }));

    // 2. WebRTC signal dispatch
    socket.trigger("voice:signal", {
      toSocketId: "sock-v2",
      stageId: "stage-algorithms",
      signalData: { type: "offer", sdp: "v=0..." }
    });
    expect(mockIo.to).toHaveBeenCalledWith("sock-v2");

    // 3. Speaking state synchronization
    socket.trigger("voice:speakingState", {
      stageId: "stage-algorithms",
      isSpeaking: true
    });
    const peer = Array.from(registry.activeVoiceRooms.get("stage-algorithms")!)[0];
    expect(peer).toBeDefined();
    expect(peer?.isSpeaking).toBe(true);

    // 4. Mute state synchronization
    socket.trigger("voice:muteState", {
      stageId: "stage-algorithms",
      isMuted: true
    });
    expect(peer?.isMuted).toBe(true);

    // 5. Leave stage
    const leaveAck = vi.fn();
    await socket.trigger("voice:leaveStage", { stageId: "stage-algorithms" }, leaveAck);
    expect(socket.leave).toHaveBeenCalledWith("voice:stage-algorithms");
    expect(registry.activeVoiceRooms.has("stage-algorithms")).toBe(false);
    expect(leaveAck).toHaveBeenCalledWith({ success: true, stageId: "stage-algorithms" });
  });

  it("cleans up voice stages automatically on socket disconnect", () => {
    const registry = {
      onlineUsersMap: new Map<string, Set<string>>([["u-voice-2", new Set(["sock-v2"])]]),
      activeVoiceRooms: new Map<string, Set<VoicePeer>>([
        [
          "stage-math",
          new Set([
            {
              socketId: "sock-v2",
              userId: "u-voice-2",
              name: "Math Peer",
              isSpeaking: false,
              isMuted: false
            }
          ])
        ]
      ])
    };
    const mockIo = createMockIo() as any;
    const { socket } = createMockSocket("u-voice-2", "sock-v2");

    registerPresenceHandlers(mockIo, socket as any, registry);
    socket.trigger("disconnect");

    expect(registry.activeVoiceRooms.has("stage-math")).toBe(false);
  });
});

describe("Admin Broadcast Controller (admin.socket.ts)", () => {
  it("rejects non-admin users attempting broadcasts", async () => {
    const registry = {
      onlineUsersMap: new Map<string, Set<string>>(),
      activeVoiceRooms: new Map<string, Set<VoicePeer>>()
    };
    const mockIo = createMockIo() as any;
    const { socket } = createMockSocket("u-student-1", "sock-std-1", ROLES.STUDENT);

    registerAdminBroadcastHandlers(mockIo, socket as any, registry);

    const ack = vi.fn();
    await socket.trigger(
      "admin:broadcastAnnouncement",
      { title: "Unauthorized", message: "Should fail" },
      ack
    );

    expect(ack).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: "ADMIN_REQUIRED"
    }));
    expect(socket.emit).toHaveBeenCalledWith("adminError", expect.objectContaining({ code: "ADMIN_REQUIRED" }));
  });

  it("dispatches global broadcast when targetScope is ALL", async () => {
    const registry = {
      onlineUsersMap: new Map<string, Set<string>>(),
      activeVoiceRooms: new Map<string, Set<VoicePeer>>()
    };
    const mockIo = createMockIo() as any;
    const { socket } = createMockSocket("u-admin-1", "sock-adm-1", ROLES.ADMIN, "Principal Office");

    registerAdminBroadcastHandlers(mockIo, socket as any, registry);

    const ack = vi.fn();
    await socket.trigger(
      "admin:broadcastAnnouncement",
      {
        title: "Campus Fire Drill",
        message: "All students please assemble at ground",
        urgencyLevel: "CRITICAL",
        targetScope: "ALL",
        audioAlert: true
      },
      ack
    );

    expect(mockIo.emit).toHaveBeenCalledWith("globalBroadcastReceived", expect.objectContaining({
      title: "Campus Fire Drill",
      urgencyLevel: "CRITICAL"
    }));
    expect(mockIo.emit).toHaveBeenCalledWith("admin:broadcastAnnouncement", expect.objectContaining({
      title: "Campus Fire Drill"
    }));
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("dispatches targeted department broadcast when targetScope is DEPARTMENT", async () => {
    const registry = {
      onlineUsersMap: new Map<string, Set<string>>(),
      activeVoiceRooms: new Map<string, Set<VoicePeer>>()
    };
    const mockIo = createMockIo() as any;
    const { socket } = createMockSocket("u-admin-1", "sock-adm-1", ROLES.ADMIN, "Dept Head");

    registerAdminBroadcastHandlers(mockIo, socket as any, registry);

    const ack = vi.fn();
    await socket.trigger(
      "admin:broadcastAnnouncement",
      {
        title: "CSE Lab Maintenance",
        message: "Servers will reboot at 6 PM",
        urgencyLevel: "WARNING",
        targetScope: "DEPARTMENT",
        targetDepartment: "CSE"
      },
      ack
    );

    expect(mockIo.to).toHaveBeenCalledWith("dept:cse");
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
