"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "../../../lib/api/contracts";
import { LanguageSwitch, useLocale } from "../../../lib/i18n/context";
import { useApp } from "../../context";
import { FrontendV2ThemeSwitch } from "../frontend-v2-theme";
import {
  FoundationBrandMark,
  FoundationIcon,
  FoundationScope,
  useFoundationTheme,
  type FoundationIconName,
} from "../foundation/index";
import styles from "./shell.module.css";

interface NavItem {
  href?: string;
  labelEn: string;
  labelAr: string;
  icon: FoundationIconName;
  disabledNoteEn?: string;
  disabledNoteAr?: string;
}

const ROLE_NAV: Record<Role, readonly NavItem[]> = {
  PATIENT: [
    { href: "/patient", labelEn: "My care", labelAr: "رعايتي", icon: "care-heart" },
    { href: "/patient/discover", labelEn: "Discover", labelAr: "استكشف الأطباء", icon: "search" },
    { href: "/patient/appointments", labelEn: "Appointments", labelAr: "مواعيدي", icon: "calendar" },
    { href: "/patient/record", labelEn: "Record", labelAr: "الملف الصحي", icon: "doc" },
    { href: "/patient/settings", labelEn: "Settings", labelAr: "الإعدادات", icon: "user" },
  ],
  CLINICIAN: [
    { href: "/doctor/schedule", labelEn: "Schedule", labelAr: "الجدول اليومي", icon: "calendar" },
    { href: "/doctor/availability", labelEn: "Availability", labelAr: "المواعيد المتاحة", icon: "clock" },
    { href: "/doctor/consultation", labelEn: "Consultation", labelAr: "الاستشارة", icon: "stethoscope" },
    {
      labelEn: "My patients",
      labelAr: "مرضاي",
      icon: "user",
      disabledNoteEn: "Planned",
      disabledNoteAr: "مخطط لاحقًا",
    },
  ],
  PHARMACY_STAFF: [
    { href: "/pharmacy", labelEn: "Pharmacy fulfillment", labelAr: "صرف الوصفات", icon: "pharmacy-rx" },
  ],
  LAB_STAFF: [
    { href: "/laboratory", labelEn: "Laboratory (Future)", labelAr: "المعمل (مستقبلي)", icon: "lab-flask" },
  ],
  ADMIN: [
    { href: "/admin", labelEn: "Operations directory", labelAr: "دليل التشغيل", icon: "admin-shield" },
  ],
};

const ROLE_SWITCH_OPTIONS: readonly { role: Role; en: string; ar: string }[] = [
  { role: "PATIENT", en: "Patient", ar: "المريض" },
  { role: "CLINICIAN", en: "Doctor", ar: "الطبيب" },
  { role: "PHARMACY_STAFF", en: "Pharmacy", ar: "الصيدلية" },
  { role: "LAB_STAFF", en: "Laboratory (Future)", ar: "المعمل (مستقبلي)" },
  { role: "ADMIN", en: "Admin", ar: "الإدارة" },
];

export function V2DemoShell({
  children,
  onRoleChange,
  onLogout,
  toast,
  onDismiss,
}: {
  children: ReactNode;
  onRoleChange?: (role: Role) => Promise<void>;
  onLogout: () => void;
  toast: string;
  onDismiss: () => void;
}) {
  const { api, session, refresh } = useApp();
  const pathname = usePathname() || "";
  const { locale } = useLocale();
  const { resolved } = useFoundationTheme();
  const ar = locale === "ar";
  const [liveAccountName, setLiveAccountName] = useState<string>(session.name);

  // Sync latest patient display name whenever refresh ticks (fixes P2 stale profile name defect).
  useEffect(() => {
    let active = true;
    setLiveAccountName(session.name);
    if (api.mode === "demo" && session.mode === "demo" && session.role === "PATIENT") {
      api
        .profile()
        .then((profile) => {
          if (active && profile?.displayName) setLiveAccountName(profile.displayName);
        })
        .catch(() => {
          /* Retain fallback session.name */
        });
    }
    return () => {
      active = false;
    };
  }, [api, session.mode, session.name, session.role, refresh]);

  const navItems = ROLE_NAV[session.role] ?? [];
  const surface =
    session.role === "PATIENT"
      ? "patient"
      : session.role === "CLINICIAN"
        ? "doctor"
        : session.role === "PHARMACY_STAFF"
          ? "pharmacy"
          : session.role === "LAB_STAFF"
            ? "laboratory"
            : "admin";

  return (
    <FoundationScope locale={locale} surface={surface} className={styles.shell}>
      <a className={styles.skip} href="#main">
        {ar ? "تخطي إلى المحتوى الرئيسي" : "Skip to main content"}
      </a>

      <header className={styles.header} data-v2-shell="true" data-frontend-v2>
        <div className={styles.headerInner}>
          <div className={styles.topRow}>
            <div className={styles.brandGroup}>
              <FoundationBrandMark locale={locale} appearance={resolved} variant="compact" />
              <span className={styles.demoPill}>
                {ar ? "تجريبي · بيانات اصطناعية" : "Synthetic Demo"}
              </span>
              <span className={styles.accountChip} data-shell-account-name>
                <FoundationIcon name="user" size={16} />
                <span>{liveAccountName}</span>
              </span>
            </div>

            <div className={styles.tools}>
              <LanguageSwitch />
              <details
                className={styles.themeDetails}
                onKeyDown={(event) => {
                  if (event.key !== "Escape") return;
                  event.currentTarget.querySelector("summary")?.focus();
                  event.currentTarget.open = false;
                }}
              >
                <summary aria-label={ar ? "إعدادات المظهر" : "Appearance"}>
                  <FoundationIcon name={resolved === "light" ? "sun" : "moon"} size={16} />
                  <span>{ar ? "المظهر" : "Theme"}</span>
                </summary>
                <div className={styles.themePopover}>
                  <FrontendV2ThemeSwitch />
                </div>
              </details>

              {api.mode === "demo" && session.mode === "demo" && onRoleChange ? (
                <label className="sr-only" htmlFor="v2-workspace-select">
                  {ar ? "تبديل مساحة الدور التجريبية" : "Switch demo workspace"}
                </label>
              ) : null}
              {api.mode === "demo" && session.mode === "demo" && onRoleChange ? (
                <select
                  id="v2-workspace-select"
                  data-workspace-switch
                  aria-label={ar ? "تبديل الدور التجريبي" : "Switch demo role"}
                  value={session.role}
                  onChange={(event) => {
                    void onRoleChange(event.target.value as Role);
                  }}
                >
                  {ROLE_SWITCH_OPTIONS.map((option) => (
                    <option key={option.role} value={option.role}>
                      {ar ? option.ar : option.en}
                    </option>
                  ))}
                </select>
              ) : null}

              <button type="button" onClick={onLogout} data-shell-signout>
                <FoundationIcon name="logout" size={16} />{" "}
                <span>{ar ? "خروج" : "Sign out"}</span>
              </button>
            </div>
          </div>

          <nav className={styles.navRow} aria-label={ar ? "تنقل البوابة" : "Workspace navigation"}>
            {navItems.map((item) => {
              if (!item.href) {
                return (
                  <span
                    key={item.labelEn}
                    className={styles.navDisabled}
                    aria-disabled="true"
                  >
                    <FoundationIcon name={item.icon} size={17} />
                    <span>{ar ? item.labelAr : item.labelEn}</span>
                    <small>({ar ? item.disabledNoteAr : item.disabledNoteEn})</small>
                  </span>
                );
              }
              const active =
                item.href === "/patient"
                  ? pathname === "/patient"
                  : item.href === "/doctor/schedule"
                    ? pathname === "/doctor" || pathname === "/doctor/schedule" || pathname.startsWith("/doctor/schedule/")
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={styles.navLink}
                  aria-current={active ? "page" : undefined}
                >
                  <FoundationIcon name={item.icon} size={17} />
                  <span>{ar ? item.labelAr : item.labelEn}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className={styles.main}>
        {toast ? (
          <div className={styles.toast} role="status" aria-live="polite">
            <span>{toast}</span>
            <button type="button" className={styles.toastDismiss} onClick={onDismiss}>
              {ar ? "إغلاق" : "Dismiss"}
            </button>
          </div>
        ) : null}
        {children}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>
            {ar
              ? "EgyHealth 360 · جلسة عرض تجريبية داخل المتصفح — بيانات اصطناعية وليست رعاية حية."
              : "EgyHealth 360 · Browser-only synthetic demo — not live clinical care."}
          </span>
          <span>
            {ar ? "الأرقام القياسية 0-9 · المواعيد بوضوح زمني صريح" : "Latin numerals · Explicit dates"}
          </span>
        </div>
      </footer>
    </FoundationScope>
  );
}
