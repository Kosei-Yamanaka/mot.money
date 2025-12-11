import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const STORAGE_KEY = "records";

type Mode = "expense" | "income";

type RecordItem = {
  id: string;
  date: string;          // "12/11" みたいな文字列
  mode: Mode;
  store: string;
  displayAmount: string; // 表示用
  actualAmount?: number;
  createdAt?: string;
};

type Summary = {
  monthLabel: string; // "2025/12"
  income: number;
  expense: number;
  balance: number;
};

export default function History() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  const calcSummary = (list: RecordItem[]) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1〜12

    const monthPrefix = `${month}/`; // "12/"

    const thisMonth = list.filter((item) =>
      item.date?.startsWith(monthPrefix)
    );

    const income = thisMonth
      .filter((r) => r.mode === "income")
      .reduce((sum, r) => sum + (r.actualAmount ?? 0), 0);

    const expense = thisMonth
      .filter((r) => r.mode === "expense")
      .reduce((sum, r) => sum + (r.actualAmount ?? 0), 0);

    const balance = income - expense;

    setSummary({
      monthLabel: `${year}/${month}`,
      income,
      expense,
      balance,
    });
  };

  const loadRecords = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const list: RecordItem[] = json ? JSON.parse(json) : [];
      setRecords(list);
      calcSummary(list);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const formatYen = (value: number) =>
    value.toLocaleString("ja-JP", { maximumFractionDigits: 0 });

  const handleDelete = (id: string) => {
    Alert.alert("削除確認", "この記録を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          try {
            const newList = records.filter((r) => r.id !== id);
            setRecords(newList);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
            calcSummary(newList);
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: RecordItem }) => {
    const isExpense = item.mode === "expense";
    return (
      <View style={styles.item}>
        <View style={styles.itemRow}>
          <Text style={styles.date}>{item.date}</Text>
          <Text style={[styles.mode, isExpense ? styles.expense : styles.income]}>
            {isExpense ? "支出" : "収入"}
          </Text>
        </View>
        <View style={styles.itemRow}>
          <Text style={styles.store}>{item.store}</Text>
          <Text
            style={[
              styles.amount,
              isExpense ? styles.expense : styles.income,
            ]}
          >
            {item.displayAmount} 円
          </Text>
        </View>
        <View style={styles.itemRowBottom}>
          <View />
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Text style={styles.deleteText}>削除</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 今月サマリー */}
      {summary && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>
            {summary.monthLabel} のまとめ
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>収入合計</Text>
            <Text style={[styles.summaryValue, styles.income]}>
              {formatYen(summary.income)} 円
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>支出合計</Text>
            <Text style={[styles.summaryValue, styles.expense]}>
              {formatYen(summary.expense)} 円
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>残高</Text>
            <Text
              style={[
                styles.summaryValue,
                summary.balance >= 0 ? styles.income : styles.expense,
              ]}
            >
              {formatYen(summary.balance)} 円
            </Text>
          </View>
        </View>
      )}

      {/* 履歴 */}
      {records.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>まだ記録がありません</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
  summaryBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#555",
  },
  item: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemRowBottom: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  date: {
    fontSize: 14,
    color: "#666",
  },
  mode: {
    fontSize: 14,
    fontWeight: "bold",
  },
  store: {
    fontSize: 16,
    marginTop: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  expense: {
    color: "#d9534f",
  },
  income: {
    color: "#0275d8",
  },
  deleteText: {
    fontSize: 14,
    color: "#d9534f",
    fontWeight: "bold",
  },
});
