export type ThemeId = "blue" | "green" | "mono";

export type AppTheme = {
  id: ThemeId;
  bg: string;
  card: string;
  card2: string;
  border: string;
  text: string;
  subText: string;
  primary: string;
  primarySoft: string;
  danger: string;
  success: string;
  tabInactive: string;
};

export const THEMES: Record<ThemeId, AppTheme> = {
  blue: {
    id: "blue",
    bg: "#EFF4FF",
    card: "#FFFFFF",
    card2: "#EEF3FF",
    border: "#D8E2FF",
    text: "#0F172A",
    subText: "#64748B",
    primary: "#2F66F2",
    primarySoft: "#DCE8FF",
    danger: "#C23B3B",
    success: "#1F7A43",
    tabInactive: "#94A3B8",
  },
  green: {
    id: "green",
    bg: "#F1F7F3",
    card: "#FFFFFF",
    card2: "#EAF5EE",
    border: "#D6E9DA",
    text: "#0F172A",
    subText: "#5B6B62",
    primary: "#1E7A43",
    primarySoft: "#D7F0E1",
    danger: "#C23B3B",
    success: "#1E7A43",
    tabInactive: "#93A39A",
  },
  mono: {
    id: "mono",
    bg: "#F5F5F5",
    card: "#FFFFFF",
    card2: "#F0F0F0",
    border: "#E2E2E2",
    text: "#111827",
    subText: "#6B7280",
    primary: "#111827",
    primarySoft: "#E5E7EB",
    danger: "#B91C1C",
    success: "#166534",
    tabInactive: "#9CA3AF",
  },
};

export const THEME_LABEL: Record<ThemeId, string> = {
  blue: "ブルー",
  green: "グリーン",
  mono: "モノクロ",
};
