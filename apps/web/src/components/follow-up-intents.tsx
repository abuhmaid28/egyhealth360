"use client";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useApp } from "./context";
import { useLocale } from "../lib/i18n/context";
import { safeErrorMessage } from "../lib/api/errors";
import {
  draftBody,
  windowForEditing,
  type DesiredWindow,
  type FollowUpDraft,
  type FollowUpIntent,
  type FollowUpService,
} from "../lib/api/follow-up-intents";
import {
  Badge,
  Card,
  Empty,
  Field,
  Heading,
  Loading,
  Modal,
  Resource,
  SessionRecovery,
  useResource,
} from "./ui";

export function PatientFollowUps() {
  const { api } = useApp();
  const service = useMemo(() => api.followUpIntents!.forPatient(), [api]);
  const { t } = useLocale();
  return (
    <>
      <Heading
        eyebrow={t("My record")}
        title={t("Your next steps in care")}
        description={t(
          "Only released follow-up instructions shared with you appear here. A desired window is not a booked appointment.",
        )}
      />
      <FollowUpScreen service={service} />
    </>
  );
}
export function FollowUpScreen({
  service,
  author = false,
}: {
  service: FollowUpService;
  author?: boolean;
}) {
  const timers = useRef(
    new Map<FollowUpService, ReturnType<typeof setTimeout>>(),
  );
  useEffect(() => {
    const pending = timers.current;
    clearTimeout(pending.get(service));
    pending.delete(service);
    return () => {
      pending.set(
        service,
        setTimeout(() => {
          service.dispose();
          pending.delete(service);
        }, 0),
      );
    };
  }, [service]);
  const stamp = useSyncExternalStore(
    service.subscribe,
    service.scopeStamp,
    service.scopeStamp,
  );
  return <FollowUpScope key={stamp} service={service} author={author} />;
}
function FollowUpScope({
  service,
  author,
}: {
  service: FollowUpService;
  author: boolean;
}) {
  const { t } = useLocale();
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const refreshButton = useRef<HTMLButtonElement>(null);
  const focusAfterSave = () =>
    requestAnimationFrame(() =>
      refreshButton.current?.focus({ preventScroll: true }),
    );
  const resource = useResource(
    async () => ({ page, revision, result: await service.list(page) }),
    [service, page, revision],
  );
  const refresh = () => {
    setNotice("");
    setRevision((n) => n + 1);
  };
  return (
    <section
      id={author ? "live-follow-up" : undefined}
      className="follow-up-workspace"
      aria-label={t("Follow-up instructions")}
    >
      {author && (
        <Card>
          <Badge tone="soft">{t("Next steps")}</Badge>
          <h2>{t("Follow-up instructions")}</h2>
          <p>
            {t(
              "After documenting the visit, save a separate follow-up draft, review it, then deliberately sign and release it. Summary release and follow-up release are independent.",
            )}
          </p>
        </Card>
      )}
      {notice && (
        <p role="status" className="documentation-warning">
          {t(notice)}
        </p>
      )}
      <Resource resource={resource}>
        {({ result, page: loadedPage, revision: loadedRevision }) =>
          loadedPage === page && loadedRevision === revision ? (
            <div key={`${page}:${revision}`}>
              {author && (
                <Card>
                  <FollowUpEditor
                    save={(value) => service.create(value)}
                    done={() => {
                      setNotice(
                        "Follow-up draft saved. Review it before release.",
                      );
                      setRevision((n) => n + 1);
                      focusAfterSave();
                    }}
                  />
                </Card>
              )}
              {result.data.length ? (
                result.data.map((intent) => (
                  <IntentCard
                    key={intent.key}
                    intent={intent}
                    author={author}
                    service={service}
                    done={() => {
                      setNotice(
                        "Follow-up command accepted. Current access is checked again below.",
                      );
                      setRevision((n) => n + 1);
                      focusAfterSave();
                    }}
                  />
                ))
              ) : (
                <Empty
                  title={t(
                    author
                      ? "No visible follow-up drafts or released instructions"
                      : "No released follow-up instructions",
                  )}
                  description={t(
                    "Only currently permitted content is shown. Hidden or restricted entries are not included.",
                  )}
                />
              )}
              <nav
                className="documentation-action-row"
                aria-label={t("Follow-up pages")}
              >
                <button
                  className="button secondary"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((n) => n - 1);
                    setNotice("");
                  }}
                >
                  {t("Previous page")}
                </button>
                <span>{t("Page {page}", { page: String(page) })}</span>
                <button
                  className="button secondary"
                  disabled={page * 20 >= result.meta.total || page >= 10000}
                  onClick={() => {
                    setPage((n) => n + 1);
                    setNotice("");
                  }}
                >
                  {t("Next page")}
                </button>
              </nav>
            </div>
          ) : (
            <Loading />
          )
        }
      </Resource>
      <button
        ref={refreshButton}
        className="button secondary"
        onClick={refresh}
      >
        {t("Refresh follow-up instructions")}
      </button>
    </section>
  );
}
function WindowRead({ value }: { value: DesiredWindow | null }) {
  const { t, locale } = useLocale();
  if (!value)
    return (
      <p className="muted">{t("No desired follow-up window specified")}</p>
    );
  const format = (s: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
      timeZone: value.timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(s));
  return (
    <div>
      <h3>{t("Desired follow-up window")}</h3>
      <p>
        <bdi>
          {format(value.startAt)} → {format(value.endAt)}
        </bdi>
        <br />
        <bdi>{value.timeZone}</bdi>
      </p>
      <p className="small muted">
        {t(
          "This window is a preference, not a booking or an automatic reminder.",
        )}
      </p>
    </div>
  );
}
function IntentRead({ intent }: { intent: FollowUpDraft }) {
  const { t } = useLocale();
  return (
    <>
      <h3>{t("Clinician instruction")}</h3>
      <p className="documentation-narrative" dir="auto">
        {intent.instruction}
      </p>
      <WindowRead value={intent.desiredWindow} />
    </>
  );
}
function IntentCard({
  intent,
  author,
  service,
  done,
}: {
  intent: FollowUpIntent;
  author: boolean;
  service: FollowUpService;
  done(): void;
}) {
  const { t, locale } = useLocale();
  const [action, setAction] = useState<"release" | "correct" | null>(null);
  const [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Card className="follow-up-intent">
      <div className="documentation-action-row">
        <h2>{t("Follow-up instruction")}</h2>
        <Badge tone={intent.state === "DRAFT" ? "soft" : "green"}>
          {t(
            intent.state === "DRAFT"
              ? "Draft · clinician only"
              : "Signed and released",
          )}
        </Badge>
        {intent.correction && <Badge tone="soft">{t("Correction")}</Badge>}
        {intent.current && intent.state !== "DRAFT" && (
          <Badge tone="soft">{t("Current signed entry")}</Badge>
        )}
      </div>
      <IntentRead intent={intent} />
      {intent.releasedAt && (
        <p className="small muted">
          {t("Released")}:{" "}
          <bdi>
            {new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
              dateStyle: "medium",
            }).format(new Date(intent.releasedAt))}
          </bdi>
        </p>
      )}
      {intent.booking ? (
        <div>
          <h3>{t("Linked booking")}</h3>
          <Badge tone="soft">
            {t(
              {
                BOOKED: "Booked",
                CANCELLED: "Cancelled",
                RESCHEDULED: "Rescheduled",
                NO_SHOW: "No-show",
                IN_CONSULTATION: "In consultation",
                CONSULTED: "Consulted",
              }[intent.booking.state],
            )}
          </Badge>
          {!author && (
            <Link
              className="button secondary"
              href={`/patient/appointments/${intent.booking.id}`}
            >
              {t("View linked booking")}
            </Link>
          )}
          {["CANCELLED", "RESCHEDULED"].includes(intent.booking.state) && (
            <p>
              {t(
                "The linked booking is no longer booked. This follow-up instruction remains separate.",
              )}
            </p>
          )}
        </div>
      ) : (
        <p className="muted">{t("No booking linked to this instruction")}</p>
      )}
      {author && (
        <button
          className="button secondary"
          onClick={() => {
            setAction(intent.state === "DRAFT" ? "release" : "correct");
            setConfirmed(false);
            setError("");
          }}
        >
          {t(
            intent.state === "DRAFT"
              ? "Review follow-up release"
              : "Correct released follow-up",
          )}
        </button>
      )}
      {action === "release" && (
        <Modal
          className="modal follow-up-dialog"
          aria-labelledby="follow-up-release-title"
          onCancel={(e) => {
            e.preventDefault();
            if (!busy) setAction(null);
          }}
        >
          <h2 id="follow-up-release-title">{t("Review follow-up release")}</h2>
          <IntentRead intent={intent} />
          <p>
            {t(
              "Signing releases this instruction to the patient. It does not create a booking or release other clinical documentation.",
            )}
          </p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            {t("I reviewed this instruction for the correct patient")}
          </label>
          {error && (
            <p role="alert" className="form-error">
              {t(error)}
            </p>
          )}
          <SessionRecovery message={error} />
          <div className="documentation-action-row">
            <button
              className="button primary"
              disabled={busy || !confirmed}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await service.release(intent.key);
                  done();
                } catch (e) {
                  setError(safeErrorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t(busy ? "Saving…" : "Sign and release follow-up")}
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              {t("Go back")}
            </button>
          </div>
        </Modal>
      )}
      {action === "correct" && (
        <Modal
          className="modal follow-up-dialog"
          aria-labelledby="follow-up-correction-title"
          onCancel={(e) => {
            e.preventDefault();
            if (!busy) setAction(null);
          }}
        >
          <h2 id="follow-up-correction-title">
            {t("Correct released follow-up")}
          </h2>
          <FollowUpEditor
            initial={intent}
            correction
            save={(value, reason) =>
              service.correct(intent.key, value, reason!)
            }
            done={done}
            busyChanged={setBusy}
          />
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => setAction(null)}
          >
            {t("Go back")}
          </button>
        </Modal>
      )}
    </Card>
  );
}
function FollowUpEditor({
  initial,
  correction = false,
  save,
  done,
  busyChanged,
}: {
  initial?: FollowUpDraft;
  correction?: boolean;
  save(value: FollowUpDraft, reason?: string): Promise<void>;
  done(): void;
  busyChanged?(busy: boolean): void;
}) {
  const { t } = useLocale();
  const edited = useMemo(
    () => windowForEditing(initial?.desiredWindow ?? null),
    [initial],
  );
  const [instruction, setInstruction] = useState(initial?.instruction ?? ""),
    [hasWindow, setHasWindow] = useState(!!edited);
  const [startAt, setStart] = useState(edited?.startAt ?? ""),
    [endAt, setEnd] = useState(edited?.endAt ?? ""),
    [zone, setZone] = useState(edited?.timeZone ?? "");
  const [reason, setReason] = useState(""),
    [review, setReview] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const value: FollowUpDraft = {
    instruction,
    desiredWindow: hasWindow ? { startAt, endAt, timeZone: zone } : null,
  };
  return (
    <form
      className="follow-up-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (correction && !review) {
          try {
            draftBody(value);
            setReview(true);
            setError("");
          } catch (e) {
            setError(safeErrorMessage(e));
          }
          return;
        }
        setBusy(true);
        busyChanged?.(true);
        setError("");
        try {
          await save(value, correction ? reason : undefined);
          done();
        } catch (e) {
          setError(safeErrorMessage(e));
        } finally {
          setBusy(false);
          busyChanged?.(false);
        }
      }}
    >
      {!correction && <h3>{t("New follow-up draft")}</h3>}
      <fieldset disabled={busy || review}>
        <Field label={t("Clinician instruction")}>
          <textarea
            value={instruction}
            required
            rows={4}
            onChange={(e) => setInstruction(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <p className="small muted">
          {t(
            "Maximum 2,000 characters. Each save creates a separate immutable draft.",
          )}
        </p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={hasWindow}
            onChange={(e) => setHasWindow(e.target.checked)}
          />
          {t("Add an optional desired follow-up window")}
        </label>
        {hasWindow && (
          <>
            <p className="small muted">
              {t(
                "Enter both instants with explicit offsets, for example 2026-11-15T09:00:00+02:00, and the exact IANA zone, for example Africa/Cairo. The server validates the window.",
              )}
            </p>
            <Field label={t("Desired window starts at")}>
              <input
                dir="ltr"
                required
                value={startAt}
                onChange={(e) => setStart(e.target.value)}
                placeholder="2026-11-15T09:00:00+02:00"
              />
            </Field>
            <Field label={t("Desired window ends at")}>
              <input
                dir="ltr"
                required
                value={endAt}
                onChange={(e) => setEnd(e.target.value)}
                placeholder="2026-11-22T09:00:00+02:00"
              />
            </Field>
            <Field label={t("Desired window time zone")}>
              <input
                dir="ltr"
                required
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="Africa/Cairo"
              />
            </Field>
          </>
        )}
        {correction && (
          <Field label={t("Reason for follow-up correction")}>
            <textarea
              value={reason}
              required
              rows={2}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        )}
      </fieldset>
      {review && (
        <>
          <p>
            {t(
              "This correction will be signed and released immediately. The earlier signed instruction remains in clinical history.",
            )}
          </p>
          <IntentRead intent={value} />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            {t("I reviewed this instruction for the correct patient")}
          </label>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => {
              setReview(false);
              setConfirmed(false);
            }}
          >
            {t("Edit correction")}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {t(error)}
        </p>
      )}
      <SessionRecovery message={error} />
      <button
        className="button primary"
        disabled={busy || (review && !confirmed)}
      >
        {t(
          busy
            ? "Saving…"
            : correction
              ? review
                ? "Sign and release correction"
                : "Review follow-up correction"
              : "Save follow-up draft",
        )}
      </button>
    </form>
  );
}
