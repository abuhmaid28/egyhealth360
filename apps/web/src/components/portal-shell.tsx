"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { createDemoAdapter } from "../lib/mock/adapter";
import type { Role } from "../lib/api/contracts";
import { accountName } from "../lib/presentation";
import { myCareCopy } from "../lib/patient-my-care-copy";
import { LanguageSwitch, useLocale } from "../lib/i18n/context";
import { useApp } from "./context";
import { Icon, type IconName } from "./ui";
import care from "./patient-my-care.module.css";
import styles from "./portal-shell.module.css";

type Destination = [string, string, IconName];
const homes: Record<Role, string> = {
  PATIENT: "/patient",
  CLINICIAN: "/doctor",
  PHARMACY_STAFF: "/pharmacy",
  LAB_STAFF: "/laboratory",
  ADMIN: "/admin",
};
const roles: [Role, string][] = [
  ["PATIENT", "Patient"],
  ["CLINICIAN", "Doctor"],
  ["PHARMACY_STAFF", "Pharmacy"],
  ["LAB_STAFF", "Laboratory"],
  ["ADMIN", "Admin"],
];
export interface PortalShellProps {
  children: ReactNode;
  onLogout: () => Promise<void>;
  onRoleChange?: (role: Role) => Promise<void>;
  toast: string;
  onDismiss: () => void;
  mainClassName?: string;
  footerNote?: string;
  screenState?: {
    value: string;
    change: (value: string) => void;
    items: [string, string][];
  };
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
  screenState,
}: PortalShellProps) {
  const { api, session } = useApp();
  const { locale, t } = useLocale();
  const path = usePathname();
  const c = myCareCopy[locale];
  const patient = session.role === "PATIENT";
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
    items.map(([href, label]) => (
      <Link
        key={href}
        href={href}
        aria-current={active(href) ? "page" : undefined}
      >
        {label}
      </Link>
    ));
  return (
    <div
      className={`${care.root} ${styles.root}`}
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-portal-shell={session.role}
    >
      <a className={care.skip} href="#main">
        {c.skip}
      </a>
      <header className={care.header}>
        <div className={`${care.headerInner} ${styles.header}`}>
          <Link
            href={home}
            className={care.wordmark}
            aria-label="EgyHealth 360"
          >
            <bdi dir="ltr">EgyHealth 360</bdi>
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
          <div className={`${care.utilities} ${styles.utilities}`}>
            <span className={styles.mode} data-session-mode={api.mode}>
              {api.mode === "live"
                ? c.live
                : locale === "ar"
                  ? "وضع التجربة"
                  : "Demo mode"}
            </span>
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
                <Link href={settings}>{c.settings}</Link>
                <button onClick={() => void onLogout()}>{c.signOut}</button>
              </div>
            </details>
          </div>
        </div>
        {secondary.length > 0 && (
          <nav
            className={styles.secondary}
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
        {api.mode === "demo" && (
          <details
            className={care.demoTools}
            data-demo-utility
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.currentTarget.open = false;
                e.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary>
              <span className={care.demoLabel}>
                {c.demoUtility}
                <small className={care.demoIndication} data-demo-indication>
                  {c.demo}
                </small>
              </span>
              <Icon name="chevron" size={16} />
            </summary>
            <div className={care.demoPanel}>
              {onRoleChange && (
                <label>
                  {c.demoWorkspace}
                  <select
                    aria-label={c.demoWorkspace}
                    value={session.role}
                    onChange={(e) => void onRoleChange(e.target.value as Role)}
                  >
                    {roles.map(([role, label]) => (
                      <option key={role} value={role}>
                        {t(label)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {screenState && (
                <label>
                  {c.screenState}
                  <select
                    aria-label={c.screenState}
                    value={screenState.value}
                    onChange={(e) => screenState.change(e.target.value)}
                  >
                    {screenState.items.map(([value, label]) => (
                      <option key={value} value={value}>
                        {t(label)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                onClick={() => {
                  (api as ReturnType<typeof createDemoAdapter>).reset();
                  void onLogout();
                }}
              >
                {t("Reset demo journey")}
              </button>
            </div>
          </details>
        )}
      </footer>
      {patient && (
        <nav
          className={care.bottomNav}
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
