import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const EVENT_CATEGORIES = [
  "hackathons",
  "deadlines",
  "workshops",
  "reviews"
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export interface IEvent {
  title: string;
  description: string;
  category: EventCategory;
  department: string;
  organizer: string;
  venue: string;
  dateStr: string;
  timeStr: string;
  isVirtual: boolean;
  tags: string[];
  attendeesCount: number;
  attendees: Types.ObjectId[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type EventDocument = HydratedDocument<IEvent>;
type EventModel = Model<IEvent>;

const eventSchema = new Schema<IEvent, EventModel>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: {
      type: String,
      enum: EVENT_CATEGORIES,
      default: "workshops",
      index: true
    },
    department: { type: String, required: true, trim: true, maxlength: 100 },
    organizer: { type: String, required: true, trim: true, maxlength: 100 },
    venue: { type: String, required: true, trim: true, maxlength: 200 },
    dateStr: { type: String, required: true, trim: true },
    timeStr: { type: String, required: true, trim: true },
    isVirtual: { type: Boolean, default: false },
    tags: { type: [{ type: String, trim: true }], default: [] },
    attendeesCount: { type: Number, default: 1, min: 0 },
    attendees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

eventSchema.index({ createdAt: -1 });
eventSchema.index({ category: 1, createdAt: -1 });
eventSchema.index({ title: "text", description: "text", organizer: "text" });

export const Event = model<IEvent, EventModel>("Event", eventSchema);
