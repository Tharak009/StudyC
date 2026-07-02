import { create } from "zustand";
import type { Announcement, AnnouncementStatus, AnnouncementPriority } from "../types/announcement";

interface AnnouncementState {
  announcements: Announcement[];
  addAnnouncement: (announcement: Omit<Announcement, "_id" | "createdAt" | "updatedAt" | "viewsCount">) => void;
  updateAnnouncement: (id: string, updates: Partial<Announcement>) => void;
  deleteAnnouncement: (id: string) => void;
  archiveAnnouncement: (id: string) => void;
  unarchiveAnnouncement: (id: string) => void;
  duplicateAnnouncement: (id: string) => void;
  incrementViews: (id: string) => void;
}

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    _id: "ann-1",
    title: "Emergency: Water Supply Disruption in Block B & C",
    content: "<p><strong>Attention all students and hostel residents,</strong></p><p>A main pipeline burst has occurred near the campus dining hall. Water supply will be suspended in <strong>Block B and Block C hostels</strong> today from <strong>2:00 PM to 6:00 PM</strong> while emergency repairs are being carried out.</p><p>Please store sufficient water for immediate needs. Drinking water dispensers remain operational in the academic center library. We apologize for the inconvenience.</p>",
    category: "EMERGENCY",
    targetAudience: "ENTIRE_COLLEGE",
    priority: "CRITICAL",
    publishDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    status: "PUBLISHED",
    viewsCount: 342,
    createdBy: "Campus Admin Swetha",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: "ann-2",
    title: "CSE Midterm Examinations Schedule Released",
    content: "<p>The official exam schedule for Computer Science and Engineering midterms is now available.</p><ul><li>Exams start: <strong>Next Monday (July 6, 2026)</strong></li><li>Timing: <strong>9:30 AM onwards</strong></li><li>Venue: <strong>Academic Hall A & B</strong></li></ul><p>Please download the schedule PDF below and verify your subject slots. Candidates must present their student ID cards to gain entrance to the exam hall.</p>",
    category: "ACADEMIC",
    targetAudience: "DEPARTMENT",
    targetDepartment: "Computer Science",
    priority: "HIGH",
    publishDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: "PUBLISHED",
    viewsCount: 156,
    attachments: [
      { name: "cse_midterms_schedule_july2026.pdf", url: "#", size: "1.4 MB" }
    ],
    createdBy: "Department Head Sen",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: "ann-3",
    title: "Google campus placement information session",
    content: "<p>Google's campus recruitment team is hosting a live virtual info session for final year students.</p><p>Topics covered: Software Engineer interview pipelines, resume preparation tips, and campus placement schedules. Attendance is highly recommended for all CS and IT final year students.</p><p>Register in advance to receive the meeting invite link.</p>",
    category: "PLACEMENT",
    targetAudience: "ACADEMIC_YEAR",
    targetAcademicYear: 4,
    priority: "HIGH",
    publishDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    status: "SCHEDULED",
    viewsCount: 0,
    createdBy: "Placement Cell Office",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: "ann-4",
    title: "StudyConnect Hackathon 2026: Team Registration Open",
    content: "<p>Get ready for the biggest codefest of the year! StudyConnect's annual hackathon is back.</p><p>Teams of 2 to 4 students can register under Open or Theme categories. Prizes up to <strong>$5,000</strong> and recruitment opportunities are up for grabs.</p><p>Register your team before the final deadline.</p>",
    category: "EVENTS",
    targetAudience: "ENTIRE_COLLEGE",
    priority: "NORMAL",
    publishDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // Expired 1 hour ago
    status: "EXPIRED",
    viewsCount: 420,
    createdBy: "Campus Admin Swetha",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: "ann-5",
    title: "Draft: Placement Drive FAQ Document",
    content: "<p>Draft guidelines outlining responses to common student questions about placement registrations, eligibility, and CGPA requirements.</p>",
    category: "PLACEMENT",
    targetAudience: "ENTIRE_COLLEGE",
    priority: "LOW",
    publishDate: new Date().toISOString(),
    status: "DRAFT",
    viewsCount: 0,
    createdBy: "Placement Cell Office",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const useAnnouncementStore = create<AnnouncementState>((set) => ({
  announcements: INITIAL_ANNOUNCEMENTS,

  addAnnouncement: (ann) => {
    const newAnn: Announcement = {
      ...ann,
      _id: `ann-${Math.random().toString(36).substring(2, 9)}`,
      viewsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set((state) => ({ announcements: [newAnn, ...state.announcements] }));
  },

  updateAnnouncement: (id, updates) => {
    set((state) => ({
      announcements: state.announcements.map((ann) =>
        ann._id === id
          ? { ...ann, ...updates, updatedAt: new Date().toISOString() }
          : ann
      )
    }));
  },

  deleteAnnouncement: (id) => {
    set((state) => ({
      announcements: state.announcements.filter((ann) => ann._id !== id)
    }));
  },

  archiveAnnouncement: (id) => {
    set((state) => ({
      announcements: state.announcements.map((ann) =>
        ann._id === id ? { ...ann, status: "ARCHIVED" as AnnouncementStatus } : ann
      )
    }));
  },

  unarchiveAnnouncement: (id) => {
    set((state) => ({
      announcements: state.announcements.map((ann) => {
        if (ann._id === id) {
          const now = new Date().getTime();
          const isScheduled = new Date(ann.publishDate).getTime() > now;
          const isExpired = ann.expiryDate && new Date(ann.expiryDate).getTime() < now;
          const status: AnnouncementStatus = isExpired
            ? "EXPIRED"
            : isScheduled
            ? "SCHEDULED"
            : "PUBLISHED";
          return { ...ann, status };
        }
        return ann;
      })
    }));
  },

  duplicateAnnouncement: (id) => {
    set((state) => {
      const target = state.announcements.find((ann) => ann._id === id);
      if (!target) return state;
      const duplicated: Announcement = {
        ...target,
        _id: `ann-${Math.random().toString(36).substring(2, 9)}`,
        title: `${target.title} (Copy)`,
        status: "DRAFT" as AnnouncementStatus,
        viewsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return { announcements: [duplicated, ...state.announcements] };
    });
  },

  incrementViews: (id) => {
    set((state) => ({
      announcements: state.announcements.map((ann) =>
        ann._id === id ? { ...ann, viewsCount: ann.viewsCount + 1 } : ann
      )
    }));
  }
}));
