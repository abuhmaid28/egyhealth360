"use client";
import { BrandLogo } from "./brand-logo";
import { safeErrorMessage } from "../lib/api/errors";
import { LanguageSwitch, useLocale } from "../lib/i18n/context";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  HealthcareAdapter,
  Mode,
  Role,
  Session,
} from "../lib/api/contracts";
import { createDemoAdapter } from "../lib/mock/adapter";
import { useLiveSession } from "./live-session";
import { createBookingService } from "../lib/api/booking";
import { Context } from "./context";
import { Field, Icon, Loading, type IconName, type Preview } from "./ui";
import { PortalShell } from "./portal-shell";
import care from "./patient-my-care.module.css";
import recovery from "./v2/visual-recovery.module.css";
import { useDemoTestScenario } from "./v2/demo-test-scenario";
import { FrontendV2ThemeSwitch, useFrontendV2Theme } from "./v2/frontend-v2-theme";
import { PatientScreen } from "./patient";
import { PatientMyCare } from "./patient-my-care";
import {
  ClinicianConsultation,
  ClinicianConsultationBoot,
} from "./clinician-consultation";
import { DoctorScreen } from "./doctor";
import { OperationsScreen } from "./operations";
export const homes: Record<Role, string> = {
  PATIENT: "/patient",
  CLINICIAN: "/doctor",
  PHARMACY_STAFF: "/pharmacy",
  LAB_STAFF: "/laboratory",
  ADMIN: "/admin",
};
const roles: { role: Role; name: string; icon: IconName; description: [string, string] }[] = [
  { role: "PATIENT", name: "Patient", icon: "heart", description: ["Find care and manage visits", "دور على رعاية وتابع زياراتك"] },
  { role: "CLINICIAN", name: "Doctor", icon: "calendar", description: ["Schedule and consultations", "المواعيد والاستشارات"] },
  { role: "PHARMACY_STAFF", name: "Pharmacy", icon: "pill", description: ["Prescription workspace", "مساحة عمل الروشتات"] },
  { role: "LAB_STAFF", name: "Laboratory", icon: "lab", description: ["Future concept", "تصوّر مستقبلي"] },
  { role: "ADMIN", name: "Admin", icon: "building", description: ["People and organizations", "الأشخاص والجهات"] },
];

// Only explicit browser Demo transitions set this presentation target.
let demoFocusDestination: string | null = null;

export function Application({
  liveConfigured = true,
}: {
  liveConfigured?: boolean;
}) {
  const liveSession = useLiveSession();
  const { reset: resetTheme } = useFrontendV2Theme();
  const { locale, t } = useLocale();

  const pathname = usePathname();
  const router = useRouter();
  const [api, setApi] = useState<HealthcareAdapter>();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const scenario = useDemoTestScenario(api?.mode === "demo");
  const preview: Preview = scenario === "uncertain" ? "ready" : scenario;
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (api?.mode !== "live" || !api.documentation) return;
    const source = api.documentation;
    if (!source.subscribe) return;
    let stamp = source.scopeStamp();
    return source.subscribe(() => {
      const next = source.scopeStamp();
      if (next !== stamp) { stamp = next; resetTheme(); }
    });
  }, [api, resetTheme]);
  const booking = useMemo(() => api && createBookingService(api), [api]);
  useEffect(() => {
    let active = true;
    const mode = liveSession.mode(liveConfigured);
    const adapter =
      mode === "live" ? liveSession.adapter() : liveSession.demo();
    setApi(adapter);
    const restored =
      mode === "live" && !liveConfigured
        ? Promise.resolve(null)
        : adapter.session();
    restored.then((s) => {
      if (active) {
        if (!s) resetTheme();
        setSession(s);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [liveSession, liveConfigured, resetTheme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!ready || !booking || session?.mode !== "demo" || pathname !== demoFocusDestination) return;
    const target = document.getElementById("main");
    if (!target) return;
    demoFocusDestination = null;
    target.focus({ preventScroll: true });
  }, [booking, pathname, ready, session]);
  const chooseMode = (mode: Mode) => {
    demoFocusDestination = null;
    resetTheme();
    liveSession.clear();
    const effective: Mode = mode === "live" && !liveConfigured ? "demo" : mode;
    liveSession.selectMode(effective);
    const adapter =
      effective === "live" ? liveSession.adapter() : liveSession.demo();
    setApi(adapter);
    return adapter;
  };
  const enter = async (role: Role, path?: string) => {
    if (session?.mode === "live") return;
    const demo = chooseMode("demo") as ReturnType<typeof createDemoAdapter>;
    const s = await demo.enter(role);
    setSession(s);
    setRefresh((v) => v + 1);
    const destination = path?.startsWith(`${homes[role]}/`) ? path : homes[role];
    demoFocusDestination = destination;
    router.push(destination);
  };
  const logout = async () => {
    try {
      await api?.logout();
      demoFocusDestination = null;
      resetTheme();
      setSession(null);
      router.push("/login");
    } catch (e) {
      setToast(safeErrorMessage(e));
    }
  };
  if (
    (!ready || !api || !booking) &&
    /^\/doctor\/consultation\/[^/]+\/documentation$/.test(pathname)
  )
    return <ClinicianConsultationBoot />;
  if (!ready || !api || !booking)
    return (
      <main className={`${care.root} boot`}>
        <span className={care.wordmark}><BrandLogo language={locale} /></span>
        <Loading />
      </main>
    );
  if (!session)
    return (
      <Login
        liveConfigured={liveConfigured}
        enter={enter}
        onLive={async (email, password) => {
          if (!liveConfigured) {
            throw new Error(
              "This preview offers the browser-only demo. Live sign-in is unavailable until a backend is connected.",
            );
          }
          const live = chooseMode("live");
          const s = await live.login(email, password);
          setSession(s);
          const home = homes[s.role];
          router.push(
            pathname === home || pathname.startsWith(`${home}/`)
              ? pathname
              : home,
          );
        }}
      />
    );
  if (session.role === "PATIENT" && pathname === "/patient")
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
        }}
      >
        <PatientMyCare
          onLogout={logout}
          onRoleChange={enter}
          toast={toast}
          onDismiss={() => setToast("")}
        />
      </Context.Provider>
    );
  if (
    api.mode === "live" &&
    session.role === "CLINICIAN" &&
    /^\/doctor\/consultation\/[^/]+\/documentation$/.test(pathname)
  )
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
        }}
      >
        <ClinicianConsultation
          bookingId={pathname.split("/")[3]}
          onLogout={logout}
          toast={toast}
          onDismiss={() => setToast("")}
        />
      </Context.Provider>
    );
  const allowed =
    pathname === homes[session.role] ||
    pathname.startsWith(`${homes[session.role]}/`);
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
      }}
    >
      <PortalShell
        onLogout={logout}
        onRoleChange={enter}
        toast={toast}
        onDismiss={() => setToast("")}
      >
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
      </PortalShell>
    </Context.Provider>
  );
}
function Login({
  enter,
  onLive,
  liveConfigured,
}: {
  enter: (role: Role) => Promise<void>;
  onLive: (email: string, password: string) => Promise<void>;
  liveConfigured: boolean;
}) {
  const { locale, t } = useLocale();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const ar = locale === "ar";
  return (
    <main className={`${care.root} ${recovery.entry}`} lang={locale} dir={ar ? "rtl" : "ltr"} data-frontend-v2>
      <header className={recovery.entryHeader}>
        <BrandLogo language={locale} />
        <div className={recovery.entryTools}>
          <LanguageSwitch />
          <details
            className={recovery.entryTheme}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.currentTarget.querySelector("summary")?.focus();
              event.currentTarget.open = false;
            }}
          >
            <summary aria-label={ar ? "المظهر" : "Appearance"}><Icon name="settings" size={20} /></summary>
            <div><FrontendV2ThemeSwitch /></div>
          </details>
        </div>
      </header>

      <section className={recovery.entryHero} aria-labelledby="entry-title">
        <div className={recovery.entryMessage}>
          <p className={recovery.entryKicker}>{ar ? "رعاية متصلة" : "Connected healthcare"}</p>
          <h1 id="entry-title">{t("All your care.")} <em>{ar ? "في مكان واحد." : "In one place."}</em></h1>
          <p>{t("Find a doctor, manage your visit and read the care information your clinician shares.")}</p>
          <a className={recovery.entryAction} href="#demo-workspaces">
            {ar ? "استكشف البوابات" : "Explore workspaces"}<Icon name="arrow" size={20} />
          </a>
        </div>
        <div className={recovery.entryImage} aria-hidden="true" />
      </section>

      <div className={recovery.entryContent}>
        {liveConfigured ? (
          <section className={recovery.entrySignIn} aria-labelledby="live-sign-in">
            <h2 id="live-sign-in">{t("Sign in with live account")}</h2>
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
                  dir="ltr"
                  autoCapitalize="none"
                  spellCheck={false}
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
          </section>
        ) : (
          <aside className={`entry-mode-note ${recovery.entrySignIn}`} role="status">
            <Icon name="shield" size={18} />
            <p>
              {t(
                "This preview offers the browser-only demo. Live sign-in is unavailable until a backend is connected.",
              )}
            </p>
          </aside>
        )}
        <section className={recovery.entryPortals} id="demo-workspaces" aria-labelledby="demo-workspaces-heading">
          <div className={recovery.entryPortalHeading}>
            <div>
              <h2 id="demo-workspaces-heading">{ar ? "اختار مساحة العرض التجريبي" : "Choose a demo workspace"}</h2>
              <p>{ar ? "خمس بوابات لاستكشاف رحلة الرعاية ببيانات تجريبية." : "Five workspaces to explore the care journey with fictional data."}</p>
            </div>
            <span className={recovery.entryDemoMark}><Icon name="shield" size={17} />{ar ? "عرض تجريبي" : "Synthetic demo"}</span>
          </div>
          <div className={recovery.entryPortalGrid}>
            {roles.map(({ role, name, icon, description }) => (
              <button
                key={role}
                className={role === "PATIENT" ? "demo-button" : undefined}
                aria-label={t(role === "PATIENT" ? "Explore the patient demo" : name)}
                disabled={pending}
                onClick={() => void enter(role)}
              >
                <span className={recovery.entryPortalIcon}><Icon name={icon} size={22} /></span>
                <strong>{t(name)}</strong>
                <span>{description[ar ? 1 : 0]}</span>
                <Icon name="arrow" size={18} />
              </button>
            ))}
          </div>
          <p className={recovery.entryDisclosure}>
            <Icon name="shield" size={18} />
            {t("The demo uses synthetic data saved only in this browser. It does not create a live session or backend clinical records.")}
          </p>
        </section>
      </div>
    </main>
  );
}
