"use client";
import { useId, useState } from "react";
import { useLocale } from "../lib/i18n/context";
import { safeErrorMessage } from "../lib/api/errors";
import {
  DocumentationError,
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
  return <WorkspaceScope key={service.scopeStamp()} service={service} />;
}
function WorkspaceScope({ service }: { service: DocumentationApi }) {
  const { t } = useLocale();
  const [revision, setRevision] = useState(0);
  const resource = useResource(
    async () => ({ revision, view: await service.workspace() }),
    [service, revision],
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
      <Resource resource={resource}>
        {(result) =>
          result.revision === revision &&
          result.view.scopeStamp === service.scopeStamp() ? (
            <DocumentationEditor
              key={`${result.view.scopeStamp}:${revision}`}
              service={service}
              view={result.view}
              reload={() => setRevision((value) => value + 1)}
            />
          ) : (
            <Loading />
          )
        }
      </Resource>
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
  reload: () => void;
}) {
  const { t } = useLocale();
  const [view, setView] = useState(initialView);
  const [facts, setFacts] = useState<FactsDraft>(view.facts),
    [note, setNote] = useState(view.note?.text ?? ""),
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
        "Saved in the controlled preview. No Live backend write occurred.",
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
        <button className="button secondary" onClick={reload}>
          {t("Refresh visible documentation")}
        </button>
      </Card>
    );
  const saveFacts = () => run("facts", () => service.saveFacts(facts));
  const saveNote = () => run("note", () => service.savePrivateNote(note), true);
  const saveSummary = () =>
    run(
      "summary",
      () => service.saveSummary({ text: summary, instructions }),
      true,
    );
  return (
    <>
      <Card className="documentation-context">
        <div>
          <p className="eyebrow">{t("Opened consultation context")}</p>
          <h2>
            <bdi>{view.patientName}</bdi>
          </h2>
          <p>
            <bdi>
              {view.providerName} · {view.clinicName}
            </bdi>
          </p>
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
            <button className="button secondary" onClick={reload}>
              {t("Recheck visible documentation")}
            </button>
          )}
          <Card id="doc-facts">
            <CardTitle title={t("01 · Complaint and findings")} />
            <p className="muted">
              {t(
                "These author-only entries are not automatically copied into the patient summary.",
              )}
            </p>
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
            <div id="doc-allergy" className="documentation-review">
              <h3>{t("Allergy / intolerance review")}</h3>
              <Field
                label={t("Review state")}
                hint={t(
                  "Unknown and not reviewed never mean no known allergies.",
                )}
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
                    <fieldset
                      className="documentation-allergy-item"
                      key={index}
                    >
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
                          <option value="INTOLERANCE">
                            {t("Intolerance")}
                          </option>
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
                    disabled={
                      locked || facts.allergy.items.length >= limits.items
                    }
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
          </Card>
          <Card
            id="doc-private"
            tabIndex={-1}
            className="documentation-private"
          >
            <CardTitle title={t("02 · Private note")} />
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
                    !validNarrative(note, limits.narrative, true)
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
                    disabled={locked || note !== view.note?.text}
                    onClick={() => setConfirmation("sign")}
                  >
                    {t("Sign private note")}
                  </button>
                )}
              </div>
            )}
          </Card>
          <Card id="doc-summary" tabIndex={-1}>
            <CardTitle title={t("03 · Patient summary and instructions")} />
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
                    instructions !== view.summary.instructions
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
                  {version.reason && <p dir="auto">{version.reason}</p>}
                  {version.current && (
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
                ? "Only the saved patient summary and instructions below become patient-visible. Private note and author-only findings are excluded."
                : "Signing keeps this note private. It does not release anything to the patient or ADMIN.",
            )}
          </p>
          <div className="documentation-release-preview">
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
          done={() => {
            setRedacted(true);
            setNote("");
            setSummary("");
            setInstructions("");
            reload();
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
}: {
  version: DocumentationVersion;
  change: "ADDENDUM" | "CORRECTION";
  service: DocumentationApi;
  close: () => void;
  done: () => Promise<void>;
}) {
  const { t } = useLocale();
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
  done: () => void;
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
                done();
            } finally {
              setBusy(false);
            }
          }}
        >
          {t(busy ? "Restricting…" : "Confirm wrong-patient restriction")}
        </button>
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
  return <ReleasedScope key={service.scopeStamp()} service={service} />;
}
function ReleasedScope({ service }: { service: DocumentationApi }) {
  const { t } = useLocale();
  const resource = useResource(() => service.released(), [service]);
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
        {(summaries) => (
          <div className="documentation-released-list">
            {summaries.length ? (
              summaries.map((v) => (
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
                  <p>
                    <bdi>
                      {v.authorName} · {v.clinicName}
                    </bdi>
                  </p>
                  <p className="small muted">
                    <bdi>
                      {date(v.releasedAt)} · {time(v.releasedAt)}
                    </bdi>
                  </p>
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
        )}
      </Resource>
    </>
  );
}
