import type { FilterQuery, UpdateQuery } from "mongoose";
import { Event, type IEvent, type EventDocument } from "../models/event.model.js";

export interface CreateEventInput {
  title: string;
  description: string;
  category: IEvent["category"];
  department: string;
  organizer: string;
  venue: string;
  dateStr: string;
  timeStr: string;
  isVirtual?: boolean;
  tags?: string[];
  createdBy: string;
}

export class EventRepository {
  async list(filter: FilterQuery<IEvent> = {}, search?: string, limit = 50): Promise<EventDocument[]> {
    const query: FilterQuery<IEvent> = { ...filter };
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { organizer: { $regex: escaped, $options: "i" } },
        { department: { $regex: escaped, $options: "i" } },
        { tags: { $in: [new RegExp(escaped, "i")] } }
      ];
    }

    return Event.find(query)
      .populate("createdBy", "fullName rollNumber department profilePicture role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findById(id: string): Promise<EventDocument | null> {
    return Event.findById(id)
      .populate("createdBy", "fullName rollNumber department profilePicture role")
      .exec();
  }

  async create(data: CreateEventInput): Promise<EventDocument> {
    return Event.create({
      ...data,
      attendees: [data.createdBy],
      attendeesCount: 1
    });
  }

  async updateById(id: string, update: UpdateQuery<IEvent>): Promise<EventDocument | null> {
    return Event.findByIdAndUpdate(id, update, { new: true, runValidators: true }).exec();
  }

  async deleteById(id: string): Promise<EventDocument | null> {
    return Event.findByIdAndDelete(id).exec();
  }

  async toggleRsvp(eventId: string, userId: string): Promise<{ event: EventDocument | null; isRegistered: boolean }> {
    const existing = await Event.findById(eventId);
    if (!existing) return { event: null, isRegistered: false };

    const isAttending = existing.attendees.some((a) => a.toString() === userId);

    let updated: EventDocument | null;
    if (isAttending) {
      updated = await Event.findByIdAndUpdate(
        eventId,
        {
          $pull: { attendees: userId },
          $inc: { attendeesCount: -1 }
        },
        { new: true }
      ).exec();
      return { event: updated, isRegistered: false };
    } else {
      updated = await Event.findByIdAndUpdate(
        eventId,
        {
          $addToSet: { attendees: userId },
          $inc: { attendeesCount: 1 }
        },
        { new: true }
      ).exec();
      return { event: updated, isRegistered: true };
    }
  }
}

export const eventRepository = new EventRepository();
