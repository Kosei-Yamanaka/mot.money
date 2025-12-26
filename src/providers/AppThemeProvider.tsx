import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useEffect, useMemo, useState } from "react";
import { AppTheme, THEMES, ThemeId } from "../constants/appTheme";

const STORAGE_KEY_THEME = "mot_theme_id";

type Ctx = {
  theme: AppTheme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  isReady: boolean;
};

export const AppThemeContext = createContext<Ctx | null>(null);

export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>("blue");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY_THEME);
        if (saved && (saved === "blue" || saved === "green" || saved === "mono")) {
          setThemeIdState(saved);
        }
      } catch {
        // ignore
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setThemeId = async (id: ThemeId) => {
    setThemeIdState(id);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_THEME, id);
    } catch {
      // ignore
    }
  };

  const value = useMemo<Ctx>(() => {
    const theme = THEMES[themeId] ?? THEMES.blue;
    return { theme, themeId, setThemeId, isReady };
  }, [themeId]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}
