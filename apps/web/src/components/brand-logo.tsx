"use client";
import styles from "./brand-logo.module.css";

/** Temporary text-only preview wordmark until AP05 brand rights/trademark proofs close. */
export function BrandLogo({
  decorative = false,
  language = "en",
}: {
  decorative?: boolean;
  language?: "en" | "ar";
}) {
  return (
    <span
      className={styles.logo}
      data-preview-brand="text-only"
      dir={language === "ar" ? "rtl" : "ltr"}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "EgyHealth 360"}
      aria-hidden={decorative || undefined}
    >
      <span className={styles.wordmark}>
        <span>{language === "ar" ? "إيجي هيلث" : "EgyHealth"}</span>
        <span className={styles.accent}>360</span>
      </span>
    </span>
  );
}
