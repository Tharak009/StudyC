import { create } from "zustand";

export interface BackupEntry {
  id: string;
  filename: string;
  size: string;
  date: string;
  status: string;
}

export interface SystemSettingsState {
  general: {
    platformName: string;
    platformLogo: string;
    platformDescription: string;
    defaultLanguage: string;
    timezone: string;
    dateFormat: string;
  };
  college: {
    collegeName: string;
    collegeLogo: string;
    emailDomain: string;
    website: string;
    academicYear: string;
    semester: string;
    departments: string[];
  };
  registration: {
    enableRegistration: boolean;
    allowOnlyCollegeEmails: boolean;
    requireEmailVerification: boolean;
    defaultStudentRole: string;
  };
  authentication: {
    sessionTimeout: number;
    rememberMeDuration: number;
    passwordExpiry: number;
    maxLoginAttempts: number;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    senderName: string;
    senderEmail: string;
    replyToEmail: string;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    announcementNotifications: boolean;
    eventNotifications: boolean;
    communityNotifications: boolean;
  };
  upload: {
    maxFileSize: number;
    allowedFileTypes: string[];
    maxImageSize: number;
    storageLimit: number;
  };
  communities: {
    allowCommunityCreation: boolean;
    communityApprovalRequired: boolean;
    maxMembers: number;
    maxCommunitiesPerUser: number;
  };
  events: {
    allowStudentEvents: boolean;
    requireEventApproval: boolean;
    maxParticipants: number;
    registrationDeadlineHours: number;
  };
  appearance: {
    defaultTheme: string;
    primaryColor: string;
    accentColor: string;
    enableDarkMode: boolean;
  };
  security: {
    passwordPolicy: string;
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    accountLockDuration: number;
  };
  backups: {
    lastBackup: string;
    backupStatus: string;
    history: BackupEntry[];
  };
  about: {
    version: string;
    environment: string;
    databaseStatus: string;
    serverStatus: string;
    frontendVersion: string;
    backendVersion: string;
    buildDate: string;
  };
  updateSettings: (section: string, values: any) => void;
  resetSettings: () => void;
  triggerManualBackup: () => void;
  restoreBackup: (backupId: string) => void;
}

const INITIAL_SETTINGS = {
  general: {
    platformName: "StudyConnect",
    platformLogo: "/assets/logo.png",
    platformDescription: "A collaborative learning platform for students and administration.",
    defaultLanguage: "en",
    timezone: "UTC+05:30",
    dateFormat: "YYYY-MM-DD"
  },
  college: {
    collegeName: "ComStudy Engineering College",
    collegeLogo: "/assets/college-logo.png",
    emailDomain: "comstudy.edu.in",
    website: "https://www.comstudy.edu.in",
    academicYear: "2026",
    semester: "Odd",
    departments: ["Computer Science", "Information Technology", "Mechanical Engineering", "Civil Engineering"]
  },
  registration: {
    enableRegistration: true,
    allowOnlyCollegeEmails: true,
    requireEmailVerification: true,
    defaultStudentRole: "STUDENT"
  },
  authentication: {
    sessionTimeout: 60,
    rememberMeDuration: 30,
    passwordExpiry: 90,
    maxLoginAttempts: 5
  },
  email: {
    smtpHost: "smtp.comstudy.edu.in",
    smtpPort: 587,
    senderName: "StudyConnect Admin",
    senderEmail: "admin@comstudy.edu.in",
    replyToEmail: "support@comstudy.edu.in"
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    announcementNotifications: true,
    eventNotifications: true,
    communityNotifications: true
  },
  upload: {
    maxFileSize: 10,
    allowedFileTypes: [".pdf", ".docx", ".zip", ".png", ".jpg"],
    maxImageSize: 5,
    storageLimit: 100
  },
  communities: {
    allowCommunityCreation: true,
    communityApprovalRequired: true,
    maxMembers: 500,
    maxCommunitiesPerUser: 10
  },
  events: {
    allowStudentEvents: true,
    requireEventApproval: true,
    maxParticipants: 200,
    registrationDeadlineHours: 24
  },
  appearance: {
    defaultTheme: "Dark",
    primaryColor: "#6366f1",
    accentColor: "#8b5cf6",
    enableDarkMode: true
  },
  security: {
    passwordPolicy: "Strong",
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: true,
    accountLockDuration: 30
  },
  backups: {
    lastBackup: "2026-06-29 12:00:00",
    backupStatus: "Healthy",
    history: [
      { id: "b1", filename: "backup_2026_06_29.tar.gz", size: "45.2 MB", date: "2026-06-29 12:00:00", status: "Completed" },
      { id: "b2", filename: "backup_2026_06_22.tar.gz", size: "44.8 MB", date: "2026-06-22 12:00:00", status: "Completed" }
    ]
  },
  about: {
    version: "v1.4.2",
    environment: "Production",
    databaseStatus: "Online",
    serverStatus: "Running",
    frontendVersion: "v1.4.2-web",
    backendVersion: "v1.4.0-api",
    buildDate: "2026-06-25 18:30:00"
  }
};

export const useSettingsStore = create<SystemSettingsState>((set) => ({
  ...INITIAL_SETTINGS,

  updateSettings: (section, values) => {
    set((state) => ({
      ...state,
      [section]: {
        ...(state as any)[section],
        ...values
      }
    }));
  },

  resetSettings: () => {
    set((state) => ({
      ...state,
      ...INITIAL_SETTINGS
    }));
  },

  triggerManualBackup: () => {
    set((state) => {
      const now = new Date();
      const dateStr = now.toISOString().replace(/T/, " ").replace(/\..+/, "");
      const newBackup: BackupEntry = {
        id: `b-${Date.now()}`,
        filename: `backup_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}_${String(now.getDate()).padStart(2, "0")}.tar.gz`,
        size: "46.1 MB",
        date: dateStr,
        status: "Completed"
      };

      return {
        ...state,
        backups: {
          lastBackup: dateStr,
          backupStatus: "Healthy",
          history: [newBackup, ...state.backups.history]
        }
      };
    });
  },

  restoreBackup: (backupId) => {
    set((state) => {
      const backup = state.backups.history.find((b) => b.id === backupId);
      if (!backup) return state;
      const historyCopy = state.backups.history.map((b) =>
        b.id === backupId ? { ...b, status: "Restored" } : b
      );
      return {
        ...state,
        backups: {
          ...state.backups,
          history: historyCopy
        }
      };
    });
  }
}));
