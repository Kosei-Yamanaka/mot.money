import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const CATEGORY_KEY = "categories";

type Mode = "expense" | "income";

type Category = {
  id: string;
  name: string;
  type: Mode;
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: "exp_conv", name: "コンビニ", type: "expense" },
  { id: "exp_super", name: "スーパー", type: "expense" },
  { id: "exp_cafe", name: "カフェ", type: "expense" },
  { id: "inc_salary", name: "給料", type: "income" },
  { id: "inc_parttime", name: "バイト", type: "income" },
  { id: "inc_other", name: "その他収入", type: "income" },
];

export default function SettingsScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newIncomeName, setNewIncomeName] = useState("");

  useEffect(() => {
    (async () => {
      const json = await AsyncStorage.getItem(CATEGORY_KEY);
      if (!json) {
        setCategories(DEFAULT_CATEGORIES);
        await AsyncStorage.setItem(
          CATEGORY_KEY,
          JSON.stringify(DEFAULT_CATEGORIES)
        );
      } else {
        try {
          const arr: Category[] = JSON.parse(json);
          if (!Array.isArray(arr) || arr.length === 0) {
            setCategories(DEFAULT_CATEGORIES);
            await AsyncStorage.setItem(
              CATEGORY_KEY,
              JSON.stringify(DEFAULT_CATEGORIES)
            );
          } else {
            setCategories(arr);
          }
        } catch {
          setCategories(DEFAULT_CATEGORIES);
          await AsyncStorage.setItem(
            CATEGORY_KEY,
            JSON.stringify(DEFAULT_CATEGORIES)
          );
        }
      }
    })();
  }, []);

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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>カテゴリ設定</Text>

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
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addCategory("expense")}
          >
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
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addCategory("income")}
          >
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
    backgroundColor: "#f7f2de",
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#dddddd",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  categoryName: {
    fontSize: 15,
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#ff8a80",
    borderRadius: 8,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  addRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 8,
  },
  addButton: {
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2962ff",
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  note: {
    fontSize: 12,
    color: "#555",
    marginBottom: 24,
  },
});
