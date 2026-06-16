import type { NotificationDocument } from "../models/notification.model.js";

type BroadcastNotification = Record<string, unknown>;
type NotificationHandler = (userId: string, notification: BroadcastNotification) => void;

let createdHandler: NotificationHandler | undefined;
let updatedHandler: NotificationHandler | undefined;
let deletedHandler: NotificationHandler | undefined;

export const notificationBus = {
  onCreated(handler: NotificationHandler) {
    createdHandler = handler;
  },
  onUpdated(handler: NotificationHandler) {
    updatedHandler = handler;
  },
  onDeleted(handler: NotificationHandler) {
    deletedHandler = handler;
  },
  notificationCreated(userId: string, notification: NotificationDocument | Record<string, unknown>) {
    createdHandler?.(userId, serialize(notification));
  },
  notificationUpdated(userId: string, notification: NotificationDocument | Record<string, unknown>) {
    updatedHandler?.(userId, serialize(notification));
  },
  notificationDeleted(userId: string, notification: NotificationDocument | Record<string, unknown>) {
    deletedHandler?.(userId, serialize(notification));
  }
};

const serialize = (notification: NotificationDocument | Record<string, unknown>) =>
  "toJSON" in notification && typeof notification.toJSON === "function" ? notification.toJSON() : notification;
