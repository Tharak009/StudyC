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

export interface Event {
  _id: string;
  title: string;
  description: string;
  category: EventCategory;
  department: string;
  organizer: string;
  venue: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // HH:MM
  registrationDeadline: string; // ISO date string
  maxParticipants: number;
  currentRegistrations: number;
  status: EventStatus;
  approvalStatus: ApprovalStatus;
  bannerImage?: string;
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
