"use client";

import Link from "next/link";
import { useApp } from "../../context";
import { useLocale } from "../../../lib/i18n/context";
import { V2DemoShell } from "../shell/index";
import { PatientDemoV2 } from "./PatientDemoV2";
import { DoctorDemoV2 } from "./DoctorDemoV2";
import { PharmacyDemoV2 } from "./PharmacyDemoV2";
import { LaboratoryDemoV2 } from "./LaboratoryDemoV2";
import { AdminDemoV2 } from "./AdminDemoV2";
import type { Role } from "../../../lib/api/contracts";
import styles from "./demo-v2.module.css";

const ROLE_HOME: Record<Role, string> = {
  PATIENT: "/patient",
  CLINICIAN: "/doctor",
  PHARMACY_STAFF: "/pharmacy",
  LAB_STAFF: "/laboratory",
  ADMIN: "/admin",
};

export function DemoV2Router({
  path,
  onRoleChange,
  onLogout,
  toast,
  onDismiss,
}: {
  path: string;
  onRoleChange?: (role: Role) => Promise<void>;
  onLogout: () => void;
  toast: string;
  onDismiss: () => void;
}) {
  const { api, session } = useApp();
  const { locale } = useLocale();
  const ar = locale === "ar";

  // Fail closed: Demo V2 workspaces render ONLY when both api and session are demo.
  if (api.mode !== "demo" || session.mode !== "demo") {
    return null;
  }

  const home = ROLE_HOME[session.role];
  const cleanPath = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  const allowed = cleanPath === home || cleanPath.startsWith(`${home}/`);

  const renderNotFound = () => (
    <section className={styles.card} data-v2-not-found="true">
      <h1>{ar ? "الصفحة غير موجودة" : "Page not found"}</h1>
      <p className={styles.muted}>
        {ar
          ? "المسار المطلوب غير متاح داخل مساحة العمل الحالية."
          : "The requested route is not available in this demo workspace."}
      </p>
      <div className={styles.actionRow}>
        <Link href={home} className={styles.btnPrimary}>
          {ar ? "العودة إلى البوابة" : "Return to workspace"}
        </Link>
      </div>
    </section>
  );

  return (
    <V2DemoShell
      onRoleChange={onRoleChange}
      onLogout={onLogout}
      toast={toast}
      onDismiss={onDismiss}
    >
      {!allowed ? (
        <section className={styles.card}>
          <h1>{ar ? "اختر بوابة دورك الحالي" : "Open your active workspace"}</h1>
          <p className={styles.muted}>
            {ar
              ? "هذا المسار يتبع بوابة مختلفة عن الدور التجريبي الحالي."
              : "This URL belongs to another workspace role. Open your active workspace below."}
          </p>
          <div className={styles.actionRow}>
            <Link href={home} className={styles.btnPrimary}>
              {ar ? "فتح البوابة" : "Open workspace"}
            </Link>
          </div>
        </section>
      ) : session.role === "PATIENT" ? (
        <PatientDemoV2 path={cleanPath} />
      ) : session.role === "CLINICIAN" ? (
        <DoctorDemoV2 path={cleanPath} />
      ) : session.role === "PHARMACY_STAFF" ? (
        cleanPath === "/pharmacy" ? <PharmacyDemoV2 /> : renderNotFound()
      ) : session.role === "LAB_STAFF" ? (
        cleanPath === "/laboratory" ? <LaboratoryDemoV2 /> : renderNotFound()
      ) : cleanPath === "/admin" ? (
        <AdminDemoV2 />
      ) : (
        renderNotFound()
      )}
    </V2DemoShell>
  );
}
