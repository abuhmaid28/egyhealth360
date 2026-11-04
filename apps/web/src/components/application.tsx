"use client";
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
import { Field, Icon, Loading, type Preview } from "./ui";
import { PortalShell } from "./portal-shell";
import care from "./patient-my-care.module.css";
import portal from "./portal-shell.module.css";
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
const roles: { role: Role; name: string }[] = [
  { role: "PATIENT", name: "Patient" },
  { role: "CLINICIAN", name: "Doctor" },
  { role: "PHARMACY_STAFF", name: "Pharmacy" },
  { role: "LAB_STAFF", name: "Laboratory" },
  { role: "ADMIN", name: "Admin" },
];
export function Application({
  liveConfigured = true,
}: {
  liveConfigured?: boolean;
}) {
  const liveSession = useLiveSession();
  const { t } = useLocale();

  const pathname = usePathname();
  const router = useRouter();
  const [api, setApi] = useState<HealthcareAdapter>();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<Preview>("ready");
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState("");
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
        setSession(s);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [liveSession, liveConfigured]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    setPreview("ready");
  }, [pathname]);
  const chooseMode = (mode: Mode) => {
    liveSession.clear();
    liveSession.selectMode(mode);
    const adapter =
      mode === "live" ? liveSession.adapter() : liveSession.demo();
    setApi(adapter);
    return adapter;
  };
  const enter = async (role: Role, path?: string) => {
    if (session?.mode === "live") return;
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
  if (
    (!ready || !api || !booking) &&
    /^\/doctor\/consultation\/[^/]+\/documentation$/.test(pathname)
  )
    return <ClinicianConsultationBoot />;
  if (!ready || !api || !booking)
    return (
      <main className={`${care.root} boot`}>
        <bdi className={care.wordmark} dir="ltr">
          EgyHealth 360
        </bdi>
        <Loading />
      </main>
    );
  if (!session)
    return (
      <Login
        liveConfigured={liveConfigured}
        enter={enter}
        onLive={async (email, password) => {
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
        screenState={{
          value: preview,
          change: (v) => setPreview(v as Preview),
          items: [
            ["ready", "Populated"],
            ["loading", "Loading"],
            ["empty", "Empty"],
            ["error", "Error"],
          ],
        }}
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
  const { t } = useLocale();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <main className={`${care.root} ${portal.login} login`}>
      <section className="login-story">
        <bdi className={care.wordmark} dir="ltr">
          EgyHealth 360
        </bdi>
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
              "Find a doctor, manage your visit and read the care information your clinician shares.",
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
          <div className="entry-mode-note">
            <Icon name="shield" size={18} />
            <p>
              {t(
                liveConfigured
                  ? "Sign in to your live care account. The demonstration portals below use separate fictional data."
                  : "Explore the fictional demonstration below. Live sign-in is not available in this preview.",
              )}
            </p>
          </div>
          {liveConfigured && (
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
          )}
          <div className="divider">
            <span>{t("Here for the presentation?")}</span>
          </div>
          <button
            className="button demo-button full"
            disabled={pending}
            onClick={() => {
              void enter("PATIENT");
            }}
          >
            {t("Explore the patient demo")}
            <Icon name="arrow" size={18} />
          </button>
          <p className="demo-portals-note">
            {t("Preview a portal with fictional data")}
          </p>
          <div className="demo-role-links">
            {roles.slice(1).map((r) => (
              <button
                key={r.role}
                disabled={pending}
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
