import type { ReactNode } from "react";
import "./globals.css";
import { LiveSessionProvider } from "../src/components/live-session";
import { LocaleProvider } from "../src/lib/i18n/context";
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
          <LiveSessionProvider>{children}</LiveSessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
