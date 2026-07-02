import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Event, Participant } from "../types/event";

const MOCK_PARTICIPANTS: Participant[] = [
  { id: "p1", fullName: "Aarav Sharma", email: "aarav@college.edu", rollNumber: "CS-2023-01", registrationDate: "2026-06-15", checkedIn: true },
  { id: "p2", fullName: "Meera Patel", email: "meera@college.edu", rollNumber: "IT-2023-08", registrationDate: "2026-06-16", checkedIn: true },
  { id: "p3", fullName: "Kabir Mehta", email: "kabir@college.edu", rollNumber: "ME-2024-12", registrationDate: "2026-06-17", checkedIn: false },
  { id: "p4", fullName: "Dia Reddy", email: "dia@college.edu", rollNumber: "EC-2023-22", registrationDate: "2026-06-18", checkedIn: true },
  { id: "p5", fullName: "Aryan Goel", email: "aryan@college.edu", rollNumber: "CS-2023-14", registrationDate: "2026-06-19", checkedIn: false },
];

const INITIAL_EVENTS: Event[] = [
  {
    _id: "evt-001",
    title: "National Coding Challenge 2026",
    description: "Compete with top coders across the nation to solve complex algorithm challenges in 24 hours.",
    category: "Hackathon",
    department: "Computer Science",
    organizer: "Coding Club",
    venue: "Main Auditorium",
    date: "2026-07-10",
    time: "09:00",
    registrationDeadline: "2026-07-08",
    maxParticipants: 200,
    currentRegistrations: 5,
    status: "UPCOMING",
    approvalStatus: "APPROVED",
    bannerImage: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=60",
    attachments: [{ name: "Hackathon Guidelines.pdf", url: "#" }],
    createdAt: "2026-06-10T10:00:00Z",
    updatedAt: "2026-06-10T12:00:00Z",
    registeredUsers: [...MOCK_PARTICIPANTS],
  },
  {
    _id: "evt-002",
    title: "AI & ML Technical Seminar",
    description: "Explore the frontiers of deep learning, generative models, and computer vision with research experts.",
    category: "Seminar",
    department: "Information Technology",
    organizer: "AI Synergy Club",
    venue: "Seminar Hall B",
    date: "2026-06-30",
    time: "14:00",
    registrationDeadline: "2026-06-28",
    maxParticipants: 120,
    currentRegistrations: 4,
    status: "ONGOING",
    approvalStatus: "APPROVED",
    bannerImage: "https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=600&auto=format&fit=crop&q=60",
    createdAt: "2026-06-12T09:00:00Z",
    updatedAt: "2026-06-12T09:00:00Z",
    registeredUsers: [...MOCK_PARTICIPANTS].slice(0, 4),
  },
  {
    _id: "evt-003",
    title: "React Web Dev Masterclass",
    description: "A hands-on workshop on Next.js 15, Server Actions, state management, and modern component frameworks.",
    category: "Workshop",
    department: "Computer Science",
    organizer: "Web Developers Guild",
    venue: "Lab 4, CS Block",
    date: "2026-07-05",
    time: "10:30",
    registrationDeadline: "2026-07-03",
    maxParticipants: 50,
    currentRegistrations: 3,
    status: "UPCOMING",
    approvalStatus: "APPROVED",
    bannerImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop&q=60",
    createdAt: "2026-06-15T14:00:00Z",
    updatedAt: "2026-06-15T15:30:00Z",
    registeredUsers: [...MOCK_PARTICIPANTS].slice(0, 3),
  },
  {
    _id: "evt-004",
    title: "Student Project Exhibition",
    description: "Showcase of multidisciplinary engineering innovations and capstone projects developed by senior students.",
    category: "Other",
    department: "Multidisciplinary",
    organizer: "Student Council",
    venue: "Campus Exhibition Center",
    date: "2026-06-20",
    time: "10:00",
    registrationDeadline: "2026-06-18",
    maxParticipants: 300,
    currentRegistrations: 5,
    status: "COMPLETED",
    approvalStatus: "APPROVED",
    createdAt: "2026-05-20T08:00:00Z",
    updatedAt: "2026-06-20T17:00:00Z",
    registeredUsers: [...MOCK_PARTICIPANTS],
  },
  {
    _id: "evt-005",
    title: "CyberSecurity Capture The Flag",
    description: "Jeopardy-style CTF challenge focusing on web exploitation, cryptography, reverse engineering, and forensics.",
    category: "Hackathon",
    department: "Electronics Engineering",
    organizer: "HackerSec Club",
    venue: "Online CTF Portal",
    date: "2026-07-15",
    time: "12:00",
    registrationDeadline: "2026-07-14",
    maxParticipants: 500,
    currentRegistrations: 2,
    status: "UPCOMING",
    approvalStatus: "PENDING",
    bannerImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=60",
    createdAt: "2026-06-18T10:00:00Z",
    updatedAt: "2026-06-18T10:00:00Z",
    registeredUsers: [...MOCK_PARTICIPANTS].slice(0, 2),
  },
];

interface EventState {
  events: Event[];
  setEvents: (events: Event[] | ((prev: Event[]) => Event[])) => void;
  addEvent: (event: Event) => void;
  updateEvent: (eventId: string, updates: Partial<Event>) => void;
  deleteEvent: (eventId: string) => void;
  registerForEvent: (eventId: string, participant: Participant) => void;
  cancelRegistration: (eventId: string, rollNumber: string) => void;
}

export const useEventStore = create<EventState>()(
  persist(
    (set) => ({
      events: INITIAL_EVENTS,
      setEvents: (eventsOrFn) =>
        set((state) => ({
          events: typeof eventsOrFn === "function" ? eventsOrFn(state.events) : eventsOrFn,
        })),
      addEvent: (event) => set((state) => ({ events: [event, ...state.events] })),
      updateEvent: (eventId, updates) =>
        set((state) => ({
          events: state.events.map((e) =>
            e._id === eventId ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          ),
        })),
      deleteEvent: (eventId) =>
        set((state) => ({
          events: state.events.filter((e) => e._id !== eventId),
        })),
      registerForEvent: (eventId, participant) =>
        set((state) => ({
          events: state.events.map((e) => {
            if (e._id !== eventId) return e;
            const users = e.registeredUsers ?? [];
            if (users.some((u) => u.rollNumber === participant.rollNumber)) return e;
            return {
              ...e,
              currentRegistrations: e.currentRegistrations + 1,
              registeredUsers: [...users, participant],
            };
          }),
        })),
      cancelRegistration: (eventId, rollNumber) =>
        set((state) => ({
          events: state.events.map((e) => {
            if (e._id !== eventId) return e;
            const users = e.registeredUsers ?? [];
            if (!users.some((u) => u.rollNumber === rollNumber)) return e;
            return {
              ...e,
              currentRegistrations: Math.max(0, e.currentRegistrations - 1),
              registeredUsers: users.filter((u) => u.rollNumber !== rollNumber),
            };
          }),
        })),
    }),
    {
      name: "studyconnect-events-store",
    }
  )
);
