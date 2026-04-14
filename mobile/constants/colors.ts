export type AppThemeMode = "light" | "dark";

const sharedColors = {
  primary: "#0f766e",
  primaryLight: "#14b8a6",
  primaryDark: "#134e4a",
  accent: "#f59e0b",
  accentLight: "#fbbf24",
  success: "#10b981",
  successBg: "rgba(16, 185, 129, 0.12)",
  warning: "#f59e0b",
  warningBg: "rgba(245, 158, 11, 0.12)",
  error: "#ef4444",
  errorBg: "rgba(239, 68, 68, 0.12)",
  info: "#3b82f6",
  infoBg: "rgba(59, 130, 246, 0.12)"
} as const;

export const darkColors = {
  ...sharedColors,
  primaryGlow: "rgba(15, 118, 110, 0.25)",
  background: "#0a0f1e",
  backgroundCard: "#0f1629",
  surface: "#141c35",
  surfaceAlt: "#1a2444",
  surfacePressed: "#1e2a52",
  border: "#1e2d4f",
  borderLight: "#253659",
  text: "#e2e8f0",
  textMuted: "#64748b",
  textSoft: "#94a3b8",
  inactive: "#334155"
} as const;

export const lightColors = {
  ...sharedColors,
  primaryGlow: "rgba(15, 118, 110, 0.12)",
  background: "#f4f7fb",
  backgroundCard: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "#e9eff7",
  surfacePressed: "#edf4fb",
  border: "#d7e2ef",
  borderLight: "#e7eef7",
  text: "#10233f",
  textMuted: "#6a7a90",
  textSoft: "#4b5d75",
  inactive: "#94a3b8"
} as const;

export interface AppColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;
  info: string;
  infoBg: string;
  primaryGlow: string;
  background: string;
  backgroundCard: string;
  surface: string;
  surfaceAlt: string;
  surfacePressed: string;
  border: string;
  borderLight: string;
  text: string;
  textMuted: string;
  textSoft: string;
  inactive: string;
}

export function getAppColors(theme: AppThemeMode): AppColors {
  return theme === "light" ? lightColors : darkColors;
}

export const colors = darkColors;
