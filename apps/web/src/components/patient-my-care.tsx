"use client";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Appointment, Role } from "../lib/api/contracts";
import type { LiveBooking } from "../lib/api/live-booking";
import { accountName, presentationName, directoryLabel, timeZoneLabel, repeatedTimeOffset } from "../lib/presentation";
import {
  appointmentActivity,
  careDate,
  careTime,
  nextCareAppointment,
  ownDemoAppointment,
  ownLiveAppointment,
  sharedActivity,
  type CareActivity,
  type CareAppointment,
} from "../lib/patient-my-care";
import { myCareCopy, type MyCareCopy } from "../lib/patient-my-care-copy";
import { clinicianMonogram } from "../lib/patient-my-care-avatar";
import { useLocale } from "../lib/i18n/context";
import { useApp } from "./context";
import { useDirectoryNames } from "./live-booking";
import { Icon, useResource, type IconName } from "./ui";
import styles from "./patient-my-care.module.css";
import { PortalShell } from "./portal-shell";

type ScreenState = "ready" | "loading" | "empty" | "error" | "uncertain";
const noSubscribe = () => () => {};
const demoStamp = () => "demo";
type Copy = { [K in keyof MyCareCopy]: string };
interface Props {
  onLogout: () => Promise<void>;
  onRoleChange: (role: Role) => Promise<void>;
  toast: string;
  onDismiss: () => void;
}

/** My Care projection uses the same presentation shell as its destinations. */
export function PatientMyCare(props: Props) {
  const { api } = useApp();
  const { locale } = useLocale();
  const stamp = useSyncExternalStore(
    api.documentation?.subscribe ?? noSubscribe,
    api.documentation?.scopeStamp ?? demoStamp,
    api.documentation?.scopeStamp ?? demoStamp,
  );
  return (
    <div lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} data-my-care>
      <CareScreen key={api.mode} scopeStamp={stamp} {...props} />
    </div>
  );
}

function CareScreen({
  onLogout,
  onRoleChange,
  toast,
  onDismiss,
  scopeStamp,
}: Props & { scopeStamp: string }) {
  const { api, session, booking, refresh } = useApp();
  const { locale, t } = useLocale();
  const c: Copy = myCareCopy[locale];
  const [preview, setPreview] = useState<ScreenState>("ready");
  const names = useDirectoryNames();
  const profile = useResource(() => api.profile(), [api, refresh]);
  const visits = useResource<
    | { mode: "demo"; rows: Appointment[] }
    | { mode: "live"; rows: LiveBooking[] }
  >(async () => {
    if (api.mode === "live") {
      if (!api.liveBookings)
        throw new Error("Live booking integration unavailable");
      return { mode: "live", rows: (await api.liveBookings.history()).data };
    }
    return { mode: "demo", rows: await booking.listOwn() };
  }, [api, booking, refresh]);
  const followUps = useMemo(
    () => (api.mode === "live" ? api.followUpIntents?.forPatient() : undefined),
    [api],
  );
  useEffect(() => () => followUps?.dispose(), [followUps]);
  const care = useResource(async () => {
    if (api.mode === "demo") {
      const record = await api.record();
      return {
        scopeStamp,
        recent: record.consultations
          .filter((r) => r.released)
          .map((r) => ({
            key: r.appointmentId,
            kind: "summary" as const,
            title: "Visit summary",
            source: null,
            occurredAt: null,
            timeZone: "UTC",
            href: "/patient/record",
            state: "Shared with you",
          })),
        hasFollowUp: record.consultations.some(
          (r) => r.released && !!r.followUp.trim(),
        ),
        unverified: false,
      };
    }
    // Independent, already-integrated own-source readers. Never call the Demo record adapter in Live.
    const [summaries, recommendations] = await Promise.allSettled([
      api.documentation
        ? api.documentation.released()
        : Promise.reject(new Error("Unavailable")),
      followUps ? followUps.list() : Promise.reject(new Error("Unavailable")),
    ]);
    return {
      scopeStamp,
      recent:
        summaries.status === "fulfilled" ? sharedActivity(summaries.value) : [],
      hasFollowUp:
        recommendations.status === "fulfilled" &&
        recommendations.value.data.some(
          (r) => r.current && r.state === "SIGNED_RELEASED",
        ),
      unverified:
        summaries.status === "rejected" ||
        recommendations.status === "rejected",
    };
  }, [api, followUps, refresh, scopeStamp]);
  // Hide old shared-source metadata immediately on capability change, without
  // remounting/retrying unrelated profile and logistics reads on access loss.
  const sources = care.data?.scopeStamp === scopeStamp ? care.data : undefined;
  const appointments =
    visits.data?.mode === "live"
      ? visits.data.rows.map((r) =>
          ownLiveAppointment(r, names?.providers ?? [], names?.clinics ?? []),
        )
      : (visits.data?.rows.map(ownDemoAppointment) ?? []);
  const state = api.mode === "demo" ? preview : "ready";
  const next =
    state === "empty" ? undefined : nextCareAppointment(appointments);
  const recent =
    state === "empty"
      ? []
      : [
          ...(sources?.recent ?? []),
          ...appointmentActivity(
            appointments.filter((a) => a.state === "CONSULTED"),
          ),
        ]
          .sort(
            (a, b) =>
              (b.occurredAt ? Date.parse(b.occurredAt) : 0) -
              (a.occurredAt ? Date.parse(a.occurredAt) : 0),
          )
          .slice(0, 4);
  const displayName = profile.data
    ? presentationName(profile.data.displayName, t)
    : accountName(session, t);
  const firstName = displayName.split(" ")[0];
  const summaryHref =
    api.mode === "live" ? "/patient/summaries" : "/patient/record";
  const hasSummary = state !== "empty" && !!sources?.recent.length;
  const unverified =
    state === "uncertain" || !!care.error || !!sources?.unverified;
  return (
    <>
      <PortalShell
        onLogout={onLogout}
        onRoleChange={onRoleChange}
        toast={toast}
        onDismiss={onDismiss}
        mainClassName={styles.main}
        screenState={{
          value: preview,
          change: (v) => setPreview(v as ScreenState),
          items: [
            ["ready", c.populated],
            ["loading", c.loadingState],
            ["empty", c.emptyState],
            ["error", c.errorState],
            ["uncertain", c.uncertainState],
          ],
        }}
      >
        <div className={styles.intro}>
          <h1>
            {c.greeting} <bdi>{firstName}</bdi>
          </h1>
          <p>
            <span>{c.support}</span>
          </p>
        </div>
        {profile.error && (
          <p className={styles.profileError} role="alert" data-profile-error>
            {c.profileError}
          </p>
        )}
        <div className={styles.grid}>
          <AppointmentAnchor
            c={c}
            locale={locale}
            appointment={next}
            loading={state === "loading" || visits.pending}
            error={state === "error" || !!visits.error}
            sessionRecovery={
              visits.error ===
                "Your session has ended. Please sign in again." ||
              visits.error ===
                "Request verification failed. Refresh your session before retrying."
            }
            retry={() => {
              if (state === "error") setPreview("ready");
              visits.retry();
            }}
            translate={t}
          />
          <NextForYou
            c={c}
            summaryHref={summaryHref}
            hasSummary={hasSummary}
            hasFollowUp={state !== "empty" && !!sources?.hasFollowUp}
            mode={api.mode}
            loading={state === "loading" || care.pending}
          />
          <CareShortcuts
            c={c}
            summaryHref={summaryHref}
            live={api.mode === "live"}
          />
          <section
            className={styles.recent}
            aria-labelledby="care-recent-title"
          >
            <div className={styles.sectionHeading}>
              <h2 id="care-recent-title">{c.recentCare}</h2>
              <Link href="/patient/history" className={styles.textLink}>
                {c.viewAll}
                <Icon name="arrow" size={16} />
              </Link>
            </div>
            {unverified && (
              <div
                className={styles.verification}
                role="status"
                data-source-verification
              >
                <Icon name="shield" />
                <div>
                  <h3>{c.unverified}</h3>
                  <p>{c.unverifiedContext}</p>
                  <Link className={styles.textLink} href={summaryHref}>
                    {c.verifySource}
                    <Icon name="arrow" size={16} />
                  </Link>
                </div>
              </div>
            )}
            {state === "loading" || care.pending ? (
              <CareLoading c={c} />
            ) : recent.length ? (
              <ul className={styles.activityList}>
                {recent.map((item) => (
                  <RecentCare
                    key={`${item.kind}:${item.key}`}
                    item={item}
                    locale={locale}
                    c={c}
                    translate={t}
                  />
                ))}
              </ul>
            ) : (
              <div className={styles.emptyRecent}>
                <Icon name="record" />
                <h3>{c.noRecent}</h3>
                <p>{c.noRecentContext}</p>
              </div>
            )}
            <p className={styles.sourceNote}>
              {c.sharedOnly} <span>{c.historical}</span>
            </p>
          </section>
        </div>
      </PortalShell>
    </>
  );
}

function StateLabel({ state, c }: { state: string; c: Copy }) {
  const labels: Record<string, string> = {
    BOOKED: c.booked,
    IN_CONSULTATION: c.opened,
    CONSULTED: c.consulted,
    CANCELLED: c.cancelled,
    RESCHEDULED: c.rescheduled,
    NO_SHOW: c.noShow,
    "Shared with you": c.shared,
  };
  return (
    <span className={styles.status} data-state={state}>
      <span aria-hidden="true" />
      {labels[state] ?? c.shared}
    </span>
  );
}
function CareLoading({ c }: { c: Copy }) {
  return (
    <div className={styles.loading} role="status" aria-label={c.loading}>
      <span>{c.loadingContext}</span>
      <div aria-hidden="true" />
      <div aria-hidden="true" />
    </div>
  );
}
function AppointmentAnchor({
  c,
  locale,
  appointment: a,
  loading,
  error,
  sessionRecovery,
  retry,
  translate,
}: {
  c: Copy;
  locale: "en" | "ar";
  appointment?: CareAppointment;
  loading: boolean;
  error: boolean;
  sessionRecovery: boolean;
  retry: () => void;
  translate: (value: string) => string;
}) {
  const offset = a ? repeatedTimeOffset(a.startAt, a.timeZone) : null;
  return (
    <section
      className={styles.appointment}
      aria-labelledby="care-next-title"
      data-appointment-anchor
    >
      <div className={styles.appointmentTop}>
        <h2 id="care-next-title">{c.nextAppointment}</h2>
        {!loading && !error && a && <StateLabel state={a.state} c={c} />}
      </div>
      {loading ? (
        <CareLoading c={c} />
      ) : error ? (
        <div className={styles.appointmentState} role="alert">
          <h3>{c.error}</h3>
          <p>{sessionRecovery ? c.sessionRecovery : c.errorContext}</p>
          <button
            className={styles.whiteButton}
            onClick={sessionRecovery ? () => window.location.reload() : retry}
          >
            {sessionRecovery ? c.refreshSession : c.loadAgain}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      ) : a ? (
        <>
          <div className={styles.appointmentDetails}>
            <span
              className={styles.doctorAvatar}
              aria-hidden="true"
              data-clinician-monogram
            >
              <bdi>
                {clinicianMonogram(
                  a.doctor ? presentationName(a.doctor, translate) : null,
                )}
              </bdi>
            </span>
            <div className={styles.doctorInfo}>
              <h3>
                {a.specialty ? directoryLabel(a.specialty, translate) : c.specialtyUnavailable}
              </h3>
              <p>
                <bdi>
                  {a.doctor
                    ? presentationName(a.doctor, translate)
                    : c.doctorUnavailable}
                </bdi>
              </p>
              <small>{c.inPerson}</small>
            </div>
            <div className={styles.appointmentWhen}>
              <p>
                <bdi>{careDate(a.startAt, a.timeZone, locale)}</bdi>{" "}
                <bdi dir="ltr">{careTime(a.startAt, a.timeZone)}</bdi>
              </p>
              <p className={styles.eventZone}>
                <bdi>{timeZoneLabel(a.timeZone, translate)}</bdi>
                {offset && <> · <bdi dir="ltr">{offset}</bdi></>}
              </p>
              <p>
                <bdi>
                  {a.clinic
                    ? presentationName(a.clinic, translate)
                    : c.clinicUnavailable}
                </bdi>
              </p>
            </div>
          </div>
          <div className={styles.appointmentBottom}>
            <p>{c.bookingBoundary}</p>
            <Link
              className={styles.whiteButton}
              href={`/patient/appointments/${encodeURIComponent(a.id)}`}
            >
              {c.viewDetails}
              <Icon name="arrow" size={18} />
            </Link>
          </div>
        </>
      ) : (
        <div className={styles.appointmentState}>
          <h3>{c.empty}</h3>
          <p>{c.emptyContext}</p>
          <Link className={styles.whiteButton} href="/patient/discover">
            {c.findAppointment}
            <Icon name="arrow" size={18} />
          </Link>
          <p className={styles.boundary}>{c.bookingBoundary}</p>
        </div>
      )}
    </section>
  );
}
function NextForYou({
  c,
  summaryHref,
  hasSummary,
  hasFollowUp,
  mode,
  loading,
}: {
  c: Copy;
  summaryHref: string;
  hasSummary: boolean;
  hasFollowUp: boolean;
  mode: "live" | "demo";
  loading: boolean;
}) {
  const actions: {
    href: string;
    icon: IconName;
    title: string;
    context: string;
  }[] = [
    ...(hasSummary
      ? [
          {
            href: summaryHref,
            icon: "record" as const,
            title: c.readSummary,
            context: c.readSummaryContext,
          },
        ]
      : []),
    ...(hasFollowUp
      ? [
          {
            href: mode === "live" ? "/patient/follow-up" : "/patient/record",
            icon: "calendar" as const,
            title: c.readFollowUp,
            context: c.readFollowUpContext,
          },
        ]
      : []),
    {
      href: "/patient/appointments",
      icon: "calendar",
      title: c.reviewAppointments,
      context: c.reviewAppointmentsContext,
    },
  ];
  return (
    <section className={styles.nextForYou} aria-labelledby="care-actions-title">
      <h2 id="care-actions-title">{c.nextForYou}</h2>
      {loading ? (
        <CareLoading c={c} />
      ) : (
        <ul>
          {actions.slice(0, 3).map((a) => (
            <li key={a.title}>
              <Link href={a.href}>
                <span className={styles.iconSpot}>
                  <Icon name={a.icon} size={18} />
                </span>
                <span>
                  <strong>{a.title}</strong>
                  <small>{a.context}</small>
                </span>
                <Icon name="chevron" size={18} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
function CareShortcuts({
  c,
  summaryHref,
  live,
}: {
  c: Copy;
  summaryHref: string;
  live: boolean;
}) {
  const items: { title: string; icon: IconName; href?: string }[] = [
    {
      title: c.prescriptions,
      icon: "pill",
      href: live ? undefined : "/patient/medications",
    },
    { title: c.summaries, icon: "record", href: summaryHref },
    { title: c.records, icon: "record", href: "/patient/history" },
    { title: c.appointments, icon: "calendar", href: "/patient/appointments" },
  ];
  return (
    <section
      className={styles.shortcuts}
      aria-labelledby="care-shortcuts-title"
    >
      <h2 id="care-shortcuts-title">{c.yourCare}</h2>
      <nav
        className={styles.tiles}
        aria-label={c.secondary}
        data-care-shortcuts
      >
        {items.map((item) => {
          const content: ReactNode = (
            <>
              <span className={styles.iconSpot}>
                <Icon name={item.icon} />
              </span>
              <strong>{item.title}</strong>
              <small>{item.href ? c.viewSources : c.notIntegrated}</small>
            </>
          );
          return item.href ? (
            <Link
              key={item.title}
              href={item.href}
              aria-label={item.title}
              title={item.title}
            >
              {content}
            </Link>
          ) : (
            <div
              key={item.title}
              role="group"
              aria-label={item.title}
              aria-disabled="true"
            >
              {content}
            </div>
          );
        })}
      </nav>
    </section>
  );
}
function RecentCare({
  item,
  c,
  locale,
  translate,
}: {
  item: CareActivity;
  c: Copy;
  locale: "en" | "ar";
  translate: (value: string) => string;
}) {
  return (
    <li>
      <Link className={styles.activity} href={item.href}>
        <span className={styles.iconSpot}>
          <Icon
            name={item.kind === "summary" ? "record" : "calendar"}
            size={18}
          />
        </span>
        <div className={styles.activityBody}>
          <h3>{item.kind === "summary" ? c.summary : c.appointment}</h3>
          {(item.source || item.occurredAt) && (
            <p>
              {item.source && (
                <bdi>{presentationName(item.source, translate)}</bdi>
              )}
              {item.source && item.occurredAt && (
                <span aria-hidden="true"> · </span>
              )}
              {item.occurredAt ? (
                <time dateTime={item.occurredAt}>
                  <bdi>{careDate(item.occurredAt, item.timeZone, locale)}</bdi>{" "}
                  <bdi>{timeZoneLabel(item.timeZone, translate)}</bdi>
                </time>
              ) : null}
            </p>
          )}
        </div>
        <div className={styles.activityEnd}>
          <StateLabel state={item.state} c={c} />
          <span className={styles.textLink}>
            {item.kind === "summary" ? c.openSummaries : c.openAppointment}
            <Icon name="arrow" size={16} />
          </span>
        </div>
      </Link>
    </li>
  );
}
