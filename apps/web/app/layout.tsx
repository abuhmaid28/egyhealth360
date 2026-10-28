import type { ReactNode } from "react";
import "./globals.css";
export const metadata = {
  title: "EgyHealth 360 · Your care, connected",
  description:
    "A connected healthcare journey. Synthetic graduation demonstration with explicit live API integration boundaries.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
