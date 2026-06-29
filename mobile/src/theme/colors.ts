export const colors = {
  light: {
    primary: "#6366f1", // Indigo
    primaryLight: "#e0e7ff",
    background: "#f8fafc", // Slate 50
    card: "#ffffff",
    text: "#0f172a", // Slate 900
    textSecondary: "#64748b", // Slate 500
    border: "#e2e8f0", // Slate 200
    notification: "#f43f5e", // Rose 500
    success: "#10b981", // Emerald 500
    error: "#ef4444", // Red 500
    warning: "#f59e0b", // Amber 500
  },
  dark: {
    primary: "#818cf8", // Indigo 400
    primaryLight: "#312e81",
    background: "#080b12", // Dark ink
    card: "#111827", // Gray 900
    text: "#f8fafc", // Slate 50
    textSecondary: "#94a3b8", // Slate 400
    border: "#1f2937", // Gray 800
    notification: "#fb7185", // Rose 400
    success: "#34d399", // Emerald 400
    error: "#f87171", // Red 400
    warning: "#fbbf24", // Amber 400
  },
};

export type ThemeColors = typeof colors.light;
