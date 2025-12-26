import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../src/hooks/useAppTheme";

const STORAGE_KEY = "records";
const CATEGORY_KEY = "categories";

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

type Category = {
  id: string;
  name: string;
  type: Mode;
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: "exp_conv", name: "コンビニ", type: "expense" },
  { id: "exp_super", name: "スーパー", type: "expense" },
  { id: "exp_study", name: "勉強", type: "expense" },
  { id: "exp_cafe", name: "カフェ", type: "expense" },
  { id: "exp_pc", name: "パソコン", type: "expense" },
  { id: "exp_social", name: "交際費", type: "expense" },
  { id: "exp_other", name: "その他", type: "expense" },

  { id: "inc_salary", name: "給料", type: "income" },
  { id: "inc_part", name: "バイト", type: "income" },
  { id: "inc_other", name: "その他", type: "income" },
];

async function loadCategoriesFromStorage(): Promise<Category[]> {
  const json = await AsyncStorage.getItem(CATEGORY_KEY);
  if (!json) {
    await AsyncStorage.setItem(CATEGORY_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  try {
    const arr: Category[] = JSON.parse(json);
    if (!Array.isArray(arr) || arr.length === 0) {
      await AsyncStorage.setItem(CATEGORY_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return arr;
  } catch {
    await AsyncStorage.setItem(CATEGORY_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
}

function formatDateLabel(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}/${m}/${day}`;
}

export default function Index() {
  const { theme } = useAppTheme();

  const [mode, setMode] = useState<Mode>("expense");

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");

  const [rawDigits, setRawDigits] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const list = await loadCategoriesFromStorage();
        setCategories(list);

        const currentList = list.filter((c) => c.type === mode);
        if (currentList.length > 0) {
          if (!selectedCategoryName || !currentList.some((c) => c.name === selectedCategoryName)) {
            setSelectedCategoryName(currentList[0].name);
          }
        } else {
          setSelectedCategoryName("");
        }
      })();
    }, [mode])
  );

  const changeDateBy = (delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta);
      return next;
    });
  };

  // 2桁=百円単位の仕様は残しつつ、UI文言は出さない
  const updateAmountFromDigits = (digits: string) => {
    if (!digits) return setAmount(0);
    const n = parseInt(digits, 10);
    if (Number.isNaN(n)) return setAmount(0);
    setAmount(n * 100);
  };

  const handleDigitPress = (digit: string) => {
    setRawDigits((prev) => {
      const next = (prev + digit).replace(/^0+/, "");
      if (next.length > 6) return prev;
      updateAmountFromDigits(next || "0");
      return next || "";
    });
  };

  const handleBackspace = () => {
    setRawDigits((prev) => {
      const next = prev.slice(0, -1);
      updateAmountFromDigits(next || "0");
      return next;
    });
  };

  const amountText = useMemo(() => {
    if (!rawDigits) return "0";
    return amount.toLocaleString("ja-JP", { maximumFractionDigits: 0 });
  }, [rawDigits, amount]);

  const resetInput = () => {
    setRawDigits("");
    setAmount(0);
    setMode("expense");
    const expList = categories.filter((c) => c.type === "expense");
    setSelectedCategoryName(expList[0]?.name ?? "");
  };

  const handleSave = async () => {
    if (amount === 0) {
      Alert.alert("金額が0円です", "金額を入力してね。");
      return;
    }
    const dateLabel = formatDateLabel(selectedDate);
    const categoryName = selectedCategoryName || (mode === "expense" ? "支出" : "収入");

    const createdAtDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );

    const newRecord: RecordItem = {
      id: Date.now().toString(),
      date: dateLabel,
      mode,
      store: categoryName,
      displayAmount: amountText,
      actualAmount: mode === "expense" ? amount + 50 : amount,
      createdAt: createdAtDate.toISOString(),
    };

    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const list: RecordItem[] = json ? JSON.parse(json) : [];
      const updated = [newRecord, ...list];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      resetInput();
      Alert.alert("保存した！");
    } catch (e) {
      console.error(e);
      Alert.alert("エラー", "保存に失敗した…");
    }
  };

  const currentCategories = useMemo(() => categories.filter((c) => c.type === mode), [categories, mode]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>入力</Text>

        {/* 支出/収入 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.segmentWrap, { backgroundColor: theme.card2, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                mode === "expense" && { backgroundColor: theme.primary },
              ]}
              onPress={() => setMode("expense")}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, { color: mode === "expense" ? "#fff" : theme.text }]}>
                支出
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                mode === "income" && { backgroundColor: theme.primary },
              ]}
              onPress={() => setMode("income")}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, { color: mode === "income" ? "#fff" : theme.text }]}>
                収入
              </Text>
            </TouchableOpacity>
          </View>

          {/* 日付 */}
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text }]}>日付</Text>
            <View style={styles.dateControls}>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: theme.card2, borderColor: theme.border }]}
                onPress={() => changeDateBy(-1)}
              >
                <Text style={{ fontWeight: "900", color: theme.text }}>◀</Text>
              </TouchableOpacity>
              <Text style={[styles.dateText, { color: theme.text }]}>{formatDateLabel(selectedDate)}</Text>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: theme.card2, borderColor: theme.border }]}
                onPress={() => changeDateBy(1)}
              >
                <Text style={{ fontWeight: "900", color: theme.text }}>▶</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 金額（縦短く） */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.rowHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>金額</Text>
            <Text style={[styles.cardHint, { color: theme.subText }]}>2桁=百円</Text>
          </View>

          <View style={[styles.amountBox, { backgroundColor: theme.card2, borderColor: theme.border }]}>
            <Text style={[styles.amountText, { color: theme.text }]}>{amountText}</Text>
            <Text style={[styles.amountUnit, { color: theme.subText }]}>円</Text>
          </View>
        </View>

        {/* カテゴリ（固定枠 + 横スワイプ） */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.rowHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>カテゴリ</Text>
          </View>

          <View style={[styles.categoryViewport, { backgroundColor: theme.card2, borderColor: theme.border }]}>
            <FlatList
              data={currentCategories}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 10, alignItems: "center" }}
              renderItem={({ item }) => {
                const active = selectedCategoryName === item.name;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedCategoryName(item.name)}
                    style={[
                      styles.catPill,
                      {
                        backgroundColor: active ? theme.primary : theme.card,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontWeight: "900", color: active ? "#fff" : theme.text }}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={{ color: theme.subText, paddingHorizontal: 10 }}>
                  設定でカテゴリ追加してね
                </Text>
              }
            />
          </View>
        </View>

        {/* キーパッド（下まで見れるサイズ） */}
        <View style={styles.keypad}>
          {["1","2","3","4","5","6","7","8","9"].map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.keyBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => handleDigitPress(d)}
              activeOpacity={0.85}
            >
              <Text style={[styles.keyText, { color: theme.text }]}>{d}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.keyBtn, styles.keySave, { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={handleSave}
            activeOpacity={0.9}
          >
            <Text style={[styles.keyText, { color: "#fff" }]}>保存</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.keyBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleDigitPress("0")}
            activeOpacity={0.85}
          >
            <Text style={[styles.keyText, { color: theme.text }]}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.keyBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleBackspace}
            activeOpacity={0.85}
          >
            <Text style={[styles.keyText, { color: theme.text }]}>←</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },

  segmentWrap: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentText: { fontSize: 15, fontWeight: "900" },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 15, fontWeight: "900" },
  dateControls: { flexDirection: "row", alignItems: "center" },
  iconBtn: {
    width: 38,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dateText: { fontSize: 18, fontWeight: "900", marginHorizontal: 12 },

  rowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: "900" },
  cardHint: { fontSize: 12, fontWeight: "800" },

  amountBox: {
    borderWidth: 1,
    borderRadius: 14,
    height: 62,           // ✅ 縦短く
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  amountText: { fontSize: 30, fontWeight: "900" },
  amountUnit: { fontSize: 16, fontWeight: "900", marginLeft: 6 },

  categoryViewport: {
    borderWidth: 1,
    borderRadius: 14,
    height: 64,           // ✅ 固定枠
    justifyContent: "center",
  },
  catPill: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 2,
  },
  keyBtn: {
    width: "31.5%",
    height: 62,           // ✅ 大きすぎない
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  keyText: { fontSize: 22, fontWeight: "900" },
  keySave: {},
});
