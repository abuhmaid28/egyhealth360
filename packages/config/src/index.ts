export function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value)) throw new Error('Invalid positive integer configuration');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > 2147483647) throw new Error('Invalid positive integer configuration');
  return parsed;
}
