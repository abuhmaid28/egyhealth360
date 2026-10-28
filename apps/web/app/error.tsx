"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="boot">
      <div className="error-panel" role="alert">
        <h1>Let’s try that again.</h1>
        <p>
          This view could not be displayed. Your demo journey stays in this
          browser.
        </p>
        <button className="button primary" onClick={reset}>
          Reload view
        </button>
      </div>
    </main>
  );
}
