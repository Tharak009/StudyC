import type { Express } from "express";
import { ApiError } from "../utils/api-error.js";
import { eventRepository, type EventRepository, type CreateEventInput } from "../repositories/event.repository.js";
import { userRepository, type IUserRepository } from "../repositories/user.repository.js";
import type { EventCategory, EventApprovalStatus } from "../models/event.model.js";
import { StorageService } from "./storage.service.js";
import { LocalStorageProvider } from "../uploads/local-storage.provider.js";
import { getSocketServer } from "../sockets/index.js";

export interface ListEventsFilter {
  category?: EventCategory;
  search?: string;
  limit?: number;
  approvalStatus?: EventApprovalStatus | "all";
}

export interface UpdateEventPayload {
  title?: string;
  description?: string;
  category?: EventCategory;
  department?: string;
  organizer?: string;
  venue?: string;
  dateStr?: string;
  timeStr?: string;
  isVirtual?: boolean;
  tags?: string[];
  removeImage?: boolean;
  status?: string;
  approvalStatus?: string;
}

export class EventService {
  constructor(
    private readonly events: EventRepository,
    private readonly users: IUserRepository,
    private readonly storage: StorageService
  ) {}

  async listEvents(filter: ListEventsFilter, userRole?: string) {
    const mongoFilter: Record<string, unknown> = {};
    if (filter.category) {
      mongoFilter.category = filter.category;
    }

    if (userRole === "ADMIN") {
      if (filter.approvalStatus) {
        mongoFilter.approvalStatus = filter.approvalStatus;
      } else {
        mongoFilter.approvalStatus = "APPROVED";
      }
    } else {
      // Non-admins can strictly ONLY view APPROVED events
      mongoFilter.approvalStatus = "APPROVED";
    }

    return this.events.list(mongoFilter, filter.search, filter.limit || 50);
  }

  async getEventById(id: string) {
    const event = await this.events.findById(id);
    if (!event) {
      throw new ApiError(404, "Event not found", [], "EVENT_NOT_FOUND");
    }
    return event;
  }

  async createEvent(
    userId: string,
    data: Omit<CreateEventInput, "createdBy">,
    file?: Express.Multer.File
  ) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found", [], "USER_NOT_FOUND");
    }

    let eventImage;
    if (file) {
      const stored = await this.storage.uploadEventPoster(file);
      eventImage = {
        key: stored.key,
        url: stored.url,
        originalName: file.originalname || stored.key,
        mimeType: stored.mimeType,
        size: stored.size
      };
    }

    const { approvalStatus: _ignoredStatus, ...cleanData } = data as any;

    const event = await this.events.create({
      ...cleanData,
      ...(eventImage ? { eventImage } : {}),
      createdBy: userId,
      approvalStatus: "PENDING"
    });

    return this.events.findById(event._id.toString());
  }

  async updateEvent(
    userId: string,
    userRole: string,
    eventId: string,
    data: UpdateEventPayload,
    file?: Express.Multer.File
  ) {
    const existing = await this.events.findById(eventId);
    if (!existing) {
      throw new ApiError(404, "Event not found", [], "EVENT_NOT_FOUND");
    }

    const creatorId = existing.createdBy?._id
      ? existing.createdBy._id.toString()
      : existing.createdBy.toString();

    const isAuthorized = creatorId === userId || userRole === "ADMIN";
    if (!isAuthorized) {
      throw new ApiError(403, "You do not have permission to update this event", [], "FORBIDDEN");
    }

    const updateQuery: Record<string, unknown> = { ...data };
    delete updateQuery.removeImage;
    delete updateQuery.approvalStatus;
    delete updateQuery.status;

    if (file) {
      const stored = await this.storage.uploadEventPoster(file);
      const newImage = {
        key: stored.key,
        url: stored.url,
        originalName: file.originalname || stored.key,
        mimeType: stored.mimeType,
        size: stored.size
      };
      if (existing.eventImage?.key) {
        await this.storage.delete(existing.eventImage.key).catch(() => {});
      }
      updateQuery.eventImage = newImage;
    } else if (data.removeImage) {
      if (existing.eventImage?.key) {
        await this.storage.delete(existing.eventImage.key).catch(() => {});
      }
      updateQuery.eventImage = null;
    }

    return this.events.updateById(eventId, updateQuery);
  }

  async approveEvent(userId: string, userRole: string, eventId: string) {
    if (userRole !== "ADMIN") {
      throw new ApiError(403, "Only administrators can approve events", [], "FORBIDDEN");
    }

    const existing = await this.events.findById(eventId);
    if (!existing) {
      throw new ApiError(404, "Event not found", [], "EVENT_NOT_FOUND");
    }

    await this.events.updateById(eventId, { approvalStatus: "APPROVED" });
    return this.events.findById(eventId);
  }

  async rejectEvent(userId: string, userRole: string, eventId: string) {
    if (userRole !== "ADMIN") {
      throw new ApiError(403, "Only administrators can reject events", [], "FORBIDDEN");
    }

    const existing = await this.events.findById(eventId);
    if (!existing) {
      throw new ApiError(404, "Event not found", [], "EVENT_NOT_FOUND");
    }

    await this.events.updateById(eventId, { approvalStatus: "REJECTED" });
    return this.events.findById(eventId);
  }

  async deleteEvent(userId: string, userRole: string, eventId: string) {
    const existing = await this.events.findById(eventId);
    if (!existing) {
      throw new ApiError(404, "Event not found", [], "EVENT_NOT_FOUND");
    }

    const creatorId = existing.createdBy?._id
      ? existing.createdBy._id.toString()
      : existing.createdBy.toString();

    const isAuthorized = creatorId === userId || userRole === "ADMIN";
    if (!isAuthorized) {
      throw new ApiError(403, "You do not have permission to delete this event", [], "FORBIDDEN");
    }

    if (existing.eventImage?.key) {
      await this.storage.delete(existing.eventImage.key).catch(() => {});
    }

    await this.events.deleteById(eventId);
    return { success: true };
  }

  async toggleRsvp(userId: string, eventId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found", [], "USER_NOT_FOUND");
    }

    const result = await this.events.toggleRsvp(eventId, userId);
    if (!result.event) {
      throw new ApiError(404, "Event not found", [], "EVENT_NOT_FOUND");
    }

    const io = getSocketServer();
    if (io) {
      const payload = {
        eventId,
        attendeesCount: result.event.attendeesCount,
        attendees: result.event.attendees,
        updatedBy: userId
      };
      io.emit("event:attendeesUpdated", payload);
      io.emit("eventRsvpUpdated", payload);
    }

    return result;
  }
}

export const eventService = new EventService(
  eventRepository,
  userRepository,
  new StorageService(new LocalStorageProvider())
);
