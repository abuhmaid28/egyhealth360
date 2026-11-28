"use client";
import { BrandLogo } from "./brand-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { createDemoAdapter } from "../lib/mock/adapter";
import type { Role } from "../lib/api/contracts";
import { accountName } from "../lib/presentation";
import { myCareCopy } from "../lib/patient-my-care-copy";
import { LanguageSwitch, useLocale } from "../lib/i18n/context";
import { useApp } from "./context";
import { Icon, type IconName } from "./ui";
import care from "./patient-my-care.module.css";
import styles from "./portal-shell.module.css";

import { FrontendV2ThemeSwitch } from "./v2/frontend-v2-theme";
import { DemoV2Router } from "./v2/demo-v2/DemoV2Router";
import {
  isDemoV2QueryActive,
  resolveDemoV2PresentationOptIn,
} from "./v2/demo-v2/presentation-opt-in";
import v2 from "./v2/patient-doctor-layout.module.css";
import recovery from "./v2/visual-recovery.module.css";

type Destination = [string, string, IconName];
const homes: Record<Role, string> = {
  PATIENT: "/patient",
  CLINICIAN: "/doctor",
  PHARMACY_STAFF: "/pharmacy",
  LAB_STAFF: "/laboratory",
  ADMIN: "/admin",
};
const roles: [Role, string, IconName][] = [
  ["PATIENT", "Patient", "heart"],
  ["CLINICIAN", "Doctor", "calendar"],
  ["PHARMACY_STAFF", "Pharmacy", "pill"],
  ["LAB_STAFF", "Laboratory", "lab"],
  ["ADMIN", "Admin", "building"],
];
export interface PortalShellProps {
  children: ReactNode;
  onLogout: () => Promise<void>;
  onRoleChange?: (role: Role) => Promise<void>;
  toast: string;
  onDismiss: () => void;
  mainClassName?: string;
  footerNote?: string;
  patientMyCareV2?: boolean;
}
/** Presentation only: destinations remain role scoped; screens retain their own Live readers and commands. */
export function PortalShell({
  children,
  onLogout,
  onRoleChange,
  toast,
  onDismiss,
  mainClassName,
  footerNote,
  patientMyCareV2 = false,
}: PortalShellProps) {
  const { api, session } = useApp();
  const { locale, t } = useLocale();
  const path = usePathname();
  const isDemoPair = api.mode === "demo" && session.mode === "demo";
  const previewDefault =
    process.env.EH_UI_PREVIEW_DEMO_ONLY === "1" ||
    process.env.EH_UI_LIVE_CONFIGURED === "0";
  const [v2OptIn, setV2OptIn] = useState(() =>
    isDemoPair
      ? resolveDemoV2PresentationOptIn({
          previewDemoOnly: process.env.EH_UI_PREVIEW_DEMO_ONLY === "1",
          liveConfigured: process.env.EH_UI_LIVE_CONFIGURED !== "0",
        })
      : false,
  );
  useEffect(() => {
    if (!isDemoPair) {
      setV2OptIn(false);
      return;
    }
    if (
      resolveDemoV2PresentationOptIn({
        previewDemoOnly: process.env.EH_UI_PREVIEW_DEMO_ONLY === "1",
        liveConfigured: process.env.EH_UI_LIVE_CONFIGURED !== "0",
      })
    ) {
      setV2OptIn(true);
    }
  }, [isDemoPair, path]);
  const demoV2Active =
    isDemoPair &&
    (previewDefault || v2OptIn || isDemoV2QueryActive()) &&
    typeof DemoV2Router === "function";
  if (demoV2Active) {
    return (
      <DemoV2Router
        path={path}
        onRoleChange={onRoleChange}
        onLogout={() => void onLogout()}
        toast={toast}
        onDismiss={onDismiss}
      />
    );
  }
  const c = myCareCopy[locale];
  const patient = session.role === "PATIENT";
  const myCareV2 = patientMyCareV2 && patient && path === "/patient";
  const clinician = session.role === "CLINICIAN";
  const home = homes[session.role];
  const name = accountName(session, t);
  const settings = `${home}/settings`;
  const primary: Destination[] = patient
    ? [
        [home, c.myCare, "grid"],
        ["/patient/discover", c.findCare, "search"],
      ]
    : clinician
      ? [["/doctor/schedule", t("My schedule"), "calendar"]]
      : session.role === "ADMIN"
        ? [
            [home, t("Operations overview"), "grid"],
            ["/admin/organizations", t("Organizations & clinics"), "building"],
            ["/admin/users", t("Users"), "user"],
          ]
        : [
            [
              home,
              t(
                session.role === "LAB_STAFF"
                  ? "Request inbox"
                  : "Prescription inbox",
              ),
              session.role === "LAB_STAFF" ? "lab" : "pill",
            ],
          ];
  const secondary: Destination[] = patient
    ? [
        ["/patient/appointments", c.appointments, "calendar"],
        [
          api.mode === "live" ? "/patient/summaries" : "/patient/record",
          t("Visit summary"),
          "record",
        ],
        ["/patient/follow-up", t("Follow-up"), "heart"],
        ["/patient/history", c.records, "record"],
        ...(api.mode === "demo"
          ? ([
              ["/patient/medications", t("Medications"), "pill"],
              ["/patient/laboratory", t("Laboratory"), "lab"],
            ] as Destination[])
          : []),
      ]
    : clinician
      ? [
          ["/doctor/availability", t("Availability"), "clock"],
          ...(api.mode === "live"
            ? ([
                ["/doctor/summaries", t("Released visit summaries"), "record"],
              ] as Destination[])
            : []),
        ]
      : session.role === "ADMIN"
        ? [
            ["/admin/directory", t("Directory"), "search"],
            ["/admin/scheduling", t("Scheduling settings"), "settings"],
          ]
        : [];
  const active = (href: string) =>
    path === href ||
    (href !== home && path.startsWith(`${href}/`)) ||
    (href === "/patient/discover" &&
      /^\/patient\/(doctors|clinics)\//.test(path)) ||
    (href === "/doctor/schedule" &&
      (path === "/doctor" ||
        /^\/doctor\/(appointments|consultation)\//.test(path)));
  const links = (items: Destination[]) =>
    items.map(([href, label, icon]) => (
      <Link
        key={href}
        href={href}
        aria-current={active(href) ? "page" : undefined}
      >
        <Icon name={icon} size={17} />
        <span>{label}</span>
      </Link>
    ));
  return (
    <div
      className={`${care.root} ${styles.root} ${v2.root} ${recovery.shell}${myCareV2 ? ` ${styles.patientMyCareV2}` : ""}`}
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-portal-shell={session.role}
      data-frontend-v2
      data-frontend-v2-content={patient || clinician || undefined}
      data-patient-my-care-v2={myCareV2 || undefined}
    >
      <a className={care.skip} href="#main" onClick={myCareV2 ? (event) => {
        const main = document.getElementById("main");
        if (!main) return;
        event.preventDefault();
        main.focus({ preventScroll: true });
        main.scrollIntoView({ block: "start" });
      } : undefined}>
        {c.skip}
      </a>
      <header className={`${care.header} ${recovery.header}`}>
        <div className={`${care.headerInner} ${styles.header}`}>
          <Link
            href={home}
            className={care.wordmark}
            aria-label="EgyHealth 360"
          >
            <BrandLogo decorative language={locale} />
          </Link>
          <nav
            className={`${care.primaryNav} ${styles.primary}`}
            aria-label={t("Main navigation")}
          >
            {links(primary)}
            {clinician && (
              <span
                className={styles.unavailable}
                aria-disabled="true"
                title={
                  locale === "ar"
                    ? "مش متاح في الواجهة دي"
                    : "Unavailable in this interface"
                }
              >
                {locale === "ar" ? "مرضاي" : "My patients"}
              </span>
            )}
          </nav>
          <div className={`${care.utilities} ${styles.utilities} ${recovery.headerUtilities}`}>
            <span className={styles.mode} data-session-mode={api.mode} data-demo-indication={api.mode === "demo" || undefined}>
              {api.mode === "live"
                ? c.live
                : locale === "ar"
                  ? "وضع التجربة"
                  : "Demo mode"}
            </span>
            {api.mode === "demo" && session.mode === "demo" && onRoleChange && (
              <details
                className={recovery.workspace}
                data-workspace-switch
                onKeyDown={(event) => {
                  if (event.key !== "Escape") return;
                  event.currentTarget.querySelector("summary")?.focus();
                  event.currentTarget.open = false;
                }}
              >
                <summary>
                  <Icon name="grid" size={17} />
                  <span>{locale === "ar" ? "بدّل مساحة العمل" : "Switch workspace"}</span>
                  <Icon name="chevron" size={15} />
                </summary>
                <div className={recovery.workspaceList}>
                  {roles.map(([role, label, icon]) => (
                    <button
                      key={role}
                      type="button"
                      data-workspace-role={role}
                      aria-current={role === session.role ? "true" : undefined}
                      onClick={(event) => {
                        const menu = event.currentTarget.closest("details");
                        if (menu) {
                          menu.querySelector("summary")?.focus();
                          menu.open = false;
                        }
                        if (role !== session.role) void onRoleChange(role);
                      }}
                    >
                      <Icon name={icon} size={19} />
                      <span>{t(label)}</span>
                      {role === session.role && <Icon name="check" size={16} />}
                    </button>
                  ))}
                </div>
              </details>
            )}
            <LanguageSwitch />
            <details
              className={styles.account}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.currentTarget.open = false;
                  e.currentTarget.querySelector("summary")?.focus();
                }
              }}
            >
              <summary className={care.avatar} aria-label={c.account}>
                <Icon name="user" size={18} />
              </summary>
              <div>
                <bdi>{name}</bdi>
                <FrontendV2ThemeSwitch />
                <Link href={settings}>{c.settings}</Link>
                {api.mode === "demo" && session.mode === "demo" && (
                  <button
                    type="button"
                    onClick={() => {
                      (api as ReturnType<typeof createDemoAdapter>).reset();
                      void onLogout();
                    }}
                  >
                    {t("Reset demo journey")}
                  </button>
                )}
                <button onClick={() => void onLogout()}>{c.signOut}</button>
              </div>
            </details>
          </div>
        </div>
        {!myCareV2 && secondary.length > 0 && (
          <nav
            className={`${styles.secondary} ${recovery.secondaryNav}`}
            aria-label={
              locale === "ar" ? "روابط مساحة العمل" : "Workspace navigation"
            }
          >
            {links(secondary)}
            <Link
              href={settings}
              aria-current={active(settings) ? "page" : undefined}
            >
              {c.settings}
            </Link>
          </nav>
        )}
      </header>
      <main id="main" className={mainClassName ?? styles.content} tabIndex={-1}>
        {children}
      </main>
      <footer className={care.footer}>
        <bdi dir="ltr">© 2026 EgyHealth 360</bdi>
        {footerNote && <span>{footerNote}</span>}
        <button onClick={() => void onLogout()}>{c.signOut}</button>
      </footer>
      {patient && !myCareV2 && (
        <nav
          className={`${care.bottomNav} ${recovery.mobileNav}`}
          aria-label={c.primary}
          data-bottom-navigation
        >
          {[
            ...primary,
            ["/patient/history", c.records, "record"],
            [settings, c.account, "user"] as Destination,
          ].map(([href, label, icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
            >
              <Icon name={icon as IconName} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      )}
      {toast && (
        <div className={care.toast} role="status">
          <span>{t(toast)}</span>
          <button onClick={onDismiss} aria-label={c.dismiss}>
            <Icon name="close" />
          </button>
        </div>
      )}
    </div>
  );
}
