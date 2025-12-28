// src/theme/chartColors.ts
export type ChartThemeId = "pastel_blue" | "pastel_pink" | "pastel_green";

export const THEME_LABEL: Record<ChartThemeId, string> = {
  pastel_blue: "パステル（青）",
  pastel_pink: "パステル（ピンク）",
  pastel_green: "パステル（緑）",
};

export const CHART_THEMES: Record<ChartThemeId, string[]> = {
  pastel_blue: ["#2B66FF", "#6DA7FF", "#9CC3FF", "#C4DBFF", "#E2EEFF"],
  pastel_pink: ["#FF4DA6", "#FF80C1", "#FFADD6", "#FFD0E8", "#FFE6F3"],
  pastel_green: ["#1F7A43", "#4BAE6A", "#7CD494", "#B6EBC6", "#E3F8E8"],
};
