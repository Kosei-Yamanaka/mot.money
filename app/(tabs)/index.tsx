import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const MAX_DIGITS = 5; // 最大5桁 → 99999 * 100 = 9,999,900円まで
const STORAGE_KEY = "records";

type Mode = "expense" | "income";

export default function Index() {
  const [digits, setDigits] = useState<string>(""); // 百円単位で入力（"2", "45", "111" など）
  const [store, setStore] = useState<string>("");   // お店
  const [message, setMessage] = useState<string>("");
  const [mode, setMode] = useState<Mode>("expense"); // 支出 or 収入

  // 生の金額（数値）。digits = "45" → rawAmount = 4500
  const rawAmount = digits === "" ? 0 : Number(digits) * 100;

  // 表示用金額
  //  - 未入力のときは「00」
  //  - 入力されているときはカンマ付き ("11,100" など)
  const displayAmount =
    digits === "" ? "00" : rawAmount.toLocaleString("ja-JP");

  // 内部で使う金額：とりあえず +50（あとで調整OK）
  const actualAmount = digits === "" ? 0 : Number(digits) * 100 + 50;

  // 数字ボタンを押したとき（最大 MAX_DIGITS 桁）
  const handleDigitPress = (d: string) => {
    if (digits.length >= MAX_DIGITS) return;
    setDigits(digits + d);
    setMessage("");
  };

  const handleClear = () => {
    setDigits("");
    setMessage("");
  };

  const handleSave = async () => {
    if (digits === "" || !store) {
      setMessage("金額とお店を選んでね");
      return;
    }

    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}`;
    const createdAt = now.toISOString();

    const newRecord = {
      id: createdAt, // とりあえずISO文字列をIDに
      date: dateStr,
      mode,
      store,
      displayAmount, // 画面用（文字列, カンマ付き）
      actualAmount,  // 計算用（数値、+50済み）
      createdAt,
    };

    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const list = json ? JSON.parse(json) : [];
      const newList = [newRecord, ...list]; // 先頭に追加
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));

      setMessage("保存したよ！");
      setDigits("");
      setStore("");
    } catch (e) {
      console.error(e);
      setMessage("保存に失敗しました…");
    }
  };

  return (
    <View style={styles.container}>
      {/* 支出 / 収入 タブ */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, mode === "expense" && styles.tabActive]}
          onPress={() => setMode("expense")}
        >
          <Text
            style={[
              styles.tabText,
              mode === "expense" && styles.tabTextActive,
            ]}
          >
            支出
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, mode === "income" && styles.tabActive]}
          onPress={() => setMode("income")}
        >
          <Text
            style={[
              styles.tabText,
              mode === "income" && styles.tabTextActive,
            ]}
          >
            収入
          </Text>
        </TouchableOpacity>
      </View>

      {/* 金額 */}
      <View style={styles.row}>
        <Text style={styles.label}>金額</Text>
        <View style={styles.amountBox}>
          <Text style={styles.amountText}>{displayAmount} 円</Text>
        </View>
      </View>

      {/* お店 */}
      <View style={styles.row}>
        <Text style={styles.label}>お店</Text>
        <View style={styles.storeGrid}>
          {["コンビニ", "スーパー", "カフェ"].map((name) => (
            <TouchableOpacity
              key={name}
              style={[
                styles.storeBtn,
                store === name && styles.storeBtnSelected,
              ]}
              onPress={() => setStore(name)}
            >
              <Text style={styles.storeText}>{name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 数字キーパッド */}
      <View style={styles.pad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <TouchableOpacity
            key={n}
            style={styles.key}
            onPress={() => handleDigitPress(String(n))}
          >
            <Text style={styles.keyText}>{n}</Text>
          </TouchableOpacity>
        ))}

        {/* 保存 */}
        <TouchableOpacity
          style={[styles.key, styles.saveKey]}
          onPress={handleSave}
        >
          <Text style={[styles.keyText, styles.saveText]}>保存</Text>
        </TouchableOpacity>

        {/* 0 */}
        <TouchableOpacity
          style={styles.key}
          onPress={() => handleDigitPress("0")}
        >
          <Text style={styles.keyText}>0</Text>
        </TouchableOpacity>

        {/* クリア */}
        <TouchableOpacity style={styles.key} onPress={handleClear}>
          <Text style={styles.keyText}>←</Text>
        </TouchableOpacity>
      </View>

      {message !== "" && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f2de",
    paddingTop: 60,
    alignItems: "center",
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 40,
    borderRadius: 20,
    backgroundColor: "#ccccff",
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: "#4b6cff",
  },
  tabText: {
    fontSize: 18,
    color: "#000",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  row: {
    width: "90%",
    marginBottom: 12,
  },
  label: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 4,
  },
  amountBox: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
  },
  amountText: {
    fontSize: 32,
    textAlign: "right",
  },
  storeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  storeBtn: {
    backgroundColor: "#a7e6ff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginRight: 8,
    marginTop: 4,
  },
  storeBtnSelected: {
    backgroundColor: "#1f8bff",
  },
  storeText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  pad: {
    marginTop: 20,
    width: 260,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  key: {
    width: 75,
    height: 75,
    backgroundColor: "#fff",
    margin: 5,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  keyText: {
    fontSize: 28,
    fontWeight: "bold",
  },
  saveKey: {
    backgroundColor: "#264ee4",
  },
  saveText: {
    color: "#fff",
  },
  message: {
    marginTop: 10,
    fontSize: 16,
  },
});
