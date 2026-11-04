import type { NextConfig } from "next";
// Separate static Next app: no API rewrites, runtime environment, sessions or server actions.
const config: NextConfig = { output: "export", trailingSlash: true, poweredByHeader: false };
export default config;
