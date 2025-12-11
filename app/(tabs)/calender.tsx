import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ScrollView,
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
  displayAmount: string;
  actualAmount?: number; // +50 済み
  createdAt?: string;    // ISO 文字列
};

type DayTotal = {
  income: number;
  expense: number;
};

type MonthSummary = {
  income: number;
  expense: number;
  balance: number;
};

export default function CalenderScreen() {
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1); // 1〜12
  const [dayTotals, setDayTotals] = useState<Record<number, DayTotal>>({});
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);

  const loadRecords = async (y: number, m: number) => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const list: RecordItem[] = json ? JSON.parse(json) : [];

      const totals: Record<number, DayTotal> = {};
      let monthIncome = 0;
      let monthExpense = 0;

      for (const rec of list) {
        // 年・月の判定は createdAt を優先
        let yy: number | null = null;
        let mm: number | null = null;
        let dd: number | null = null;

        if (rec.createdAt) {
          const d = new Date(rec.createdAt);
          yy = d.getFullYear();
          mm = d.getMonth() + 1;
          dd = d.getDate();
        } else if (rec.date) {
          // 古いデータ用のフォールバック（年は指定の y とみなす）
          const [mStr, dStr] = rec.date.split("/");
          yy = y;
          mm = parseInt(mStr, 10);
          dd = parseInt(dStr, 10);
        }

        if (
          yy === null ||
          mm === null ||
          dd === null ||
          Number.isNaN(yy) ||
          Number.isNaN(mm) ||
          Number.isNaN(dd)
        ) {
          continue;
        }

        if (yy !== y || mm !== m) continue;

        if (!totals[dd]) {
          totals[dd] = { income: 0, expense: 0 };
        }

        const value = rec.actualAmount ?? 0;

        if (rec.mode === "income") {
          totals[dd].income += value;
          monthIncome += value;
        } else {
          totals[dd].expense += value;
          monthExpense += value;
        }
      }

      setDayTotals(totals);
      setMonthSummary({
        income: monthIncome,
        expense: monthExpense,
        balance: monthIncome - monthExpense,
      });
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRecords(year, month);
    }, [year, month])
  );

  const changeMonth = (delta: number) => {
    setMonth((prev) => {
      let newMonth = prev + delta;
      let newYear = year;

      if (newMonth <= 0) {
        newMonth = 12;
        newYear = year - 1;
      } else if (newMonth >= 13) {
        newMonth = 1;
        newYear = year + 1;
      }
      setYear(newYear);
      return newMonth;
    });
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=日,6=土

  // 6週分(最大42マス)のセル
  const cells: { day?: number }[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({});
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d });
  }
  while (cells.length % 7 !== 0) {
    cells.push({});
  }

  const formatYen = (value: number) =>
    value.toLocaleString("ja-JP", { maximumFractionDigits: 0 });

  return (
    <View style={styles.container}>
      {/* 月切り替え */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.monthButton}
          onPress={() => changeMonth(-1)}
        >
          <Text style={styles.monthButtonText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {year}年 {month}月
        </Text>
        <TouchableOpacity
          style={styles.monthButton}
          onPress={() => changeMonth(1)}
        >
          <Text style={styles.monthButtonText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* 凡例 */}
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>
          <Text style={styles.expenseDot}>●</Text> 支出　
          <Text style={styles.incomeDot}>●</Text> 収入
        </Text>
      </View>

      {/* 曜日ヘッダ */}
      <View style={styles.weekHeaderRow}>
        {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
          <View key={w} style={styles.weekHeaderCell}>
            <Text style={styles.weekHeaderText}>{w}</Text>
          </View>
        ))}
      </View>

      {/* カレンダー本体 */}
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.calendarGrid}>
          {cells.map((cell, idx) => {
            const d = cell.day;
            const totals = d ? dayTotals[d] : undefined;
            const income = totals?.income ?? 0;
            const expense = totals?.expense ?? 0;

            return (
              <View key={idx} style={styles.dayCell}>
                <View style={styles.dayTile}>
                  {d ? (
                    <>
                      <Text style={styles.dayNumber}>{d}</Text>
                      {(income > 0 || expense > 0) && (
                        <View style={styles.dayAmounts}>
                          {expense > 0 && (
                            <Text
                              style={[styles.amountText, styles.expenseText]}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                            >
                              -{formatYen(expense)}
                            </Text>
                          )}
                          {income > 0 && (
                            <Text
                              style={[styles.amountText, styles.incomeText]}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                            >
                              +{formatYen(income)}
                            </Text>
                          )}
                        </View>
                      )}
                    </>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* 月のサマリー */}
      {monthSummary && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>この月のまとめ</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>収入合計</Text>
            <Text style={[styles.summaryValue, styles.incomeText]}>
              {formatYen(monthSummary.income)} 円
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>支出合計</Text>
            <Text style={[styles.summaryValue, styles.expenseText]}>
              {formatYen(monthSummary.expense)} 円
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>残高</Text>
            <Text
              style={[
                styles.summaryValue,
                monthSummary.balance >= 0 ? styles.incomeText : styles.expenseText,
              ]}
            >
              {formatYen(monthSummary.balance)} 円
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f2de",
    paddingTop: 40,
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  monthButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
    borderRadius: 10,
  },
  monthButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 12,
  },
  legendRow: {
    alignItems: "center",
    marginBottom: 4,
  },
  legendText: {
    fontSize: 14,
  },
  expenseDot: {
    color: "#d9534f",
  },
  incomeDot: {
    color: "#0275d8",
  },
  weekHeaderRow: {
    flexDirection: "row",
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  weekHeaderCell: {
    flex: 1,
    alignItems: "center",
  },
  weekHeaderText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 4,
  },
  dayCell: {
    width: "14.2857%",
    padding: 2,
  },
  dayTile: {
    flex: 1,
    aspectRatio: 1.05,
    borderWidth: 0.5,
    borderColor: "#dddddd",
    borderRadius: 4,
    padding: 2,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: "bold",
  },
  dayAmounts: {
    marginTop: 2,
  },
  amountText: {
    fontSize: 9,
  },
  expenseText: {
    color: "#d9534f",
  },
  incomeText: {
    color: "#0275d8",
  },
  // 月サマリー
  summaryBox: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "#dddddd",
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "bold",
  },
});
