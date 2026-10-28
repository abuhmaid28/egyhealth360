"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type {
  HealthcareAdapter,
  Mode,
  Role,
  Session,
} from "../lib/api/contracts";
import { createDemoAdapter } from "../lib/mock/adapter";
import { createLiveAdapter } from "../lib/api/live";
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
  const pathname = usePathname();
  const router = useRouter();
  const [api, setApi] = useState<HealthcareAdapter>();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<Preview>("ready");
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState("");
  const [mobile, setMobile] = useState(false);
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
  const enter = async (role: Role) => {
    const demo = chooseMode("demo") as ReturnType<typeof createDemoAdapter>;
    const s = await demo.enter(role);
    setSession(s);
    setRefresh((v) => v + 1);
    router.push(homes[role]);
  };
  const logout = async () => {
    try {
      await api?.logout();
      setSession(null);
      router.push("/login");
    } catch (e) {
      setToast((e as Error).message);
    }
  };
  if (!ready || !api)
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
  const page =
    navigation[session.role].find((n) => n[0] === pathname)?.[1] ??
    "Care workspace";
  return (
    <Context.Provider
      value={{
        api,
        session,
        preview,
        refresh,
        notify: setToast,
        changed: () => setRefresh((v) => v + 1),
        startDemoBooking: async (provider, slot, reason) => {
          const demo = chooseMode("demo") as ReturnType<
            typeof createDemoAdapter
          >;
          const synthetic = await demo.enter("PATIENT");
          const appointment = await demo.bookPreview(provider, slot, reason);
          setSession(synthetic);
          setRefresh((v) => v + 1);
          return appointment;
        },
      }}
    >
      <a className="skip" href="#main">
        Skip to content
      </a>
      {mobile && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link href={homes[session.role]} className="logo-link">
          <Logo />
        </Link>
        <div className="workspace-label">
          {roles.find((r) => r.role === session.role)?.name} workspace
        </div>
        <nav aria-label="Main navigation">
          {navigation[session.role].map(([href, label, icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={pathname === href ? "active" : ""}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {pathname === href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-note">
            <span className="icon-tile">
              <Icon name="shield" />
            </span>
            <strong>Your care, connected.</strong>
            <p>One place for every step of your health journey.</p>
          </div>
          <Link
            href={`${homes[session.role]}/settings`}
            className="nav-settings"
          >
            <Icon name="settings" />
            Profile & settings
          </Link>
          <button onClick={logout} className="nav-settings">
            <Icon name="logout" />
            Sign out
          </button>
          <div className="sidebar-user">
            <Avatar name={session.name} />
            <div>
              <strong>{session.name}</strong>
              <small>
                {session.mode === "demo"
                  ? "Synthetic demo account"
                  : "Live account"}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Icon name="menu" />
            </button>
            <span>My workspace</span>
            <Icon name="chevron" size={13} />
            <strong>{page}</strong>
          </div>
          <div className="top-actions">
            <span className={`mode-indicator ${api.mode}`}>
              {api.mode === "demo" ? "Graduation demo" : "Live API"}
            </span>
            {api.mode === "demo" && (
              <>
                <label className="sr-only" htmlFor="workspace-switch">
                  Demo workspace
                </label>
                <select
                  id="workspace-switch"
                  aria-label="Demo workspace"
                  value={session.role}
                  onChange={(e) => {
                    void enter(e.target.value as Role);
                  }}
                >
                  {roles.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.name}
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
              Synthetic presentation · 28 October 2026 · browser-only state
            </span>
            <details>
              <summary>Demo controls</summary>
              <div className="demo-popover">
                <label>
                  Screen state
                  <select
                    aria-label="Screen state"
                    value={preview}
                    onChange={(e) => setPreview(e.target.value as Preview)}
                  >
                    <option value="ready">Populated</option>
                    <option value="loading">Loading</option>
                    <option value="empty">Empty</option>
                    <option value="error">Error</option>
                  </select>
                </label>
                <button
                  onClick={() => {
                    (api as ReturnType<typeof createDemoAdapter>).reset();
                    setSession(null);
                    router.push("/login");
                  }}
                >
                  Reset demo journey
                </button>
              </div>
            </details>
          </div>
        )}
        <main id="main" className="content">
          {!allowed ? (
            <div className="empty">
              <h1>Choose your workspace</h1>
              <p>
                Your current account opens the{" "}
                {roles.find((r) => r.role === session.role)?.name} workspace.
              </p>
              <Link className="button primary" href={homes[session.role]}>
                Open workspace
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
          <span>© 2026 EgyHealth 360</span>
          <span>Care that stays with you.</span>
          <span>
            English ·{" "}
            <span lang="ar" dir="rtl">
              العربية
            </span>{" "}
            planned
          </span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toast}
          <button
            aria-label="Dismiss notification"
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <main className="login">
      <section className="login-story">
        <Logo />
        <div>
          <p className="eyebrow">A healthier journey starts here</p>
          <h1>
            All your care.
            <br />
            One connected
            <br />
            <em>experience.</em>
          </h1>
          <p>
            From finding the right doctor to your next follow-up. Feel supported
            at every step.
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
              Find your care team
            </span>
            <span>
              <Icon name="check" />
              Keep your health story together
            </span>
            <span>
              <Icon name="check" />
              Stay connected after your visit
            </span>
          </div>
        </div>
        <small>Designed for the EgyHealth 360 graduation project.</small>
      </section>
      <section className="login-form">
        <div className="login-box">
          <span className="eyebrow">Welcome to EgyHealth 360</span>
          <h2>Good to see you.</h2>
          <p className="muted">Sign in to continue your healthcare journey.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setError("");
              try {
                await onLive(email, password);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setPending(false);
              }
            }}
          >
            <Field label="Email address">
              <input
                type="email"
                autoComplete="username"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in with live account"}
              <Icon name="arrow" size={18} />
            </button>
          </form>
          <div className="divider">
            <span>Here for the presentation?</span>
          </div>
          <button
            className="button demo-button full"
            onClick={() => {
              void enter("PATIENT");
            }}
          >
            Explore the patient demo
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
                {r.name}
              </button>
            ))}
          </div>
          <p className="login-disclosure">
            <Icon name="shield" size={16} />
            The demo uses synthetic data saved only in this browser. It does not
            create a live session or backend clinical records.
          </p>
        </div>
      </section>
    </main>
  );
}
