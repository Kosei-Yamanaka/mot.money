import AsyncStorage from "@react-native-async-storage/async-storage";

export const RECORDS_KEY = "records";

export type Mode = "expense" | "income";

export type RecordItem = {
  id: string;
  date: string; // YYYY/MM/DD
  mode: Mode;
  category: string;
  actualAmount: number; // 円
  createdAt: string;
};

export function formatYen(n: number) {
  return (Number(n) || 0).toLocaleString("ja-JP");
}

export async function loadRecords(): Promise<RecordItem[]> {
  const raw = await AsyncStorage.getItem(RECORDS_KEY);
  const arr = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(arr)) return [];
  return arr.map((r: any) => ({
    id: String(r.id ?? Math.random()),
    date: String(r.date ?? "不明"),
    mode: r.mode === "income" ? "income" : "expense",
    category: String(r.category ?? r.store ?? "未分類"),
    actualAmount: Number(r.actualAmount ?? 0),
    createdAt: String(r.createdAt ?? new Date().toISOString()),
  })) as RecordItem[];
}

export async function saveRecords(next: RecordItem[]) {
  await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(next));
}
