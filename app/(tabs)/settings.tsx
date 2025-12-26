import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { THEME_LABEL, ThemeId } from "../../src/constants/appTheme";
import { useAppTheme } from "../../src/hooks/useAppTheme";

export default function Settings() {
  const { theme, themeId, setThemeId } = useAppTheme();

  const ids: ThemeId[] = ["blue", "green", "mono"];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>設定</Text>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>テーマ</Text>

        <View style={{ flexDirection: "row", marginTop: 10, flexWrap: "wrap" }}>
          {ids.map((id) => {
            const active = id === themeId;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => setThemeId(id)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? theme.primary : theme.card2,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
                activeOpacity={0.85}
              >
                <Text style={{ fontWeight: "900", color: active ? "#fff" : theme.text }}>
                  {THEME_LABEL[id]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={{ marginTop: 10, color: theme.subText, fontWeight: "800" }}>
          変更は全画面に即反映されるよ
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, paddingTop: 10 },
  title: { fontSize: 18, fontWeight: "900", textAlign: "center", marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 16, padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: "900" },
  pill: { height: 42, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, justifyContent: "center", alignItems: "center", marginRight: 10, marginBottom: 10 },
});
