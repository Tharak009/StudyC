export type EventStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type EventCategory =
  | "Workshop"
  | "Seminar"
  | "Hackathon"
  | "Cultural"
  | "Sports"
  | "Webinar"
  | "Other";

export interface Participant {
  id: string;
  fullName: string;
  email: string;
  rollNumber: string;
  registrationDate: string;
  checkedIn: boolean;
}

export interface EventImage {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface Event {
  _id: string;
  title: string;
  description: string;
  category: EventCategory;
  department: string;
  organizer: string | any;
  venue: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // HH:MM
  registrationDeadline: string; // ISO date string
  maxParticipants: number;
  currentRegistrations: number;
  status: EventStatus;
  approvalStatus: ApprovalStatus;
  bannerImage?: string;
  eventImage?: EventImage | null;
  attachments?: { name: string; url: string }[];
  createdAt: string;
  updatedAt: string;
  registeredUsers?: Participant[];
}

export const EVENT_CATEGORIES: EventCategory[] = [
  "Workshop",
  "Seminar",
  "Hackathon",
  "Cultural",
  "Sports",
  "Webinar",
  "Other",
];

export function getOrganizerName(organizer: any): string {
  if (!organizer) return "Student Organizer";
  if (typeof organizer === "string") return organizer;
  if (typeof organizer === "object" && organizer !== null) {
    return (
      organizer.name ||
      organizer.fullName ||
      organizer.organizer ||
      "Student Organizer"
    );
  }
  return String(organizer);
}

