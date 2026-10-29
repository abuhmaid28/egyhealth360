"use client";
import { safeErrorMessage } from "../lib/api/errors";
import { useLocale } from "../lib/i18n/context";
import Link from "next/link";
import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useEffect,
  useState,
  type ReactNode,
  type ComponentProps,
} from "react";

/** Native focus containment with explicit restoration after conditional React unmount. */
export function Modal({ children, ...props }: ComponentProps<"dialog">) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog {...props} ref={ref}>
      {children}
    </dialog>
  );
}
export type IconName =
  | "grid"
  | "search"
  | "calendar"
  | "record"
  | "pill"
  | "lab"
  | "arrow"
  | "clock"
  | "pin"
  | "check"
  | "heart"
  | "user"
  | "settings"
  | "logout"
  | "plus"
  | "chevron"
  | "close"
  | "menu"
  | "shield"
  | "building"
  | "activity";
const paths: Record<IconName, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v5m10-5v5M3 11h18m-13 4h2m4 0h2" />
    </>
  ),
  record: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6m-6 4h6m-6 4h4" />
    </>
  ),
  pill: (
    <>
      <path d="m8 4-4 4a6 6 0 0 0 8 8l4-4A6 6 0 0 0 8 4Zm-2 2 8 8" />
    </>
  ),
  lab: (
    <>
      <path d="M9 3h6m-5 0v7l-6 9a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M8 14h8" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  heart: (
    <path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1C-1 11 12 20 12 20s13-9 8-15Z" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  settings: (
    <>
      <path d="m10 3-1 3-3 1-3 3 2 2-1 4 3 3 3-1 2 3 4-1 1-3 3-2-1-4 2-2-3-3-4 1Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H4v16h5m5-12 4 4-4 4m-6-4h12" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h2m4 0h2M8 11h2m4 0h2m-6 10v-5h4v5" />
    </>
  ),
  activity: <path d="M2 12h5l3-8 4 16 3-8h5" />,
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      data-directional={["arrow", "chevron", "logout"].includes(name)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function Logo() {
  const { t } = useLocale();

  return (
    <span className="brand">
      <span className="brand-mark">
        <Icon name="plus" size={29} />
      </span>
      <span>
        {t("EgyHealth")}
        <b>{t("360")}</b>
        <small>{t("CONNECTED CARE. BETTER HEALTH.")}</small>
      </span>
    </span>
  );
}
export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  const { t } = useLocale();
  return (
    <span className={`badge ${tone}`}>
      <span className="status-dot" />
      {typeof children === "string" ? t(children) : children}
    </span>
  );
}
export function Avatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  return (
    <span className={`avatar ${large ? "large" : ""}`}>
      {name
        .replace("Dr. ", "")
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")}
    </span>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function CardTitle({
  title,
  href,
  action = "View all",
}: {
  title: string;
  href?: string;
  action?: string;
}) {
  const { t } = useLocale();
  return (
    <div className="card-title">
      <h2>{t(title)}</h2>
      {href && (
        <Link href={href} className="text-link">
          {t(action)}
          <Icon name="arrow" size={16} />
        </Link>
      )}
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  description: string;
  children?: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{t(eyebrow ?? "")}</p>}
        <h1>{typeof title === "string" ? t(title) : title}</h1>
        <p className="muted">{t(description)}</p>
      </div>
      {children}
    </div>
  );
}
export function Empty({
  title = "A fresh start",
  description = "Your information will appear here as your care journey continues.",
  href,
  action,
}: {
  title?: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  const { t } = useLocale();
  return (
    <div className="empty">
      <span className="icon-tile">
        <Icon name="calendar" size={28} />
      </span>
      <h3>{t(title)}</h3>
      <p>{t(description)}</p>
      {href && (
        <Link className="button primary" href={href}>
          {t(action ?? "Find a doctor")}
          <Icon name="arrow" size={16} />
        </Link>
      )}
    </div>
  );
}
export function Loading() {
  const { t } = useLocale();

  return (
    <div className="loading" role="status" aria-label={t("Loading")}>
      <div className="skeleton wide" />
      <div className="skeleton" />
      <div className="skeleton tall" />
      <span className="muted">{t("Loading your workspace…")}</span>
    </div>
  );
}
export type Preview = "ready" | "loading" | "empty" | "error";
export function useResource<T>(
  load: () => Promise<T>,
  dependencies: unknown[],
) {
  const [state, setState] = useState<{
    data?: T;
    error?: string;
    pending: boolean;
  }>({ pending: true });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ pending: true });
    load()
      .then((data) => {
        if (active) setState({ data, pending: false });
      })
      .catch((e) => {
        if (active)
          setState({
            error: safeErrorMessage(e),
            pending: false,
          });
      });
    return () => {
      active = false;
    };
  }, [...dependencies, version]);
  return { ...state, retry: () => setVersion((v) => v + 1) };
}
export function Resource<T>({
  resource,
  children,
  preview = "ready",
}: {
  resource: ReturnType<typeof useResource<T>>;
  children: (data: T) => ReactNode;
  preview?: Preview;
}) {
  const { t } = useLocale();

  if (preview === "loading" || resource.pending) return <Loading />;
  if (preview === "error" || resource.error)
    return (
      <div className="error-panel" role="alert">
        <Icon name="activity" size={28} />
        <h3>{t("We couldn’t load this view")}</h3>
        <p>
          {t(
            resource.error ??
              "Demo error preview. Choose “Populated” to restore the view.",
          )}
        </p>
        <SessionRecovery message={resource.error} />
        <button className="button secondary" onClick={resource.retry}>
          {t("Try again")}
        </button>
      </div>
    );
  if (preview === "empty")
    return (
      <Empty
        title={t("Nothing here yet")}
        description={t(
          "This is the empty-state preview. Choose “Populated” to resume the demo.",
        )}
      />
    );
  return resource.data !== undefined ? children(resource.data) : null;
}
export function SessionRecovery({ message }: { message?: string }) {
  const { t } = useLocale();
  if (
    message !== "Your session has ended. Please sign in again." &&
    message !==
      "Request verification failed. Refresh your session before retrying."
  )
    return null;
  return (
    <button
      type="button"
      className="button secondary"
      onClick={() => window.location.reload()}
    >
      {t("Refresh session")}
    </button>
  );
}
export function Detail({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: ReactNode;
  children: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="detail">
      <span className="icon-tile">
        <Icon name={icon} />
      </span>
      <div>
        <small className="muted">
          {typeof title === "string" ? t(title) : title}
        </small>
        <div>{children}</div>
      </div>
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const { t } = useLocale();
  const generatedId = useId();
  const control = isValidElement<{ id?: string; "aria-describedby"?: string }>(
    children,
  )
    ? children
    : null;
  const id = control?.props.id ?? generatedId;
  const description =
    [control?.props["aria-describedby"], hint ? `${id}-hint` : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{t(label)}</label>
      {control
        ? cloneElement(control, { id, "aria-describedby": description })
        : children}
      {hint && (
        <small id={`${id}-hint`} className="muted">
          {t(hint ?? "")}
        </small>
      )}
    </div>
  );
}
export const date = (value: string, timeZone = "Africa/Cairo") =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(new Date(value));
export const time = (value: string, timeZone = "Africa/Cairo") =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
