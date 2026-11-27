"use client";

import type { ReactNode } from "react";
import type { Locale } from "../../../lib/i18n/catalog";
import styles from "./foundation.module.css";
import { useFoundationTheme, type FoundationAppearance } from "./theme";

export interface FoundationScopeProps {
  locale: Locale;
  surface: "gateway" | "shell" | "patient" | "doctor" | "pharmacy" | "laboratory" | "admin";
  appearance?: FoundationAppearance;
  className?: string;
  children: ReactNode;
}

export function FoundationScope({
  locale,
  surface,
  appearance,
  className,
  children,
}: FoundationScopeProps) {
  const { resolved } = useFoundationTheme();
  const activeAppearance = appearance ?? resolved;
  const classes = [styles.scope, className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      data-v2-foundation="true"
      data-foundation-surface={surface}
      data-foundation-theme={activeAppearance}
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      {children}
    </div>
  );
}
