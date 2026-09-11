/**
 * StudyConnect Campus Streak Engine
 * 
 * Accurately tracks daily student learning streaks across consecutive calendar days.
 * Syncs reactively between Dashboard, Student Profile, and Study Circles.
 */

export interface StudyStreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // ISO format "YYYY-MM-DD"
  lastActivityTimestamp: number;
  activeDays: string[]; // List of historical active dates "YYYY-MM-DD"
  isActiveToday: boolean;
}

export const STREAK_STORAGE_KEY = "studyconnect_streak_data";
export const LEGACY_STREAK_KEY = "studyconnect_study_streak";
export const STREAK_EVENT = "studyconnect:streak-updated";

/**
 * Format a Date object as a local "YYYY-MM-DD" string.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the calendar day difference between two "YYYY-MM-DD" strings.
 * Returns:
 *   0 if same day
 *   1 if dateA is exactly the day after dateB
 *  >1 if more than 1 day apart
 */
export function getDaysDifference(dateStrA: string, dateStrB: string): number {
  if (dateStrA === dateStrB) return 0;
  const [yA, mA, dA] = dateStrA.split("-").map(Number);
  const [yB, mB, dB] = dateStrB.split("-").map(Number);
  const dateA = new Date(yA, mA - 1, dA);
  const dateB = new Date(yB, mB - 1, dB);
  const diffMs = dateA.getTime() - dateB.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Load the current streak state from localStorage, evaluating whether
 * the streak is currently intact, pending today's activity, or lapsed.
 */
export function getStudyStreak(): StudyStreakState {
  const today = getLocalDateString();
  let state: Partial<StudyStreakState> = {};

  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw);
    } else {
      // Check legacy key if migrating
      const legacy = localStorage.getItem(LEGACY_STREAK_KEY);
      if (legacy) {
        const parsedLegacy = parseInt(legacy, 10);
        if (!isNaN(parsedLegacy) && parsedLegacy > 0) {
          state.currentStreak = parsedLegacy;
          state.longestStreak = parsedLegacy;
        }
      }
    }
  } catch {
    state = {};
  }

  let currentStreak = typeof state.currentStreak === "number" ? state.currentStreak : 0;
  let longestStreak = typeof state.longestStreak === "number" ? state.longestStreak : currentStreak;
  const lastActiveDate = state.lastActiveDate || "";
  const lastActivityTimestamp = state.lastActivityTimestamp || 0;
  const activeDays = Array.isArray(state.activeDays) ? state.activeDays : [];

  if (!lastActiveDate) {
    // Brand new user with no recorded activity yet
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: "",
      lastActivityTimestamp: 0,
      activeDays: [],
      isActiveToday: false
    };
  }

  const daysSinceActive = getDaysDifference(today, lastActiveDate);

  if (daysSinceActive === 0) {
    // Active today!
    return {
      currentStreak: Math.max(1, currentStreak),
      longestStreak: Math.max(longestStreak, currentStreak),
      lastActiveDate,
      lastActivityTimestamp,
      activeDays,
      isActiveToday: true
    };
  }

  if (daysSinceActive === 1) {
    // Was active yesterday, streak is intact waiting for today's action!
    return {
      currentStreak: Math.max(1, currentStreak),
      longestStreak,
      lastActiveDate,
      lastActivityTimestamp,
      activeDays,
      isActiveToday: false
    };
  }

  // More than 1 day has passed without activity — streak lapsed!
  return {
    currentStreak: 0,
    longestStreak,
    lastActiveDate,
    lastActivityTimestamp,
    activeDays,
    isActiveToday: false
  };
}

/**
 * Record student study activity (visiting dashboard, sending a message, uploading notes, etc.).
 * Returns the updated streak state and whether the streak was extended to a new day.
 */
export function recordStudyActivity(): {
  state: StudyStreakState;
  extended: boolean;
  streakCount: number;
} {
  const today = getLocalDateString();
  const now = Date.now();
  const prev = getStudyStreak();

  let nextStreak = prev.currentStreak;
  let extended = false;

  if (prev.isActiveToday) {
    // Already active today — maintain streak, update timestamp
    nextStreak = Math.max(1, prev.currentStreak);
  } else if (prev.lastActiveDate && getDaysDifference(today, prev.lastActiveDate) === 1) {
    // Was active yesterday — CONSECUTIVE DAY EXTENSION!
    nextStreak = prev.currentStreak + 1;
    extended = true;
  } else {
    // First time or streak lapsed — start fresh with 1 Day!
    nextStreak = 1;
    extended = prev.currentStreak === 0;
  }

  const nextLongest = Math.max(prev.longestStreak, nextStreak);
  const nextActiveDays = prev.activeDays.includes(today)
    ? prev.activeDays
    : [...prev.activeDays, today].slice(-90); // Keep last 90 active days

  const newState: StudyStreakState = {
    currentStreak: nextStreak,
    longestStreak: nextLongest,
    lastActiveDate: today,
    lastActivityTimestamp: now,
    activeDays: nextActiveDays,
    isActiveToday: true
  };

  try {
    // Save to modern key
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(newState));

    // Keep legacy key synced as raw integer string
    localStorage.setItem(LEGACY_STREAK_KEY, String(nextStreak));

    // Synchronize user profile if stored
    const rawProfile = localStorage.getItem("studyconnect_user_profile");
    if (rawProfile) {
      const profile = JSON.parse(rawProfile);
      profile.studyStreakDays = nextStreak;
      localStorage.setItem("studyconnect_user_profile", JSON.stringify(profile));
    }
  } catch {}

  // Dispatch cross-tab / cross-component event
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(STREAK_EVENT, {
        detail: {
          currentStreak: nextStreak,
          longestStreak: nextLongest,
          extended,
          isActiveToday: true
        }
      })
    );
  }

  return {
    state: newState,
    extended,
    streakCount: nextStreak
  };
}

/**
 * Returns formatted streak text for display in the UI.
 */
export function getStreakDisplay(): {
  count: number;
  text: string;
  badge: string;
  subtitle: string;
  isActiveToday: boolean;
} {
  const streak = getStudyStreak();
  const count = streak.currentStreak;
  const text = count === 1 ? "1 Day" : `${count} Days`;
  const badge = `${count}d 🔥`;
  const subtitle = streak.isActiveToday
    ? "Active today • Keep it up!"
    : count > 0
    ? "Study today to keep your streak!"
    : "Start a study streak today!";

  return {
    count,
    text,
    badge,
    subtitle,
    isActiveToday: streak.isActiveToday
  };
}
