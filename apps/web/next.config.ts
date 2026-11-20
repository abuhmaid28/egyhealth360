import type { NextConfig } from "next";
/** Build-time, server-only routing configuration. Never expose upstream credentials. */
export function apiOrigin(
  value: string | undefined,
  hosted: boolean,
): string | null {
  if (value === undefined || value === "")
    return hosted ? null : "http://127.0.0.1:3001";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("EH_UI_API_ORIGIN must be an absolute HTTP(S) origin.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    (hosted && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (hosted && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  )
    throw new Error(
      "EH_UI_API_ORIGIN must be a credential-free origin; Vercel requires a public HTTPS backend.",
    );
  return url.origin;
}

const origin = apiOrigin(
  process.env.EH_UI_API_ORIGIN,
  process.env.VERCEL === "1",
);
const config: NextConfig = {
  env: { EH_UI_LIVE_CONFIGURED: origin ? "1" : "0" },
  async rewrites() {
    return origin
      ? [
          {
            source: "/api/v1/:path*",
            destination: `${origin}/api/v1/:path*`,
          },
        ]
      : [];
  },
};
export default config;
