import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { EVENT_CATEGORIES } from "../models/event.model.js";

const objectId = z.string().refine((value) => isValidObjectId(value), "Invalid event identifier");

export const eventIdParamsSchema = z.object({
  params: z.object({
    id: objectId
  })
});

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2, "Title is too short").max(200, "Title is too long"),
    description: z.string().trim().min(2, "Description is too short").max(2000, "Description is too long"),
    category: z.enum(EVENT_CATEGORIES),
    department: z.string().trim().min(2).max(100),
    organizer: z.string().trim().min(2).max(100),
    venue: z.string().trim().min(2).max(200),
    dateStr: z.string().trim().min(2).max(100),
    timeStr: z.string().trim().min(2).max(100),
    isVirtual: z.boolean().optional().default(false),
    tags: z.array(z.string().trim()).optional().default([])
  })
});

export const updateEventSchema = z.object({
  params: z.object({
    id: objectId
  }),
  body: z.object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().min(2).max(2000).optional(),
    category: z.enum(EVENT_CATEGORIES).optional(),
    department: z.string().trim().min(2).max(100).optional(),
    organizer: z.string().trim().min(2).max(100).optional(),
    venue: z.string().trim().min(2).max(200).optional(),
    dateStr: z.string().trim().min(2).max(100).optional(),
    timeStr: z.string().trim().min(2).max(100).optional(),
    isVirtual: z.boolean().optional(),
    tags: z.array(z.string().trim()).optional()
  })
});

export const listEventsSchema = z.object({
  query: z.object({
    category: z.enum(EVENT_CATEGORIES).optional(),
    search: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50)
  })
});
