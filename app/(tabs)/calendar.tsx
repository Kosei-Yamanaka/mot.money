import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useAppTheme } from "../../src/hooks/useAppTheme";

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

function ymd(d: Date) {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
function sameYMD(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatYen(n: number) {
  const v = Number(n) || 0;
  return v.toLocaleString("ja-JP");
}

export default function CalendarScreen() {
  const { theme } = useAppTheme();

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const moveMonth = (delta: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const recordDateObj = useCallback((r: RecordItem) => {
    const d = new Date(r.createdAt);
    if (!Number.isNaN(d.getTime())) return d;
    const [Y, M, D] = (r.date || "").split("/").map((x) => parseInt(x, 10));
    return new Date(Y, (M || 1) - 1, D || 1);
  }, []);

  const monthRecords = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    return records.filter((r) => {
      const d = recordDateObj(r);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [records, currentMonth, recordDateObj]);

  const daySumMap = useMemo(() => {
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

  const selectedRecords = useMemo(() => {
    return records
      .filter((r) => sameYMD(recordDateObj(r), selectedDate))
      .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  }, [records, selectedDate, recordDateObj]);

  const monthIncome = useMemo(() => monthRecords.filter(r => r.mode === "income").reduce((s,r)=>s+(Number(r.actualAmount)||0),0), [monthRecords]);
  const monthExpense = useMemo(() => monthRecords.filter(r => r.mode === "expense").reduce((s,r)=>s+(Number(r.actualAmount)||0),0), [monthRecords]);
  const monthBalance = monthIncome - monthExpense;

  const totalBalance = useMemo(() => {
    let inc = 0, exp = 0;
    records.forEach((r) => {
      const a = Number(r.actualAmount) || 0;
      if (r.mode === "income") inc += a;
      else exp += a;
    });
    return inc - exp;
  }, [records]);

  const cells = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y, m, 1);
    const firstDay = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const arr: Array<{ day: number | null; dateObj: Date | null }> = [];
    for (let i = 0; i < firstDay; i++) arr.push({ day: null, dateObj: null });
    for (let d = 1; d <= daysInMonth; d++) arr.push({ day: d, dateObj: new Date(y, m, d) });
    while (arr.length < 42) arr.push({ day: null, dateObj: null });
    return arr;
  }, [currentMonth]);

  const deleteItem = useCallback(async (id: string) => {
    const next = records.filter((r) => r.id !== id);
    setRecords(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [records]);

  const confirmDelete = useCallback((id: string) => {
    Alert.alert("削除", "この明細を削除する？", [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: () => deleteItem(id) },
    ]);
  }, [deleteItem]);

  const renderRightActions = (id: string) => (
    <TouchableOpacity
      style={[styles.deleteBtn, { backgroundColor: theme.danger }]}
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
        <View style={[styles.detailRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.detailTitle, { color: theme.text }]}>{item.store || "未分類"}</Text>
          <Text style={[styles.detailAmount, { color: isIncome ? theme.success : theme.danger }]}>{amountText}</Text>
        </View>
      </Swipeable>
    );
  };

  const today = new Date();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.monthHeader}>
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => moveMonth(-1)}>
          <Text style={[styles.navTxt, { color: theme.text }]}>◀</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: theme.text }]}>
          {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
        </Text>
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => moveMonth(1)}>
          <Text style={[styles.navTxt, { color: theme.text }]}>▶</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {["日","月","火","水","木","金","土"].map((w, idx) => (
          <Text key={w} style={[styles.weekTxt, { color: theme.subText }, idx===0 && { color: theme.danger }, idx===6 && { color: theme.primary }]}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((c, idx) => {
          if (!c.day || !c.dateObj) return <View key={idx} style={[styles.cell, styles.cellBlank]} />;
          const key = ymd(c.dateObj);
          const sums = daySumMap.get(key) || { inc: 0, exp: 0 };
          const isSelected = sameYMD(c.dateObj, selectedDate);
          const isToday = sameYMD(c.dateObj, today);

          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.85}
              onPress={() => setSelectedDate(c.dateObj!)}
              style={[
                styles.cell,
                { backgroundColor: theme.card, borderColor: theme.border },
                isToday && { backgroundColor: theme.primarySoft },
                isSelected && { borderColor: theme.primary, borderWidth: 2 },
              ]}
            >
              <Text style={[styles.dayNum, { color: theme.text }]}>{c.day}</Text>
              {sums.inc > 0 && <Text style={{ fontSize: 10, fontWeight: "900", color: theme.success }} numberOfLines={1}>+{formatYen(sums.inc)}</Text>}
              {sums.exp > 0 && <Text style={{ fontSize: 10, fontWeight: "900", color: theme.danger }} numberOfLines={1}>-{formatYen(sums.exp)}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.summaryTitle, { color: theme.text }]}>今月</Text>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.text }]}>収入</Text>
          <Text style={[styles.summaryValue, { color: theme.success }]}>+{formatYen(monthIncome)}円</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.text }]}>支出</Text>
          <Text style={[styles.summaryValue, { color: theme.danger }]}>-{formatYen(monthExpense)}円</Text>
        </View>

        <View style={[styles.hr, { backgroundColor: theme.border }]} />

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.text }]}>残高</Text>
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {monthBalance >= 0 ? "+" : ""}{formatYen(monthBalance)}円
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.text }]}>累計残高</Text>
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {totalBalance >= 0 ? "+" : ""}{formatYen(totalBalance)}円
          </Text>
        </View>
      </View>

      <View style={[styles.detailArea, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.detailHeader, { color: theme.text }]}>{ymd(selectedDate)} の詳細</Text>
        <FlatList
          data={selectedRecords}
          keyExtractor={(i) => i.id}
          renderItem={renderDetailItem}
          contentContainerStyle={{ paddingBottom: 6 }}
          ListEmptyComponent={<Text style={{ color: theme.subText, fontWeight: "800" }}>この日は記録なし</Text>}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 6 },

  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 6 },
  monthTitle: { fontSize: 18, fontWeight: "900" },
  navBtn: { width: 44, height: 32, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  navTxt: { fontSize: 14, fontWeight: "900" },

  weekRow: { flexDirection: "row", paddingHorizontal: 10, marginBottom: 4 },
  weekTxt: { width: "14.285%", textAlign: "center", fontWeight: "900", fontSize: 11 },

  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, marginBottom: 6 },
  cell: { width: "14.285%", height: 44, borderRadius: 6, borderWidth: 1, marginBottom: 6, paddingTop: 3, paddingHorizontal: 4 },
  cellBlank: { backgroundColor: "transparent", borderWidth: 0 },

  dayNum: { fontSize: 11, fontWeight: "900", lineHeight: 13 },

  summaryCard: { marginHorizontal: 12, borderRadius: 16, padding: 12, borderWidth: 1 },
  summaryTitle: { fontSize: 15, fontWeight: "900", marginBottom: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  summaryLabel: { fontSize: 13, fontWeight: "800" },
  summaryValue: { fontSize: 15, fontWeight: "900" },
  hr: { height: 1, marginVertical: 8 },

  detailArea: { flex: 1, marginTop: 10, marginHorizontal: 12, borderRadius: 16, padding: 12, borderWidth: 1 },
  detailHeader: { fontSize: 15, fontWeight: "900", marginBottom: 10 },

  detailRow: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1 },
  detailTitle: { fontSize: 15, fontWeight: "900" },
  detailAmount: { fontSize: 15, fontWeight: "900" },

  deleteBtn: { width: 90, marginBottom: 10, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  deleteTxt: { color: "white", fontWeight: "900" },
});
