// app/(tabs)/history.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { arc as d3arc, pie as d3pie } from "d3-shape";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";

import { CHART_THEMES, ChartThemeId, THEME_LABEL } from "../constants/chartColors";

/* =========================
   保存してるデータの型（Inputと同じ想定）
========================= */
type Mode = "expense" | "income";

type RecordItem = {
  id: string;
  date: string; // "YYYY/MM/DD" or "YYYY-MM-DD"
  mode: Mode;
  store: string; // カテゴリ名（storeに入ってる前提）
  displayAmount: string;
  actualAmount: number;
  createdAt: string;
};

const STORAGE_KEY = "records";
const THEME_KEY = "chart_theme";

/* =========================
   便利関数
========================= */
const ymTitle = (d: Date) => `${d.getFullYear()}年${d.getMonth() + 1}月`;
const formatYen = (n: number) => (Number(n) || 0).toLocaleString("ja-JP");

const parseYMD = (s: string) => {
  const norm = (s || "").trim().replace(/\//g, "-");
  const [y, m, d] = norm.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, delta: number) => new Date(d.getFullYear(), d.getMonth() + delta, 1);

/* =========================
   History（グラフだけ）
========================= */
export default function History() {
  const [mode, setMode] = useState<Mode>("expense");                 // 支出/収入
  const [cursorMonth, setCursorMonth] = useState<Date>(() => startOfMonth(new Date())); // 表示月
  const [records, setRecords] = useState<RecordItem[]>([]);          // 全レコード
  const [refreshing, setRefreshing] = useState(false);               // pull to refresh
  const [themeId, setThemeId] = useState<ChartThemeId>("pastel_blue");// ✅ 設定で選んだ色

  /* =========================
     データ読み込み
  ========================= */
  const loadRecords = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const arr: RecordItem[] = raw ? JSON.parse(raw) : [];
      setRecords(Array.isArray(arr) ? arr : []);
    } catch (e) {
      console.error(e);
      setRecords([]);
    }
  }, []);

  const loadTheme = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved && saved in CHART_THEMES) setThemeId(saved as ChartThemeId);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // ✅ タブを開くたびに「レコード」と「テーマ」両方読み直す（反映されない対策）
  useFocusEffect(
    useCallback(() => {
      loadRecords();
      loadTheme();
    }, [loadRecords, loadTheme])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadRecords(), loadTheme()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadRecords, loadTheme]);

  /* =========================
     月 & mode で抽出
  ========================= */
  const filtered = useMemo(() => {
    const cm = cursorMonth;
    return records
      .filter((r) => r.mode === mode)
      .filter((r) => {
        const d = parseYMD(r.date) ?? (r.createdAt ? new Date(r.createdAt) : null);
        if (!d) return false;
        return isSameMonth(d, cm);
      });
  }, [records, mode, cursorMonth]);

  const total = useMemo(
    () => filtered.reduce((s, r) => s + (Number(r.actualAmount) || 0), 0),
    [filtered]
  );

  /* =========================
     カテゴリ別集計（storeをカテゴリとして扱う）
  ========================= */
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const key = (r.store || "未分類").trim();
      map.set(key, (map.get(key) || 0) + (Number(r.actualAmount) || 0));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // 上位だけ + その他
  const top = useMemo(() => {
    const TOP_N = 7;
    const main = byCategory.slice(0, TOP_N);
    const rest = byCategory.slice(TOP_N);
    const restSum = rest.reduce((s, [, v]) => s + v, 0);
    if (restSum > 0) main.push(["その他", restSum]);
    return main;
  }, [byCategory]);

  // ✅ テーマの色をここで適用
  const pieData = useMemo(() => {
    const colors = CHART_THEMES[themeId];
    return top.map(([label, value], idx) => ({
      label,
      value,
      color: colors[idx % colors.length],
    }));
  }, [top, themeId]);

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* 支出/収入 */}
        <View style={styles.switchRow}>
          <TouchableOpacity
            style={[styles.switchBtn, mode === "expense" && styles.switchActive]}
            onPress={() => setMode("expense")}
            activeOpacity={0.85}
          >
            <Text style={[styles.switchTxt, mode === "expense" && styles.switchTxtActive]}>
              支出
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switchBtn, mode === "income" && styles.switchActive]}
            onPress={() => setMode("income")}
            activeOpacity={0.85}
          >
            <Text style={[styles.switchTxt, mode === "income" && styles.switchTxtActive]}>
              収入
            </Text>
          </TouchableOpacity>
        </View>

        {/* 月ナビ */}
        <View style={styles.monthRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setCursorMonth((p) => addMonths(p, -1))}>
            <Text style={styles.navTxt}>◀</Text>
          </TouchableOpacity>

          <View style={{ alignItems: "center" }}>
            <Text style={styles.monthTitle}>{ymTitle(cursorMonth)}</Text>
            <Text style={styles.subTitle}>配色：{THEME_LABEL[themeId]}</Text>
          </View>

          <TouchableOpacity style={styles.navBtn} onPress={() => setCursorMonth((p) => addMonths(p, 1))}>
            <Text style={styles.navTxt}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* グラフカード（履歴リストは出さない） */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{mode === "expense" ? "支出" : "収入"} 合計</Text>
            <Text style={styles.cardTotal}>{formatYen(total)}円</Text>
          </View>

          {total === 0 ? (
            <Text style={styles.empty}>（データなし）</Text>
          ) : (
            <PieChart pieData={pieData} total={total} />
          )}

          {/* 3列：カテゴリ / 金額 / % */}
          {total > 0 && (
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={[styles.th, { flex: 1 }]}>カテゴリ</Text>
                <Text style={[styles.th, { width: 110, textAlign: "right" }]}>金額</Text>
                <Text style={[styles.th, { width: 48, textAlign: "right" }]}>%</Text>
              </View>

              {pieData.map((p) => {
                const pct = Math.round((p.value / total) * 100);
                return (
                  <View key={p.label} style={styles.tr}>
                    <View style={[styles.dot, { backgroundColor: p.color }]} />
                    <Text style={styles.tdLabel} numberOfLines={1}>
                      {p.label}
                    </Text>
                    <Text style={styles.tdValue}>{formatYen(p.value)}円</Text>
                    <Text style={styles.tdPct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* =========================
   円グラフ（はみ出ない / ラベルは扇形内）
   - 小さい扇形はラベル非表示（ごちゃつき防止）
========================= */
function PieChart({
  pieData,
  total,
}: {
  pieData: { label: string; value: number; color: string }[];
  total: number;
}) {
  const size = 200;
  const radius = size / 2;

  const arcs = useMemo(() => {
    const p = d3pie<{ label: string; value: number; color: string }>()
      .value((d) => d.value)
      .sort(null);

    const a = d3arc<any>()
      .innerRadius(radius * 0.60)
      .outerRadius(radius * 0.96);

    const labelArc = d3arc<any>()
      .innerRadius(radius * 0.78)
      .outerRadius(radius * 0.78);

    return p(pieData).map((d: any) => {
      const [lx, ly] = labelArc.centroid(d);
      const percent = Math.round((d.data.value / total) * 100);

      // ✅ 桁が増えたら小さく：カテゴリ名が長い場合も縮める
      const labelLen = String(d.data.label || "").length;
      const fontSize = percent >= 16 ? 10 : percent >= 10 ? 9 : 0; // 小さい扇形は0（表示しない）
      const shrink = labelLen >= 6 ? 1 : 0;
      const finalSize = Math.max(8, fontSize - shrink);

      return {
        path: a(d),
        color: d.data.color,
        label: d.data.label,
        percent,
        labelPos: { x: lx, y: ly },
        labelSize: finalSize,
      };
    });
  }, [pieData, total]);

  return (
    <View style={{ alignItems: "center", marginTop: 10 }}>
      <Svg width={size} height={size}>
        <G x={radius} y={radius}>
          {arcs.map((s, idx) => (
            <Path key={idx} d={s.path} fill={s.color} />
          ))}

          {/* 扇形の中にカテゴリ（小さい扇形は表示しない） */}
          {arcs.map((s, idx) => {
            if (s.percent < 10) return null;
            return (
              <SvgText
                key={`t-${idx}`}
                x={s.labelPos.x}
                y={s.labelPos.y}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize={String(s.labelSize)}
                fontWeight="900"
                fill="#111"
              >
                {s.label}
              </SvgText>
            );
          })}

          {/* 中央：合計 */}
          <SvgText
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize="12"
            fontWeight="900"
            fill="#222"
          >
            合計
          </SvgText>
          <SvgText
            y={16}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize="14"
            fontWeight="900"
            fill="#222"
          >
            {formatYen(total)}円
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

/* =========================
   Styles
========================= */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, backgroundColor: "#F6F1E3" },

  // 支出/収入トグル
  switchRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  switchBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#D8DFFB",
    alignItems: "center",
  },
  switchActive: { backgroundColor: "#4F7CFF" },
  switchTxt: { fontWeight: "900", color: "#2B2B2B" },
  switchTxtActive: { color: "white" },

  // 月ナビ
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  monthTitle: { fontSize: 17, fontWeight: "900" },
  subTitle: { marginTop: 2, fontSize: 11, color: "#666", fontWeight: "700" },
  navBtn: {
    width: 44,
    height: 30,
    borderRadius: 10,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E1CF",
  },
  navTxt: { fontSize: 15, fontWeight: "900" },

  // カード
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9E3D3",
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  cardTitle: { fontSize: 15, fontWeight: "900" },
  cardTotal: { fontSize: 16, fontWeight: "900" },
  empty: { marginTop: 10, color: "#666", fontWeight: "700" },

  // 表
  table: { marginTop: 10 },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: "#EFE7D7",
  },
  th: { fontSize: 12, fontWeight: "900", color: "#555" },

  tr: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 4, marginRight: 8, borderWidth: 1, borderColor: "#E8E1CF" },
  tdLabel: { flex: 1, fontWeight: "900", fontSize: 12, color: "#222" },
  tdValue: { width: 110, textAlign: "right", fontWeight: "900", fontSize: 12, color: "#222" },
  tdPct: { width: 48, textAlign: "right", fontWeight: "900", fontSize: 12, color: "#222" },
});
