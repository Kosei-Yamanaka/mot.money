import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../src/hooks/useAppTheme";

const STORAGE_KEY = "records";

type Mode = "expense" | "income";
type RecordItem = {
  id: string;
  date: string;
  mode: Mode;
  store: string;
  displayAmount: string;
  actualAmount: number;
  createdAt: string;
};

function formatYen(n: number) {
  return (Number(n) || 0).toLocaleString("ja-JP");
}

export default function History() {
  const { theme } = useAppTheme();
  const [records, setRecords] = useState<RecordItem[]>([]);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr: RecordItem[] = raw ? JSON.parse(raw) : [];
    setRecords(Array.isArray(arr) ? arr : []);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const grouped = useMemo(() => {
    // date(YYYY/M/D) でまとめる
    const map = new Map<string, RecordItem[]>();
    records.forEach((r) => {
      const key = r.date || "不明";
      map.set(key, [...(map.get(key) || []), r]);
    });
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [records]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>履歴</Text>

      <FlatList
        data={grouped}
        keyExtractor={(item) => item[0]}
        renderItem={({ item }) => {
          const [date, list] = item;
          return (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ fontWeight: "900", color: theme.text, marginBottom: 8 }}>{date}</Text>
              {list.slice(0, 8).map((r) => {
                const isInc = r.mode === "income";
                return (
                  <View key={r.id} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontWeight: "800", color: theme.text }}>{r.store}</Text>
                    <Text style={{ fontWeight: "900", color: isInc ? theme.success : theme.danger }}>
                      {isInc ? "+" : "-"}{formatYen(r.actualAmount)}円
                    </Text>
                  </View>
                );
              })}
              {list.length > 8 && (
                <Text style={{ color: theme.subText, fontWeight: "800", marginTop: 6 }}>
                  ほか {list.length - 8} 件
                </Text>
              )}
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, paddingTop: 10 },
  title: { fontSize: 18, fontWeight: "900", textAlign: "center", marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 10 },
});
