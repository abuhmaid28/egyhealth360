import type { NextConfig } from "next";
const config: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.EH_UI_API_ORIGIN ?? "http://127.0.0.1:3001"}/api/v1/:path*`,
      },
    ];
  },
};
export default config;
