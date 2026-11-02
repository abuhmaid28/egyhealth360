/** Display-only monogram from the available clinician name; never an invented identity. */
export function clinicianMonogram(name: string | null | undefined): string {
  const tokens = (name ?? "")
    .normalize("NFC")
    .trim()
    .replace(
      /^(?:(?:dr\.?|doctor|د\.?|دكتور|الدكتور|دكتورة|الدكتورة|طبيب|طبيبة)(?:\s+|$))+/iu,
      "",
    )
    .match(/[\p{L}][\p{L}\p{M}'’-]*/gu);
  if (!tokens?.length) return "—";
  return [tokens[0], ...(tokens.length > 1 ? [tokens[tokens.length - 1]] : [])]
    .map((token) => Array.from(token)[0].toUpperCase())
    .join("");
}
