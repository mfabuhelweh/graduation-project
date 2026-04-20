export type AppThemeMode = "light" | "dark";

const sharedColors = {
  primary: "#1F5AA9",
  primaryLight: "#2F75D6",
  primaryDark: "#171717",
  accent: "#2F75D6",
  accentLight: "#B88A2C",
  success: "#1F5AA9",
  successBg: "rgba(31, 90, 169, 0.10)",
  warning: "#D4AF37",
  warningBg: "rgba(212, 175, 55, 0.10)",
  error: "#EF4444",
  errorBg: "rgba(239, 68, 68, 0.11)",
  info: "#171717",
  infoBg: "rgba(23, 23, 23, 0.08)"
} as const;

export const darkColors = {
  ...sharedColors,
  primaryGlow: "rgba(95, 162, 255, 0.16)",
  background: "#101413",
  backgroundCard: "#202B26",
  surface: "#181F1C",
  surfaceAlt: "#202B26",
  surfacePressed: "#26372F",
  border: "rgba(95, 162, 255, 0.30)",
  borderLight: "rgba(255, 255, 255, 0.08)",
  text: "#F8FAFC",
  textMuted: "#A7B5AD",
  textSoft: "#E3EBE7",
  inactive: "#67756D"
} as const;

export const lightColors = {
  ...sharedColors,
  primaryGlow: "rgba(31, 90, 169, 0.12)",
  background: "#F6F8F7",
  backgroundCard: "#EDF3EF",
  surface: "#FFFFFF",
  surfaceAlt: "#EDF3EF",
  surfacePressed: "#E3ECE7",
  border: "rgba(31, 90, 169, 0.22)",
  borderLight: "rgba(23, 23, 23, 0.08)",
  text: "#1B2420",
  textMuted: "#65736B",
  textSoft: "#33443C",
  inactive: "#98A49E"
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
