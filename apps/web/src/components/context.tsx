"use client";
import { createContext, useContext } from "react";
import type { HealthcareAdapter, Session } from "../lib/api/contracts";
import type { Preview } from "./ui";
export interface AppContext {
  api: HealthcareAdapter;
  session: Session;
  preview: Preview;
  refresh: number;
  notify: (message: string) => void;
  changed: () => void;
}
export const Context = createContext<AppContext | null>(null);
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace context missing.");
  return value;
}
