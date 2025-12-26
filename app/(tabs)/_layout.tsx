import { Tabs } from "expo-router";
import React from "react";
import { useAppTheme } from "../../src/hooks/useAppTheme";

export default function TabLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "入力" }} />
      <Tabs.Screen name="calendar" options={{ title: "カレンダー" }} />
      <Tabs.Screen name="history" options={{ title: "履歴" }} />
      <Tabs.Screen name="settings" options={{ title: "設定" }} />
    </Tabs>
  );
}
