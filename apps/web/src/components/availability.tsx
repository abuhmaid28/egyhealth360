"use client";
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
  if (meta.total <= meta.pageSize && meta.page === 1) return null;
  return (
    <div className="pagination">
      <button
        className="button secondary"
        disabled={meta.page === 1}
        onClick={() => change(meta.page - 1)}
      >
        Previous
      </button>
      <span>
        Page {meta.page} · {meta.total} intervals
      </span>
      <button
        className="button secondary"
        disabled={meta.page * meta.pageSize >= meta.total}
        onClick={() => change(meta.page + 1)}
      >
        Next
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
      <CardTitle title="Choose your appointment" />
      <p className="muted">Finite availability · clinic-local times</p>
      <Field label="Availability clinic">
        <select
          value={clinic}
          onChange={(e) => {
            setClinic(e.target.value);
            choosePage(1);
          }}
        >
          <option value="">All provider clinics</option>
          {provider.clinics.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
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
                      <strong>Choose a published interval</strong>
                      <small>
                        Dates and times use the timezone shown on each slot.
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
                        <small>{date(s.startAt, s.timeZone)}</small>
                        <strong>
                          {time(s.startAt, s.timeZone)}–
                          {time(s.endAt, s.timeZone)}
                        </strong>
                        <small>{s.timeZone}</small>
                        {date(s.startAt, s.timeZone) !==
                          date(s.endAt, s.timeZone) && (
                          <small>Ends {date(s.endAt, s.timeZone)}</small>
                        )}
                        <small>
                          {provider.clinics.find((c) => c.id === s.clinicId)
                            ?.displayName ?? "Clinic unavailable"}
                        </small>
                        {!s.bookable && <small>Unavailable</small>}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <Empty
                  title="No available times"
                  description="There are no published bookable intervals for this view. Try another clinic or return later."
                />
              )}
              <Pagination meta={result.meta} change={choosePage} />
              {result.data.length > 0 && (
                <>
                  <Field label="What brings you in?">
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </Field>
                  {api.mode === "live" && (
                    <div className="boundary-notice">
                      <Badge tone="amber">
                        Live availability → Demo booking
                      </Badge>
                      <p>
                        The slot is published by the backend. Booking is a
                        synthetic preview only; it will not reserve the live
                        slot or create a care relationship.
                      </p>
                    </div>
                  )}
                  <button
                    className="button primary full"
                    disabled={!valid || !reason.trim()}
                    onClick={() => {
                      if (valid) onReview(valid);
                    }}
                  >
                    {api.mode === "live"
                      ? "Review demo booking"
                      : "Review appointment"}
                    <Icon name="arrow" size={17} />
                  </button>
                  <p className="small muted">
                    Booking provides no medical-record access or clinical
                    authority.
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
        eyebrow="Make room for care"
        title="Availability"
        description="Publish finite intervals and review your own publication history."
      />
      <div className="two-column availability-columns">
        <Card>
          <CardTitle title="Your published availability history" />
          <Resource resource={slots} preview={preview}>
            {(result) => (
              <>
                {result.data.length ? (
                  <div className="own-slot-list">
                    {result.data.map((s) => (
                      <article className="own-slot" key={s.id}>
                        <div>
                          <strong>{date(s.startAt, s.timeZone)}</strong>
                          <p>
                            {time(s.startAt, s.timeZone)}–
                            {time(s.endAt, s.timeZone)} · {s.timeZone}
                          </p>
                          <small className="muted">
                            {clinics.data?.find((c) => c.id === s.clinicId)
                              ?.displayName ?? s.clinicId}
                          </small>
                        </div>
                        <div className="own-slot-actions">
                          <Badge
                            tone={s.state === "WITHDRAWN" ? "soft" : "green"}
                          >
                            {s.state === "PUBLISHED"
                              ? "Published"
                              : "Withdrawn"}
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
                                  setError((e as Error).message);
                                } finally {
                                  setWithdrawing("");
                                }
                              }}
                            >
                              {withdrawing === s.id
                                ? "Withdrawing…"
                                : "Withdraw interval"}
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="No published intervals"
                    description="Publish a finite interval to make time available. Withdrawn intervals remain in your own history."
                  />
                )}
                <Pagination meta={result.meta} change={setPage} />
              </>
            )}
          </Resource>
        </Card>
        <Card>
          <CardTitle title="Publish a finite interval" />
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
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Field
                    label="Publication clinic"
                    hint="The server checks your current clinic membership and publication scope."
                  >
                    <select
                      required
                      value={clinicId}
                      onChange={(e) => setClinicId(e.target.value)}
                    >
                      <option value="">Choose a published clinic</option>
                      {options.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.displayName} · {c.city}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Starts at"
                    hint="ISO date/time with an explicit offset matching the configured clinic timezone."
                  >
                    <input
                      type="text"
                      required
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      placeholder="2026-11-02T09:00:00+02:00"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Ends at">
                    <input
                      type="text"
                      required
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      placeholder="2026-11-02T09:30:00+02:00"
                      autoComplete="off"
                    />
                  </Field>
                  <button
                    className="button primary full"
                    disabled={busy || !!withdrawing}
                  >
                    {busy ? "Publishing…" : "Publish interval"}
                    <Icon name="plus" size={17} />
                  </button>
                </form>
              ) : (
                <Empty
                  title="No published clinics"
                  description="Publication requires an eligible clinic and current membership."
                />
              )
            }
          </Resource>
          <p className="small muted">
            Clinic scheduling settings remain server-owned. Exact duration,
            timezone offsets, lead time and horizon are validated by the
            backend. No recurrence or configuration editing is provided.
          </p>
          {api.mode === "demo" && (
            <p className="small muted">
              Demo fixture: Nile Care Clinic · Africa/Cairo · 28–29 October 2026
              use +03:00.
            </p>
          )}
        </Card>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
          <button
            className="text-link"
            onClick={() => {
              slots.retry();
              clinics.retry();
            }}
          >
            Refresh availability
          </button>
        </div>
      )}
    </>
  );
}
