import type { Locale } from "../../../lib/i18n/catalog";
import type { FoundationAppearance } from "./theme";
import { verifyPublicAssetPath } from "./asset-registry";

export function FoundationBrandMark({
  locale,
  appearance,
  variant = "primary",
  className,
}: {
  locale: Locale;
  appearance: FoundationAppearance;
  variant?: "primary" | "compact";
  className?: string;
}) {
  const polarity = appearance === "light" ? "light" : "dark";
  const src = verifyPublicAssetPath(`/brand/dp02/${variant}-${locale}-${polarity}.svg`);
  const dims =
    variant === "compact"
      ? locale === "ar"
        ? { width: 156, height: 34 }
        : { width: 148, height: 34 }
      : locale === "ar"
        ? { width: 184, height: 40 }
        : { width: 176, height: 40 };

  return (
    <img
      src={src}
      alt="EgyHealth 360"
      width={dims.width}
      height={dims.height}
      data-dp02-logo
      className={className}
    />
  );
}

const DEMO_PORTRAITS: Record<string, string> = {
  "mariam-hassan": "/visual-recovery/mariam.webp",
  "omar-khaled": "/visual-recovery/omar.webp",
  "sara-adel": "/visual-recovery/sara.webp",
};

export function FoundationPortrait({
  id,
  name,
  isDemoSurface,
  className,
}: {
  id: string;
  name: string;
  isDemoSurface: boolean;
  className?: string;
}) {
  const mapped = isDemoSurface ? DEMO_PORTRAITS[id] : undefined;
  const src = mapped ? verifyPublicAssetPath(mapped) : undefined;
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={64}
        height={64}
        className={className}
        data-demo-portrait={id}
      />
    );
  }
  const letters = name
    .replace(/^(Dr\.|د\.|دكتور|دكتورة)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className={className} aria-hidden="true">
      {letters || "EH"}
    </span>
  );
}

export function FoundationHeroVisual({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 420 280"
      role="img"
      aria-label={
        locale === "ar"
          ? "رسم توضيحي لمسار الرعاية المتصلة في EgyHealth 360"
          : "Connected care network architectural motif"
      }
      className={className}
    >
      <defs>
        <linearGradient id="ehHeroCard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#613dc8" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#ffb88b" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id="ehPulseLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="55%" stopColor="#ffb88b" />
          <stop offset="100%" stopColor="#8ef0c7" />
        </linearGradient>
      </defs>
      <rect x="14" y="14" width="392" height="252" rx="28" fill="url(#ehHeroCard)" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.5" />
      <circle cx="318" cy="84" r="56" fill="#613dc8" fillOpacity="0.24" />
      <circle cx="318" cy="84" r="34" fill="#ffb88b" fillOpacity="0.2" />
      <circle cx="96" cy="204" r="46" fill="#613dc8" fillOpacity="0.18" />
      <path d="M56 150h72l20-44 26 76 22-46 18 14h150" fill="none" stroke="url(#ehPulseLine)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="44" y="42" width="164" height="58" rx="14" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.24" />
      <circle cx="68" cy="71" r="11" fill="#ffb88b" fillOpacity="0.9" />
      <rect x="90" y="61" width="92" height="8" rx="4" fill="currentColor" fillOpacity="0.65" />
      <rect x="90" y="76" width="62" height="6" rx="3" fill="currentColor" fillOpacity="0.35" />
      <rect x="218" y="182" width="160" height="54" rx="14" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.24" />
      <circle cx="242" cy="209" r="9" fill="#8ef0c7" fillOpacity="0.9" />
      <rect x="262" y="200" width="90" height="7" rx="3.5" fill="currentColor" fillOpacity="0.65" />
      <rect x="262" y="213" width="68" height="6" rx="3" fill="currentColor" fillOpacity="0.35" />
    </svg>
  );
}

export function FoundationPortalEmblem({
  role,
  className,
}: {
  role: "patient" | "doctor" | "pharmacy" | "laboratory" | "admin";
  className?: string;
}) {
  const accent =
    role === "patient"
      ? "#a78bfa"
      : role === "doctor"
        ? "#ffb88b"
        : role === "pharmacy"
          ? "#8ef0c7"
          : role === "laboratory"
            ? "#ffd188"
            : "#cbc3e6";

  return (
    <svg viewBox="0 0 72 72" aria-hidden="true" className={className}>
      <rect x="6" y="6" width="60" height="60" rx="18" fill={accent} fillOpacity="0.16" stroke={accent} strokeOpacity="0.52" strokeWidth="1.5" />
      {role === "patient" && (
        <path d="M36 49c-8-5.5-14-11-14-18.2A7.8 7.8 0 0 1 36 26a7.8 7.8 0 0 1 14 4.8C50 38 44 43.5 36 49Z" fill={accent} fillOpacity="0.34" stroke={accent} strokeWidth="2.2" />
      )}
      {role === "doctor" && (
        <>
          <path d="M24 21v9a10 10 0 0 0 20 0v-9" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M34 40v4a7 7 0 0 0 14 0v-2" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="48" cy="39" r="3.5" fill={accent} />
        </>
      )}
      {role === "pharmacy" && (
        <>
          <rect x="22" y="22" width="28" height="28" rx="6" fill={accent} fillOpacity="0.22" stroke={accent} strokeWidth="2.2" />
          <path d="M36 28v16M28 36h16" stroke={accent} strokeWidth="2.6" strokeLinecap="round" />
        </>
      )}
      {role === "laboratory" && (
        <path d="M30 22h12m-9 0v9l-9 15a2.2 2.2 0 0 0 1.9 3.3h20.2A2.2 2.2 0 0 0 48 46l-9-15v-9M28 41h16" fill={accent} fillOpacity="0.22" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
      )}
      {role === "admin" && (
        <>
          <path d="M36 19 22 25v10c0 8.5 5.6 15.6 14 18 8.4-2.4 14-9.5 14-18V25L36 19Z" fill={accent} fillOpacity="0.22" stroke={accent} strokeWidth="2.2" />
          <path d="m30 36 4.2 4.2 8.2-8.6" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
