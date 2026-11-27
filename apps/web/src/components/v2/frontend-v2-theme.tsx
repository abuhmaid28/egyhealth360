"use client";
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale } from "../../lib/i18n/context";

type Theme = "system" | "light" | "dark";
const ThemeContext = createContext({ theme: "system" as Theme, select: (_theme: Theme) => { void _theme; }, reset: () => {} });

/** T1 presentation state only. No persisted or identity-attached preference. */
export function FrontendV2ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const reset = useCallback(() => setTheme("system"), []);
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-frontend-v2-theme");
    else root.setAttribute("data-frontend-v2-theme", theme);
    return () => root.removeAttribute("data-frontend-v2-theme");
  }, [theme]);
  const value = useMemo(() => ({ theme, select: setTheme, reset }), [theme, reset]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useFrontendV2Theme() { return useContext(ThemeContext); }
export function FrontendV2ThemeSwitch() {
  const { locale } = useLocale();
  const { theme, select } = useFrontendV2Theme();
  return <label className="v2-theme-switch">
    <span>{locale === "ar" ? "المظهر" : "Appearance"}</span>
    <select value={theme} onChange={event => select(event.target.value as Theme)}>
      <option value="system">{locale === "ar" ? "حسب الجهاز" : "System"}</option>
      <option value="light">{locale === "ar" ? "فاتح" : "Light"}</option>
      <option value="dark">{locale === "ar" ? "داكن" : "Dark"}</option>
    </select>
    <small>{locale === "ar" ? "اختيارك للجلسة دي بس." : "Your choice lasts for this session only."}</small>
  </label>;
}
