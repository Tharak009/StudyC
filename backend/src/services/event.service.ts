import { ApiError } from "../utils/api-error.js";
import { eventRepository, type EventRepository, type CreateEventInput } from "../repositories/event.repository.js";
import { userRepository, type IUserRepository } from "../repositories/user.repository.js";
import type { EventCategory } from "../models/event.model.js";

export interface ListEventsFilter {
  category?: EventCategory;
  search?: string;
  limit?: number;
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
}

export class EventService {
  constructor(
    private readonly events: EventRepository,
    private readonly users: IUserRepository
  ) {}

  async listEvents(filter: ListEventsFilter) {
    const mongoFilter: Record<string, unknown> = {};
    if (filter.category) {
      mongoFilter.category = filter.category;
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

  async createEvent(userId: string, data: Omit<CreateEventInput, "createdBy">) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found", [], "USER_NOT_FOUND");
    }

    const event = await this.events.create({
      ...data,
      createdBy: userId
    });

    return this.events.findById(event._id.toString());
  }

  async updateEvent(userId: string, userRole: string, eventId: string, data: UpdateEventPayload) {
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

    return this.events.updateById(eventId, data);
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

    return result;
  }
}

export const eventService = new EventService(eventRepository, userRepository);
