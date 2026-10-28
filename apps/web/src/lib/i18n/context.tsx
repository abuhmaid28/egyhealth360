"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  translate,
  parseLocale,
  localePreferenceKey,
  type Locale,
} from "./catalog";
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
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    try {
      setLocale(parseLocale(localStorage.getItem(localePreferenceKey)));
    } catch {
      /* Preference unavailable; English remains usable. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem(localePreferenceKey, locale);
    } catch {
      /* Presentation-only preference. */
    }
  }, [locale]);
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
