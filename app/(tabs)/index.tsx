// app/(tabs)/index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useAppTheme } from "../../src/hooks/useAppTheme";

const STORAGE_KEY = "records";

type Mode = "expense" | "income";

type RecordItem = {
  id: string;
  date: string; // YYYY/M/D
  mode: Mode;
  store: string; // ここはカテゴリ名として使う（history側も合わせやすい）
  displayAmount: string;
  actualAmount: number;
  createdAt: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toKeyDate(d: Date) {
  // 例: 2025/12/28
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function toISODate(d: Date) {
  // 例: 2025-12-28（Calendar用）
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isToday(d: Date) {
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

function formatYen(n: number) {
  return (Number(n) || 0).toLocaleString("ja-JP");
}

function addDays(date: Date, diff: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + diff);
  return d;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Index() {
  const { theme } = useAppTheme();

  const categories = useMemo(
    () => ["コンビニ", "スーパー", "勉強", "カフェ", "交通", "その他"],
    []
  );

  const [mode, setMode] = useState<Mode>("expense");
  const [date, setDate] = useState<Date>(new Date());
  const [openCal, setOpenCal] = useState(false);
  const [category, setCategory] = useState(categories[0]);

  // 百円単位の入力： "23" -> 2300円
  const [hundredsStr, setHundredsStr] = useState<string>("0");

  const amount = useMemo(() => {
    const n = parseInt(hundredsStr || "0", 10);
    return (Number.isFinite(n) ? n : 0) * 100;
  }, [hundredsStr]);

  const amountLabel = useMemo(() => {
    if (!amount) return "00";
    // 100円単位なので 0円が出ないように、普通にフォーマット
    return formatYen(amount);
  }, [amount]);

  const pressDigit = useCallback((d: string) => {
    setHundredsStr((prev) => {
      // 先頭0のときは置き換え
      const base = prev === "0" ? "" : prev;
      const next = (base + d).slice(0, 8); // 最大8桁（= 999,999,900円）
      return next.length ? next : "0";
    });
  }, []);

  const backspace = useCallback(() => {
    setHundredsStr((prev) => {
      if (!prev || prev === "0") return "0";
      const next = prev.slice(0, -1);
      return next.length ? next : "0";
    });
  }, []);

  const clearAmount = useCallback(() => {
    setHundredsStr("0");
  }, []);

  const save = useCallback(async () => {
    if (!amount) return; // 0円は保存しない

    const item: RecordItem = {
      id: uid(),
      date: toKeyDate(date),
      mode,
      store: category,
      displayAmount: `${mode === "income" ? "+" : "-"}${formatYen(amount)}円`,
      actualAmount: amount,
      createdAt: new Date().toISOString(),
    };

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr: RecordItem[] = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(arr) ? [item, ...arr] : [item];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    // 保存したら金額だけクリア（連続入力しやすい）
    clearAmount();
  }, [amount, category, clearAmount, date, mode]);

  const dateStr = useMemo(() => toKeyDate(date), [date]);

  const markedDates = useMemo(() => {
    const sel = toISODate(date);
    const today = toISODate(new Date());
    return {
      [today]: {
        marked: true,
        dotColor: theme.primary,
      },
      [sel]: {
        selected: true,
        selectedColor: theme.primary,
      },
    } as any;
  }, [date, theme.primary]);

  return (
    <View style={[styles.body, { backgroundColor: theme.bg }]}>
      {/* 支出/収入 */}
      <View style={[styles.segmentWrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <TouchableOpacity
          onPress={() => setMode("expense")}
          activeOpacity={0.9}
          style={[
            styles.segment,
            {
              backgroundColor: mode === "expense" ? theme.text : theme.card2,
              borderColor: mode === "expense" ? theme.text : theme.border,
            },
          ]}
        >
          <Text style={{ fontWeight: "900", color: mode === "expense" ? "#fff" : theme.text }}>
            支出
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode("income")}
          activeOpacity={0.9}
          style={[
            styles.segment,
            {
              backgroundColor: mode === "income" ? theme.text : theme.card2,
              borderColor: mode === "income" ? theme.text : theme.border,
            },
          ]}
        >
          <Text style={{ fontWeight: "900", color: mode === "income" ? "#fff" : theme.text }}>
            収入
          </Text>
        </TouchableOpacity>
      </View>

      {/* 日付 */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardLabel, { color: theme.text }]}>日付</Text>

          {/* 🗓 ボタン（説明文は無し） */}
          <TouchableOpacity onPress={() => setOpenCal(true)} activeOpacity={0.85}>
            <Text style={{ fontSize: 18 }}>🗓</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateRow}>
          <TouchableOpacity
            onPress={() => setDate((d) => addDays(d, -1))}
            activeOpacity={0.85}
            style={[styles.iconBtn, { backgroundColor: theme.card2, borderColor: theme.border }]}
          >
            <Text style={{ fontWeight: "900", color: theme.text }}>◀</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setOpenCal(true)}
            activeOpacity={0.85}
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Text style={[styles.dateText, { color: theme.text }]}>{dateStr}</Text>

            {isToday(date) && (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: theme.primary,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "900", color: "#fff" }}>TODAY</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDate((d) => addDays(d, 1))}
            activeOpacity={0.85}
            style={[styles.iconBtn, { backgroundColor: theme.card2, borderColor: theme.border }]}
          >
            <Text style={{ fontWeight: "900", color: theme.text }}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* カテゴリ */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardLabel, { color: theme.text }]}>カテゴリ</Text>
          {/* 文字は出さない（ダサいので） */}
          <View />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
          contentContainerStyle={{ paddingRight: 6 }}
        >
          {categories.map((c) => {
            const active = c === category;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setCategory(c)}
                activeOpacity={0.85}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? theme.text : theme.card2,
                    borderColor: active ? theme.text : theme.border,
                  },
                ]}
              >
                <Text style={{ fontWeight: "900", color: active ? "#fff" : theme.text }}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 金額 */}
      <Pressable
        onLongPress={clearAmount}
        style={[styles.amountBox, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <Text style={[styles.amountText, { color: theme.text }]}>
          {amountLabel}円
        </Text>
      </Pressable>

      {/* テンキー */}
      <View style={{ marginTop: 2 }}>
        <View style={styles.keyRow}>
          {["1", "2", "3"].map((k) => (
            <TouchableOpacity
              key={k}
              onPress={() => pressDigit(k)}
              activeOpacity={0.9}
              style={[styles.keyBase, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={[styles.keyText, { color: theme.text }]}>{k}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keyRow}>
          {["4", "5", "6"].map((k) => (
            <TouchableOpacity
              key={k}
              onPress={() => pressDigit(k)}
              activeOpacity={0.9}
              style={[styles.keyBase, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={[styles.keyText, { color: theme.text }]}>{k}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keyRow}>
          {["7", "8", "9"].map((k) => (
            <TouchableOpacity
              key={k}
              onPress={() => pressDigit(k)}
              activeOpacity={0.9}
              style={[styles.keyBase, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={[styles.keyText, { color: theme.text }]}>{k}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keyRow}>
          {/* 保存 */}
          <TouchableOpacity
            onPress={save}
            activeOpacity={0.9}
            style={[
              styles.keyBase,
              {
                width: "31.5%",
                backgroundColor: theme.text,
                borderColor: theme.text,
              },
            ]}
          >
            <Text style={[styles.keyText, { color: "#fff" }]}>保存</Text>
          </TouchableOpacity>

          {/* 0 */}
          <TouchableOpacity
            onPress={() => pressDigit("0")}
            activeOpacity={0.9}
            style={[styles.keyBase, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.keyText, { color: theme.text }]}>0</Text>
          </TouchableOpacity>

          {/* ← */}
          <TouchableOpacity
            onPress={backspace}
            activeOpacity={0.9}
            style={[styles.keyBase, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.keyText, { color: theme.text }]}>←</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* カレンダーモーダル */}
      <Modal visible={openCal} transparent animationType="fade" onRequestClose={() => setOpenCal(false)}>
        <Pressable style={styles.modalBg} onPress={() => setOpenCal(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {}}
          >
            <Calendar
              current={toISODate(date)}
              markedDates={markedDates}
              onDayPress={(day) => {
                // day.dateString: YYYY-MM-DD
                const [y, m, dd] = day.dateString.split("-").map((v) => parseInt(v, 10));
                const next = new Date(y, m - 1, dd);
                setDate(next);
                setOpenCal(false);
              }}
              theme={{
                backgroundColor: theme.card,
                calendarBackground: theme.card,
                textSectionTitleColor: theme.subText,
                selectedDayBackgroundColor: theme.primary,
                selectedDayTextColor: "#fff",
                todayTextColor: theme.primary,
                dayTextColor: theme.text,
                textDisabledColor: theme.border,
                monthTextColor: theme.text,
                arrowColor: theme.text,
              }}
            />

            <TouchableOpacity
              onPress={() => setOpenCal(false)}
              activeOpacity={0.9}
              style={{
                marginTop: 10,
                height: 44,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontWeight: "900", color: theme.text }}>閉じる</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 60,
    paddingBottom: 6,
  },

  segmentWrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 999,
    padding: 5,
    marginBottom: 10,
  },
  segment: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  card: { borderWidth: 1, borderRadius: 16, padding: 9, marginBottom: 8 },
  cardLabel: { fontSize: 13, fontWeight: "900" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  iconBtn: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dateText: { fontSize: 30, fontWeight: "900" },

  pill: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  amountBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 65,
    justifyContent: "center",
    marginBottom: 8,
  },
  amountText: {
    fontSize: 30,
    fontWeight: "900",
    textAlign: "right",
  },

  keyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  keyBase: {
    width: "31.5%",
    height: 67,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: { fontSize: 22, fontWeight: "900" },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 18,
    justifyContent: "center",
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
});
