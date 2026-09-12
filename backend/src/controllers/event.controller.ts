import type { Request, Response } from "express";
import { eventService } from "../services/event.service.js";
import { ApiResponse } from "../utils/api-response.js";
import type { EventCategory } from "../models/event.model.js";

export class EventController {
  async list(request: Request, response: Response) {
    const category = request.query.category as EventCategory | undefined;
    const search = request.query.search as string | undefined;
    const limit = request.query.limit ? Number(request.query.limit) : 50;
    const approvalStatus = request.query.approvalStatus as any;

    const events = await eventService.listEvents(
      { category, search, limit, approvalStatus },
      request.user?.role
    );
    response.json(new ApiResponse(200, events, "Events retrieved successfully"));
  }

  async details(request: Request, response: Response) {
    const event = await eventService.getEventById(request.params.id as string);
    response.json(new ApiResponse(200, event, "Event retrieved successfully"));
  }

  async create(request: Request, response: Response) {
    const event = await eventService.createEvent(request.user!.id, request.body, request.file);
    response.status(201).json(new ApiResponse(201, event, "Event created successfully"));
  }

  async update(request: Request, response: Response) {
    const event = await eventService.updateEvent(
      request.user!.id,
      request.user!.role,
      request.params.id as string,
      request.body,
      request.file
    );
    response.json(new ApiResponse(200, event, "Event updated successfully"));
  }

  async approve(request: Request, response: Response) {
    const event = await eventService.approveEvent(
      request.user!.id,
      request.user!.role,
      request.params.id as string
    );
    response.json(new ApiResponse(200, event, "Event approved successfully"));
  }

  async reject(request: Request, response: Response) {
    const event = await eventService.rejectEvent(
      request.user!.id,
      request.user!.role,
      request.params.id as string
    );
    response.json(new ApiResponse(200, event, "Event rejected successfully"));
  }

  async delete(request: Request, response: Response) {
    const result = await eventService.deleteEvent(
      request.user!.id,
      request.user!.role,
      request.params.id as string
    );
    response.json(new ApiResponse(200, result, "Event deleted successfully"));
  }

  async toggleRsvp(request: Request, response: Response) {
    const result = await eventService.toggleRsvp(request.user!.id, request.params.id as string);
    response.json(
      new ApiResponse(
        200,
        result,
        result.isRegistered ? "Successfully registered for event" : "Registration cancelled"
      )
    );
  }
}

export const eventController = new EventController();
