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
    <html lang="en">
      <body>
        <LocaleProvider>
          <LiveSessionProvider>{children}</LiveSessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
