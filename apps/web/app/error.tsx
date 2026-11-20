"use client";
import care from "../src/components/patient-my-care.module.css";
import portal from "../src/components/portal-shell.module.css";
import { useLocale } from "../src/lib/i18n/context";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useLocale();
  return (
    <main className={`${care.root} ${portal.login} boot`}>
      <div className="error-panel" role="alert">
        <h1>{t("Let’s try that again.")}</h1>
        <p>{t("We couldn’t load this view")}</p>
        <button className="button primary" onClick={reset}>
          {t("Reload view")}
        </button>
      </div>
    </main>
  );
}
