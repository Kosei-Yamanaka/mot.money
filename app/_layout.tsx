import { Stack } from "expo-router";
import React from "react";
import { AppThemeProvider } from "../src/providers/AppThemeProvider";

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppThemeProvider>
  );
}
