import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

const STORAGE_KEY = "records";

type Mode = "expense" | "income";

type RecordItem = {
  id: string;
  date: string; // "YYYY/M/D"
  mode: Mode;
  store: string;
  displayAmount: string;
  actualAmount: number;
  createdAt: string;
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function ymdKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function parseRecordDate(r: RecordItem): Date {
  const t = Date.parse(r.createdAt);
  if (!Number.isNaN(t)) return new Date(t);

  const m = r.date?.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date();
}
function yen(n: number) {
  const v = Math.trunc(Number(n) || 0);
  return v.toLocaleString("ja-JP");
}
function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/**
 * ✅ kをやめて、日本語で短縮（万/億）
 * - 1234 -> 1,234
 * - 58050 -> 5.8万
 * - 258800 -> 25.9万
 * - 123000000 -> 1.2億
 */
function shortJa(n: number) {
  const vAbs = Math.abs(Math.trunc(Number(n) || 0));
  const sign = n < 0 ? "-" : "";

  if (vAbs >= 100_000_000) {
    const o = (vAbs / 100_000_000).toFixed(1).replace(/\.0$/, "");
    return `${sign}${o}億`;
  }
  if (vAbs >= 10_000) {
    const m = (vAbs / 10_000).toFixed(1).replace(/\.0$/, "");
    return `${sign}${m}万`;
  }
  return `${sign}${yen(vAbs)}`;
}

export default function CalendarScreen() {
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [selectedYmd, setSelectedYmd] = useState<string>(() => ymdKey(new Date()));

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr: RecordItem[] = raw ? JSON.parse(raw) : [];
    setRecords(Array.isArray(arr) ? arr : []);
  }, []);

  // ✅「保存したのに反映されない」対策：タブ復帰で必ず再読込
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const headerLabel = useMemo(
    () => `${cursor.getFullYear()}年 ${cursor.getMonth() + 1}月`,
    [cursor]
  );

  const moveMonth = (delta: number) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  // 日別集計
  const dayAgg = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; items: RecordItem[] }>();

    for (const r of records) {
      const d = parseRecordDate(r);
      const key = ymdKey(d);

      if (!map.has(key)) map.set(key, { income: 0, expense: 0, items: [] });
      const obj = map.get(key)!;

      if (r.mode === "income") obj.income += Number(r.actualAmount) || 0;
      else obj.expense += Number(r.actualAmount) || 0;

      obj.items.push(r);
    }

    for (const [, v] of map) {
      v.items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }
    return map;
  }, [records]);

  const monthAgg = useMemo(() => {
    const s = monthStart(cursor);
    const e = monthEnd(cursor);
    let income = 0;
    let expense = 0;

    for (const r of records) {
      const d = parseRecordDate(r);
      if (d >= s && d <= e) {
        if (r.mode === "income") income += Number(r.actualAmount) || 0;
        else expense += Number(r.actualAmount) || 0;
      }
    }
    return { income, expense, net: income - expense };
  }, [records, cursor]);

  const totalAgg = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const r of records) {
      if (r.mode === "income") income += Number(r.actualAmount) || 0;
      else expense += Number(r.actualAmount) || 0;
    }
    return { income, expense, net: income - expense };
  }, [records]);

  const selectedItems = useMemo(
    () => dayAgg.get(selectedYmd)?.items ?? [],
    [dayAgg, selectedYmd]
  );

  // カレンダーセル（42マス固定）
  const cells = useMemo(() => {
    const s = monthStart(cursor);
    const e = monthEnd(cursor);

    const startDow = s.getDay();
    const daysInMonth = e.getDate();

    const arr: Array<{ kind: "blank" } | { kind: "day"; day: number; key: string }> = [];

    for (let i = 0; i < startDow; i++) arr.push({ kind: "blank" });
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      arr.push({ kind: "day", day, key: ymdKey(d) });
    }
    while (arr.length < 42) arr.push({ kind: "blank" });
    return arr;
  }, [cursor]);

  const deleteRecord = useCallback(
    async (id: string) => {
      const next = records.filter((r) => r.id !== id);
      setRecords(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    [records]
  );

  const renderRightActions = (id: string) => (
    <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.85} onPress={() => deleteRecord(id)}>
      <Text style={styles.deleteTxt}>削除</Text>
    </TouchableOpacity>
  );

  const renderDetailItem = ({ item }: { item: RecordItem }) => {
    const sign = item.mode === "income" ? "+" : "-";
    const amt = Math.abs(Number(item.actualAmount) || 0);

    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <View style={styles.detailRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.detailTitle} numberOfLines={1}>
              {item.store}
            </Text>
            <Text style={styles.detailSub} numberOfLines={1}>
              {item.date}
            </Text>
          </View>
          <Text style={[styles.detailAmount, item.mode === "income" ? styles.green : styles.red]} numberOfLines={1}>
            {sign}
            {yen(amt)}円
          </Text>
        </View>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      {/* 月ヘッダー（余白詰め） */}
      <View style={styles.monthHeader}>
        <TouchableOpacity style={styles.navBtn} onPress={() => moveMonth(-1)}>
          <Text style={styles.navTxt}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.monthTitle}>{headerLabel}</Text>

        <TouchableOpacity style={styles.navBtn} onPress={() => moveMonth(1)}>
          <Text style={styles.navTxt}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* 曜日（さらに小さめ） */}
      <View style={styles.weekRow}>
        {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => (
          <Text
            key={w}
            style={[
              styles.weekTxt,
              i === 0 && { color: "#d44" },
              i === 6 && { color: "#2b66ff" },
            ]}
          >
            {w}
          </Text>
        ))}
      </View>

      {/* カレンダー（縦さらに圧縮） */}
      <View style={styles.grid}>
        {cells.map((c, idx) => {
          if (c.kind === "blank") {
            return <View key={`b-${idx}`} style={[styles.cell, styles.cellBlank]} />;
          }

          const agg = dayAgg.get(c.key);
          const income = agg?.income ?? 0;
          const expense = agg?.expense ?? 0;

          const isSelected = c.key === selectedYmd;

          return (
            <Pressable
              key={c.key}
              style={[styles.cell, isSelected && styles.cellSelected]}
              onPress={() => setSelectedYmd(c.key)}
            >
              {/* ③ 日付の文字を小さく */}
              <Text style={styles.dayNum} numberOfLines={1}>{c.day}</Text>

              {/* ③ 収入/支出を両方入れやすくする（さらに小さく） */}
              {expense > 0 && (
                <Text style={[styles.amountTiny, styles.red]} numberOfLines={1}>
                  {shortJa(-expense)}
                </Text>
              )}
              {income > 0 && (
                <Text style={[styles.amountTiny, styles.green]} numberOfLines={1}>
                  {shortJa(income)}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ② カレンダー下の余白を詰める：marginTopを激減 */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>今月</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>収入</Text>
          <Text style={[styles.summaryValue, styles.green]}>+{yen(monthAgg.income)}円</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>支出</Text>
          <Text style={[styles.summaryValue, styles.red]}>-{yen(monthAgg.expense)}円</Text>
        </View>

        <View style={styles.hr} />

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { fontWeight: "900" }]}>残高</Text>
          <Text style={styles.summaryValue}>{yen(monthAgg.net)}円</Text>
        </View>

        <View style={[styles.summaryRow, { marginTop: 2 }]}>
          <Text style={[styles.summaryLabel, { fontWeight: "900" }]}>累計残高</Text>
          <Text style={styles.summaryValue}>{yen(totalAgg.net)}円</Text>
        </View>
      </View>

      {/* 選択日の詳細 */}
      <View style={styles.detailArea}>
        <Text style={styles.detailHeader}>
          {selectedYmd.replaceAll("-", "/")} の詳細（スワイプで削除）
        </Text>

        {selectedItems.length === 0 ? (
          <Text style={styles.detailEmpty}>この日はまだ記録がないよ</Text>
        ) : (
          <FlatList
            data={selectedItems}
            keyExtractor={(i) => i.id}
            renderItem={renderDetailItem}
            contentContainerStyle={{ paddingBottom: 12 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* =========================
     画面全体
  ========================= */
  container: {
    flex: 1,
    backgroundColor: "#F6F1E3",
    paddingTop: 0, // 画面上の無駄な余白を完全に削除
  },

  /* =========================
     月ヘッダー（◀ 2025年12月 ▶）
  ========================= */
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40, // 横余白を少し詰める
    paddingVertical: 2, // 縦を最小限に
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "900",
  },

  navBtn: {
    width: 40,
    height: 26, // ボタンも縦圧縮
    borderRadius: 9,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E1CF",
  },
  navTxt: {
    fontSize: 14,
    fontWeight: "900",
  },

  /* =========================
     曜日行（日〜土）
  ========================= */
  weekRow: {
    flexDirection: "row",
    paddingHorizontal: 6,
    marginBottom: 1, // カレンダーとの隙間を極小化
  },
  weekTxt: {
    width: "14.285%",
    textAlign: "center",
    fontWeight: "900",
    color: "#222",
    fontSize: 10, // 曜日も小さめ
  },

  /* =========================
     カレンダーグリッド
  ========================= */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 6,
    paddingBottom: 0, // カレンダー下の余白を削る
  },

  /* =========================
     日付セル（最重要）
  ========================= */
  cell: {
    width: "14.285%",
    height: 28, // ★超重要：縦を大幅圧縮
    borderRadius: 9,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E8E1CF",
    marginBottom: 4, // 行間を詰める
    paddingTop: 2, // 中の余白も削る
    paddingHorizontal: 3,
  },

  cellBlank: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },

  cellSelected: {
    borderColor: "#2B66FF",
    borderWidth: 2,
  },

  /* =========================
     日付数字（1,2,3...）
  ========================= */
  dayNum: {
    fontSize: 9, // 日付を小さく
    fontWeight: "900",
    color: "#222",
    lineHeight: 9, // 行高さを詰める
  },

  /* =========================
     金額（収入・支出）
  ========================= */
  amountTiny: {
    fontSize: 7, // 2行入る最小サイズ
    fontWeight: "900",
    lineHeight: 8,
    marginTop: 0,
  },

  /* =========================
     今月まとめカード
  ========================= */
  summaryCard: {
    marginTop: 0, // ★カレンダー直下の余白を削減
    marginHorizontal: 12,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 10, // カード自体を薄く
    borderWidth: 1,
    borderColor: "#E8E1CF",
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 6,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4, // 行間を詰める
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#222",
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#222",
  },

  hr: {
    height: 1,
    backgroundColor: "#EFE7D7",
    marginVertical: 5, // 仕切り線の上下余白を縮小
  },

  /* =========================
     日付詳細エリア
  ========================= */
  detailArea: {
    flex: 1,
    marginTop: 4, // summaryとの隙間を最小化
    marginHorizontal: 12,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E8E1CF",
  },

  detailHeader: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
  },

  detailEmpty: {
    color: "#666",
    fontWeight: "700",
    fontSize: 12,
  },

  /* =========================
     明細行（スワイプ削除対象）
  ========================= */
  detailRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8, // 高さを抑える
    paddingHorizontal: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EFE7D7",
  },

  detailTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#222",
  },

  detailSub: {
    marginTop: 2,
    color: "#666",
    fontSize: 11,
    fontWeight: "700",
  },

  detailAmount: {
    fontSize: 13,
    fontWeight: "900",
  },

  /* =========================
     削除ボタン（スワイプ）
  ========================= */
  deleteBtn: {
    width: 80,
    marginBottom: 8,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF4D4D",
  },

  deleteTxt: {
    color: "white",
    fontWeight: "900",
    fontSize: 13,
  },

  /* =========================
     色ユーティリティ
  ========================= */
  red: { color: "#C23B3B" }, // 支出
  green: { color: "#1F7A43" }, // 収入
});
