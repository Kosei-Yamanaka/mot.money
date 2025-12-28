import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { THEMES, ThemeId } from "../constants/appTheme";

const KEY = "app_theme_id_v1";

type Ctx = {
  themeId: ThemeId;
  theme: typeof THEMES[ThemeId];
  setThemeId: (id: ThemeId) => void;
};

export const AppThemeContext = createContext<Ctx | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>("mono");

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw === "blue" || raw === "green" || raw === "mono") setThemeIdState(raw);
    })();
  }, []);

  const setThemeId = useCallback(async (id: ThemeId) => {
    setThemeIdState(id);
    await AsyncStorage.setItem(KEY, id);
  }, []);

  const value = useMemo<Ctx>(() => {
    return { themeId, theme: THEMES[themeId], setThemeId };
  }, [themeId, setThemeId]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}
