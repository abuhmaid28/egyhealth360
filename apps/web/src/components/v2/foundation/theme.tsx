"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFrontendV2Theme } from "../frontend-v2-theme";

export type FoundationThemePreference = "system" | "light" | "dark";
export type FoundationAppearance = "dark" | "light";

export interface FoundationThemeState {
  preference: FoundationThemePreference;
  resolved: FoundationAppearance;
  setPreference: (next: FoundationThemePreference) => void;
}

export function resolveFoundationAppearance(
  preference: FoundationThemePreference,
  systemLight = false,
): FoundationAppearance {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return systemLight ? "light" : "dark";
}

export function useFoundationTheme(): FoundationThemeState {
  const { theme, select } = useFrontendV2Theme();
  const [systemLight, setSystemLight] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(prefers-color-scheme: light)");
    setSystemLight(query.matches);
    const update = (event: MediaQueryListEvent) => setSystemLight(event.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return {
    preference: theme,
    resolved: resolveFoundationAppearance(theme, systemLight),
    setPreference: select,
  };
}

export function FoundationThemeBridge({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
