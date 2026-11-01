"use client";
import Link from "next/link";
import { presentationName } from '../lib/presentation';
import { useEffect, useRef, useState } from "react";
import {
  CloseUiError,
  type ConsultationContext,
} from "../lib/api/consultation-close";
import type { DocumentationContext } from "../lib/api/documentation";
import { DocumentationError } from "../lib/clinical/documentation";
import { FollowUpError } from "../lib/api/follow-up-intents";
import { safeErrorMessage } from "../lib/api/errors";
import { useLocale } from "../lib/i18n/context";
import { useApp } from "./context";
import {
  Badge,
  Card,
  CardTitle,
  date,
  Icon,
  Modal,
  Resource,
  SessionRecovery,
  time,
  useResource,
} from "./ui";

export function CloseIndependence() {
  const { t } = useLocale();
  return (
    <ul className="close-boundaries">
      <li>{t("Private notes are not automatically signed.")}</li>
      <li>{t("Patient summaries are not automatically released.")}</li>
      <li>{t("Follow-up instructions are not automatically released.")}</li>
      <li>{t("Other care tasks stay unchanged when you close this visit.")}</li>
    </ul>
  );
}
export function ConsultationCloseCard({
  context,
  documentation,
  update,
}: {
  context: ConsultationContext;
  documentation: DocumentationContext;
  update: (next: ConsultationContext) => void;
}) {
  const { t } = useLocale();
  const [review, setReview] = useState(false);
  const result = useRef<HTMLDivElement>(null);
  const focusResult = useRef(false);
  useEffect(() => {
    if (focusResult.current && context.state === "CLOSED" && !review) {
      focusResult.current = false;
      result.current?.focus();
    }
  }, [context.state, review]);
  return (
    <>
      <Card className="consultation-close-card" id="review-close">
        <div ref={result} tabIndex={-1} className="close-result" role="status">
          <CardTitle
            title={t(
              context.state === "CLOSED"
                ? "Consultation closed"
                : "Review & close consultation",
            )}
          />
          <Badge tone={context.state === "CLOSED" ? "green" : "soft"}>
            {t(
              context.state === "CLOSED"
                ? "Closed · booking consulted"
                : "Open · documentation in progress",
            )}
          </Badge>
          {context.closedAt && (
            <p>
              <bdi>
                {date(context.closedAt, documentation.timeZone)} ·{" "}
                {time(context.closedAt, documentation.timeZone)}
              </bdi>
            </p>
          )}
        </div>
        <p className="muted">
          {t(
            context.state === "CLOSED"
              ? "The visit is closed. Saved documentation and explicit release actions remain separate and require current authority."
              : "Finish your clinical review, then deliberately close this visit. Unsaved editor changes are not saved by closing.",
          )}
        </p>
        <CloseIndependence />
        {context.state === "OPEN" && (
          <button className="button primary" onClick={() => setReview(true)}>
            {t("Review & close consultation")}
            <Icon name="check" size={16} />
          </button>
        )}
        {context.state === "CLOSED" && (
          <div className="documentation-action-row">
            <Link
              className="button secondary"
              href={`/doctor/appointments/${context.bookingId}`}
            >
              {t("View consulted booking")}
            </Link>
            <Link className="text-link" href="/doctor/schedule">
              {t("Back to schedule")}
            </Link>
          </div>
        )}
      </Card>
      {review && (
        <ReviewCloseDialog
          context={context}
          documentation={documentation}
          cancel={() => setReview(false)}
          update={(next) => {
            focusResult.current = true;
            update(next);
            setReview(false);
          }}
        />
      )}
    </>
  );
}
function ReviewCloseDialog({
  context,
  documentation,
  cancel,
  update,
}: {
  context: ConsultationContext;
  documentation: DocumentationContext;
  cancel: () => void;
  update: (next: ConsultationContext) => void;
}) {
  const { t, locale } = useLocale();
  const { api, changed } = useApp();
  const [busy, setBusy] = useState(false),
    [ack, setAck] = useState(false);
  const [failure, setFailure] = useState<{ status: number; message: string }>();
  const snapshot = useResource(async () => {
    try {
      const current = await api.consultationClose!.context(context.bookingId);
      if (current.state === "CLOSED")
        return { current, records: undefined, intents: undefined };
      const docs = api.liveDocumentation!.forConsultation(documentation);
      const followUp = api.followUpIntents!.forConsultation(context.id);
      try {
        const [records, intents] = await Promise.all([
          docs.workspace(),
          followUp.list(),
        ]);
        return { current, records, intents };
      } finally {
        docs.dispose?.();
        followUp.dispose();
      }
    } catch (e) {
      const denied =
        (e instanceof CloseUiError && [401, 404].includes(e.status)) ||
        ((e instanceof DocumentationError || e instanceof FollowUpError) &&
          ["access", "expired"].includes(e.code));
      if (denied) {
        api.liveDocumentation?.clear?.();
        api.followUpIntents?.clear();
      }
      throw e;
    }
  }, [api, context.id]);
  const denied = failure?.status === 401 || failure?.status === 404;
  const blocked =
    denied ||
    failure?.status === 403 ||
    failure?.status === 400 ||
    failure?.status === 409;
  return (
    <Modal
      className="modal close-review-modal"
      aria-labelledby="close-review-title"
      aria-describedby="close-review-description"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else cancel();
      }}
    >
      <div className="modal-header">
        <span className="icon-tile">
          <Icon name="check" />
        </span>
        <button
          className="icon-button"
          aria-label={t("Close")}
          disabled={busy}
          onClick={cancel}
        >
          <Icon name="close" />
        </button>
      </div>
      <p className="eyebrow">{t("Final visit review")}</p>
      <h2 id="close-review-title">{t("Close this consultation?")}</h2>
      <p id="close-review-description" className="muted">
        {t(
          "The consultation will become Closed and its booking Consulted. Closing cannot be undone. Releases remain your separate, explicit choice.",
        )}
      </p>
      {!denied && (
        <Resource resource={snapshot}>
          {({ current, records, intents }) =>
            current.state === "CLOSED" ? (
              <>
                <p role="status">
                  {t(
                    "This consultation is already closed. Update the workspace to its current server state.",
                  )}
                </p>
                <button
                  className="button primary"
                  onClick={() => {
                    update(current);
                    changed();
                  }}
                >
                  {t("Show closed consultation")}
                </button>
              </>
            ) : (
              <>
                <div className="confirmation-details">
                  <h3>
                    <bdi>{presentationName(documentation.patientName, t)}</bdi>
                  </h3>
                  <p>
                    <bdi>{presentationName(documentation.providerName ?? '', t)}</bdi> ·{" "}
                    <bdi>{presentationName(documentation.clinicName ?? '', t)}</bdi>
                  </p>
                  <p className="review-visit-time"><Icon name="calendar" size={16}/><bdi>{date(current.openedAt, documentation.timeZone, locale)} · {time(current.openedAt, documentation.timeZone, locale)} · {documentation.timeZone}</bdi></p>
                  <Badge tone="blue">{t('Consultation open')}</Badge>
                </div>
                <h3>{t("Recent saved documentation")}</h3>
                <p className="small muted">
                  {t(
                    "Review all saved pages and any unsaved changes in the workspace before confirming. Only separately released items are visible to the patient.",
                  )}
                </p>
                <dl className="close-review-facts">
                  <div>
                    <dt>{t("Private note")}</dt>
                    <dd>
                      {t(
                        records?.note?.state === "SIGNED"
                          ? "Signed privately"
                          : records?.note
                            ? "Saved draft · private"
                            : "No recent saved note",
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Patient summary")}</dt>
                    <dd>
                      {t(
                        records?.summary?.state === "SIGNED_RELEASED"
                          ? "Explicitly released"
                          : records?.summary
                            ? "Saved draft · not released"
                            : "No recent saved summary",
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Follow-up instructions")}</dt>
                    <dd>
                      {t("{drafts} drafts · {released} released on this page", {
                        drafts: String(
                          intents?.data.filter((i) => i.state === "DRAFT")
                            .length ?? 0,
                        ),
                        released: String(
                          intents?.data.filter(
                            (i) => i.state === "SIGNED_RELEASED",
                          ).length ?? 0,
                        ),
                      })}
                    </dd>
                  </div>
                </dl>
                <CloseIndependence />
                <label className="close-ack">
                  <input
                    type="checkbox"
                    checked={ack}
                    disabled={busy}
                    onChange={(e) => setAck(e.target.checked)}
                  />
                  <span>
                    {t(
                      "I reviewed this visit and understand that closing does not sign or release clinical material.",
                    )}
                  </span>
                </label>
                <button
                  className="button primary full"
                  disabled={busy || !ack || blocked}
                  onClick={async () => {
                    setBusy(true);
                    setFailure(undefined);
                    try {
                      const receipt =
                        await api.consultationClose!.close(current);
                      update({ ...current, ...receipt });
                      changed();
                    } catch (e) {
                      const status = e instanceof CloseUiError ? e.status : 503;
                      setFailure({ status, message: safeErrorMessage(e) });
                      if (status === 404 || status === 401) {
                        api.liveDocumentation?.clear?.(
                          status === 401 ? "expired" : "access",
                        );
                        api.followUpIntents?.clear(
                          status === 401 ? "expired" : "access",
                        );
                      }
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t(
                    busy
                      ? "Closing consultation…"
                      : failure
                        ? "Retry unchanged close"
                        : "Confirm close consultation",
                  )}
                </button>
              </>
            )
          }
        </Resource>
      )}
      {busy && (
        <p role="status" aria-live="polite">
          {t(
            "Keep this visit open while the server confirms the close outcome.",
          )}
        </p>
      )}
      {failure && (
        <div className="form-error" role="alert">
          <p>{t(failure.message)}</p>
          <SessionRecovery message={failure.message} />
        </div>
      )}
      {failure?.status === 409 && (
        <button
          className="button secondary"
          onClick={() => {
            setFailure(undefined);
            setAck(false);
            snapshot.retry();
          }}
        >
          {t("Refresh consultation state")}
        </button>
      )}
      <button className="button subtle full" disabled={busy} onClick={cancel}>
        {t("Return to documentation")}
      </button>
    </Modal>
  );
}
