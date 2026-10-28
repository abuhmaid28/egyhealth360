import { ar } from "./ar";
export type Locale = "en" | "ar";
export const localePreferenceKey = "eh360-locale";
export const parseLocale = (value: string | null): Locale =>
  value === "ar" ? "ar" : "en";
/** Called only for authored UI copy, never for clinical/free-text content or API payloads. */
export function translate(
  locale: Locale,
  key: string,
  values: Record<string, string> = {},
): string {
  let result = locale === "ar" ? (ar[key] ?? key) : key;
  for (const [name, value] of Object.entries(values))
    result = result.replace(`{${name}}`, () => value);
  return result;
}
