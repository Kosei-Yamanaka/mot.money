// app/(tabs)/history.tsx

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";

import { arc as d3arc, pie as d3pie } from "d3-shape";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";

// ✅ index.tsx と同じキーにする
const STORAGE_KEY = "records";

type Mode = "expense" | "income";

type RecordItem = {
  id: string;
  date: string; // "YYYY/M/D"
  mode: Mode;
  store: string; // カテゴリ名
  displayAmount: string;
  actualAmount: number;
  createdAt: string;
};

export default function History() {
  const [items, setItems] = useState<RecordItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<Mode>("expense");

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const arr: RecordItem[] = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(arr) ? arr : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    }
  }, []);

  // ✅ タブを開くたびに読み直す（これで即反映）
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const filtered = useMemo(
    () => items.filter((r) => r.mode === mode),
    [items, mode]
  );

  const total = useMemo(
    () => filtered.reduce((s, r) => s + (Number(r.actualAmount) || 0), 0),
    [filtered]
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const key = (r.store || "未分類").trim();
      map.set(key, (map.get(key) || 0) + (Number(r.actualAmount) || 0));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const top = useMemo(() => {
    const TOP_N = 6;
    const main = byCategory.slice(0, TOP_N);
    const rest = byCategory.slice(TOP_N);
    const restSum = rest.reduce((s, [, v]) => s + v, 0);
    if (restSum > 0) main.push(["その他", restSum]);
    return main;
  }, [byCategory]);

  const pieData = useMemo(() => {
    return top.map(([label, value], idx) => ({
      label,
      value,
      color: COLORS[idx % COLORS.length],
    }));
  }, [top]);

  const deleteItem = useCallback(
    async (id: string) => {
      const next = items.filter((x) => x.id !== id);
      setItems(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    [items]
  );

  const confirmDelete = useCallback(
    (id: string) => {
      Alert.alert("削除", "この履歴を削除する？", [
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

  const renderItem = ({ item }: { item: RecordItem }) => {
    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.store || "未分類"}</Text>
            <Text style={styles.rowSub}>{item.date || ""}</Text>
          </View>
          <Text style={styles.rowAmount}>{formatYen(item.actualAmount)}円</Text>
        </View>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* タブ切り替え */}
        <View style={styles.switchRow}>
          <TouchableOpacity
            style={[
              styles.switchBtn,
              mode === "expense" && styles.switchActive,
            ]}
            onPress={() => setMode("expense")}
          >
            <Text
              style={[
                styles.switchTxt,
                mode === "expense" && styles.switchTxtActive,
              ]}
            >
              支出
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switchBtn,
              mode === "income" && styles.switchActive,
            ]}
            onPress={() => setMode("income")}
          >
            <Text
              style={[
                styles.switchTxt,
                mode === "income" && styles.switchTxtActive,
              ]}
            >
              収入
            </Text>
          </TouchableOpacity>
        </View>

        {/* 円グラフ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {mode === "expense" ? "支出" : "収入"}（合計 {formatYen(total)}円）
          </Text>

          {total === 0 ? (
            <Text style={styles.empty}>まだデータがないよ</Text>
          ) : (
            <PieChart pieData={pieData} total={total} />
          )}

          {/* 凡例 */}
          {total > 0 &&
            pieData.map((p) => (
              <View key={p.label} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: p.color }]} />
                <Text style={styles.legendLabel}>{p.label}</Text>
                <Text style={styles.legendValue}>
                  {formatYen(p.value)}円（{Math.round((p.value / total) * 100)}%）
                </Text>
              </View>
            ))}
        </View>

        {/* リスト */}
        <Text style={styles.listTitle}>履歴</Text>
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </GestureHandlerRootView>
  );
}

function PieChart({
  pieData,
  total,
}: {
  pieData: { label: string; value: number; color: string }[];
  total: number;
}) {
  const size = 220;
  const radius = size / 2;

  const arcs = useMemo(() => {
    const p = d3pie<{ label: string; value: number; color: string }>()
      .value((d) => d.value)
      .sort(null);

    const a = d3arc<any>().innerRadius(radius * 0.55).outerRadius(radius * 0.95);

    return p(pieData).map((d: any) => ({
      path: a(d),
      color: d.data.color,
    }));
  }, [pieData, radius]);

  return (
    <View style={{ alignItems: "center", marginTop: 12 }}>
      <Svg width={size} height={size}>
        <G x={radius} y={radius}>
          {arcs.map((s, idx) => (
            <Path key={idx} d={s.path} fill={s.color} />
          ))}

          <SvgText
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize="16"
            fontWeight="700"
          >
            合計
          </SvgText>
          <SvgText
            y={18}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize="16"
            fontWeight="700"
          >
            {formatYen(total)}円
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

function formatYen(n: number) {
  const v = Number(n) || 0;
  return v.toLocaleString("ja-JP");
}

const COLORS = [
  "#4F7CFF",
  "#FF6B6B",
  "#4DCCBD",
  "#FFD166",
  "#A78BFA",
  "#22C55E",
  "#FB7185",
];

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F6F1E3" },

  switchRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  switchBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#D8DFFB",
    alignItems: "center",
  },
  switchActive: { backgroundColor: "#4F7CFF" },
  switchTxt: { fontWeight: "700", color: "#2B2B2B" },
  switchTxtActive: { color: "white" },

  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E9E3D3",
  },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  empty: { marginTop: 12, color: "#666" },

  legendRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 999, marginRight: 8 },
  legendLabel: { flex: 1, fontWeight: "700" },
  legendValue: { fontWeight: "700" },

  listTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },

  row: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EFE7D7",
  },
  rowTitle: { fontSize: 15, fontWeight: "800" },
  rowSub: { marginTop: 4, color: "#666" },
  rowAmount: { fontSize: 16, fontWeight: "900" },

  deleteBtn: {
    width: 90,
    marginBottom: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF4D4D",
  },
  deleteTxt: { color: "white", fontWeight: "900" },
});
