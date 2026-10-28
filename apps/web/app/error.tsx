"use client";
import { useLocale } from "../src/lib/i18n/context";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useLocale();
  return (
    <main className="boot">
      <div className="error-panel" role="alert">
        <h1>{t("Let’s try that again.")}</h1>
        <p>
          {t(
            "This view could not be displayed. Your demo journey stays in this browser.",
          )}
        </p>
        <button className="button primary" onClick={reset}>
          {t("Reload view")}
        </button>
      </div>
    </main>
  );
}
