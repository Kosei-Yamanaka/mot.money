// app/constants/chartColors.ts
// ✅ グラフ配色テーマ（Settingsで選べる）
// - ここを増やすと設定画面に自動で増える

export type ChartThemeId =
  | "pastel_blue"
  | "pastel_warm"
  | "pastel_mint"
  | "mono_gray"
  | "sunset";

export const THEME_LABEL: Record<ChartThemeId, string> = {
  pastel_blue: "パステル（ブルー）",
  pastel_warm: "パステル（ウォーム）",
  pastel_mint: "パステル（ミント）",
  mono_gray: "モノトーン",
  sunset: "サンセット",
};

// ✅ 色は「薄め」前提（カテゴリ文字が見える）
export const CHART_THEMES: Record<ChartThemeId, string[]> = {
  pastel_blue: [
    "#C8D6FF",
    "#DDE6FF",
    "#BFD0FF",
    "#E7ECFF",
    "#C0E8FF",
    "#D6F2FF",
    "#D8C7FF",
    "#EFE6FF",
    "#BDEEE8",
  ],
  pastel_warm: [
    "#FFD6D6",
    "#FFE2C6",
    "#FFE9A8",
    "#FFF0C9",
    "#FFD1DC",
    "#FFE6EE",
    "#D8C7FF",
    "#EFE6FF",
    "#BFECCB",
  ],
  pastel_mint: [
    "#BDEEE8",
    "#D7F7F3",
    "#BFECCB",
    "#E2FAE8",
    "#C0E8FF",
    "#D6F2FF",
    "#FFE7A8",
    "#FFF3CF",
    "#D8C7FF",
  ],
  mono_gray: [
    "#E6E6E6",
    "#DCDCDC",
    "#D2D2D2",
    "#C8C8C8",
    "#BEBEBE",
    "#B4B4B4",
    "#AAAAAA",
    "#A0A0A0",
    "#969696",
  ],
  sunset: [
    "#FFD1B2",
    "#FFE0B2",
    "#FFE7A8",
    "#FFD1DC",
    "#D8C7FF",
    "#C8D6FF",
    "#BDEEE8",
    "#BFECCB",
    "#FFF0C9",
  ],
};
