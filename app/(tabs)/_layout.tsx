// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import React from "react";
import { useAppTheme } from "../../src/hooks/useAppTheme";

export default function TabLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.subText,

        tabBarStyle: {
          backgroundColor: theme.bg,

          // ▼ ここが「ボタンが下すぎる」を解決する本体
          height: 80,
          paddingBottom: 15, // 上げたい量（12がちょうど良いこと多い）
          paddingTop: 6,

          // 仕切り線を薄く（好み）
          borderTopColor: theme.border,
          borderTopWidth: 1,
        },

        // ラベルが沈みすぎるのを防ぐ
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800",
          marginTop: -4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "入力",
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "履歴",
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "カレンダー",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
        }}
      />
    </Tabs>
  );
}
