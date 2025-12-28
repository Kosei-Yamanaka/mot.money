export type ThemeId = "blue" | "green" | "mono";

export const THEME_LABEL: Record<ThemeId, string> = {
  blue: "ブルー",
  green: "グリーン",
  mono: "モノ",
};

export type AppTheme = {
  bg: string;
  card: string;
  card2: string;
  text: string;
  subText: string;
  border: string;

  primary: string;
  primarySoft: string;

  danger: string;
  success: string;
};

export const THEMES: Record<ThemeId, AppTheme> = {
  blue: {
    bg: "#F4F7FF",
    card: "#FFFFFF",
    card2: "#EEF3FF",
    text: "#111827",
    subText: "#6B7280",
    border: "#D7E0FF",
    primary: "#2F66FF",
    primarySoft: "#E7EEFF",
    danger: "#C23B3B",
    success: "#1F9D55",
  },
  green: {
    bg: "#F3FBF6",
    card: "#FFFFFF",
    card2: "#EAF7F0",
    text: "#0F172A",
    subText: "#64748B",
    border: "#CFEAD9",
    primary: "#1E7A4C",
    primarySoft: "#E0F3E9",
    danger: "#C23B3B",
    success: "#1E7A4C",
  },
  mono: {
    bg: "#F6F6F7",
    card: "#FFFFFF",
    card2: "#F0F0F2",
    text: "#111111",
    subText: "#666666",
    border: "#E5E7EB",
    primary: "#111111",
    primarySoft: "#EDEDED",
    danger: "#C23B3B",
    success: "#111111",
  },
};
