// app/constants/chartColors.ts
export type ChartThemeId = "pastel_blue" | "pastel_warm" | "pastel_green";

export const THEME_LABEL: Record<ChartThemeId, string> = {
  pastel_blue: "パステル（ブルー）",
  pastel_warm: "パステル（ウォーム）",
  pastel_green: "パステル（グリーン）",
};

export const CHART_THEMES: Record<ChartThemeId, string[]> = {
  pastel_blue: ["#BFD0FF", "#FFC2C2", "#BDEEE8", "#FFE7A8", "#D8C7FF", "#BFECCB", "#FFD1DC", "#FFE0B2"],
  pastel_warm: ["#FFD1DC", "#FFE0B2", "#FFE7A8", "#FFC2C2", "#D8C7FF", "#BFD0FF", "#BDEEE8", "#BFECCB"],
  pastel_green: ["#BFECCB", "#BDEEE8", "#BFEFFF", "#FFE7A8", "#D8C7FF", "#FFC2C2", "#BFD0FF", "#FFD1DC"],
};
