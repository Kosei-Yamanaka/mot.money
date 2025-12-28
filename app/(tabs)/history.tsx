// app/(tabs)/history.tsx

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useAppTheme } from "../../src/hooks/useAppTheme";

const STORAGE_KEY = "records";

type Mode = "expense" | "income";
type RecordItem = {
  id: string;
  date: string; // "YYYY/M/D" or "YYYY/MM/DD"
  mode: Mode;
  store: string; // カテゴリ名
  displayAmount: string;
  actualAmount: number; // 100円単位の実金額
  createdAt: string;
};

function formatYen(n: number) {
  return (Math.round(Number(n) || 0)).toLocaleString("ja-JP");
}

function parseDateLoose(s: string): Date | null {
  if (!s) return null;
  const parts = s.split(/[\/\-]/).map((v) => Number(v));
  if (parts.length < 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, diff: number) {
  return new Date(d.getFullYear(), d.getMonth() + diff, 1);
}
function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function sumAbsExpense(list: RecordItem[]) {
  return list
    .filter((r) => r.mode === "expense")
    .reduce((acc, r) => acc + Math.abs(Number(r.actualAmount) || 0), 0);
}

function groupExpenseByCategory(list: RecordItem[]) {
  const map = new Map<string, number>();
  list.forEach((r) => {
    if (r.mode !== "expense") return;
    const key = (r.store || "未分類").trim() || "未分類";
    const v = Math.abs(Number(r.actualAmount) || 0);
    map.set(key, (map.get(key) || 0) + v);
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function getLastNDaysBars(expenseList: RecordItem[], n: number) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1));
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  const map = new Map<string, number>();
  expenseList.forEach((r) => {
    const dt = parseDateLoose(r.date);
    if (!dt) return;
    const day = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    if (day < start) return;
    if (day > today) return;
    const key = dayKey(day);
    map.set(key, (map.get(key) || 0) + Math.abs(Number(r.actualAmount) || 0));
  });

  const bars: { key: string; date: Date; value: number }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const k = dayKey(d);
    bars.push({ key: k, date: d, value: map.get(k) || 0 });
  }
  return bars;
}

function rgba(hex: string, a: number) {
  const h = (hex || "#000000").replace("#", "");
  if (h.length !== 6) return `rgba(0,0,0,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function pickColors(base: string) {
  return [
    base,
    "#111111",
    "#444444",
    "#777777",
    rgba(base, 0.75),
    rgba(base, 0.55),
  ];
}

/** ✅ ドーナツ（見やすく：サイズ/太さ/センター文字を調整） */
function Donut({
  size,
  thickness,
  items,
  colors,
  theme,
  titleTop,
  titleBottom,
}: {
  size: number;
  thickness: number;
  items: { label: string; value: number }[];
  colors: string[];
  theme: any;
  titleTop: string;
  titleBottom: string;
}) {
  const total = items.reduce((a, x) => a + (x.value || 0), 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;

  if (!total) {
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size}>
          <Circle cx={c} cy={c} r={r} stroke={theme.border} strokeWidth={thickness} fill="none" />
        </Svg>
        <View style={StyleSheet.absoluteFillObject as any}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontWeight: "900", color: theme.text }}>{titleTop}</Text>
            <Text style={{ fontWeight: "900", color: theme.danger, fontSize: 22 }}>{titleBottom}</Text>
          </View>
        </View>
      </View>
    );
  }

  let offset = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={theme.border} strokeWidth={thickness} fill="none" />
        {items.map((it, idx) => {
          const v = it.value || 0;
          const arc = (v / total) * circumference;
          const dashArray = `${arc} ${circumference - arc}`;
          const dashOffset = -offset;
          offset += arc;

          return (
            <Circle
              key={`${it.label}-${idx}`}
              cx={c}
              cy={c}
              r={r}
              stroke={colors[idx % colors.length]}
              strokeWidth={thickness}
              fill="none"
              strokeLinecap="butt"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              rotation={-90}
              originX={c}
              originY={c}
            />
          );
        })}
      </Svg>

      <View style={StyleSheet.absoluteFillObject as any}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontWeight: "900", color: theme.text, fontSize: 14 }}>{titleTop}</Text>
          <Text style={{ fontWeight: "900", color: theme.danger, fontSize: 28 }}>{titleBottom}</Text>
        </View>
      </View>
    </View>
  );
}

/** ✅ 14日棒グラフ（ズレない：Flexで14分割） */
function Bars14({
  bars,
  theme,
}: {
  bars: { key: string; date: Date; value: number }[];
  theme: any;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value || 0));
  const labelIdx = new Set([0, 4, 9, 13]);
  const label = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  const barAreaH = 150;
  const barMaxH = 120;

  return (
    <View>
      {/* 棒エリア */}
      <View style={{ height: barAreaH, borderBottomWidth: 2, borderBottomColor: theme.border }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end" }}>
          {bars.map((b, i) => {
            const h = Math.round((b.value / max) * barMaxH);
            const show = b.value > 0;

            return (
              <View key={b.key} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
                <View
                  style={{
                    width: 16,
                    height: show ? Math.max(8, h) : 6,
                    borderRadius: 999,
                    backgroundColor: show ? theme.danger : theme.border,
                    opacity: show ? 1 : 0.18,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* ラベル（同じ14分割に乗せるので絶対ズレない） */}
      <View style={{ flexDirection: "row", marginTop: 8 }}>
        {bars.map((b, i) => (
          <View key={`lb-${b.key}`} style={{ flex: 1, alignItems: "center" }}>
            {labelIdx.has(i) ? (
              <Text style={{ color: theme.subText, fontWeight: "900", fontSize: 12 }}>{label(b.date)}</Text>
            ) : (
              <Text style={{ fontSize: 12, color: "transparent" }}>.</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function History() {
  const { theme } = useAppTheme();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [monthCursor, setMonthCursor] = useState<Date>(() => startOfMonth(new Date()));

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr: RecordItem[] = raw ? JSON.parse(raw) : [];
    setRecords(Array.isArray(arr) ? arr : []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const normalized = useMemo(() => {
    return records
      .map((r) => {
        const dt = parseDateLoose(r.date);
        return dt ? { ...r, _dt: dt } : null;
      })
      .filter(Boolean) as (RecordItem & { _dt: Date })[];
  }, [records]);

  const monthRecords = useMemo(() => {
    return normalized.filter((r) => isSameMonth(r._dt, monthCursor));
  }, [normalized, monthCursor]);

  const monthExpenseTotal = useMemo(() => sumAbsExpense(monthRecords), [monthRecords]);
  const monthByCat = useMemo(() => groupExpenseByCategory(monthRecords), [monthRecords]);

  const last14Bars = useMemo(() => {
    const expenseAll = normalized.filter((r) => r.mode === "expense");
    return getLastNDaysBars(expenseAll, 14);
  }, [normalized]);

  const last14ByCat = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13);

    const list = normalized.filter((r) => {
      if (r.mode !== "expense") return false;
      const day = new Date(r._dt.getFullYear(), r._dt.getMonth(), r._dt.getDate());
      return day >= start && day <= today;
    });

    return groupExpenseByCategory(list);
  }, [normalized]);

  const palette = useMemo(() => pickColors(theme.primary), [theme.primary]);

  const monthTitle = `${monthCursor.getFullYear()}/${String(monthCursor.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = isSameMonth(monthCursor, new Date());

  const goMonth = (diff: number) => setMonthCursor((prev) => addMonths(prev, diff));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingHorizontal: 14,
        paddingTop: 35,
        paddingBottom: 28,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* 月ヘッダー */}
      <View style={styles.monthHeader}>
        <View style={[styles.arrowBtn, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={{ fontWeight: "900", color: theme.text }} onPress={() => goMonth(-1)}>
            ◀
          </Text>
        </View>

        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 26, fontWeight: "900", color: theme.text }}>{monthTitle}</Text>
          {isCurrentMonth && (
            <Text style={{ marginTop: 2, fontWeight: "900", color: theme.subText }}>
              Today ● {`${new Date().getMonth() + 1}/${new Date().getDate()}`}
            </Text>
          )}
        </View>

        <View style={[styles.arrowBtn, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={{ fontWeight: "900", color: theme.text }} onPress={() => goMonth(1)}>
            ▶
          </Text>
        </View>
      </View>

      {/* 今月の支出内訳 */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>今月の支出内訳</Text>
          <Text style={{ fontWeight: "900", color: theme.subText }}>
            合計 -{formatYen(monthExpenseTotal)}円
          </Text>
        </View>

        <View style={{ flexDirection: "row", marginTop: 12, alignItems: "center" }}>
          <Donut
            size={160}
            thickness={24}
            items={monthByCat.length ? monthByCat : [{ label: "未分類", value: 0 }]}
            colors={palette}
            theme={theme}
            titleTop="支出"
            titleBottom={`${formatYen(monthExpenseTotal)}円`}
          />

          <View style={{ flex: 1, paddingLeft: 14 }}>
            {(monthByCat.length ? monthByCat : [{ label: "未分類", value: 0 }])
              .slice(0, 4)
              .map((it, idx) => {
                const total = Math.max(1, monthExpenseTotal);
                const pct = Math.round((it.value / total) * 100);
                return (
                  <View key={`${it.label}-${idx}`} style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                    <View
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 4,
                        backgroundColor: palette[idx % palette.length],
                        marginRight: 10,
                      }}
                    />
                    <Text style={{ flex: 1, fontWeight: "900", color: theme.text, fontSize: 16 }}>
                      {it.label}
                    </Text>
                    <Text style={{ fontWeight: "900", color: theme.subText, fontSize: 16 }}>
                      {pct}%
                    </Text>
                  </View>
                );
              })}
          </View>
        </View>

        {/* 今月カテゴリ別（金額） */}
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: "900", color: theme.subText, marginBottom: 8 }}>
            今月 カテゴリ別
          </Text>

          {(monthByCat.length ? monthByCat : [{ label: "未分類", value: 0 }]).map((it, idx) => (
            <View key={`mcat-${it.label}-${idx}`} style={[styles.rowBetween, { marginBottom: 8 }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: palette[idx % palette.length],
                    marginRight: 8,
                  }}
                />
                <Text style={{ fontWeight: "900", color: theme.text }}>{it.label}</Text>
              </View>
              <Text style={{ fontWeight: "900", color: theme.danger }}>
                -{formatYen(it.value)}円
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 直近14日 支出 */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>直近14日 支出</Text>
          <Text style={{ fontWeight: "900", color: theme.subText }}>推移</Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <Bars14 bars={last14Bars} theme={theme} />
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={{ fontWeight: "900", color: theme.subText, marginBottom: 8 }}>
            直近14日 カテゴリ別
          </Text>

          {last14ByCat.length === 0 ? (
            <Text style={{ color: theme.subText, fontWeight: "800" }}>データなし</Text>
          ) : (
            last14ByCat.map((it, idx) => (
              <View key={`l14-${it.label}-${idx}`} style={[styles.rowBetween, { marginBottom: 10 }]}>
                <Text style={{ fontWeight: "900", color: theme.text, fontSize: 16 }}>
                  {it.label}
                </Text>
                <Text style={{ fontWeight: "900", color: theme.danger, fontSize: 16 }}>
                  -{formatYen(it.value)}円
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  arrowBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
