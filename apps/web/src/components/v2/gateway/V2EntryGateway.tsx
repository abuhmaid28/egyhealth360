"use client";

import { useState } from "react";
import type { Role } from "../../../lib/api/contracts";
import { LanguageSwitch, useLocale } from "../../../lib/i18n/context";
import { FrontendV2ThemeSwitch } from "../frontend-v2-theme";
import {
  FoundationBrandMark,
  FoundationHeroVisual,
  FoundationIcon,
  FoundationScope,
  useFoundationTheme,
  verifyPublicAssetPath,
  type FoundationIconName,
} from "../foundation/index";
import styles from "./gateway.module.css";

interface RoleTile {
  role: Exclude<Role, "PATIENT">;
  icon: FoundationIconName;
  enTitle: string;
  arTitle: string;
  enSummary: string;
  arSummary: string;
  enCta: string;
  arCta: string;
  enBadge: string;
  arBadge: string;
  future?: boolean;
}

const SECONDARY_ROLES: readonly RoleTile[] = [
  {
    role: "CLINICIAN",
    icon: "stethoscope",
    enTitle: "Doctor Portal",
    arTitle: "بوابة الطبيب",
    enSummary: "Review day slots, manage availability, record visit notes, and release medication instructions.",
    arSummary: "متابعة جدول اليوم، وإدارة المواعيد المتاحة، وتوثيق الزيارة وإصدار تعليمات الدواء.",
    enCta: "Open Doctor",
    arCta: "دخول الطبيب",
    enBadge: "24h schedule",
    arBadge: "جدول ٢٤ ساعة",
  },
  {
    role: "PHARMACY_STAFF",
    icon: "pharmacy-rx",
    enTitle: "Pharmacy Workspace",
    arTitle: "بوابة الصيدلية",
    enSummary: "Track routed synthetic prescriptions strictly from Received to Preparing and Dispensed.",
    arSummary: "متابعة الوصفات المحوّلة من الاستلام إلى التجهيز حتى التسليم بالكامل.",
    enCta: "Open Pharmacy",
    arCta: "دخول الصيدلية",
    enBadge: "Routed orders",
    arBadge: "طلبات محولة",
  },
  {
    role: "LAB_STAFF",
    icon: "lab-flask",
    enTitle: "Laboratory",
    arTitle: "بوابة المعمل",
    enSummary: "Conceptual workflow preview only. Live diagnostic ordering and specimen results are not active.",
    arSummary: "تصور مستقبلي فقط. طلبات التحاليل ونتائج العينات غير مفعلة فعليًا.",
    enCta: "Preview Lab Concept",
    arCta: "معاينة فكرة المعمل",
    enBadge: "FUTURE · NOT LIVE",
    arBadge: "مستقبلي · غير متاح",
    future: true,
  },
  {
    role: "ADMIN",
    icon: "admin-shield",
    enTitle: "Operations Directory",
    arTitle: "إدارة التشغيل",
    enSummary: "Inspect organization directories and operational clinic status without clinical chart access.",
    arSummary: "مراجعة دليل الجهات والعيادات التشغيلية دون أي وصول للسجلات الطبية.",
    enCta: "Open Admin",
    arCta: "دخول الإدارة",
    enBadge: "Directory only",
    arBadge: "دليل تشغيلي",
  },
];

export function V2EntryGateway({
  enter,
  pendingRole: externalPending,
}: {
  enter: (role: Role) => Promise<void>;
  pendingRole?: boolean;
}) {
  const { locale } = useLocale();
  const { resolved } = useFoundationTheme();
  const [busyRole, setBusyRole] = useState<Role | null>(null);
  const [error, setError] = useState("");
  const ar = locale === "ar";
  const careSceneSrc = verifyPublicAssetPath("/visual-recovery/care-encounter.webp");

  async function launch(role: Role) {
    setError("");
    setBusyRole(role);
    try {
      await enter(role);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ar
            ? "تعذر فتح مساحة العرض التجريبية."
            : "Could not open the selected demo workspace.",
      );
    } finally {
      setBusyRole(null);
    }
  }

  return (
    <FoundationScope locale={locale} surface="gateway" className={styles.page}>
      <div className={styles.container} data-v2-gateway="true" data-frontend-v2>
        <header className={styles.header}>
          <span className={styles.brandWrap}>
            <FoundationBrandMark locale={locale} appearance={resolved} variant="primary" />
          </span>
          <div className={styles.controls}>
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
                <FoundationIcon name={resolved === "light" ? "sun" : "moon"} size={18} />
                <span>{ar ? "المظهر" : "Theme"}</span>
              </summary>
              <div className={styles.themePanel}>
                <FrontendV2ThemeSwitch />
              </div>
            </details>
          </div>
        </header>

        <section className={styles.hero} aria-labelledby="entry-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>
              <FoundationIcon name="sparkles" size={16} />
              <span>{ar ? "عرض تجريبي ببيانات اصطناعية · غير مرتبط بمستشفى حي" : "Synthetic Browser Demo · Not Live Clinical Care"}</span>
            </p>
            <h1 id="entry-title" className={styles.heroTitle}>
              {ar ? "كل رعايتك الصحية." : "All your connected care."}{" "}
              <em className={styles.heroTitleEm}>
                {ar ? "بخطوة واضحة واحدة." : "Clearly in one place."}
              </em>
            </h1>
            <p className={styles.heroLead}>
              {ar
                ? "استكشف العيادات المعتمدة، احجز موعدك، وراجع ملخصات الزيارات والوصفات في بيئة تجريبية آمنة داخل المتصفح فقط."
                : "Discover clinics, book a synthetic appointment slot, review released summaries, and inspect role workflows safely in your browser."}
            </p>
            <div className={styles.heroActions}>
              <button
                type="button"
                className={`demo-button ${styles.primaryCta}`}
                aria-label={ar ? "استكشف تجربة المريض" : "Explore the patient demo"}
                disabled={Boolean(busyRole || externalPending)}
                onClick={() => void launch("PATIENT")}
                data-gateway-primary-cta="PATIENT"
              >
                <FoundationIcon name="care-heart" size={20} />
                <span>{ar ? "ابدأ كبوابة المريض" : "Enter Patient Workspace"}</span>
                <FoundationIcon name="arrow" size={18} />
              </button>
              <a className={styles.secondaryLink} href="#demo-workspaces">
                <FoundationIcon name="list" size={18} />
                <span>{ar ? "كل البوابات (٥ أدوار)" : "All 5 role workspaces"}</span>
              </a>
            </div>
          </div>

          <div
            className={styles.heroVisualPane}
            aria-hidden="true"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(14,11,26,0.22), rgba(14,11,26,0.65)), url("${careSceneSrc}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <FoundationHeroVisual locale={locale} className={styles.heroSvg} />
            <div className={styles.previewFrame}>
              <img
                src={careSceneSrc}
                alt={ar ? "مشهد توضيحي اصطناعي لاستشارة طبية" : "Synthetic care encounter visual preview"}
                width={76}
                height={56}
                className={styles.previewThumb}
              />
              <div className={styles.previewCaption}>
                <strong>{ar ? "جلسة تجريبية محلية بالكامل" : "Browser-scoped synthetic session"}</strong>
                <span>
                  {ar
                    ? "لا يتم إرسال أي بيانات مريض أو طلبات شبكة لخادم حي."
                    : "Zero live network calls, zero live tokens, and isolated sample fixtures."}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="demo-workspaces" className={styles.rolesSection} aria-labelledby="demo-workspaces-heading">
          <div className={styles.sectionHead}>
            <h2 id="demo-workspaces-heading">
              {ar ? "اختر بوابة التجربة" : "Choose a synthetic workspace"}
            </h2>
            <p>
              {ar
                ? "يبدأ المريض كمسار أساسي، مع إمكانية اختبار بوابات الطبيب والصيدلية والمعمل المستقبلي والإدارة."
                : "Patient is the primary journey, alongside Doctor, Pharmacy, Future Lab preview, and Admin operations."}
            </p>
          </div>

          {error ? (
            <p className={styles.errorNote} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.roleGrid}>
            {SECONDARY_ROLES.map((item) => (
              <article key={item.role} className={styles.roleCard} data-gateway-role-card={item.role}>
                <div className={styles.roleTop}>
                  <FoundationIcon name={item.icon} size={24} />
                  <span
                    className={`${styles.roleBadge} ${item.future ? styles.roleBadgeFuture : ""}`}
                  >
                    {ar ? item.arBadge : item.enBadge}
                  </span>
                </div>
                <div>
                  <h3>{ar ? item.arTitle : item.enTitle}</h3>
                  <p>{ar ? item.arSummary : item.enSummary}</p>
                </div>
                <button
                  type="button"
                  className={styles.roleButton}
                  disabled={Boolean(busyRole || externalPending)}
                  onClick={() => void launch(item.role)}
                  data-gateway-role-btn={item.role}
                >
                  <span>{ar ? item.arCta : item.enCta}</span>
                  <FoundationIcon name="arrow" size={16} />
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className={`${styles.modeNote} entry-mode-note`} aria-label={ar ? "تنبيه وضع المعاينة" : "Preview mode notice"}>
          <FoundationIcon name="lock" size={20} />
          <p>
            {ar
              ? "تتيح هذه المعاينة العرض التجريبي داخل المتصفح فقط. تسجيل الدخول المباشر غير متاح حتى يتم توصيل الخادم."
              : "This preview offers the browser-only demo. Live sign-in is unavailable until a backend is connected."}
          </p>
        </aside>
      </div>
    </FoundationScope>
  );
}
