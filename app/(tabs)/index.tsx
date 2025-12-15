import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const STORAGE_KEY = "records";
const CATEGORY_KEY = "categories";

type Mode = "expense" | "income";

type RecordItem = {
  id: string;
  date: string; // "12/11"
  mode: Mode;
  store: string; // ← カテゴリ名として使う
  displayAmount: string;
  actualAmount: number;
  createdAt: string;
};

type Category = {
  id: string;
  name: string;
  type: Mode; // expense / income
};

const DEFAULT_CATEGORIES: Category[] = [
  // 支出
  { id: "exp_conv", name: "コンビニ", type: "expense" },
  { id: "exp_super", name: "スーパー", type: "expense" },
  { id: "exp_cafe", name: "カフェ", type: "expense" },
  // 収入
  { id: "inc_salary", name: "給料", type: "income" },
  { id: "inc_parttime", name: "バイト", type: "income" },
  { id: "inc_other", name: "その他収入", type: "income" },
];

async function loadCategoriesFromStorage(): Promise<Category[]> {
  const json = await AsyncStorage.getItem(CATEGORY_KEY);
  if (!json) {
    // 初回はデフォルトを書き込んで返す
    await AsyncStorage.setItem(
      CATEGORY_KEY,
      JSON.stringify(DEFAULT_CATEGORIES)
    );
    return DEFAULT_CATEGORIES;
  }
  try {
    const arr: Category[] = JSON.parse(json);
    if (!Array.isArray(arr) || arr.length === 0) {
      await AsyncStorage.setItem(
        CATEGORY_KEY,
        JSON.stringify(DEFAULT_CATEGORIES)
      );
      return DEFAULT_CATEGORIES;
    }
    return arr;
  } catch {
    await AsyncStorage.setItem(
      CATEGORY_KEY,
      JSON.stringify(DEFAULT_CATEGORIES)
    );
    return DEFAULT_CATEGORIES;
  }
}

export default function Index() {
  const [mode, setMode] = useState<Mode>("expense");

  // カテゴリ
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] =
    useState<string>("");

  // 金額入力
  const [rawDigits, setRawDigits] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);

  // 日付
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // 画面に戻ってきたとき & mode 変わったときにカテゴリ読み直し
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const list = await loadCategoriesFromStorage();
        setCategories(list);

        const currentList = list.filter((c) => c.type === mode);
        if (currentList.length > 0) {
          // まだ選択がない or 種類が変わったときは先頭を選ぶ
          if (
            !selectedCategoryName ||
            !currentList.some((c) => c.name === selectedCategoryName)
          ) {
            setSelectedCategoryName(currentList[0].name);
          }
        } else {
          setSelectedCategoryName("");
        }
      })();
    }, [mode])
  );

  // ========= 日付 =========
  const formatDateLabel = (d: Date) => {
   const y = d.getFullYear();
   const m = d.getMonth() + 1;
   const day = d.getDate();
   return `${y}/${m}/${day}`;
  };

  const changeDateBy = (delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta);
      return next;
    });
  };

  // ========= 金額ロジック（2桁入力で百の位） =========
  const updateAmountFromDigits = (digits: string) => {
    if (!digits) {
      setAmount(0);
      return;
    }
    const n = parseInt(digits, 10);
    if (Number.isNaN(n)) {
      setAmount(0);
      return;
    }
    const rounded = n * 100; // 34 → 3400円
    setAmount(rounded);
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

  const formatAmountText = () => {
    if (rawDigits === "") return "00";
    return amount.toLocaleString("ja-JP", { maximumFractionDigits: 0 });
  };

  const resetInput = () => {
    setRawDigits("");
    setAmount(0);
    setMode("expense");
    // 支出カテゴリの先頭を選び直し
    const expList = categories.filter((c) => c.type === "expense");
    if (expList.length > 0) {
      setSelectedCategoryName(expList[0].name);
    } else {
      setSelectedCategoryName("");
    }
  };

  // ========= 保存 =========
  const handleSave = async () => {
    if (amount === 0) {
      Alert.alert("金額が 0 円です", "金額を入力してください。");
      return;
    }

    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    const dateLabel = `${y}/${m}/${day}`;


    const categoryName =
      selectedCategoryName || (mode === "expense" ? "支出" : "収入");

    // 🔽 ここで「選択している日付」の Date を作る
    const createdAtDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );

    const newRecord: RecordItem = {
      id: Date.now().toString(),
      date: dateLabel,
      mode,
      store: categoryName, // カテゴリ名
      displayAmount: formatAmountText(),
      actualAmount: mode === "expense" ? amount + 50 : amount,
      // 🔽 ここを「今」じゃなくて、選択した日付にする
      createdAt: createdAtDate.toISOString(),
    };

    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const list: RecordItem[] = json ? JSON.parse(json) : [];
      const updated = [newRecord, ...list];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      resetInput();
      Alert.alert("保存しました");
    } catch (e) {
      console.error(e);
      Alert.alert("エラー", "保存に失敗しました");
    }
  };


  const currentCategories = categories.filter((c) => c.type === mode);

  // ========= JSX =========
  return (
    <View style={styles.container}>
      {/* 支出 / 収入 */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            mode === "expense" ? styles.modeActiveExpense : styles.modeInactive,
          ]}
          onPress={() => setMode("expense")}
        >
          <Text
            style={[
              styles.modeText,
              mode === "expense"
                ? styles.modeTextActive
                : styles.modeTextInactive,
            ]}
          >
            支出
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            mode === "income" ? styles.modeActiveIncome : styles.modeInactive,
          ]}
          onPress={() => setMode("income")}
        >
          <Text
            style={[
              styles.modeText,
              mode === "income"
                ? styles.modeTextActive
                : styles.modeTextInactive,
            ]}
          >
            収入
          </Text>
        </TouchableOpacity>
      </View>

      {/* 日付 */}
      <View style={styles.row}>
        <Text style={styles.label}>日付</Text>
        <View style={styles.dateControls}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => changeDateBy(-1)}
          >
            <Text style={styles.dateButtonText}>◀</Text>
          </TouchableOpacity>

          <Text style={styles.dateText}>{formatDateLabel(selectedDate)}</Text>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => changeDateBy(1)}
          >
            <Text style={styles.dateButtonText}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 金額 */}
      <View style={styles.row}>
        <Text style={styles.label}>金額</Text>
        <View style={styles.amountBox}>
          <Text style={styles.amountText}>{formatAmountText()} 円</Text>
        </View>
      </View>

      {/* カテゴリ */}
      <View style={[styles.row, { marginTop: 16 }]}>
        <Text style={styles.label}>カテゴリ</Text>
      </View>

      <View style={styles.storeRow}>
        {currentCategories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.storeButton,
              selectedCategoryName === cat.name && styles.storeButtonActive,
            ]}
            onPress={() => setSelectedCategoryName(cat.name)}
          >
            <Text
              style={[
                styles.storeButtonText,
                selectedCategoryName === cat.name &&
                  styles.storeButtonTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
        {currentCategories.length === 0 && (
          <Text style={{ marginLeft: 8 }}>カテゴリがありません（設定から追加）</Text>
        )}
      </View>

      {/* キーパッド */}
      <View style={styles.keypad}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <TouchableOpacity
            key={d}
            style={styles.keyButton}
            onPress={() => handleDigitPress(d)}
          >
            <Text style={styles.keyText}>{d}</Text>
          </TouchableOpacity>
        ))}

        {/* 保存 */}
        <TouchableOpacity
          style={[styles.keyButton, styles.saveButton]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>

        {/* 0 */}
        <TouchableOpacity
          style={styles.keyButton}
          onPress={() => handleDigitPress("0")}
        >
          <Text style={styles.keyText}>0</Text>
        </TouchableOpacity>

        {/* ← */}
        <TouchableOpacity style={styles.keyButton} onPress={handleBackspace}>
          <Text style={styles.keyText}>←</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f2de",
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  modeRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    marginHorizontal: 6,
    alignItems: "center",
  },
  modeActiveExpense: {
    backgroundColor: "#4c6fff",
  },
  modeActiveIncome: {
    backgroundColor: "#c6b5ff",
  },
  modeInactive: {
    backgroundColor: "#e2e2e2",
  },
  modeText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  modeTextActive: {
    color: "#fff",
  },
  modeTextInactive: {
    color: "#555",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    width: 70,
  },
  amountBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 28,
    fontWeight: "bold",
  },
  storeRow: {
    flexDirection: "row",
    marginBottom: 16,
    flexWrap: "wrap",
  },
  storeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#aee7ff",
    borderRadius: 12,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  storeButtonActive: {
    backgroundColor: "#4c6fff",
  },
  storeButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  storeButtonTextActive: {
    color: "#fff",
  },
  keypad: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  keyButton: {
    width: "30%",
    aspectRatio: 1,
    margin: "1.5%",
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  keyText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#2962ff",
  },
  saveButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  dateControls: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  dateButton: {
    width: 40,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  dateText: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 12,
  },
});
