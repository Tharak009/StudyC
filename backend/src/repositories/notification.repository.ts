import type { FilterQuery } from "mongoose";
import { Notification, type INotification, type NotificationDocument } from "../models/notification.model.js";

export interface CreateNotificationData {
  userId: string;
  type: INotification["type"];
  title: string;
  message: string;
  entityType?: INotification["entityType"];
  entityId?: string;
}

export interface NotificationListOptions {
  page: number;
  limit: number;
  unreadOnly?: boolean;
}

export class NotificationRepository {
  create(input: CreateNotificationData): Promise<NotificationDocument> {
    return Notification.create(input);
  }

  findById(id: string): Promise<NotificationDocument | null> {
    return Notification.findById(id).exec();
  }

  async list(userId: string, { page, limit, unreadOnly }: NotificationListOptions) {
    const filter: FilterQuery<INotification> = { userId };
    if (unreadOnly) filter.isRead = false;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Notification.countDocuments(filter).exec()
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  async unreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, isRead: false }).exec();
  }

  markAsRead(id: string): Promise<NotificationDocument | null> {
    return Notification.findByIdAndUpdate(
      id,
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    ).exec();
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    ).exec();
    return result.modifiedCount;
  }

  deleteById(id: string): Promise<NotificationDocument | null> {
    return Notification.findByIdAndDelete(id).exec();
  }

  async deleteAll(userId: string): Promise<number> {
    const result = await Notification.deleteMany({ userId }).exec();
    return result.deletedCount;
  }
}

export const notificationRepository = new NotificationRepository();
