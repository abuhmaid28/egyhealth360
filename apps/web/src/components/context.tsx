"use client";
import { createContext, useContext } from "react";
import type {
  HealthcareAdapter,
  Session,
  Provider,
  Availability,
  Appointment,
} from "../lib/api/contracts";
import type { Preview } from "./ui";
export interface AppContext {
  api: HealthcareAdapter;
  session: Session;
  preview: Preview;
  refresh: number;
  notify: (message: string) => void;
  changed: () => void;
  startDemoBooking: (
    provider: Provider,
    slot: Availability,
    reason: string,
  ) => Promise<Appointment>;
}
export const Context = createContext<AppContext | null>(null);
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace context missing.");
  return value;
}
