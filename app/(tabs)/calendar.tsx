import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
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
  date: string; // "YYYY/M/D"（君のIndexがこう保存してる）
  mode: Mode;
  store: string; // カテゴリ名
  displayAmount: string;
  actualAmount: number;
  createdAt: string; // ISO
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function ymd(d: Date) {
  // "YYYY/M/D" で統一（IndexのdateLabelと合わせる）
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function sameYMD(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatYen(n: number) {
  const v = Number(n) || 0;
  return v.toLocaleString("ja-JP");
}

function amountFontSizeByDigits(formatted: string) {
  // 例: "30,000" みたいな文字列長で段階的に小さく
  const len = formatted.length;
  if (len >= 9) return 7;  // "1,234,567" 以上
  if (len >= 7) return 8;  // "123,456" くらい
  return 9;                // それ以下
}

export default function CalendarScreen() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const arr: RecordItem[] = raw ? JSON.parse(raw) : [];
      setRecords(Array.isArray(arr) ? arr : []);
    } catch (e) {
      console.error(e);
      setRecords([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // 月移動
  const moveMonth = (delta: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  // createdAt を使って日付判定（date文字列より安全）
  const recordDateObj = useCallback((r: RecordItem) => {
    const d = new Date(r.createdAt);
    if (Number.isNaN(d.getTime())) {
      // createdAtが壊れてたら date をパース（フォールバック）
      // "YYYY/M/D"
      const [Y, M, D] = (r.date || "").split("/").map((x) => parseInt(x, 10));
      if (!Y || !M || !D) return new Date();
      return new Date(Y, M - 1, D);
    }
    return d;
  }, []);

  // 月内のレコード
  const monthRecords = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    return records.filter((r) => {
      const d = recordDateObj(r);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [records, currentMonth, recordDateObj]);

  // 今月の合計
  const monthIncome = useMemo(() => {
    return monthRecords
      .filter((r) => r.mode === "income")
      .reduce((s, r) => s + (Number(r.actualAmount) || 0), 0);
  }, [monthRecords]);

  const monthExpense = useMemo(() => {
    return monthRecords
      .filter((r) => r.mode === "expense")
      .reduce((s, r) => s + (Number(r.actualAmount) || 0), 0);
  }, [monthRecords]);

  const monthBalance = useMemo(() => monthIncome - monthExpense, [monthIncome, monthExpense]);

  // 累計残高（全期間）
  const totalBalance = useMemo(() => {
    let inc = 0;
    let exp = 0;
    records.forEach((r) => {
      const a = Number(r.actualAmount) || 0;
      if (r.mode === "income") inc += a;
      else exp += a;
    });
    return inc - exp;
  }, [records]);

  // 選択日の明細
  const selectedRecords = useMemo(() => {
    return records
      .filter((r) => sameYMD(recordDateObj(r), selectedDate))
      .sort((a, b) => {
        // 新しい順（idがDate.now想定）
        const na = Number(a.id) || 0;
        const nb = Number(b.id) || 0;
        return nb - na;
      });
  }, [records, selectedDate, recordDateObj]);

  // 日別集計Map（表示高速化）
  const daySumMap = useMemo(() => {
    // key = "YYYY/M/D" → {inc, exp}
    const map = new Map<string, { inc: number; exp: number }>();
    monthRecords.forEach((r) => {
      const d = recordDateObj(r);
      const key = ymd(d);
      const cur = map.get(key) || { inc: 0, exp: 0 };
      const a = Number(r.actualAmount) || 0;
      if (r.mode === "income") cur.inc += a;
      else cur.exp += a;
      map.set(key, cur);
    });
    return map;
  }, [monthRecords, recordDateObj]);

  // カレンダー用配列（42マス）
  const cells = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y, m, 1);
    const firstDay = first.getDay(); // 0:日
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const arr: Array<{ day: number | null; dateObj: Date | null }> = [];
    for (let i = 0; i < firstDay; i++) arr.push({ day: null, dateObj: null });
    for (let d = 1; d <= daysInMonth; d++) arr.push({ day: d, dateObj: new Date(y, m, d) });
    while (arr.length < 42) arr.push({ day: null, dateObj: null });
    return arr;
  }, [currentMonth]);

  // 削除
  const deleteItem = useCallback(
    async (id: string) => {
      const next = records.filter((r) => r.id !== id);
      setRecords(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    [records]
  );

  const confirmDelete = useCallback(
    (id: string) => {
      Alert.alert("削除", "この明細を削除する？", [
        { text: "キャンセル", style: "cancel" },
        { text: "削除", style: "destructive", onPress: () => deleteItem(id) },
      ]);
    },
    [deleteItem]
  );

  const renderRightActions = (id: string) => (
    <TouchableOpacity
      style={styles.deleteBtn}
      onPress={() => confirmDelete(id)}
      activeOpacity={0.85}
    >
      <Text style={styles.deleteTxt}>削除</Text>
    </TouchableOpacity>
  );

  const renderDetailItem = ({ item }: { item: RecordItem }) => {
    const isIncome = item.mode === "income";
    const amountText = `${isIncome ? "+" : "-"}${formatYen(item.actualAmount)}円`;

    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <View style={styles.detailRow}>
          <View style={{ flex: 1 }}>
            {/* 日付は出さない（上に書いてあるから） */}
            <Text style={styles.detailTitle}>{item.store || "未分類"}</Text>
          </View>
          <Text style={[styles.detailAmount, isIncome ? styles.green : styles.red]}>
            {amountText}
          </Text>
        </View>
      </Swipeable>
    );
  };

  const today = new Date();

  return (
    <View style={styles.container}>
      {/* 月ヘッダー */}
      <View style={styles.monthHeader}>
        <TouchableOpacity style={styles.navBtn} onPress={() => moveMonth(-1)}>
          <Text style={styles.navTxt}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
        </Text>

        <TouchableOpacity style={styles.navBtn} onPress={() => moveMonth(1)}>
          <Text style={styles.navTxt}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* 曜日 */}
      <View style={styles.weekRow}>
        {["日", "月", "火", "水", "木", "金", "土"].map((w, idx) => (
          <Text
            key={w}
            style={[
              styles.weekTxt,
              idx === 0 && { color: "#C23B3B" },
              idx === 6 && { color: "#2B66FF" },
            ]}
          >
            {w}
          </Text>
        ))}
      </View>

      {/* カレンダー */}
      <View style={styles.grid}>
        {cells.map((c, idx) => {
          if (!c.day || !c.dateObj) {
            return <View key={idx} style={[styles.cell, styles.cellBlank]} />;
          }

          const key = ymd(c.dateObj);
          const sums = daySumMap.get(key) || { inc: 0, exp: 0 };

          const isSelected = sameYMD(c.dateObj, selectedDate);
          const isToday = sameYMD(c.dateObj, today);

          const incText = sums.inc > 0 ? `+${formatYen(sums.inc)}` : "";
          const expText = sums.exp > 0 ? `-${formatYen(sums.exp)}` : "";

          const incFont = incText ? amountFontSizeByDigits(incText) : 9;
          const expFont = expText ? amountFontSizeByDigits(expText) : 9;

          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.85}
              onPress={() => setSelectedDate(c.dateObj!)}
              style={[
                styles.cell,
                isToday && styles.cellToday,
                isSelected && styles.cellSelected,
              ]}
            >
              <Text style={styles.dayNum}>{c.day}</Text>

              {/* 収入 */}
              {incText ? (
                <Text
                  style={[
                    styles.amountTiny,
                    styles.green,
                    { fontSize: incFont },
                  ]}
                  numberOfLines={1}
                >
                  {incText}
                </Text>
              ) : null}

              {/* 支出 */}
              {expText ? (
                <Text
                  style={[
                    styles.amountTiny,
                    styles.red,
                    { fontSize: expFont },
                  ]}
                  numberOfLines={1}
                >
                  {expText}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 今月まとめ */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>今月</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>収入</Text>
          <Text style={[styles.summaryValue, styles.green]}>
            +{formatYen(monthIncome)}円
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>支出</Text>
          <Text style={[styles.summaryValue, styles.red]}>
            -{formatYen(monthExpense)}円
          </Text>
        </View>

        <View style={styles.hr} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>残高</Text>
          <Text style={styles.summaryValue}>
            {monthBalance >= 0 ? "+" : ""}
            {formatYen(monthBalance)}円
          </Text>
        </View>

        {/* ✅ 累計残高（復活） */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>累計残高</Text>
          <Text style={styles.summaryValue}>
            {totalBalance >= 0 ? "+" : ""}
            {formatYen(totalBalance)}円
          </Text>
        </View>
      </View>

      {/* 詳細 */}
      <View style={styles.detailArea}>
        <Text style={styles.detailHeader}>{ymd(selectedDate)} の詳細</Text>

        {selectedRecords.length > 0 && (
          <FlatList
           data={selectedRecords}
           keyExtractor={(i) => i.id}
           renderItem={renderDetailItem}
           contentContainerStyle={{ paddingBottom: 6 }}
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
    paddingTop: 0,
  },

  /* =========================
     月ヘッダー（◀ 2025年12月 ▶）
  ========================= */
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingVertical: 2,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  navBtn: {
    width: 40,
    height: 26,
    borderRadius: 10,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E1CF",
  },
  navTxt: { fontSize: 14, fontWeight: "900" },

  /* =========================
     曜日行（日〜土）
  ========================= */
  weekRow: {
    flexDirection: "row",
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  weekTxt: {
    width: "14.285%",
    textAlign: "center",
    fontWeight: "900",
    color: "#222",
    fontSize: 10,
  },

  /* =========================
     カレンダーグリッド
  ========================= */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 6,
    marginBottom: 4,
  },

  /* =========================
     日付セル
  ========================= */
  cell: {
    width: "14.285%",
    height: 39, // ←「もう少しだけ縦長」ここ
    borderRadius: 3, // ← 角丸を四角寄りに
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E8E1CF",
    marginBottom: 4,
    paddingTop: 2,
    paddingHorizontal: 3,
  },
  cellBlank: { backgroundColor: "transparent", borderWidth: 0 },

  // 選択中の日
  cellSelected: { borderColor: "#2B66FF", borderWidth: 2 },

  // 今日（うっすら色）
  cellToday: { backgroundColor: "#EAF0FF" },

  /* =========================
     日付数字
  ========================= */
  dayNum: {
    fontSize: 10,
    fontWeight: "900",
    color: "#222",
    lineHeight: 12,
  },

  /* =========================
     金額（セル内）
  ========================= */
  amountTiny: {
    fontWeight: "900",
    lineHeight: 11,
    marginTop: 0,
  },

  /* =========================
     今月まとめカード
  ========================= */
  summaryCard: {
    marginTop: 0,
    marginHorizontal: 12,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8E1CF",
  },
  summaryTitle: { fontSize: 15, fontWeight: "900", marginBottom: 8 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryLabel: { fontSize: 13, fontWeight: "700", color: "#222" },
  summaryValue: { fontSize: 15, fontWeight: "900", color: "#222" },
  hr: { height: 1, backgroundColor: "#EFE7D7", marginVertical: 8 },

  /* =========================
     詳細エリア
  ========================= */
  detailArea: {
    flex: 1,
    marginTop: 8,
    marginHorizontal: 12,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8E1CF",
  },
  detailHeader: { fontSize: 15, fontWeight: "900", marginBottom: 10 },
  detailEmpty: { color: "#666", fontWeight: "700" },

  detailRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EFE7D7",
  },
  detailTitle: { fontSize: 15, fontWeight: "900", color: "#222" },
  detailAmount: { fontSize: 15, fontWeight: "900" },

  /* =========================
     スワイプ削除ボタン
  ========================= */
  deleteBtn: {
    width: 90,
    marginBottom: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF4D4D",
  },
  deleteTxt: { color: "white", fontWeight: "900" },

  /* =========================
     色
  ========================= */
  red: { color: "#C23B3B" },
  green: { color: "#1F7A43" },
});
