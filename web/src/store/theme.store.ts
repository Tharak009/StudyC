import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";
export type ThemeMode = "cobalt-mist" | "frost-glaze";

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      isDark: true,
      themeMode: "cobalt-mist",
      toggleTheme: () =>
        set((state) => {
          const nextTheme: Theme = state.theme === "dark" ? "light" : "dark";
          const isDark = nextTheme === "dark";
          const themeMode: ThemeMode = isDark ? "cobalt-mist" : "frost-glaze";
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", isDark);
            document.documentElement.style.colorScheme = nextTheme;
          }
          return { theme: nextTheme, isDark, themeMode };
        }),
      setTheme: (theme: Theme) => {
        const isDark = theme === "dark";
        const themeMode: ThemeMode = isDark ? "cobalt-mist" : "frost-glaze";
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", isDark);
          document.documentElement.style.colorScheme = theme;
        }
        set({ theme, isDark, themeMode });
      },
      toggle: () =>
        set((state) => {
          const nextTheme: Theme = state.theme === "dark" ? "light" : "dark";
          const isDark = nextTheme === "dark";
          const themeMode: ThemeMode = isDark ? "cobalt-mist" : "frost-glaze";
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", isDark);
            document.documentElement.style.colorScheme = nextTheme;
          }
          return { theme: nextTheme, isDark, themeMode };
        })
    }),
    {
      name: "studyconnect-theme",
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== "undefined") {
          const isDark = state.theme === "dark";
          document.documentElement.classList.toggle("dark", isDark);
          document.documentElement.style.colorScheme = state.theme;
        }
      }
    }
  )
);
