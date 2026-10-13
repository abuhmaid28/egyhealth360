export function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value)) throw new Error('Invalid positive integer configuration');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > 2147483647) throw new Error('Invalid positive integer configuration');
  return parsed;
}

export function authConfiguration(env: { NODE_ENV?: string; AUTH_BROWSER_ORIGIN?: string }) {
  if (!['development', 'test', 'production'].includes(env.NODE_ENV ?? '')) throw new Error('Invalid authentication mode');
  const value = env.AUTH_BROWSER_ORIGIN;
  if (!value) throw new Error('AUTH_BROWSER_ORIGIN is required');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Invalid browser origin'); }
  const production = env.NODE_ENV === 'production';
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (value !== url.origin || value.includes('*') || url.username || url.password
    || (url.protocol !== 'https:' && !(url.protocol === 'http:' && !production && loopback))) {
    throw new Error('Invalid browser origin');
  }
  return { origin: value, production, cookieName: production ? '__Host-eh_session' : 'eh_session' };
}
export type AuthConfiguration = ReturnType<typeof authConfiguration>;
