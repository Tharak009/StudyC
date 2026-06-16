import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import { NOTIFICATION_TYPES, ENTITY_TYPES, type NotificationType, type EntityType } from "../constants/notification.js";

export interface INotification {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  entityType: EntityType | null;
  entityId: Types.ObjectId | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<INotification>;
type NotificationModel = Model<INotification>;

const notificationSchema = new Schema<INotification, NotificationModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPES), required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    entityType: { type: String, enum: Object.values(ENTITY_TYPES), default: null },
    entityId: { type: Schema.Types.ObjectId, default: null },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1, createdAt: -1 });

export const Notification = model<INotification, NotificationModel>("Notification", notificationSchema);
