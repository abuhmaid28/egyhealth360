"use client";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import {
  translate,
  parseLocale,
  localePreferenceKey,
  type Locale,
} from "./catalog";
import care from "../../components/patient-my-care.module.css";
const Context = createContext({
  locale: "en" as Locale,
  setLocale: (_locale: Locale) => {
    void _locale;
  },
  t: (value: string, _values?: Record<string, string>) => {
    void _values;
    return value;
  },
});
export function LocaleProvider({ children }: { children: ReactNode }) {
  // The server and first client render must not depend on browser storage.
  const [locale, setLocale] = useState<Locale | null>(null);
  useEffect(() => {
    let restored: Locale = "en";
    try {
      restored = parseLocale(localStorage.getItem(localePreferenceKey));
    } catch {
      /* Preference unavailable; English remains usable. */
    }
    setLocale(restored);
  }, []);
  useLayoutEffect(() => {
    if (locale === null) return;
    // Commit document semantics before the resolved subtree can paint.
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem(localePreferenceKey, locale);
    } catch {
      /* Presentation-only preference. */
    }
  }, [locale]);
  if (locale === null)
    return (
      <main className={`${care.root} boot`} data-initial-locale>
        <bdi className={care.wordmark} lang="en" dir="ltr">EgyHealth 360</bdi>
        <div role="status" aria-live="polite" aria-atomic="true">
          <p lang="en" dir="ltr">Loading your workspace…</p>
          <p lang="ar" dir="rtl">بنجهّز مساحة العمل…</p>
        </div>
      </main>
    );
  return (
    <Context.Provider
      value={{
        locale,
        setLocale,
        t: (value, values) => translate(locale, value, values),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLocale() {
  return useContext(Context);
}
export function LanguageSwitch() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="language-switch" role="group" aria-label="Language / اللغة">
      <button
        type="button"
        lang="en"
        dir="ltr"
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        English
      </button>
      <span aria-hidden="true">|</span>
      <button
        type="button"
        lang="ar"
        dir="rtl"
        aria-pressed={locale === "ar"}
        onClick={() => setLocale("ar")}
      >
        العربية
      </button>
    </div>
  );
}
