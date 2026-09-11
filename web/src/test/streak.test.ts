import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getLocalDateString,
  getDaysDifference,
  getStudyStreak,
  recordStudyActivity,
  getStreakDisplay,
  STREAK_STORAGE_KEY,
  LEGACY_STREAK_KEY
} from "../utils/streak";

describe("StudyConnect Streak Engine", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("calculates date strings and day differences accurately", () => {
    expect(getDaysDifference("2026-09-11", "2026-09-11")).toBe(0);
    expect(getDaysDifference("2026-09-11", "2026-09-10")).toBe(1);
    expect(getDaysDifference("2026-09-11", "2026-09-09")).toBe(2);
    expect(getDaysDifference("2026-10-01", "2026-09-30")).toBe(1);
  });

  it("returns 0 streak for brand new user with no activity", () => {
    const streak = getStudyStreak();
    expect(streak.currentStreak).toBe(0);
    expect(streak.isActiveToday).toBe(false);
    expect(streak.lastActiveDate).toBe("");
  });

  it("initializes to 1 day on first activity record", () => {
    const result = recordStudyActivity();
    expect(result.streakCount).toBe(1);
    expect(result.extended).toBe(true);
    expect(result.state.currentStreak).toBe(1);
    expect(result.state.isActiveToday).toBe(true);

    // Verify localStorage persistence
    const saved = JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY)!);
    expect(saved.currentStreak).toBe(1);
    expect(localStorage.getItem(LEGACY_STREAK_KEY)).toBe("1");
  });

  it("maintains same streak on multiple activities on the same day", () => {
    const first = recordStudyActivity();
    expect(first.streakCount).toBe(1);

    const second = recordStudyActivity();
    expect(second.streakCount).toBe(1);
    expect(second.extended).toBe(false);
  });

  it("increments streak when user returns the next consecutive day", () => {
    // Simulate user active yesterday (2026-09-10) with 3-day streak
    const yesterday = "2026-09-10";
    localStorage.setItem(
      STREAK_STORAGE_KEY,
      JSON.stringify({
        currentStreak: 3,
        longestStreak: 5,
        lastActiveDate: yesterday,
        lastActivityTimestamp: Date.now() - 86400000,
        activeDays: ["2026-09-08", "2026-09-09", "2026-09-10"],
        isActiveToday: false
      })
    );

    // Mock today as 2026-09-11
    vi.spyOn(Date.prototype, "getFullYear").mockReturnValue(2026);
    vi.spyOn(Date.prototype, "getMonth").mockReturnValue(8); // 8 is September (0-indexed)
    vi.spyOn(Date.prototype, "getDate").mockReturnValue(11);

    const result = recordStudyActivity();
    expect(result.streakCount).toBe(4);
    expect(result.extended).toBe(true);
    expect(result.state.longestStreak).toBe(5);
  });

  it("resets streak to 1 when user misses 1 or more days", () => {
    // Simulate user active 3 days ago (2026-09-08) with 10-day streak
    const threeDaysAgo = "2026-09-08";
    localStorage.setItem(
      STREAK_STORAGE_KEY,
      JSON.stringify({
        currentStreak: 10,
        longestStreak: 10,
        lastActiveDate: threeDaysAgo,
        lastActivityTimestamp: Date.now() - 3 * 86400000,
        activeDays: ["2026-09-08"],
        isActiveToday: false
      })
    );

    // Mock today as 2026-09-11
    vi.spyOn(Date.prototype, "getFullYear").mockReturnValue(2026);
    vi.spyOn(Date.prototype, "getMonth").mockReturnValue(8);
    vi.spyOn(Date.prototype, "getDate").mockReturnValue(11);

    const result = recordStudyActivity();
    expect(result.streakCount).toBe(1);
    expect(result.state.longestStreak).toBe(10); // Preserves personal best!
  });

  it("updates longestStreak when current exceeds previous best", () => {
    localStorage.setItem(
      STREAK_STORAGE_KEY,
      JSON.stringify({
        currentStreak: 5,
        longestStreak: 5,
        lastActiveDate: "2026-09-10",
        lastActivityTimestamp: Date.now() - 86400000,
        activeDays: ["2026-09-10"],
        isActiveToday: false
      })
    );

    vi.spyOn(Date.prototype, "getFullYear").mockReturnValue(2026);
    vi.spyOn(Date.prototype, "getMonth").mockReturnValue(8);
    vi.spyOn(Date.prototype, "getDate").mockReturnValue(11);

    const result = recordStudyActivity();
    expect(result.streakCount).toBe(6);
    expect(result.state.longestStreak).toBe(6);
  });

  it("formats streak display correctly", () => {
    recordStudyActivity();
    const display = getStreakDisplay();
    expect(display.count).toBe(1);
    expect(display.text).toBe("1 Day");
    expect(display.badge).toBe("1d 🔥");
    expect(display.isActiveToday).toBe(true);
  });
});
