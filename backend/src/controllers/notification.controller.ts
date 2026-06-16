import type { Request, Response } from "express";
import { notificationService } from "../services/notification.service.js";
import { ApiResponse } from "../utils/api-response.js";
import type { ListNotificationsQuery } from "../validators/notification.validator.js";

export class NotificationController {
  async list(request: Request, response: Response) {
    const query = request.validated?.query as ListNotificationsQuery | undefined;
    const notifications = await notificationService.listNotifications(
      request.user!.id,
      {
        page: query?.page,
        limit: query?.limit,
        unreadOnly: query?.unreadOnly === "true"
      }
    );
    response.json(new ApiResponse(200, notifications, "Notifications retrieved"));
  }

  async unreadCount(request: Request, response: Response) {
    const result = await notificationService.getUnreadCount(request.user!.id);
    response.json(new ApiResponse(200, result, "Unread count retrieved"));
  }

  async markAsRead(request: Request, response: Response) {
    const notification = await notificationService.markAsRead(
      request.params.notificationId as string,
      request.user!.id
    );
    if (!notification) {
      response.status(404).json(new ApiResponse(404, null, "Notification not found"));
      return;
    }
    response.json(new ApiResponse(200, notification, "Notification marked as read"));
  }

  async markAllAsRead(request: Request, response: Response) {
    const result = await notificationService.markAllAsRead(request.user!.id);
    response.json(new ApiResponse(200, result, "All notifications marked as read"));
  }

  async delete(request: Request, response: Response) {
    const notification = await notificationService.deleteNotification(
      request.params.notificationId as string,
      request.user!.id
    );
    if (!notification) {
      response.status(404).json(new ApiResponse(404, null, "Notification not found"));
      return;
    }
    response.json(new ApiResponse(200, null, "Notification deleted"));
  }

  async clearAll(request: Request, response: Response) {
    const result = await notificationService.clearAllNotifications(request.user!.id);
    response.json(new ApiResponse(200, result, "All notifications cleared"));
  }
}

export const notificationController = new NotificationController();
