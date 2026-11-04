import type { ReactNode } from "react";
import "../../web/app/globals.css";
import "./demo.css";
import { LocaleProvider } from "../../web/src/lib/i18n/context";
import { DemoProvider } from "../src/demo";
export const metadata = {
  title: "EgyHealth 360 · Graduation demonstration",
  description: "Interactive synthetic Patient and Clinician demonstration. No live clinical service.",
  robots: { index: false, follow: false },
  icons: { icon: "data:," },
};
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><LocaleProvider><DemoProvider>{children}</DemoProvider></LocaleProvider></body></html>;
}
