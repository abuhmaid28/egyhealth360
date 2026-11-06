"use client";
import { useLocale } from "../lib/i18n/context";
import { clinicianConsultationCopy } from "../lib/clinician-consultation-copy";
import { Loading } from "./ui";
import { LiveDocumentationWorkspace } from "./live-documentation";
import { ClinicianPresentationContext } from "./clinician-consultation-presentation";
import { PortalShell } from "./portal-shell";
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
  const { locale } = useLocale(),
    c = clinicianConsultationCopy[locale];
  return (
    <div
      className={`${patient.root} ${styles.root}`}
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
      data-clinician-master
    >
      <PortalShell
        onLogout={onLogout}
        toast={toast}
        onDismiss={onDismiss}
        mainClassName={styles.main}
        footerNote={c.independent}
      >
        <ClinicianPresentationContext.Provider value={true}>
          <LiveDocumentationWorkspace bookingId={bookingId} professional />
        </ClinicianPresentationContext.Provider>
      </PortalShell>
    </div>
  );
}
