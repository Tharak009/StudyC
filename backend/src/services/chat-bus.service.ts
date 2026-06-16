import type { MessageDocument } from "../models/message.model.js";

type BroadcastMessage = Record<string, unknown>;
type BroadcastHandler = (communityId: string, message: BroadcastMessage) => void;

let createdHandler: BroadcastHandler | undefined;
let updatedHandler: BroadcastHandler | undefined;
let deletedHandler: BroadcastHandler | undefined;

export const chatBus = {
  onCreated(handler: BroadcastHandler) {
    createdHandler = handler;
  },
  onUpdated(handler: BroadcastHandler) {
    updatedHandler = handler;
  },
  onDeleted(handler: BroadcastHandler) {
    deletedHandler = handler;
  },
  messageCreated(communityId: string, message: MessageDocument | Record<string, unknown>) {
    createdHandler?.(communityId, serialize(message));
  },
  messageUpdated(communityId: string, message: MessageDocument | Record<string, unknown>) {
    updatedHandler?.(communityId, serialize(message));
  },
  messageDeleted(communityId: string, message: MessageDocument | Record<string, unknown>) {
    deletedHandler?.(communityId, serialize(message));
  }
};

const serialize = (message: MessageDocument | Record<string, unknown>) =>
  "toJSON" in message && typeof message.toJSON === "function" ? message.toJSON() : message;
