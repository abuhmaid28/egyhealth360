"use client";
import { presentationName } from '../lib/presentation';
import {
  useId,
  useState,
  useSyncExternalStore,
  useEffect,
  useRef,
} from "react";
import { useLocale } from "../lib/i18n/context";
import { safeErrorMessage } from "../lib/api/errors";
import {
  DocumentationError,
  emptyFacts,
  documentationFingerprint,
  documentationLimits as limits,
  scalarLength,
  validFacts,
  validNarrative,
  type DocumentationApi,
  type DocumentationVersion,
  type DocumentationWorkspace,
  type FactsDraft,
} from "../lib/clinical/documentation";
import {
  Badge,
  Card,
  CardTitle,
  Empty,
  Field,
  Heading,
  Icon,
  Loading,
  Modal,
  Resource,
  SessionRecovery,
  date,
  time,
  useResource,
} from "./ui";

export function DocumentationUnavailable({
  patient = false,
}: {
  patient?: boolean;
}) {
  const { t } = useLocale();
  return (
    <Card className="documentation-pending">
      <span className="icon-tile">
        <Icon name="shield" />
      </span>
      <h2>
        {t(
          patient
            ? "Released summaries are not connected yet"
            : "Clinical documentation is not connected yet",
        )}
      </h2>
      <p>
        {t(
          "Clinical documentation is awaiting backend integration. No clinical information has been sent or saved in Live mode.",
        )}
      </p>
      <p className="muted">
        {t(
          "Booking and consultation opening do not grant ongoing clinical access. Your existing Live booking and opening capabilities remain available.",
        )}
      </p>
      <button
        className="button secondary"
        disabled
        aria-describedby="documentation-pending-help"
      >
        {t(patient ? "View released summaries" : "Save clinical documentation")}
      </button>
      <p className="small muted" id="documentation-pending-help">
        {t(
          "Normal Live documentation stays unavailable until the independently reviewed backend integration.",
        )}
      </p>
    </Card>
  );
}
const focusSection = (id: string) =>
  requestAnimationFrame(() => globalThis.document.getElementById(id)?.focus());
const labels = {
  DRAFT: "Draft",
  SIGNED: "Signed · private",
  SIGNED_RELEASED: "Signed and released",
  ORIGINAL: "Original",
  CORRECTION: "Correction",
  ADDENDUM: "Addendum",
  PRIVATE_NOTE: "Private note",
  PATIENT_SUMMARY: "Patient summary",
} as const;
export function DocumentationWorkspaceScreen({
  service,
}: {
  service: DocumentationApi;
}) {
  // Remount all transient editor state synchronously when viewer/scope changes.
  // No stale author response can flash into a patient/admin presentation.
  useServiceDisposal(service);
  const stamp = useSyncExternalStore(
    service.subscribe ?? (() => () => {}),
    service.scopeStamp,
    service.scopeStamp,
  );
  return <WorkspaceScope key={stamp} service={service} />;
}
function WorkspaceScope({ service }: { service: DocumentationApi }) {
  const { t } = useLocale();
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(1),
    [historyPage, setHistoryPage] = useState(1);
  const [notice, setNotice] = useState("");
  const resource = useResource(
    async () => ({
      revision,
      page,
      historyPage,
      view: await service.workspace(page, historyPage),
    }),
    [service, revision, page, historyPage],
  );
  if (service.mode === "unavailable") return <DocumentationUnavailable />;
  return (
    <>
      <Heading
        eyebrow={t("Clinical consultation")}
        title={t("Consultation documentation")}
        description={t(
          "Human-entered documentation for this opened consultation. Current clinical authority is always required.",
        )}
      />
      {notice && (
        <p className="documentation-warning" role="status">
          {t(notice)}
        </p>
      )}
      <Resource resource={resource}>
        {(result) =>
          result.revision === revision &&
          result.page === page &&
          result.historyPage === historyPage &&
          result.view.scopeStamp === service.scopeStamp() ? (
            <DocumentationEditor
              key={`${result.view.scopeStamp}:${revision}:${page}:${historyPage}`}
              service={service}
              view={result.view}
              reload={(message) => {
                setNotice(message ?? "");
                setRevision((value) => value + 1);
              }}
            />
          ) : (
            <Loading />
          )
        }
      </Resource>
      {service.mode === "live" && (
        <DocumentationPager
          service={service}
          page={page}
          historyPage={historyPage}
          setPage={setPage}
          setHistoryPage={setHistoryPage}
        />
      )}
    </>
  );
}
function TextArea({
  label,
  value,
  onChange,
  limit,
  required = false,
  disabled = false,
  hint = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  limit: number;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  const { t } = useLocale();
  const id = useId();
  const valid = validNarrative(value, limit, required);
  const [touched, setTouched] = useState(false);
  const showError = !valid && (touched || !!value);
  return (
    <div className="documentation-field">
      <Field label={t(label)} hint={hint ? t(hint) : undefined}>
        <textarea
          rows={value.length > 300 ? 7 : 3}
          dir="auto"
          value={value}
          disabled={disabled}
          onChange={(event) => {
            setTouched(true);
            onChange(event.target.value);
          }}
          onBlur={() => setTouched(true)}
          aria-required={required}
          aria-invalid={showError}
          aria-describedby={`${id}-count${showError ? ` ${id}-error` : ""}`}
        />
      </Field>
      <div className="documentation-counter" id={`${id}-count`}>
        {t("{count} / {limit} characters", {
          count: String(scalarLength(value)),
          limit: String(limit),
        })}
      </div>
      {showError && (
        <p className="form-error" id={`${id}-error`} role="alert">
          {t(
            "Check the length and text format. Nothing is automatically shortened.",
          )}
        </p>
      )}
    </div>
  );
}
function ItemList({
  label,
  items,
  change,
  disabled,
}: {
  label: "Problems" | "Diagnoses";
  items: string[];
  change: (items: string[]) => void;
  disabled: boolean;
}) {
  const { t } = useLocale();
  return (
    <fieldset className="documentation-list">
      <legend>{t(label)}</legend>
      <p className="small muted">
        {t("Human entry only. No suggestions or inferred findings.")}
      </p>
      {items.map((value, index) => (
        <div className="documentation-list-item" key={index}>
          <TextArea
            label={label === "Problems" ? "Problem" : "Diagnosis"}
            value={value}
            onChange={(next) =>
              change(items.map((item, i) => (i === index ? next : item)))
            }
            limit={limits.item}
            required
            disabled={disabled}
          />
          <button
            type="button"
            className="button subtle"
            disabled={disabled}
            aria-label={t(
              label === "Problems"
                ? "Remove problem {number}"
                : "Remove diagnosis {number}",
              { number: String(index + 1) },
            )}
            onClick={() => change(items.filter((_, i) => i !== index))}
          >
            <Icon name="close" size={16} />
            {t("Remove")}
          </button>
        </div>
      ))}
      <div className="documentation-action-row">
        <button
          type="button"
          className="button secondary"
          disabled={disabled || items.length >= limits.items}
          onClick={() => change([...items, ""])}
        >
          {t(label === "Problems" ? "Add problem" : "Add diagnosis")}
        </button>
        <span className="small muted">
          {t("{count} / {limit} items", {
            count: String(items.length),
            limit: String(limits.items),
          })}
        </span>
      </div>
    </fieldset>
  );
}
function DocumentationEditor({
  service,
  view: initialView,
  reload,
}: {
  service: DocumentationApi;
  view: DocumentationWorkspace;
  reload: (message?: string) => void;
}) {
  const { t } = useLocale();
  const [view, setView] = useState(initialView);
  const live = service.mode === "live";
  const [factTarget, setFactTarget] = useState<
    "PRIVATE_NOTE" | "PATIENT_SUMMARY"
  >("PRIVATE_NOTE");
  const [privateFacts, setPrivateFacts] = useState(
    view.note?.facts ?? emptyFacts(),
  );
  const [summaryFacts, setSummaryFacts] = useState(
    view.summary?.facts ?? emptyFacts(),
  );
  const [controlledFacts, setControlledFacts] = useState<FactsDraft>(
    view.facts,
  );
  const facts = live
    ? factTarget === "PRIVATE_NOTE"
      ? privateFacts
      : summaryFacts
    : controlledFacts;
  const setFacts = live
    ? factTarget === "PRIVATE_NOTE"
      ? setPrivateFacts
      : setSummaryFacts
    : setControlledFacts;
  const [note, setNote] = useState(view.note?.text ?? ""),
    [summary, setSummary] = useState(view.summary?.text ?? ""),
    [instructions, setInstructions] = useState(
      view.summary?.instructions ?? "",
    );
  const [busy, setBusy] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [uncertain, setUncertain] = useState(false),
    [uncertainAction, setUncertainAction] = useState(""),
    [redacted, setRedacted] = useState(false);
  const [confirmation, setConfirmation] = useState<
    "release" | "sign" | undefined
  >();
  const [amend, setAmend] = useState<{
    target: DocumentationVersion;
    change: "ADDENDUM" | "CORRECTION";
  }>();
  const [restrict, setRestrict] = useState(false);
  const signed = view.history.filter((v) => v.state !== "DRAFT");
  const noteSigned = !!view.note && view.note.state !== "DRAFT",
    summarySigned = !!view.summary && view.summary.state !== "DRAFT";
  const locked = !!busy || uncertain;
  async function run(
    name: string,
    action: () => Promise<void>,
    refresh = false,
  ) {
    setBusy(name);
    setError("");
    setMessage("");
    try {
      await action();
      setUncertain(false);
      setUncertainAction("");
      setMessage(
        live
          ? "Saved by the Live service. Visibility follows the explicit document command."
          : "Saved in the controlled preview. No Live backend write occurred.",
      );
      if (refresh) {
        const next = await service.workspace();
        if (next.scopeStamp !== service.scopeStamp())
          throw new DocumentationError("access");
        setView(next);
        if (name === "sign")
          focusSection(
            confirmation === "release" ? "doc-summary" : "doc-private",
          );
      }
    } catch (e) {
      setError(safeErrorMessage(e));
      setUncertain(e instanceof DocumentationError && e.code === "uncertain");
      setUncertainAction(
        e instanceof DocumentationError && e.code === "uncertain" ? name : "",
      );
      if (
        e instanceof DocumentationError &&
        ["restricted", "access", "expired"].includes(e.code)
      ) {
        setRedacted(true);
        setNote("");
        setSummary("");
        setInstructions("");
        setFacts({
          complaint: "",
          problems: [],
          diagnoses: [],
          allergy: { state: "NOT_REVIEWED", items: [] },
        });
      }
    } finally {
      setBusy("");
    }
  }
  if (redacted)
    return (
      <Card>
        <p role="alert">{t(error)}</p>
        <button className="button secondary" onClick={() => reload()}>
          {t("Refresh visible documentation")}
        </button>
      </Card>
    );
  const saveFacts = () => run("facts", () => service.saveFacts(facts));
  const saveNote = () =>
    run(
      "note",
      () => service.savePrivateNote(note, live ? privateFacts : undefined),
      true,
    );
  const saveSummary = () =>
    run(
      "summary",
      () =>
        service.saveSummary({
          text: summary,
          instructions,
          ...(live ? { facts: summaryFacts } : {}),
        }),
      true,
    );
  return (
    <>
      <Card className="documentation-context">
        <div>
          <p className="eyebrow">{t("Opened consultation context")}</p>
          <h2>
            <bdi>{presentationName(view.patientName, t)}</bdi>
          </h2>
          {(view.providerName || view.clinicName) && <p><bdi>{[view.providerName, view.clinicName].filter(Boolean).map(name=>presentationName(name!, t)).join(" · ")}</bdi></p>}
          <small>
            <bdi>
              {date(view.openedAt, view.timeZone)} ·{" "}
              {time(view.openedAt, view.timeZone)} · {view.timeZone}
            </bdi>
          </small>
        </div>
        <Badge tone="soft">{t("Booking grants no clinical authority")}</Badge>
      </Card>
      <div className="documentation-grid">
        <nav
          className="documentation-outline"
          aria-label={t("Documentation sections")}
        >
          <a href="#doc-facts">{t("Complaint and findings")}</a>
          <a href="#doc-allergy">{t("Allergy review")}</a>
          <a href="#doc-private">{t("Private note")}</a>
          <a href="#doc-summary">{t("Patient summary and instructions")}</a>
          <a href="#doc-history">{t("Signed history")}</a>
        </nav>
        <div className="documentation-content">
          <div
            className="documentation-feedback"
            aria-live="polite"
            role="status"
          >
            {busy ? t("Saving…") : message ? t(message) : ""}
          </div>
          {error && (
            <div className="error-panel" role="alert">
              <p>{t(error)}</p>
              <SessionRecovery message={error} />
              {uncertain && (
                <p>
                  {t(
                    "The fields are held unchanged for explicit retry. No automatic retry takes place.",
                  )}
                </p>
              )}
            </div>
          )}
          {error && (
            <button className="button secondary" onClick={() => reload()}>
              {t("Recheck visible documentation")}
            </button>
          )}
          <Card id="doc-facts">
            <CardTitle title={t("01 · Complaint and findings")} />
            <p className="muted">
              {t(
                live
                  ? "Findings belong only to the selected document. They are saved with its draft. Private findings are never copied into a summary."
                  : "These author-only entries are not automatically copied into the patient summary.",
              )}
            </p>
            {live && (
              <Field label={t("Findings document")}>
                <select
                  value={factTarget}
                  disabled={locked}
                  onChange={(e) =>
                    setFactTarget(e.target.value as typeof factTarget)
                  }
                >
                  <option value="PRIVATE_NOTE">{t("Private note")}</option>
                  <option value="PATIENT_SUMMARY">
                    {t("Patient summary")}
                  </option>
                </select>
              </Field>
            )}
            <div id="doc-allergy">
              <FactsFields
                facts={facts}
                setFacts={setFacts}
                locked={
                  locked ||
                  (live &&
                    (factTarget === "PRIVATE_NOTE"
                      ? noteSigned
                      : summarySigned))
                }
              />
            </div>
            {!live && (
              <button
                className="button primary"
                disabled={
                  !!busy ||
                  (uncertain && uncertainAction !== "facts") ||
                  !validFacts(facts)
                }
                onClick={saveFacts}
              >
                {t(
                  uncertain && uncertainAction === "facts"
                    ? "Retry unchanged findings"
                    : "Save findings draft",
                )}
              </button>
            )}
          </Card>
          <Card
            id="doc-private"
            tabIndex={-1}
            className="documentation-private"
          >
            <CardTitle title={t("02 · Private note")} />
            {live && (
              <p>
                {t(
                  "Each save creates a separate immutable draft. Signing applies only to the displayed saved draft.",
                )}
              </p>
            )}
            <Badge tone="soft">
              {t(
                "Private — visible only to you while you retain current clinical authority",
              )}
            </Badge>
            <TextArea
              label="Private note content"
              value={note}
              onChange={setNote}
              limit={limits.narrative}
              required
              disabled={locked || noteSigned}
              hint="Never included in patient summary or release."
            />
            {noteSigned ? (
              <p className="small muted">
                {t(
                  "Signed content is immutable. Use a separate addendum or correction.",
                )}
              </p>
            ) : (
              <div className="documentation-action-row">
                <button
                  className="button primary"
                  disabled={
                    !!busy ||
                    (uncertain && uncertainAction !== "note") ||
                    !validNarrative(note, limits.narrative, true) ||
                    (live && !validFacts(privateFacts))
                  }
                  onClick={saveNote}
                >
                  {t(
                    uncertain && uncertainAction === "note"
                      ? "Retry unchanged private note"
                      : "Save private note draft",
                  )}
                </button>
                {view.note && (
                  <button
                    className="button secondary"
                    disabled={
                      locked ||
                      note !== view.note?.text ||
                      (live &&
                        documentationFingerprint(privateFacts) !==
                          documentationFingerprint(view.note?.facts))
                    }
                    onClick={() => setConfirmation("sign")}
                  >
                    {t("Sign private note")}
                  </button>
                )}
              </div>
            )}
            {live && view.note && (
              <button
                className="button secondary"
                disabled={locked}
                onClick={() => {
                  setView({ ...view, note: null });
                  setNote("");
                  setPrivateFacts(emptyFacts());
                }}
              >
                {t("Start a separate private draft")}
              </button>
            )}
          </Card>
          <Card id="doc-summary" tabIndex={-1}>
            <CardTitle title={t("03 · Patient summary and instructions")} />
            {live && (
              <p>
                {t(
                  "Each save creates a separate immutable draft. Release includes only the displayed saved summary and its findings.",
                )}
              </p>
            )}
            <Badge tone={summarySigned ? "green" : "amber"}>
              {t(
                summarySigned
                  ? "Signed and released"
                  : "Draft — not visible to patient yet",
              )}
            </Badge>
            <TextArea
              label="Patient summary content"
              value={summary}
              onChange={setSummary}
              limit={limits.narrative}
              required
              disabled={locked || summarySigned}
              hint="Enter only what you intend to share with the patient."
            />
            <TextArea
              label="Patient instructions"
              value={instructions}
              onChange={setInstructions}
              limit={limits.narrative}
              disabled={locked || summarySigned}
            />
            {summarySigned ? (
              <p className="small muted">
                {t(
                  "Signed content is immutable. Use a separate addendum or correction.",
                )}
              </p>
            ) : (
              <div className="documentation-action-row">
                <button
                  className="button secondary"
                  disabled={
                    !!busy ||
                    (uncertain && uncertainAction !== "summary") ||
                    !validNarrative(summary, limits.narrative, true) ||
                    (live && !validFacts(summaryFacts)) ||
                    !validNarrative(instructions, limits.narrative)
                  }
                  onClick={saveSummary}
                >
                  {t(
                    uncertain && uncertainAction === "summary"
                      ? "Retry unchanged summary"
                      : "Save summary draft",
                  )}
                </button>
                <button
                  className="button primary"
                  disabled={
                    locked ||
                    !view.summary ||
                    summary !== view.summary.text ||
                    instructions !== view.summary.instructions ||
                    (live &&
                      documentationFingerprint(summaryFacts) !==
                        documentationFingerprint(view.summary.facts))
                  }
                  onClick={() => setConfirmation("release")}
                >
                  {t("Review sign and release")}
                </button>
              </div>
            )}
            <p className="small muted">
              {t(
                "Saving, opening a consultation and leaving this page never release content. A private note can never use sign and release.",
              )}
            </p>
          </Card>
          {live && view.summary && (
            <button
              className="button secondary"
              disabled={locked}
              onClick={() => {
                setView({ ...view, summary: null });
                setSummary("");
                setInstructions("");
                setSummaryFacts(emptyFacts());
              }}
            >
              {t("Start a separate summary draft")}
            </button>
          )}
          <Card id="doc-history" tabIndex={-1}>
            <CardTitle title={t("04 · Signed history")} />
            {signed.length ? (
              signed.map((version) => (
                <article className="documentation-version" key={version.key}>
                  <div className="documentation-action-row">
                    <h3>{t(labels[version.kind])}</h3>
                    <Badge tone="soft">
                      {t("Visible version {number}").replace(
                        "{number}",
                        String(view.history.indexOf(version) + 1),
                      )}
                    </Badge>
                    <Badge tone="soft">{t(labels[version.state])}</Badge>
                    <Badge tone={version.current ? "green" : "soft"}>
                      {t(
                        version.current
                          ? "Current signed entry"
                          : "Earlier signed version — preserved",
                      )}
                    </Badge>
                    <Badge tone="soft">{t(labels[version.change])}</Badge>
                  </div>
                  <p className="small muted">
                    <bdi>
                      {date(version.signedAt!, view.timeZone)} ·{" "}
                      {time(version.signedAt!, view.timeZone)}
                    </bdi>
                  </p>
                  <p className="documentation-narrative" dir="auto">
                    {version.text}
                  </p>
                  {version.kind === "PATIENT_SUMMARY" && (
                    <p className="documentation-narrative" dir="auto">
                      {version.instructions}
                    </p>
                  )}
                  {version.facts && <FactsRead facts={version.facts} />}
                  {version.reason && <p dir="auto">{version.reason}</p>}
                  {(live ? version.head : version.current) && (
                    <div className="documentation-action-row">
                      <button
                        className="button secondary"
                        disabled={locked}
                        onClick={() =>
                          setAmend({ target: version, change: "ADDENDUM" })
                        }
                      >
                        {t("Add signed addendum")}
                      </button>
                      <button
                        className="button secondary"
                        disabled={locked}
                        onClick={() =>
                          setAmend({ target: version, change: "CORRECTION" })
                        }
                      >
                        {t("Create signed correction")}
                      </button>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <Empty
                title={t("No visible signed versions")}
                description={t(
                  "Only permitted signed history appears here. Drafts are not patient-visible.",
                )}
              />
            )}
            {view.history.length > 0 && (
              <button
                className="button subtle documentation-danger"
                disabled={locked}
                onClick={() => setRestrict(true)}
              >
                <Icon name="shield" size={16} />
                {t("Restrict wrong-patient document")}
              </button>
            )}
          </Card>
        </div>
      </div>
      {confirmation && (
        <Modal
          className="modal"
          aria-labelledby="documentation-sign-title"
          onCancel={(e) => {
            if (busy) e.preventDefault();
            else setConfirmation(undefined);
          }}
        >
          <div className="modal-header">
            <Icon name="shield" />
            <button
              className="icon-button"
              disabled={!!busy}
              aria-label={t("Close")}
              onClick={() => setConfirmation(undefined)}
            >
              <Icon name="close" />
            </button>
          </div>
          <h2 id="documentation-sign-title">
            {t(
              confirmation === "release"
                ? "Sign and release this summary?"
                : "Sign this private note?",
            )}
          </h2>
          <p>
            {t(
              confirmation === "release"
                ? live
                  ? "The saved summary, instructions and summary findings below become patient-visible. Private-note findings are excluded."
                  : "Only the saved patient summary and instructions below become patient-visible. Private note and author-only findings are excluded."
                : "Signing keeps this note private. It does not release anything to the patient or ADMIN.",
            )}
          </p>
          <div className="documentation-release-preview">
            {confirmation === "release" && view.summary?.facts && (
              <FactsRead facts={view.summary.facts} />
            )}
            {confirmation === "sign" && view.note?.facts && (
              <FactsRead facts={view.note.facts} />
            )}
            <p className="documentation-narrative" dir="auto">
              {confirmation === "release"
                ? view.summary?.text
                : view.note?.text}
            </p>
            {confirmation === "release" && (
              <p className="documentation-narrative" dir="auto">
                {view.summary?.instructions}
              </p>
            )}
          </div>
          <div className="documentation-action-row">
            <button
              className="button primary"
              disabled={!!busy}
              onClick={() =>
                run(
                  "sign",
                  async () => {
                    if (confirmation === "release")
                      await service.releaseSummary(view.summary!.key);
                    else await service.signPrivateNote(view.note!.key);
                    setConfirmation(undefined);
                  },
                  true,
                )
              }
            >
              {t(
                busy
                  ? "Signing…"
                  : uncertain
                    ? "Retry unchanged signing"
                    : confirmation === "release"
                      ? "Confirm sign and release"
                      : "Confirm private signing",
              )}
            </button>
            <button
              className="button secondary"
              disabled={!!busy}
              onClick={() => setConfirmation(undefined)}
            >
              {t("Go back")}
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {t(error)}
            </p>
          )}
        </Modal>
      )}
      {amend && (
        <AmendmentDialog
          version={amend.target}
          change={amend.change}
          service={service}
          close={() => setAmend(undefined)}
          refresh={reload}
          done={async () => {
            const next = await service.workspace();
            setView(next);
            if (amend.target.kind === "PRIVATE_NOTE")
              setNote(next.note?.text ?? "");
            else {
              setSummary(next.summary?.text ?? "");
              setInstructions(next.summary?.instructions ?? "");
            }
            setAmend(undefined);
            focusSection("doc-history");
          }}
        />
      )}
      {restrict && (
        <RestrictionDialog
          versions={view.history}
          service={service}
          close={() => setRestrict(false)}
          done={(message) => {
            setRedacted(true);
            setNote("");
            setSummary("");
            setInstructions("");
            reload(message);
          }}
        />
      )}
    </>
  );
}
function AmendmentDialog({
  version,
  change,
  service,
  close,
  done,
  refresh,
}: {
  version: DocumentationVersion;
  change: "ADDENDUM" | "CORRECTION";
  service: DocumentationApi;
  close: () => void;
  done: () => Promise<void>;
  refresh: (message?: string) => void;
}) {
  const { t } = useLocale();
  const [facts, setFacts] = useState(version.facts ?? emptyFacts());
  const [text, setText] = useState(""),
    [instructions, setInstructions] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uncertain, setUncertain] = useState(false);
  return (
    <Modal
      className="modal"
      aria-labelledby="documentation-amend-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else close();
      }}
    >
      <div className="modal-header">
        <Icon name="record" />
        <button
          className="icon-button"
          aria-label={t("Close")}
          disabled={busy}
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      <h2 id="documentation-amend-title">
        {t(
          change === "ADDENDUM"
            ? "Append a signed addendum"
            : "Create a signed correction",
        )}
      </h2>
      <p>
        {t(
          "The original signed version remains preserved. This creates a separate signed version with your reason.",
        )}
      </p>
      <Badge tone="soft">
        {t(
          version.kind === "PRIVATE_NOTE"
            ? "Private — never released"
            : "Patient-visible after this explicit signing",
        )}
      </Badge>
      {service.mode === "live" && (
        <>
          <p>
            {t(
              "Review all findings for this signed version. Summary findings become patient-visible on confirmation.",
            )}
          </p>
          <FactsFields
            facts={facts}
            setFacts={setFacts}
            locked={busy || uncertain}
          />
        </>
      )}
      <TextArea
        label="New signed content"
        value={text}
        onChange={setText}
        limit={limits.narrative}
        required
        disabled={busy || uncertain}
      />
      {version.kind === "PATIENT_SUMMARY" && (
        <TextArea
          label="Patient instructions"
          value={instructions}
          onChange={setInstructions}
          limit={limits.narrative}
          disabled={busy || uncertain}
        />
      )}
      <TextArea
        label="Reason for addendum or correction"
        value={reason}
        onChange={setReason}
        limit={limits.reason}
        required
        disabled={busy || uncertain}
      />
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
      <div className="documentation-action-row">
        <button
          className="button primary"
          disabled={
            busy ||
            (service.mode === "live" && !validFacts(facts)) ||
            !validNarrative(text, limits.narrative, true) ||
            !validNarrative(reason, limits.reason, true) ||
            !validNarrative(instructions, limits.narrative)
          }
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await service.amend({
                targetKey: version.key,
                ...(service.mode === "live" ? { facts } : {}),
                change,
                text,
                instructions,
                reason,
              });
              await done();
            } catch (e) {
              setError(safeErrorMessage(e));
              setUncertain(
                e instanceof DocumentationError && e.code === "uncertain",
              );
              if (
                e instanceof DocumentationError &&
                ["restricted", "access", "expired"].includes(e.code)
              )
                refresh(safeErrorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t(
            busy
              ? "Signing…"
              : uncertain
                ? "Retry unchanged amendment"
                : "Confirm signed version",
          )}
        </button>
        <button className="button secondary" disabled={busy} onClick={close}>
          {t("Go back")}
        </button>
        {error && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => refresh(error)}
          >
            {t("Recheck visible documentation")}
          </button>
        )}
      </div>
    </Modal>
  );
}
function RestrictionDialog({
  versions,
  service,
  close,
  done,
}: {
  versions: DocumentationVersion[];
  service: DocumentationApi;
  close: () => void;
  done: (message?: string) => void;
}) {
  const { t } = useLocale();
  const [selected, setSelected] = useState(""),
    [reason, setReason] = useState(""),
    [ack, setAck] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      className="modal"
      aria-labelledby="documentation-restrict-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else close();
      }}
    >
      <div className="modal-header">
        <Icon name="shield" />
        <button
          className="icon-button"
          aria-label={t("Close")}
          disabled={busy}
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      <h2 id="documentation-restrict-title">
        {t("Restrict an exact wrong-patient document")}
      </h2>
      <p className="documentation-warning">
        {t(
          "This safety action hides the selected document and affected lineage from ordinary views. It never moves a record to another patient. Original signed sources remain preserved.",
        )}
      </p>
      <Field label={t("Exact affected item / version")}>
        <select
          value={selected}
          disabled={busy}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">{t("Choose an exact visible version")}</option>
          {versions.map((v, index) => (
            <option key={v.key} value={v.key}>
              {t("Visible version {number}").replace(
                "{number}",
                String(index + 1),
              )}{" "}
              · {t(labels[v.kind])} · {t(labels[v.state])} ·{" "}
              {date(v.recordedAt)} {time(v.recordedAt)} · {t(labels[v.change])}
            </option>
          ))}
        </select>
      </Field>
      <TextArea
        label="Restriction reason"
        value={reason}
        onChange={setReason}
        limit={limits.reason}
        required
        disabled={busy}
      />
      <label className="documentation-ack">
        <input
          type="checkbox"
          checked={ack}
          disabled={busy}
          onChange={(e) => setAck(e.target.checked)}
        />
        <span>
          {t(
            "I checked the exact item and understand that this restricts visibility without moving the record.",
          )}
        </span>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
      <div className="documentation-action-row">
        <button
          className="button primary"
          disabled={
            busy ||
            !selected ||
            !ack ||
            !validNarrative(reason, limits.reason, true)
          }
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await service.restrict({ targetKey: selected, reason });
              done();
            } catch (e) {
              setError(safeErrorMessage(e));
              if (
                e instanceof DocumentationError &&
                ["restricted", "uncertain", "access", "expired"].includes(
                  e.code,
                )
              )
                done(
                  e.code === "uncertain"
                    ? "The restriction result is uncertain. Visible documentation has been refreshed. Review the exact item before explicitly retrying; no restriction success is assumed."
                    : safeErrorMessage(e),
                );
            } finally {
              setBusy(false);
            }
          }}
        >
          {t(busy ? "Restricting…" : "Confirm wrong-patient restriction")}
        </button>
        {error && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => done(error)}
          >
            {t("Recheck visible documentation")}
          </button>
        )}
        <button className="button secondary" disabled={busy} onClick={close}>
          {t("Go back")}
        </button>
      </div>
    </Modal>
  );
}
export function ReleasedSummariesScreen({
  service,
}: {
  service: DocumentationApi;
}) {
  useServiceDisposal(service);
  const stamp = useSyncExternalStore(
    service.subscribe ?? (() => () => {}),
    service.scopeStamp,
    service.scopeStamp,
  );
  return <ReleasedScope key={stamp} service={service} />;
}
function ReleasedScope({ service }: { service: DocumentationApi }) {
  const { t } = useLocale();
  const [page, setPage] = useState(1),
    [historyPage, setHistoryPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const resource = useResource(
    async () => ({
      page,
      historyPage,
      revision,
      summaries: await service.released(page, historyPage),
    }),
    [service, page, historyPage, revision],
  );
  if (service.mode === "unavailable")
    return <DocumentationUnavailable patient />;
  return (
    <>
      <Heading
        eyebrow={t("My record")}
        title={t("Released visit summaries")}
        description={t(
          "Only your permitted signed and released summaries appear here. Drafts and private notes are never included.",
        )}
      />
      <Resource resource={resource}>
        {(result) =>
          result.page === page &&
          result.historyPage === historyPage &&
          result.revision === revision ? (
            <div className="documentation-released-list">
              {result.summaries.length ? (
                result.summaries.map((v) => (
                  <Card key={v.key}>
                    <div className="documentation-action-row">
                      <h2>{t("Visit summary")}</h2>
                      <Badge tone="green">{t("Signed and released")}</Badge>
                      <Badge tone="soft">{t(labels[v.change])}</Badge>
                      <Badge tone="soft">
                        {t(
                          v.current
                            ? "Current signed entry"
                            : "Earlier signed version — preserved",
                        )}
                      </Badge>
                    </div>
                    {(v.authorName || v.clinicName) && (
                      <p>
                        <bdi>
                          {v.authorName} · {v.clinicName}
                        </bdi>
                      </p>
                    )}
                    <p className="small muted">
                      <bdi>
                        {date(v.releasedAt)} · {time(v.releasedAt)}
                      </bdi>
                    </p>
                    {v.facts && <FactsRead facts={v.facts} />}
                    <h3>{t("Patient summary")}</h3>
                    <p className="documentation-narrative" dir="auto">
                      {v.text}
                    </p>
                    <h3>{t("Patient instructions")}</h3>
                    <p className="documentation-narrative" dir="auto">
                      {v.instructions}
                    </p>
                    {v.predecessorKey && (
                      <p className="small muted">
                        {t("Linked to a permitted earlier released version.")}
                      </p>
                    )}
                  </Card>
                ))
              ) : (
                <Empty
                  title={t("No visible released summaries")}
                  description={t(
                    "Only permitted released content is shown. No draft, private or restricted metadata is included.",
                  )}
                />
              )}
            </div>
          ) : (
            <Loading />
          )
        }
      </Resource>
      {service.mode === "live" && (
        <>
          <button
            className="button secondary"
            onClick={() => setRevision((n) => n + 1)}
          >
            {t("Refresh visible documentation")}
          </button>
          <DocumentationPager
            service={service}
            page={page}
            historyPage={historyPage}
            setPage={setPage}
            setHistoryPage={setHistoryPage}
          />
        </>
      )}
    </>
  );
}

function FactsFields({
  facts,
  setFacts,
  locked,
}: {
  facts: FactsDraft;
  setFacts: (value: FactsDraft) => void;
  locked: boolean;
}) {
  const { t } = useLocale();
  return (
    <>
      {" "}
      <TextArea
        label="Complaint"
        value={facts.complaint}
        onChange={(complaint) => setFacts({ ...facts, complaint })}
        limit={limits.complaint}
        disabled={locked}
        hint="Optional human-entered narrative."
      />
      <ItemList
        label="Problems"
        items={facts.problems}
        change={(problems) => setFacts({ ...facts, problems })}
        disabled={locked}
      />
      <ItemList
        label="Diagnoses"
        items={facts.diagnoses}
        change={(diagnoses) => setFacts({ ...facts, diagnoses })}
        disabled={locked}
      />
      <div className="documentation-review">
        <h3>{t("Allergy / intolerance review")}</h3>
        <Field
          label={t("Review state")}
          hint={t("Unknown and not reviewed never mean no known allergies.")}
        >
          <select
            value={facts.allergy.state}
            disabled={locked}
            onChange={(e) =>
              setFacts({
                ...facts,
                allergy: {
                  state: e.target.value as FactsDraft["allergy"]["state"],
                  items: [],
                },
              })
            }
          >
            <option value="NOT_REVIEWED">
              {t("Not reviewed — review has not taken place")}
            </option>
            <option value="UNKNOWN">
              {t("Unknown — information is not available")}
            </option>
            <option value="REVIEWED_NO_KNOWN">
              {t("Reviewed — no known allergy or intolerance")}
            </option>
            <option value="REVIEWED_POSITIVE">
              {t("Reviewed — positive human-entered findings")}
            </option>
          </select>
        </Field>
        <p className="small muted" role="status">
          {t(
            facts.allergy.state === "UNKNOWN"
              ? "Unknown — information is not available"
              : facts.allergy.state === "NOT_REVIEWED"
                ? "Not reviewed — review has not taken place"
                : facts.allergy.state === "REVIEWED_NO_KNOWN"
                  ? "Reviewed — no known allergy or intolerance"
                  : "Reviewed — positive human-entered findings",
          )}
        </p>
        {facts.allergy.state === "REVIEWED_POSITIVE" && (
          <>
            {facts.allergy.items.map((item, index) => (
              <fieldset className="documentation-allergy-item" key={index}>
                <legend>
                  {t("Allergy / intolerance item {number}", {
                    number: String(index + 1),
                  })}
                </legend>
                <Field label={t("Item kind")}>
                  <select
                    value={item.kind}
                    disabled={locked}
                    onChange={(e) =>
                      setFacts({
                        ...facts,
                        allergy: {
                          ...facts.allergy,
                          items: facts.allergy.items.map((entry, i) =>
                            i === index
                              ? {
                                  ...entry,
                                  kind: e.target.value as
                                    | "ALLERGY"
                                    | "INTOLERANCE",
                                }
                              : entry,
                          ),
                        },
                      })
                    }
                  >
                    <option value="ALLERGY">{t("Allergy")}</option>
                    <option value="INTOLERANCE">{t("Intolerance")}</option>
                  </select>
                </Field>
                <TextArea
                  label="Substance or finding"
                  value={item.substance}
                  limit={limits.item}
                  required
                  disabled={locked}
                  onChange={(substance) =>
                    setFacts({
                      ...facts,
                      allergy: {
                        ...facts.allergy,
                        items: facts.allergy.items.map((entry, i) =>
                          i === index ? { ...entry, substance } : entry,
                        ),
                      },
                    })
                  }
                />
                <TextArea
                  label="Reaction (optional)"
                  value={item.reaction}
                  limit={limits.item}
                  disabled={locked}
                  onChange={(reaction) =>
                    setFacts({
                      ...facts,
                      allergy: {
                        ...facts.allergy,
                        items: facts.allergy.items.map((entry, i) =>
                          i === index ? { ...entry, reaction } : entry,
                        ),
                      },
                    })
                  }
                />
                <button
                  className="button subtle"
                  disabled={locked}
                  onClick={() =>
                    setFacts({
                      ...facts,
                      allergy: {
                        ...facts.allergy,
                        items: facts.allergy.items.filter(
                          (_, i) => i !== index,
                        ),
                      },
                    })
                  }
                >
                  {t("Remove allergy item")}
                </button>
              </fieldset>
            ))}
            <button
              className="button secondary"
              disabled={locked || facts.allergy.items.length >= limits.items}
              onClick={() =>
                setFacts({
                  ...facts,
                  allergy: {
                    ...facts.allergy,
                    items: [
                      ...facts.allergy.items,
                      { kind: "ALLERGY", substance: "", reaction: "" },
                    ],
                  },
                })
              }
            >
              {t("Add allergy / intolerance item")}
            </button>
          </>
        )}
      </div>
    </>
  );
}

function FactsRead({ facts }: { facts: FactsDraft }) {
  const { t } = useLocale();
  const states = {
    NOT_REVIEWED: "Not reviewed — review has not taken place",
    UNKNOWN: "Unknown — information is not available",
    REVIEWED_NO_KNOWN: "Reviewed — no known allergy or intolerance",
    REVIEWED_POSITIVE: "Reviewed — positive human-entered findings",
  } as const;
  return (
    <div className="documentation-facts-read">
      {facts.complaint && (
        <>
          <h3>{t("Complaint")}</h3>
          <p dir="auto">{facts.complaint}</p>
        </>
      )}
      {(["problems", "diagnoses"] as const).map(
        (key) =>
          facts[key].length > 0 && (
            <div key={key}>
              <h3>{t(key === "problems" ? "Problems" : "Diagnoses")}</h3>
              <ul>
                {facts[key].map((value, i) => (
                  <li key={i} dir="auto">
                    {value}
                  </li>
                ))}
              </ul>
            </div>
          ),
      )}
      <h3>{t("Allergy / intolerance review")}</h3>
      <p>{t(states[facts.allergy.state])}</p>
      {facts.allergy.items.length > 0 && (
        <ul>
          {facts.allergy.items.map((item, i) => (
            <li key={i}>
              <span>
                {t(item.kind === "ALLERGY" ? "Allergy" : "Intolerance")}:{" "}
              </span>
              <bdi>
                {item.substance}
                {item.reaction ? ` · ${item.reaction}` : ""}
              </bdi>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DocumentationPager({
  service,
  page,
  historyPage,
  setPage,
  setHistoryPage,
}: {
  service: DocumentationApi;
  page: number;
  historyPage: number;
  setPage: (n: number) => void;
  setHistoryPage: (n: number) => void;
}) {
  const { t } = useLocale();
  const pages = service.paging?.() ?? { documents: 1, history: 1 };
  return (
    <nav
      className="documentation-action-row"
      aria-label={t("Documentation pages")}
    >
      <button
        className="button secondary"
        disabled={page <= 1}
        onClick={() => {
          setPage(page - 1);
          setHistoryPage(1);
        }}
      >
        {t("Previous documents")}
      </button>
      <button
        className="button secondary"
        disabled={page >= pages.documents}
        onClick={() => {
          setPage(page + 1);
          setHistoryPage(1);
        }}
      >
        {t("Next documents")}
      </button>
      <button
        className="button secondary"
        disabled={historyPage <= 1}
        onClick={() => setHistoryPage(historyPage - 1)}
      >
        {t("Newer signed history")}
      </button>
      <button
        className="button secondary"
        disabled={historyPage >= pages.history}
        onClick={() => setHistoryPage(historyPage + 1)}
      >
        {t("Older signed history")}
      </button>
    </nav>
  );
}

/** Deferred disposal survives React development effect replay. Restriction/session
 * invalidation still purges all registered services synchronously. */
function useServiceDisposal(service: DocumentationApi) {
  const pending = useRef(
    new Map<DocumentationApi, ReturnType<typeof setTimeout>>(),
  );
  useEffect(() => {
    const timers = pending.current;
    const previous = timers.get(service);
    if (previous !== undefined) {
      clearTimeout(previous);
      timers.delete(service);
    }
    return () => {
      timers.set(
        service,
        setTimeout(() => {
          service.dispose?.();
          timers.delete(service);
        }, 0),
      );
    };
  }, [service]);
}
