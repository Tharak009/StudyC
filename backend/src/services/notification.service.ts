import type { CreateNotificationData } from "../repositories/notification.repository.js";
import { notificationRepository, type NotificationRepository } from "../repositories/notification.repository.js";
import { notificationBus } from "./notification-bus.service.js";

export class NotificationService {
  constructor(private readonly notifications: NotificationRepository) {}

  async listNotifications(userId: string, query: { page?: number; limit?: number; unreadOnly?: boolean }) {
    return this.notifications.list(userId, {
      page: query.page ?? 1,
      limit: Math.min(query.limit ?? 20, 100),
      unreadOnly: query.unreadOnly
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.notifications.unreadCount(userId);
    return { count };
  }

  async getNotification(notificationId: string, userId: string) {
    const notification = await this.notifications.findById(notificationId);
    if (!notification) return null;
    if (notification.userId.toString() !== userId) return null;
    return notification;
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.getNotification(notificationId, userId);
    if (!notification) return null;
    const updated = await this.notifications.markAsRead(notificationId);
    if (updated) {
      notificationBus.notificationUpdated(userId, updated);
    }
    return updated;
  }

  async markAllAsRead(userId: string) {
    const count = await this.notifications.markAllAsRead(userId);
    return { count };
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await this.getNotification(notificationId, userId);
    if (!notification) return null;
    const deleted = await this.notifications.deleteById(notificationId);
    if (deleted) {
      notificationBus.notificationDeleted(userId, deleted);
    }
    return deleted;
  }

  async clearAllNotifications(userId: string) {
    const count = await this.notifications.deleteAll(userId);
    return { count };
  }

  async createNotification(data: CreateNotificationData) {
    const notification = await this.notifications.create(data);
    notificationBus.notificationCreated(data.userId, notification);
    return notification;
  }
}

export const notificationService = new NotificationService(notificationRepository);
