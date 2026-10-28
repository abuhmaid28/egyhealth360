"use client";
import { safeErrorMessage } from "../lib/api/errors";
import { LanguageSwitch, useLocale } from "../lib/i18n/context";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  HealthcareAdapter,
  Mode,
  Role,
  Session,
} from "../lib/api/contracts";
import { createDemoAdapter } from "../lib/mock/adapter";
import { createLiveAdapter } from "../lib/api/live";
import { createBookingService } from "../lib/api/booking";
import { previewDemoBooking } from "../lib/mock/booking";
import { Context } from "./context";
import {
  Avatar,
  Field,
  Icon,
  Loading,
  Logo,
  type IconName,
  type Preview,
} from "./ui";
import { PatientScreen } from "./patient";
import { DoctorScreen } from "./doctor";
import { OperationsScreen } from "./operations";
export const homes: Record<Role, string> = {
  PATIENT: "/patient",
  CLINICIAN: "/doctor",
  PHARMACY_STAFF: "/pharmacy",
  LAB_STAFF: "/laboratory",
  ADMIN: "/admin",
};
const roles: { role: Role; name: string }[] = [
  { role: "PATIENT", name: "Patient" },
  { role: "CLINICIAN", name: "Doctor" },
  { role: "PHARMACY_STAFF", name: "Pharmacy" },
  { role: "LAB_STAFF", name: "Laboratory" },
  { role: "ADMIN", name: "Admin" },
];
const navigation: Record<Role, [string, string, IconName][]> = {
  PATIENT: [
    ["/patient", "Overview", "grid"],
    ["/patient/discover", "Find a doctor", "search"],
    ["/patient/appointments", "Appointments", "calendar"],
    ["/patient/record", "Medical record", "record"],
    ["/patient/medications", "Medications", "pill"],
    ["/patient/laboratory", "Laboratory", "lab"],
    ["/patient/follow-up", "Follow-up", "heart"],
  ],
  CLINICIAN: [
    ["/doctor", "Overview", "grid"],
    ["/doctor/schedule", "My schedule", "calendar"],
    ["/doctor/availability", "Availability", "clock"],
  ],
  PHARMACY_STAFF: [["/pharmacy", "Prescription inbox", "pill"]],
  LAB_STAFF: [["/laboratory", "Request inbox", "lab"]],
  ADMIN: [
    ["/admin", "Operations overview", "grid"],
    ["/admin/organizations", "Organizations & clinics", "building"],
    ["/admin/users", "Users", "user"],
    ["/admin/directory", "Directory", "search"],
    ["/admin/scheduling", "Scheduling settings", "settings"],
  ],
};
export function Application() {
  const { t } = useLocale();

  const pathname = usePathname();
  const router = useRouter();
  const [api, setApi] = useState<HealthcareAdapter>();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<Preview>("ready");
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState("");
  const [mobile, setMobile] = useState(false);
  const [compact, setCompact] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const booking = useMemo(() => api && createBookingService(api), [api]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const sync = () => {
      setCompact(media.matches);
      if (!media.matches) setMobile(false);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled), select:not(:disabled)",
        ) ?? [],
      );
    controls()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobile(false);
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keyboard);
      menuButton.current?.focus();
    };
  }, [mobile]);
  useEffect(() => {
    let active = true;
    let mode: Mode = "demo";
    try {
      if (localStorage.getItem("eh360-ui-mode") === "live") mode = "live";
    } catch {
      /* Default to demo without storage. */
    }
    const adapter =
      mode === "live"
        ? createLiveAdapter()
        : createDemoAdapter(window.localStorage);
    setApi(adapter);
    adapter.session().then((s) => {
      if (active) {
        setSession(s);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    setMobile(false);
    setPreview("ready");
  }, [pathname]);
  const chooseMode = (mode: Mode) => {
    try {
      localStorage.setItem("eh360-ui-mode", mode);
    } catch {
      /* In-memory mode still works. */
    }
    const adapter =
      mode === "live"
        ? createLiveAdapter()
        : createDemoAdapter(window.localStorage);
    setApi(adapter);
    return adapter;
  };
  const enter = async (role: Role, path?: string) => {
    const demo = chooseMode("demo") as ReturnType<typeof createDemoAdapter>;
    const s = await demo.enter(role);
    setSession(s);
    setRefresh((v) => v + 1);
    router.push(path?.startsWith(`${homes[role]}/`) ? path : homes[role]);
  };
  const logout = async () => {
    try {
      await api?.logout();
      setSession(null);
      router.push("/login");
    } catch (e) {
      setToast(safeErrorMessage(e));
    }
  };
  if (!ready || !api || !booking)
    return (
      <main className="boot">
        <Logo />
        <Loading />
      </main>
    );
  if (!session)
    return (
      <Login
        enter={enter}
        onLive={async (email, password) => {
          const live = chooseMode("live");
          const s = await live.login(email, password);
          setSession(s);
          router.push(homes[s.role]);
        }}
      />
    );
  const allowed =
    pathname === homes[session.role] ||
    pathname.startsWith(`${homes[session.role]}/`);
  const detailTitle = pathname.startsWith("/patient/doctors/")
    ? "Doctor profile"
    : pathname.startsWith("/patient/clinics/")
      ? "Clinic & location"
      : pathname.startsWith("/patient/appointments/")
        ? "Your appointment"
        : pathname.startsWith("/doctor/appointments/")
          ? "Patient appointment"
          : pathname.startsWith("/doctor/consultation/")
            ? "Consultation workspace"
            : pathname.endsWith("/settings")
              ? "Profile & settings"
              : pathname === "/patient/history"
                ? "Consultations & history"
                : "Care workspace";
  const page =
    navigation[session.role].find((n) => n[0] === pathname)?.[1] ?? detailTitle;
  return (
    <Context.Provider
      value={{
        api,
        booking,
        session,
        preview,
        refresh,
        notify: setToast,
        changed: () => setRefresh((v) => v + 1),
        openDemoWorkspace: enter,
        startDemoBooking: async (provider, slot, reason) => {
          const demo = chooseMode("demo") as ReturnType<
            typeof createDemoAdapter
          >;
          const { session: synthetic, appointment } = await previewDemoBooking(
            demo,
            provider,
            slot,
            reason,
          );
          setSession(synthetic);
          setRefresh((v) => v + 1);
          return appointment;
        },
      }}
    >
      <a className="skip" href="#main">
        {t("Skip to content")}
      </a>
      {mobile && (
        <button
          className="nav-backdrop"
          tabIndex={-1}
          aria-label={t("Close navigation")}
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        ref={sidebar}
        inert={compact && !mobile}
        className={`sidebar ${mobile ? "open" : ""}`}
      >
        {compact && (
          <button
            className="icon-button drawer-close"
            aria-label={t("Close navigation")}
            onClick={() => setMobile(false)}
          >
            <Icon name="close" />
          </button>
        )}
        <Link href={homes[session.role]} className="logo-link">
          <Logo />
        </Link>
        <div className="workspace-label">
          {t("{role} workspace", {
            role: t(roles.find((r) => r.role === session.role)?.name ?? ""),
          })}
        </div>
        <nav aria-label={t("Main navigation")}>
          {navigation[session.role].map(([href, label, icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={pathname === href ? "active" : ""}
            >
              <Icon name={icon} />
              <span>{t(label)}</span>
              {pathname === href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-note">
            <span className="icon-tile">
              <Icon name="shield" />
            </span>
            <strong>{t("Your care, connected.")}</strong>
            <p>{t("One place for every step of your health journey.")}</p>
          </div>
          <Link
            href={`${homes[session.role]}/settings`}
            className="nav-settings"
          >
            <Icon name="settings" />
            {t("Profile & settings")}
          </Link>
          <button onClick={logout} className="nav-settings">
            <Icon name="logout" />
            {t("Sign out")}
          </button>
          <div className="sidebar-user">
            <Avatar name={session.name} />
            <div>
              <strong>{session.name}</strong>
              <small>
                {session.mode === "demo"
                  ? t("Synthetic demo account")
                  : t("Live account")}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <div className="app-body" inert={mobile}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-toggle"
              ref={menuButton}
              aria-controls="workspace-navigation"
              aria-expanded={mobile}
              aria-label={t("Open navigation")}
              onClick={() => setMobile(true)}
            >
              <Icon name="menu" />
            </button>
            <span>{t("My workspace")}</span>
            <Icon name="chevron" size={13} />
            <strong>{t(page)}</strong>
          </div>
          <div className="top-actions">
            <LanguageSwitch />
            <span className={`mode-indicator ${api.mode}`}>
              {api.mode === "demo" ? t("Graduation demo") : t("Live API")}
            </span>
            {api.mode === "demo" && (
              <>
                <label className="sr-only" htmlFor="workspace-switch">
                  {t("Demo workspace")}
                </label>
                <select
                  id="workspace-switch"
                  aria-label={t("Demo workspace")}
                  value={session.role}
                  onChange={(e) => {
                    void enter(e.target.value as Role);
                  }}
                >
                  {roles.map((r) => (
                    <option key={r.role} value={r.role}>
                      {t(r.name)}
                    </option>
                  ))}
                </select>
              </>
            )}
            <Avatar name={session.name} />
          </div>
        </header>
        {api.mode === "demo" && (
          <div className="demo-bar">
            <span>
              <span className="status-dot" />
              {t(
                "Synthetic presentation · 28 October 2026 · browser-only state",
              )}
            </span>
            <details>
              <summary>{t("Demo controls")}</summary>
              <div className="demo-popover">
                <label>
                  {t("Screen state")}
                  <select
                    aria-label={t("Screen state")}
                    value={preview}
                    onChange={(e) => setPreview(e.target.value as Preview)}
                  >
                    <option value="ready">{t("Populated")}</option>
                    <option value="loading">{t("Loading")}</option>
                    <option value="empty">{t("Empty")}</option>
                    <option value="error">{t("Error")}</option>
                  </select>
                </label>
                <button
                  onClick={() => {
                    (api as ReturnType<typeof createDemoAdapter>).reset();
                    setSession(null);
                    router.push("/login");
                  }}
                >
                  {t("Reset demo journey")}
                </button>
              </div>
            </details>
          </div>
        )}
        <main id="main" className="content" tabIndex={-1}>
          {!allowed ? (
            <div className="empty">
              <h1>{t("Choose your workspace")}</h1>
              <p>
                {t("Your current account opens the")}{" "}
                {t(roles.find((r) => r.role === session.role)?.name ?? "")}{" "}
                {t("workspace.")}
              </p>
              <Link className="button primary" href={homes[session.role]}>
                {t("Open workspace")}
                <Icon name="arrow" />
              </Link>
            </div>
          ) : session.role === "PATIENT" ? (
            <PatientScreen path={pathname} />
          ) : session.role === "CLINICIAN" ? (
            <DoctorScreen path={pathname} />
          ) : (
            <OperationsScreen path={pathname} />
          )}
        </main>
        <footer className="footer">
          <span>{t("© 2026 EgyHealth 360")}</span>
          <span>{t("Care that stays with you.")}</span>
          <span>
            {t("English ·")}{" "}
            <span lang="ar" dir="rtl">
              {t("العربية")}
            </span>{" "}
            {t("available")}
          </span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {t(toast)}
          <button
            aria-label={t("Dismiss notification")}
            onClick={() => setToast("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
function Login({
  enter,
  onLive,
}: {
  enter: (role: Role) => Promise<void>;
  onLive: (email: string, password: string) => Promise<void>;
}) {
  const { t } = useLocale();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <main className="login">
      <section className="login-story">
        <Logo />
        <div>
          <p className="eyebrow">{t("A healthier journey starts here")}</p>
          <h1>
            {t("All your care.")}
            <br />
            {t("One connected")}
            <br />
            <em>{t("experience.")}</em>
          </h1>
          <p>
            {t(
              "From finding the right doctor to your next follow-up. Feel supported at every step.",
            )}
          </p>
          <div className="journey-art">
            <span>
              <Icon name="search" size={30} />
            </span>
            <i />
            <span>
              <Icon name="heart" size={30} />
            </span>
            <i />
            <span>
              <Icon name="record" size={30} />
            </span>
          </div>
          <div className="login-points">
            <span>
              <Icon name="check" />
              {t("Find your care team")}
            </span>
            <span>
              <Icon name="check" />
              {t("Keep your health story together")}
            </span>
            <span>
              <Icon name="check" />
              {t("Stay connected after your visit")}
            </span>
          </div>
        </div>
        <small>{t("Designed for the EgyHealth 360 graduation project.")}</small>
      </section>
      <section className="login-form">
        <div className="login-box">
          <LanguageSwitch />
          <span className="eyebrow">{t("Welcome to EgyHealth 360")}</span>
          <h2>{t("Good to see you.")}</h2>
          <p className="muted">
            {t("Sign in to continue your healthcare journey.")}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setError("");
              try {
                await onLive(email, password);
              } catch (e) {
                setError(safeErrorMessage(e));
              } finally {
                setPending(false);
              }
            }}
          >
            <Field label={t("Email address")}>
              <input
                type="email"
                autoComplete="username"
                required
                placeholder={t("you@example.com")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={t("Password")}>
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("Enter your password")}
              />
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {t(error)}
              </p>
            )}
            <button className="button primary full" disabled={pending}>
              {pending ? t("Signing in…") : t("Sign in with live account")}
              <Icon name="arrow" size={18} />
            </button>
          </form>
          <div className="divider">
            <span>{t("Here for the presentation?")}</span>
          </div>
          <button
            className="button demo-button full"
            onClick={() => {
              void enter("PATIENT");
            }}
          >
            {t("Explore the patient demo")}
            <Icon name="arrow" size={18} />
          </button>
          <div className="demo-role-links">
            {roles.slice(1).map((r) => (
              <button
                key={r.role}
                onClick={() => {
                  void enter(r.role);
                }}
              >
                {t(r.name)}
              </button>
            ))}
          </div>
          <p className="login-disclosure">
            <Icon name="shield" size={16} />
            {t(
              "The demo uses synthetic data saved only in this browser. It does not create a live session or backend clinical records.",
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
