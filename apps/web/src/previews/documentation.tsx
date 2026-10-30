"use client";
/** Isolated preview entry, imported ONLY by the generated test host. Not an app route. */
import { useEffect, useRef, useState } from "react";
import {
  createControlledDocumentation,
  type ControlledActor,
} from "../lib/mock/documentation-controlled";
import {
  DocumentationWorkspaceScreen,
  ReleasedSummariesScreen,
} from "../components/documentation";
import { Badge, Field, Logo } from "../components/ui";
import { LanguageSwitch, useLocale } from "../lib/i18n/context";
export default function DocumentationPreview() {
  const { t } = useLocale();
  const [fixture] = useState(() => createControlledDocumentation());
  const [actor, setActor] = useState<ControlledActor>("author"),
    [authority, setAuthority] = useState(true),
    [opened, setOpened] = useState(true),
    [expired, setExpired] = useState(false),
    [version, setVersion] = useState(0),
    [refresh, setRefresh] = useState(0),
    [holding, setHolding] = useState(false);
  const release = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => release.current?.(), []);
  return (
    <div className="documentation-preview-host" data-preview-version={version}>
      <header className="documentation-preview-header">
        <Logo />
        <Badge tone="amber">
          {t("Controlled clinical preview — synthetic, not Live")}
        </Badge>
        <LanguageSwitch />
      </header>
      <main className="documentation-preview-main">
        <details className="documentation-preview-controls" open>
          <summary>{t("Controlled preview controls")}</summary>
          <div className="documentation-preview-control-grid">
            <Field label={t("Preview role")}>
              <select
                value={actor}
                onChange={(e) => {
                  const value = e.target.value as ControlledActor;
                  fixture.controls.setActor(value);
                  setActor(value);
                  setVersion((v) => v + 1);
                }}
              >
                <option value="author">{t("Treating author")}</option>
                <option value="patient">
                  {t("Own patient released view")}
                </option>
                <option value="other-patient">{t("Other patient")}</option>
                <option value="other-clinician">
                  {t("Another clinician")}
                </option>
                <option value="admin">
                  {t("Administrator — no clinical access")}
                </option>
              </select>
            </Field>
            <Field
              label={t("Next explicit action scenario")}
              hint={t(
                "This affects only the next explicit action in this synthetic preview.",
              )}
            >
              <select
                defaultValue="ready"
                onChange={(e) => {
                  if (e.target.value === "pending") {
                    fixture.controls.delayNextCommand();
                    return;
                  }
                  if (e.target.value !== "ready")
                    fixture.controls.failNext(
                      e.target.value === "conflict" ? "conflict" : "uncertain",
                      e.target.value === "uncertain-after",
                    );
                }}
              >
                <option value="ready">{t("Ready")}</option>
                <option value="pending">
                  {t("Pending response in controlled preview")}
                </option>
                <option value="uncertain-before">
                  {t("Uncertain result before commit")}
                </option>
                <option value="uncertain-after">
                  {t("Uncertain result after controlled commit")}
                </option>
                <option value="conflict">
                  {t("Conflict / stale version")}
                </option>
              </select>
            </Field>
            <label className="documentation-ack">
              <input
                type="checkbox"
                checked={authority}
                onChange={(e) => {
                  fixture.controls.setAuthority(e.target.checked);
                  setAuthority(e.target.checked);
                  setVersion((v) => v + 1);
                }}
              />
              {t("Current clinical authority in fixture")}
            </label>
            <label className="documentation-ack">
              <input
                type="checkbox"
                checked={opened}
                onChange={(e) => {
                  fixture.controls.setOpened(e.target.checked);
                  setOpened(e.target.checked);
                  setVersion((v) => v + 1);
                }}
              />
              {t("Opened consultation context in fixture")}
            </label>
            <label className="documentation-ack">
              <input
                type="checkbox"
                checked={expired}
                onChange={(e) => {
                  fixture.controls.setExpired(e.target.checked);
                  setExpired(e.target.checked);
                  setVersion((v) => v + 1);
                }}
              />
              {t("Expired session in fixture")}
            </label>
          </div>
          <div className="documentation-action-row">
            <button
              className="button secondary"
              disabled={holding}
              onClick={() => {
                release.current = fixture.controls.hold();
                setHolding(true);
                setRefresh((v) => v + 1);
              }}
            >
              {t("Hold preview response")}
            </button>
            <button
              className="button secondary"
              disabled={!holding}
              onClick={() => {
                release.current?.();
                release.current = undefined;
                setHolding(false);
              }}
            >
              {t("Continue preview response")}
            </button>
            <button
              className="button subtle"
              disabled={holding}
              onClick={() => setRefresh((v) => v + 1)}
            >
              {t("Refresh preview view")}
            </button>
          </div>
        </details>
        <div key={`${fixture.api.scopeStamp()}:${refresh}`}>
          {actor === "patient" || actor === "other-patient" ? (
            <ReleasedSummariesScreen service={fixture.api} />
          ) : (
            <DocumentationWorkspaceScreen service={fixture.api} />
          )}
        </div>
      </main>
    </div>
  );
}
