"use client";
import Image from "next/image";
import styles from "./brand-logo.module.css";

/** Approved source-exact DP02 lockups only; theme is presentation, never session state. */
export function BrandLogo({ decorative = false, language = "en" }: { decorative?: boolean; language?: "en" | "ar" }) {
  return <span className={styles.logo} data-dp02-logo dir="ltr"
    role={decorative ? undefined : "img"}
    aria-label={decorative ? undefined : "EgyHealth 360"}
    aria-hidden={decorative || undefined}>
    {(["light", "dark"] as const).map(theme => <picture className={styles[theme]} key={theme}>
      <source media="(max-width: 480px)" srcSet={`/brand/dp02/compact-${language}-${theme}.svg`} />
      <Image src={`/brand/dp02/primary-${language}-${theme}.svg`} alt="" width={780} height={145} unoptimized />
    </picture>)}
  </span>;
}
