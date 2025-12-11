import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const STORAGE_KEY = "records";

type Mode = "expense" | "income";

type RecordItem = {
  id: string;
  date: string;          // "12/11"
  mode: Mode;
  store: string;
  displayAmount: string; // 3,400 みたいな文字列
  actualAmount: number;  // 計算用
  createdAt: string;
};

const STORES = ["コンビニ", "スーパー", "カフェ"];

export default function Index() {
  const [mode, setMode] = useState<Mode>("expense");
  const [selectedStore, setSelectedStore] = useState<string>("コンビニ");

  // 金額入力用
  const [rawDigits, setRawDigits] = useState<string>(""); // 押された数字の文字列
  const [amount, setAmount] = useState<number>(0);        // 表示用 + 保存用

  // 日付
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ========= 日付関係 =========
  const formatDateLabel = (d: Date) => {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}/${day}`;
  };

  const changeDateBy = (delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta);
      return next;
    });
  };

  // ========= 金額入力ロジック =========
  // 入力値を ×100 して金額にする
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

    // あなたの希望：「34 → 3400円」
    const rounded = n * 100;
    setAmount(rounded);
  };

  const handleDigitPress = (digit: string) => {
    setRawDigits((prev) => {
      const next = (prev + digit).replace(/^0+/, ""); // 先頭の0は削除
      if (next.length > 6) return prev; // 桁数制限
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
    setSelectedStore("コンビニ");
    setMode("expense");
  };

  // ========= 保存処理 =========
  const handleSave = async () => {
    if (amount === 0) {
      Alert.alert("金額が 0 円です", "金額を入力してください。");
      return;
    }

    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    const dateLabel = `${month}/${day}`;

    const newRecord: RecordItem = {
      id: Date.now().toString(),
      date: dateLabel,
      mode,
      store: selectedStore,
      displayAmount: formatAmountText(),
      actualAmount: mode === "expense" ? amount + 50 : amount, 
      createdAt: new Date().toISOString(),
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

  // ========= JSX =========
  return (
    <View style={styles.container}>
      {/* 支出 / 収入 切り替え */}
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
              mode === "expense" ? styles.modeTextActive : styles.modeTextInactive,
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
              mode === "income" ? styles.modeTextActive : styles.modeTextInactive,
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
          <TouchableOpacity style={styles.dateButton} onPress={() => changeDateBy(-1)}>
            <Text style={styles.dateButtonText}>◀</Text>
          </TouchableOpacity>

          <Text style={styles.dateText}>{formatDateLabel(selectedDate)}</Text>

          <TouchableOpacity style={styles.dateButton} onPress={() => changeDateBy(1)}>
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

      {/* お店 */}
      <View style={[styles.row, { marginTop: 16 }]}>
        <Text style={styles.label}>お店</Text>
      </View>

      <View style={styles.storeRow}>
        {STORES.map((store) => (
          <TouchableOpacity
            key={store}
            style={[
              styles.storeButton,
              selectedStore === store && styles.storeButtonActive,
            ]}
            onPress={() => setSelectedStore(store)}
          >
            <Text
              style={[
                styles.storeButtonText,
                selectedStore === store && styles.storeButtonTextActive,
              ]}
            >
              {store}
            </Text>
          </TouchableOpacity>
        ))}
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
        <TouchableOpacity style={[styles.keyButton, styles.saveButton]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>

        {/* 0 */}
        <TouchableOpacity style={styles.keyButton} onPress={() => handleDigitPress("0")}>
          <Text style={styles.keyText}>0</Text>
        </TouchableOpacity>

        {/* ← バックスペース */}
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
    width: 60,
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
  },
  storeButton: {
    flex: 1,
    backgroundColor: "#aee7ff",
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: "center",
  },
  storeButtonActive: {
    backgroundColor: "#4c6fff",
  },
  storeButtonText: {
    fontSize: 16,
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
