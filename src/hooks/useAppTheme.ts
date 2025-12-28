import { useContext } from "react";
import { AppThemeContext } from "../providers/AppThemeProvider";

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within AppThemeProvider");
  return ctx;
}
