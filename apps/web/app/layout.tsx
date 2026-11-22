import type { ReactNode } from "react";
import "./globals.css";
import "../src/components/v2/frontend-v2-tokens.css";
import { LiveSessionProvider } from "../src/components/live-session";
import { LocaleProvider } from "../src/lib/i18n/context";
import { FrontendV2ThemeProvider } from "../src/components/v2/frontend-v2-theme";
export const metadata = {
  title: "EgyHealth 360 · Your care, connected",
  description:
    "A connected healthcare journey. Synthetic graduation demonstration with explicit live API integration boundaries.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <noscript>
          <div className="boot">
            <p lang="en" dir="ltr">JavaScript is needed to open this workspace.</p>
            <p lang="ar" dir="rtl">فتح مساحة العمل دي محتاج JavaScript.</p>
          </div>
        </noscript>
        <LocaleProvider>
          <FrontendV2ThemeProvider><LiveSessionProvider>{children}</LiveSessionProvider></FrontendV2ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
