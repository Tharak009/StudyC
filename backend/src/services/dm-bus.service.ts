type BroadcastPayload = Record<string, unknown>;
type BroadcastHandler = (conversationId: string, payload: BroadcastPayload) => void;

let createdHandler: BroadcastHandler | undefined;
let updatedHandler: BroadcastHandler | undefined;
let deletedHandler: BroadcastHandler | undefined;
let readHandler: BroadcastHandler | undefined;

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
  }
};

const serialize = (message: Record<string, unknown>) =>
  "toJSON" in message && typeof (message as any).toJSON === "function"
    ? (message as any).toJSON()
    : message;
