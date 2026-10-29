"use client";
import { createContext, useContext } from "react";
import type { HealthcareAdapter, Session } from "../lib/api/contracts";
import type { Preview } from "./ui";
import type { BookingService } from "../lib/api/booking";
import type { Role } from "../lib/api/contracts";
export interface AppContext {
  api: HealthcareAdapter;
  booking: BookingService;
  session: Session;
  preview: Preview;
  refresh: number;
  notify: (message: string) => void;
  changed: () => void;
  openDemoWorkspace: (role: Role, path?: string) => Promise<void>;
}
export const Context = createContext<AppContext | null>(null);
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace context missing.");
  return value;
}
