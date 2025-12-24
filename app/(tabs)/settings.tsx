// app/(tabs)/settings.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { CHART_THEMES, ChartThemeId, THEME_LABEL } from "../constants/chartColors";

/* =========================
   Keys
========================= */
const CATEGORY_KEY = "categories";
const THEME_KEY = "chart_theme";

/* =========================
   Types
========================= */
type Mode = "expense" | "income";

type Category = {
  id: string;
  name: string;
  type: Mode;
};

/* =========================
   Default categories
========================= */
const DEFAULT_CATEGORIES: Category[] = [
  { id: "exp_conv", name: "コンビニ", type: "expense" },
  { id: "exp_super", name: "スーパー", type: "expense" },
  { id: "exp_cafe", name: "カフェ", type: "expense" },
  { id: "inc_salary", name: "給料", type: "income" },
  { id: "inc_parttime", name: "バイト", type: "income" },
  { id: "inc_other", name: "その他収入", type: "income" },
];

export default function Settings() {
  /* =========================
     Category state
  ========================= */
  const [categories, setCategories] = useState<Category[]>([]);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newIncomeName, setNewIncomeName] = useState("");

  /* =========================
     Theme state（グラフ色）
  ========================= */
  const [themeId, setThemeId] = useState<ChartThemeId>("pastel_blue");

  /* =========================
     Load categories
  ========================= */
  useEffect(() => {
    (async () => {
      const json = await AsyncStorage.getItem(CATEGORY_KEY);
      if (!json) {
        setCategories(DEFAULT_CATEGORIES);
        await AsyncStorage.setItem(CATEGORY_KEY, JSON.stringify(DEFAULT_CATEGORIES));
        return;
      }
      try {
        const arr: Category[] = JSON.parse(json);
        if (!Array.isArray(arr) || arr.length === 0) {
          setCategories(DEFAULT_CATEGORIES);
          await AsyncStorage.setItem(CATEGORY_KEY, JSON.stringify(DEFAULT_CATEGORIES));
        } else {
          setCategories(arr);
        }
      } catch {
        setCategories(DEFAULT_CATEGORIES);
        await AsyncStorage.setItem(CATEGORY_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      }
    })();
  }, []);

  /* =========================
     Load theme
  ========================= */
  const loadTheme = useCallback(async () => {
    const saved = await AsyncStorage.getItem(THEME_KEY);
    if (saved && saved in CHART_THEMES) setThemeId(saved as ChartThemeId);
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  /* =========================
     Save theme
  ========================= */
  const saveTheme = useCallback(async (id: ChartThemeId) => {
    try {
      await AsyncStorage.setItem(THEME_KEY, id);
      setThemeId(id);
      Alert.alert("保存しました", `グラフの色：${THEME_LABEL[id]}`);
    } catch (e) {
      console.error(e);
      Alert.alert("エラー", "保存に失敗しました");
    }
  }, []);

  /* =========================
     Category helpers
  ========================= */
  const saveCategories = async (list: Category[]) => {
    setCategories(list);
    await AsyncStorage.setItem(CATEGORY_KEY, JSON.stringify(list));
  };

  const addCategory = async (type: Mode) => {
    const name = type === "expense" ? newExpenseName.trim() : newIncomeName.trim();
    if (!name) {
      Alert.alert("カテゴリ名を入力してください");
      return;
    }

    const id = `${type}_${Date.now()}`;
    const updated = [...categories, { id, name, type }];
    await saveCategories(updated);

    if (type === "expense") setNewExpenseName("");
    else setNewIncomeName("");
  };

  const deleteCategory = async (id: string, type: Mode) => {
    const listOfType = categories.filter((c) => c.type === type);
    if (listOfType.length <= 1) {
      Alert.alert("最後のカテゴリは削除できません");
      return;
    }
    const updated = categories.filter((c) => c.id !== id);
    await saveCategories(updated);
  };

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={styles.title}>設定</Text>

      {/* =========================
         グラフの色
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>グラフの色</Text>

        {(Object.keys(CHART_THEMES) as ChartThemeId[]).map((id) => {
          const colors = CHART_THEMES[id];
          const selected = themeId === id;

          return (
            <TouchableOpacity
              key={id}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => saveTheme(id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {THEME_LABEL[id]}
              </Text>

              <View style={styles.swatches}>
                {colors.slice(0, 6).map((c, i) => (
                  <View key={i} style={[styles.swatch, { backgroundColor: c }]} />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* =========================
         カテゴリ設定
      ========================= */}
      <Text style={styles.bigSectionTitle}>カテゴリ設定</Text>

      {/* 支出カテゴリ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>支出カテゴリ</Text>
        {expenseCategories.map((cat) => (
          <View key={cat.id} style={styles.categoryRow}>
            <Text style={styles.categoryName}>{cat.name}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteCategory(cat.id, "expense")}
            >
              <Text style={styles.deleteButtonText}>削除</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="新しい支出カテゴリ"
            value={newExpenseName}
            onChangeText={setNewExpenseName}
          />
          <TouchableOpacity style={styles.addButton} onPress={() => addCategory("expense")}>
            <Text style={styles.addButtonText}>追加</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 収入カテゴリ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>収入カテゴリ</Text>
        {incomeCategories.map((cat) => (
          <View key={cat.id} style={styles.categoryRow}>
            <Text style={styles.categoryName}>{cat.name}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteCategory(cat.id, "income")}
            >
              <Text style={styles.deleteButtonText}>削除</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="新しい収入カテゴリ"
            value={newIncomeName}
            onChangeText={setNewIncomeName}
          />
          <TouchableOpacity style={styles.addButton} onPress={() => addCategory("income")}>
            <Text style={styles.addButtonText}>追加</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.note}>
        ※ 入力画面では、ここで設定したカテゴリが「支出」「収入」で切り替わって表示されます。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F1E3",
    paddingTop: 14,
    paddingHorizontal: 14,
  },

  title: { fontSize: 18, fontWeight: "900", marginBottom: 12 },

  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8E1CF",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: "900", marginBottom: 10 },

  row: {
    borderWidth: 1,
    borderColor: "#EFE7D7",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowSelected: { borderColor: "#2B66FF", borderWidth: 2 },

  label: { fontSize: 13, fontWeight: "900", color: "#222" },
  labelSelected: { color: "#2B66FF" },

  swatches: { flexDirection: "row", gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1, borderColor: "#E8E1CF" },

  bigSectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },

  section: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E1CF",
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", marginBottom: 8 },

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  categoryName: { fontSize: 15, fontWeight: "700" },

  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ff8a80",
    borderRadius: 10,
  },
  deleteButtonText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  addRow: { flexDirection: "row", marginTop: 10 },
  input: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#EFE7D7",
  },
  addButton: {
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2962ff",
    borderRadius: 10,
  },
  addButtonText: { color: "#fff", fontWeight: "900" },

  note: { fontSize: 12, color: "#555", marginBottom: 24, fontWeight: "700" },
});
