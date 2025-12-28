import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../src/hooks/useAppTheme";

const STORAGE_KEY = "records";

type Mode = "expense" | "income";
type RecordItem = {
  id: string;
  date: string; // YYYY/MM/DD
  mode: Mode;
  category: string;
  displayAmount: string;
  actualAmount: number;
  createdAt: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatYen(n: number) {
  return (Number(n) || 0).toLocaleString("ja-JP");
}
function parseYMD(s: string) {
  const [y, m, d] = s.split("/").map((v) => parseInt(v, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
async function loadRecords(): Promise<RecordItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const arr = raw ? JSON.parse(raw) : [];
  return Array.isArray(arr) ? arr : [];
}

function monthKey(d: Date) {
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}`;
}
function ymd(d: Date) {
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
}

function addMonths(d: Date, diff: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + diff);
  return x;
}

// 月のカレンダー配列を作る（週の頭は日曜）
function buildMonthMatrix(base: Date) {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);

  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay()); // 日曜まで戻す

  const end = new Date(last);
  end.setDate(end.getDate() + (6 - end.getDay())); // 土曜まで進める

  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export default function Calendar() {
  const { theme } = useAppTheme();

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [baseMonth, setBaseMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(ymd(new Date()));

  const load = useCallback(async () => {
    const arr = await loadRecords();
    setRecords(arr);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const weeks = useMemo(() => buildMonthMatrix(baseMonth), [baseMonth]);

  // 日ごとの合計（収入-支出）
  const dayTotals = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      const key = r.date;
      const v = r.mode === "expense" ? -(r.actualAmount || 0) : (r.actualAmount || 0);
      map.set(key, (map.get(key) || 0) + v);
    });
    return map;
  }, [records]);

  const selectedList = useMemo(() => {
    return records
      .filter((r) => r.date === selectedDate)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [records, selectedDate]);

  const selectedTotal = useMemo(() => {
    return selectedList.reduce((s, r) => s + (r.mode === "expense" ? -(r.actualAmount || 0) : (r.actualAmount || 0)), 0);
  }, [selectedList]);

  const todayKey = useMemo(() => ymd(new Date()), []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>カレンダー</Text>

      {/* 月切替 */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.rowBetween}>
          <Pressable
            onPress={() => setBaseMonth((d) => addMonths(d, -1))}
            style={[styles.navBtn, { backgroundColor: theme.card2, borderColor: theme.border }]}
          >
            <Text style={{ fontWeight: "900", color: theme.text }}>◀</Text>
          </Pressable>

          <Text style={{ fontWeight: "900", color: theme.text, fontSize: 16 }}>
            {monthKey(baseMonth)}
          </Text>

          <Pressable
            onPress={() => setBaseMonth((d) => addMonths(d, +1))}
            style={[styles.navBtn, { backgroundColor: theme.card2, borderColor: theme.border }]}
          >
            <Text style={{ fontWeight: "900", color: theme.text }}>▶</Text>
          </Pressable>
        </View>

        {/* 曜日 */}
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
            <Text key={w} style={{ width: "14.285%", textAlign: "center", color: theme.subText, fontWeight: "900" }}>
              {w}
            </Text>
          ))}
        </View>

        {/* 日付グリッド */}
        {weeks.map((week, wi) => (
          <View key={`w-${wi}`} style={{ flexDirection: "row", marginTop: 8 }}>
            {week.map((d, di) => {
              const key = ymd(d);
              const inMonth = d.getMonth() === baseMonth.getMonth();
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;

              const total = dayTotals.get(key) || 0;
              const has = total !== 0;

              const totalColor = total < 0 ? theme.danger : theme.success;

              return (
                <Pressable
                  key={`d-${di}-${key}`}
                  onPress={() => setSelectedDate(key)}
                  style={[
                    styles.dayCell,
                    {
                      borderColor: isSelected ? theme.primary : theme.border,
                      backgroundColor: isSelected ? theme.card2 : "transparent",
                      opacity: inMonth ? 1 : 0.35,
                    },
                  ]}
                >
                  <Text style={{ color: isToday ? theme.primary : theme.text, fontWeight: "900" }}>
                    {d.getDate()}
                  </Text>

                  {/* ちっちゃい合計表示（邪魔にならないやつ） */}
                  {has ? (
                    <Text style={{ marginTop: 4, fontSize: 10, fontWeight: "900", color: totalColor }} numberOfLines={1}>
                      {total < 0 ? "-" : "+"}{formatYen(Math.abs(total))}
                    </Text>
                  ) : (
                    <View style={{ height: 14 }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* 選択日の明細 */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, flex: 1 }]}>
        <View style={styles.rowBetween}>
          <Text style={{ fontWeight: "900", color: theme.text, fontSize: 16 }}>{selectedDate}</Text>
          <Text style={{ fontWeight: "900", color: selectedTotal < 0 ? theme.danger : theme.success }}>
            {selectedTotal < 0 ? "-" : "+"}{formatYen(Math.abs(selectedTotal))}円
          </Text>
        </View>

        <ScrollView style={{ marginTop: 10 }}>
          {selectedList.length === 0 ? (
            <Text style={{ color: theme.subText, fontWeight: "800" }}>この日はまだ記録なし</Text>
          ) : (
            selectedList.map((r) => {
              const isInc = r.mode === "income";
              return (
                <View key={r.id} style={[styles.rowBetween, { paddingVertical: 10, borderBottomWidth: 1, borderColor: theme.border }]}>
                  <Text style={{ color: theme.text, fontWeight: "900" }}>{r.category || "未分類"}</Text>
                  <Text style={{ color: isInc ? theme.success : theme.danger, fontWeight: "900" }}>
                    {isInc ? "+" : "-"}{formatYen(r.actualAmount)}円
                  </Text>
                </View>
              );
            })
          )}
          <View style={{ height: 6 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
  title: { fontSize: 18, fontWeight: "900", textAlign: "center", marginBottom: 10 },

  card: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  navBtn: { width: 44, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  dayCell: {
    width: "14.285%",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
