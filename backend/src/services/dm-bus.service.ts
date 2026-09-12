type BroadcastPayload = Record<string, unknown>;
type BroadcastHandler = (conversationId: string, payload: BroadcastPayload) => void;
type UserBroadcastHandler = (userId: string, payload: BroadcastPayload) => void;

let createdHandler: BroadcastHandler | undefined;
let updatedHandler: BroadcastHandler | undefined;
let deletedHandler: BroadcastHandler | undefined;
let readHandler: BroadcastHandler | undefined;
let purgedHandler: BroadcastHandler | undefined;
let reactionHandler: BroadcastHandler | undefined;
let pinHandler: BroadcastHandler | undefined;
let starHandler: UserBroadcastHandler | undefined;
let deletedForMeHandler: UserBroadcastHandler | undefined;

export const dmBus = {
  onCreated(handler: BroadcastHandler) {
    createdHandler = handler;
  },
  onUpdated(handler: BroadcastHandler) {
    updatedHandler = handler;
  },
  onDeleted(handler: BroadcastHandler) {
    deletedHandler = handler;
  },
  onRead(handler: BroadcastHandler) {
    readHandler = handler;
  },
  onPurged(handler: BroadcastHandler) {
    purgedHandler = handler;
  },
  onReaction(handler: BroadcastHandler) {
    reactionHandler = handler;
  },
  onPin(handler: BroadcastHandler) {
    pinHandler = handler;
  },
  onStar(handler: UserBroadcastHandler) {
    starHandler = handler;
  },
  onDeletedForMe(handler: UserBroadcastHandler) {
    deletedForMeHandler = handler;
  },
  messageCreated(conversationId: string, message: Record<string, unknown>) {
    createdHandler?.(conversationId, serialize(message));
  },
  messageUpdated(conversationId: string, message: Record<string, unknown>) {
    updatedHandler?.(conversationId, serialize(message));
  },
  messageDeleted(conversationId: string, message: Record<string, unknown>) {
    deletedHandler?.(conversationId, serialize(message));
  },
  messageRead(conversationId: string, message: Record<string, unknown>) {
    readHandler?.(conversationId, serialize(message));
  },
  messagePurged(conversationId: string, payload: Record<string, unknown>) {
    purgedHandler?.(conversationId, serialize(payload));
  },
  reactionUpdated(conversationId: string, payload: Record<string, unknown>) {
    reactionHandler?.(conversationId, serialize(payload));
  },
  pinUpdated(conversationId: string, payload: Record<string, unknown>) {
    pinHandler?.(conversationId, serialize(payload));
  },
  starUpdated(userId: string, payload: Record<string, unknown>) {
    starHandler?.(userId, serialize(payload));
  },
  deletedForMe(userId: string, payload: Record<string, unknown>) {
    deletedForMeHandler?.(userId, serialize(payload));
  }
};

const serialize = (message: Record<string, unknown>) =>
  "toJSON" in message && typeof (message as any).toJSON === "function"
    ? (message as any).toJSON()
    : message;

