"use client";
import Link from "next/link";
import { LanguageSwitch, useLocale } from "../lib/i18n/context";
import { clinicianConsultationCopy } from "../lib/clinician-consultation-copy";
import { Icon, Loading } from "./ui";
import { LiveDocumentationWorkspace } from "./live-documentation";
import { ClinicianPresentationContext } from "./clinician-consultation-presentation";
import patient from "./patient-my-care.module.css";
import styles from "./clinician-consultation.module.css";

export function ClinicianConsultationBoot() {
  const { locale } = useLocale();
  return (
    <div
      className={patient.root}
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
      data-clinician-master-boot
    >
      <header className={patient.header}>
        <div className={patient.headerInner}>
          <bdi dir="ltr" className={patient.wordmark}>
            EgyHealth 360
          </bdi>
        </div>
      </header>
      <main className={styles.main}>
        <Loading />
      </main>
    </div>
  );
}

export function ClinicianConsultation({
  bookingId,
  onLogout,
  toast,
  onDismiss,
}: {
  bookingId: string;
  onLogout: () => Promise<void>;
  toast: string;
  onDismiss: () => void;
}) {
  const { locale, t } = useLocale(),
    c = clinicianConsultationCopy[locale];
  return (
    <div
      className={`${patient.root} ${styles.root}`}
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
      data-clinician-master
    >
      <a className={patient.skip} href="#main">
        {t("Skip to content")}
      </a>
      <header className={patient.header}>
        <div className={`${patient.headerInner} ${styles.headerInner}`}>
          <Link
            className={patient.wordmark}
            href="/doctor/schedule"
            aria-label="EgyHealth 360"
          >
            <bdi dir="ltr">EgyHealth 360</bdi>
          </Link>
          <nav
            className={`${patient.primaryNav} ${styles.primaryNav}`}
            aria-label={t("Main navigation")}
          >
            <Link href="/doctor/schedule">{c.schedule}</Link>
            <span
              role="link"
              aria-disabled="true"
              tabIndex={0}
              title={c.unavailable}
              aria-label={`${c.people} · ${c.unavailable}`}
            >
              {c.people}
            </span>
          </nav>
          <div className={patient.utilities}>
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
              <summary className={patient.avatar} aria-label={c.account}>
                <Icon name="user" size={18} />
              </summary>
              <div>
                <Link href="/doctor/availability">{t("Availability")}</Link>
                <Link href="/doctor/settings">{t("Workspace settings")}</Link>
                <button onClick={() => void onLogout()}>{t("Sign out")}</button>
              </div>
            </details>
          </div>
        </div>
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        <ClinicianPresentationContext.Provider value={true}>
          <LiveDocumentationWorkspace bookingId={bookingId} professional />
        </ClinicianPresentationContext.Provider>
      </main>
      <footer className={styles.footer}>
        <bdi dir="ltr">© 2026 EgyHealth 360</bdi>
        <span>{c.independent}</span>
      </footer>
      {toast && (
        <div className={patient.toast} role="status">
          <span>{t(toast)}</span>
          <button onClick={onDismiss} aria-label={t("Dismiss notification")}>
            <Icon name="close" />
          </button>
        </div>
      )}
    </div>
  );
}
