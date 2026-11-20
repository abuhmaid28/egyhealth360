"use client";
import { presentationName, directoryLabel, timeZoneLabel } from "../lib/presentation";
import { safeErrorMessage } from "../lib/api/errors";
import { useLocale } from "../lib/i18n/context";
import { useRef, useState } from "react";
import type {
  Availability,
  Page,
  Provider,
  PublishSlot,
} from "../lib/api/contracts";
import { useApp } from "./context";
import {
  Badge,
  Card,
  CardTitle,
  date,
  Empty,
  Field,
  Heading,
  Icon,
  Resource,
  time,
  useResource,
} from "./ui";
export function Pagination({
  meta,
  change,
}: {
  meta: Page<unknown>["meta"];
  change: (page: number) => void;
}) {
  const { t } = useLocale();

  if (meta.total <= meta.pageSize && meta.page === 1) return null;
  return (
    <div className="pagination">
      <button
        className="button secondary"
        disabled={meta.page === 1}
        onClick={() => change(meta.page - 1)}
      >
        {t("Previous")}
      </button>
      <span>
        {t("Page {page} · {total} intervals", {
          page: String(meta.page),
          total: String(meta.total),
        })}
      </span>
      <button
        className="button secondary"
        disabled={meta.page * meta.pageSize >= meta.total}
        onClick={() => change(meta.page + 1)}
      >
        {t("Next")}
      </button>
    </div>
  );
}
export function PublicAvailability({
  provider,
  reason,
  setReason,
  onReview,
}: {
  provider: Provider;
  reason: string;
  setReason: (value: string) => void;
  onReview: (slot: Availability) => void;
}) {
  const { t, locale } = useLocale();

  const { api, preview, refresh } = useApp();
  const [page, setPage] = useState(1);
  const [clinic, setClinic] = useState("");
  const [selected, setSelected] = useState<Availability>();
  const resource = useResource(
    () =>
      api.availabilityPage(provider.id, {
        page,
        pageSize: 20,
        ...(clinic ? { clinic } : {}),
      }),
    [api, provider.id, page, clinic, refresh],
  );
  const choosePage = (value: number) => {
    setSelected(undefined);
    setPage(value);
  };
  return (
    <Card className="booking-card">
      <CardTitle title={t("Choose your appointment")} />
      <p className="muted">{t("Available appointments · clinic time")}</p>
      <Field label={t("Availability clinic")}>
        <select
          value={clinic}
          onChange={(e) => {
            setClinic(e.target.value);
            choosePage(1);
          }}
        >
          <option value="">{t("All provider clinics")}</option>
          {provider.clinics.map((c) => (
            <option key={c.id} value={c.id}>
              {presentationName(c.displayName, t)}
            </option>
          ))}
        </select>
      </Field>
      <Resource resource={resource} preview={preview}>
        {(result) => {
          const valid =
            selected &&
            result.data.find((s) => s.id === selected.id && s.bookable);
          return (
            <>
              {result.data.length ? (
                <>
                  <div className="date-tile">
                    <Icon name="calendar" />
                    <div>
                      <strong>{t("Choose an available time")}</strong>
                      <small>
                        {t(
                          "Dates and times use the timezone shown on each slot.",
                        )}
                      </small>
                    </div>
                  </div>
                  <div className="slots live-slots">
                    {result.data.map((s) => (
                      <button
                        key={s.id}
                        disabled={!s.bookable}
                        aria-pressed={valid?.id === s.id}
                        className={valid?.id === s.id ? "selected" : ""}
                        onClick={() => setSelected(s)}
                      >
                        <small>{date(s.startAt, s.timeZone, locale)}</small>
                        <strong>
                          {time(s.startAt, s.timeZone, locale)}
                          {t("–")}
                          {time(s.endAt, s.timeZone, locale)}
                        </strong>
                        <small>
                          <bdi>{timeZoneLabel(s.timeZone, t)}</bdi>
                        </small>
                        {date(s.startAt, s.timeZone, locale) !==
                          date(s.endAt, s.timeZone, locale) && (
                          <small>
                            {t("Ends")}
                            {date(s.endAt, s.timeZone, locale)}
                          </small>
                        )}
                        <small>
                          {presentationName(provider.clinics.find((c) => c.id === s.clinicId)
                            ?.displayName ?? t("Clinic unavailable"), t)}
                        </small>
                        {!s.bookable && <small>{t("Unavailable")}</small>}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <Empty
                  title={t("No available times")}
                  description={t(
                    "There are no published bookable intervals for this view. Try another clinic or return later.",
                  )}
                />
              )}
              <Pagination meta={result.meta} change={choosePage} />
              {result.data.length > 0 && (
                <>
                  {api.mode === "demo" && (
                    <Field label={t("What brings you in?")}>
                      <textarea
                        dir="auto"
                        rows={3}
                        maxLength={500}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </Field>
                  )}
                  {api.mode === "live" && (
                    <div className="boundary-notice">
                      <Badge tone="amber">
                        {t("Live availability → Real booking")}
                      </Badge>
                      <p>
                        {t(
                          "Confirming creates a real logistics booking. No clinical reason is collected and no medical-record access is granted.",
                        )}
                      </p>
                    </div>
                  )}
                  <button
                    className="button primary full"
                    disabled={!valid || (api.mode === "demo" && !reason.trim())}
                    onClick={() => {
                      if (valid) onReview(valid);
                    }}
                  >
                    {api.mode === "live"
                      ? t("Review live booking")
                      : t("Review appointment")}
                    <Icon name="arrow" size={17} />
                  </button>
                  <p className="small muted">
                    {t(
                      "Booking provides no medical-record access or clinical authority.",
                    )}
                  </p>
                </>
              )}
            </>
          );
        }}
      </Resource>
    </Card>
  );
}
export function DoctorAvailability() {
  const { t, locale } = useLocale();

  const { api, preview, refresh, changed, notify } = useApp();
  const [page, setPage] = useState(1);
  const slots = useResource(
    () => api.ownAvailability(page),
    [api, page, refresh],
  );
  const clinics = useResource(() => api.clinics(), [api]);
  const [clinicId, setClinicId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [withdrawing, setWithdrawing] = useState("");
  const pending = useRef<PublishSlot | undefined>(undefined);
  const withdrawalKeys = useRef(new Map<string, string>());
  return (
    <>
      <Heading
        eyebrow={t("Make room for care")}
        title={t("Availability")}
        description={t(
          "Publish finite intervals and review your own publication history.",
        )}
      />
      <div className="two-column availability-columns">
        <Card>
          <CardTitle title={t("Your published availability history")} />
          <Resource resource={slots} preview={preview}>
            {(result) => (
              <>
                {result.data.length ? (
                  <div className="own-slot-list">
                    {result.data.map((s) => (
                      <article className="own-slot" key={s.id}>
                        <div>
                          <strong>{date(s.startAt, s.timeZone, locale)}</strong>
                          <p>
                            <bdi dir="ltr">{time(s.startAt, s.timeZone, locale)}
                            {t("–")}
                            {time(s.endAt, s.timeZone, locale)}</bdi> {t("·")}
                            {timeZoneLabel(s.timeZone, t)}
                          </p>
                          <small className="muted">
                            {presentationName(clinics.data?.find((c) => c.id === s.clinicId)
                              ?.displayName ?? t("Clinic unavailable"), t)}
                          </small>
                        </div>
                        <div className="own-slot-actions">
                          <Badge
                            tone={s.state === "WITHDRAWN" ? "soft" : "green"}
                          >
                            {s.state === "PUBLISHED"
                              ? t("Published")
                              : t("Withdrawn")}
                          </Badge>
                          {s.state === "PUBLISHED" && (
                            <button
                              className="button secondary"
                              disabled={!!withdrawing || busy}
                              onClick={async () => {
                                setWithdrawing(s.id);
                                setError("");
                                const identity = `${s.id}:${s.version}`;
                                let key = withdrawalKeys.current.get(identity);
                                if (!key) {
                                  key = crypto.randomUUID();
                                  withdrawalKeys.current.set(identity, key);
                                }
                                try {
                                  await api.withdrawSlot({
                                    slotId: s.id,
                                    expectedVersion: s.version,
                                    operationKey: key,
                                  });
                                  changed();
                                  notify("Availability withdrawn.");
                                } catch (e) {
                                  setError(safeErrorMessage(e));
                                } finally {
                                  setWithdrawing("");
                                }
                              }}
                            >
                              {withdrawing === s.id
                                ? t("Withdrawing…")
                                : t("Withdraw interval")}
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title={t("No published intervals")}
                    description={t(
                      "Publish a finite interval to make time available. Withdrawn intervals remain in your own history.",
                    )}
                  />
                )}
                <Pagination meta={result.meta} change={setPage} />
              </>
            )}
          </Resource>
        </Card>
        <Card>
          <CardTitle title={t("Publish a finite interval")} />
          <Resource resource={clinics} preview={preview}>
            {(options) =>
              options.length ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError("");
                    const values = {
                      clinicId,
                      startAt: start.trim(),
                      endAt: end.trim(),
                    };
                    const prior = pending.current;
                    if (
                      !prior ||
                      prior.clinicId !== values.clinicId ||
                      prior.startAt !== values.startAt ||
                      prior.endAt !== values.endAt
                    )
                      pending.current = {
                        ...values,
                        operationKey: crypto.randomUUID(),
                      };
                    try {
                      await api.publishSlot(pending.current!);
                      pending.current = undefined;
                      changed();
                      notify("Availability published.");
                    } catch (e) {
                      setError(safeErrorMessage(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Field
                    label={t("Publication clinic")}
                    hint={t(
                      "Choose a clinic where you can publish appointments.",
                    )}
                  >
                    <select
                      required
                      value={clinicId}
                      onChange={(e) => setClinicId(e.target.value)}
                    >
                      <option value="">{t("Choose a published clinic")}</option>
                      {options.map((c) => (
                        <option key={c.id} value={c.id}>
                          {presentationName(c.displayName, t)} {t("·")}
                          {directoryLabel(c.city, t)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label={t("Starts at")}
                    hint={t(
                      "Use the format shown, including the clinic’s time difference.",
                    )}
                  >
                    <input
                      type="text"
                      required
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      dir="ltr"
                      placeholder={t("2026-11-02T09:00:00+02:00")}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label={t("Ends at")}>
                    <input
                      type="text"
                      required
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      dir="ltr"
                      placeholder={t("2026-11-02T09:30:00+02:00")}
                      autoComplete="off"
                    />
                  </Field>
                  <button
                    className="button primary full"
                    disabled={busy || !!withdrawing}
                  >
                    {busy ? t("Publishing…") : t("Publish interval")}
                    <Icon name="plus" size={17} />
                  </button>
                </form>
              ) : (
                <Empty
                  title={t("No published clinics")}
                  description={t(
                    "Publication requires an eligible clinic and current membership.",
                  )}
                />
              )
            }
          </Resource>
          <p className="small muted">
            {t(
              "Appointments follow the clinic’s scheduling rules. Publish each interval separately.",
            )}
          </p>
          {api.mode === "demo" && (
            <p className="small muted">
              {t(
                "Demo appointments are shown in Cairo time.",
              )}
            </p>
          )}
        </Card>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {t(error)}
          <button
            className="text-link"
            onClick={() => {
              slots.retry();
              clinics.retry();
            }}
          >
            {t("Refresh availability")}
          </button>
        </div>
      )}
    </>
  );
}
