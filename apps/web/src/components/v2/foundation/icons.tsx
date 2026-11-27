import type { ReactNode } from "react";

export type FoundationIconName =
  | "care-heart"
  | "calendar"
  | "stethoscope"
  | "pharmacy-rx"
  | "lab-flask"
  | "admin-shield"
  | "search"
  | "filter"
  | "clock"
  | "pin"
  | "lock"
  | "check"
  | "warning"
  | "user"
  | "arrow"
  | "logout"
  | "sun"
  | "moon"
  | "globe"
  | "doc"
  | "consent-hand"
  | "sparkles"
  | "building"
  | "list"
  | "close"
  | "plus";

const ICON_GLYPHS: Record<FoundationIconName, ReactNode> = {
  "care-heart": (
    <>
      <path
        d="M12 20.2C7.4 17.1 4 13.8 4 9.5A4.5 4.5 0 0 1 12 6.8a4.5 4.5 0 0 1 8 2.7c0 4.3-3.4 7.6-8 10.7Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path d="M12 20.2C7.4 17.1 4 13.8 4 9.5A4.5 4.5 0 0 1 12 6.8a4.5 4.5 0 0 1 8 2.7c0 4.3-3.4 7.6-8 10.7Z" />
      <path d="M9.5 11.5h2l1-2 1.2 3.5 1-1.5h1.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" fill="currentColor" fillOpacity="0.14" />
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18M8 14h3M13 14h3M8 17h4" />
    </>
  ),
  stethoscope: (
    <>
      <circle cx="18" cy="14" r="2.2" fill="currentColor" fillOpacity="0.18" />
      <path d="M6 4v5a4 4 0 0 0 8 0V4" />
      <path d="M10 13v3a4 4 0 0 0 8 0v-.5" />
      <circle cx="18" cy="14" r="2" />
    </>
  ),
  "pharmacy-rx": (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" fillOpacity="0.14" />
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M8 16V8h3.5a2.2 2.2 0 0 1 0 4.4H8m3 0 4.5 4.6m-4.5 0 4.5-4.6" />
    </>
  ),
  "lab-flask": (
    <>
      <path
        d="M9 4h6m-4.5 0v5.5L5.2 18a1.4 1.4 0 0 0 1.2 2h11.2a1.4 1.4 0 0 0 1.2-2l-5.3-8.5V4"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path d="M9 4h6m-4.5 0v5.5L5.2 18a1.4 1.4 0 0 0 1.2 2h11.2a1.4 1.4 0 0 0 1.2-2l-5.3-8.5V4M8 15h8" />
    </>
  ),
  "admin-shield": (
    <>
      <path
        d="M12 3 4.5 6.2v5.4c0 4.8 3.2 8.7 7.5 10.1 4.3-1.4 7.5-5.3 7.5-10.1V6.2L12 3Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path d="M12 3 4.5 6.2v5.4c0 4.8 3.2 8.7 7.5 10.1 4.3-1.4 7.5-5.3 7.5-10.1V6.2L12 3Z" />
      <path d="M9.2 12.2 11.2 14.2 15.2 9.8" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" fill="currentColor" fillOpacity="0.14" />
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16l-6 7.2v5.1l-4 1.7v-6.8L4 6Z" fill="currentColor" fillOpacity="0.14" />
      <path d="M4 6h16l-6 7.2v5.1l-4 1.7v-6.8L4 6Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="currentColor" fillOpacity="0.14" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v4.8l3.2 2" />
    </>
  ),
  pin: (
    <>
      <path
        d="M12 21s6-5.2 6-10.2a6 6 0 1 0-12 0C6 15.8 12 21 12 21Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path d="M12 21s6-5.2 6-10.2a6 6 0 1 0-12 0C6 15.8 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2.5" fill="currentColor" fillOpacity="0.16" />
      <rect x="5" y="11" width="14" height="9" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.14" />
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.8-5.1" />
    </>
  ),
  warning: (
    <>
      <path
        d="M12 4 3.5 19h17L12 4Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path d="M12 4 3.5 19h17L12 4Zm0 5.5v4.5m0 2.5h.01" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" fill="currentColor" fillOpacity="0.16" />
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  arrow: <path d="M5 12h14m-5.5-5.5L19 12l-5.5 5.5" />,
  logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16.5 14.5 12 10 7.5M14.5 12H4" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2m0 14v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
    </>
  ),
  moon: (
    <>
      <path
        d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="currentColor" fillOpacity="0.12" />
      <circle cx="12" cy="12" r="8.5" />
      <ellipse cx="12" cy="12" rx="4" ry="8.5" />
      <path d="M4 9.5h16M4 14.5h16" />
    </>
  ),
  doc: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.5" fill="currentColor" fillOpacity="0.14" />
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M8.5 8.5h7M8.5 12.5h7M8.5 16.5h4.5" />
    </>
  ),
  "consent-hand": (
    <>
      <path
        d="M7 12V7.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V11m0-3.5a1.5 1.5 0 0 1 3 0V13c0 4-2.5 7-6 7s-6-2.8-6-6v-2a1.5 1.5 0 0 1 3 0"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path d="M7 12V7.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V11m0-3.5a1.5 1.5 0 0 1 3 0V13c0 4-2.5 7-6 7s-6-2.8-6-6v-2a1.5 1.5 0 0 1 3 0" />
    </>
  ),
  sparkles: (
    <>
      <path
        d="m12 3 1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8-4.8-1.7 4.8-1.7L12 3Z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path d="m12 3 1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8-4.8-1.7 4.8-1.7L12 3ZM18 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" fill="currentColor" fillOpacity="0.14" />
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M9 8h2m2 0h2M9 12h2m2 0h2M10 20v-4h4v4" />
    </>
  ),
  list: <path d="M5 7h14M5 12h14M5 17h10" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
};

export function FoundationIcon({
  name,
  size = 20,
  className,
  label,
}: {
  name: FoundationIconName;
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-mirror-rtl={name === "arrow" ? "true" : undefined}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {ICON_GLYPHS[name]}
    </svg>
  );
}
