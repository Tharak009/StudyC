import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

const preferredTheme = (): Theme =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: preferredTheme(),
      toggle: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" }))
    }),
    { name: "studyconnect-theme" }
  )
);
