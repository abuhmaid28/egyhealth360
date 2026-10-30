"use client";
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { HealthcareAdapter } from "../lib/api/contracts";
import { createLiveAdapter } from "../lib/api/live";
type LiveSession = { adapter: () => HealthcareAdapter; clear: () => void };
const Context = createContext<LiveSession | null>(null);
/** A persistent client-only capability scope, not an authorization cache.
 * Each page still resolves /auth/me; all reads/writes recheck on the server.
 * No module-global identity, browser storage, or synthetic clinical state. */
export function LiveSessionProvider({ children }: { children: ReactNode }) {
  const current = useRef<HealthcareAdapter | undefined>(undefined);
  const value = useMemo<LiveSession>(
    () => ({
      adapter: () => (current.current ??= createLiveAdapter()),
      clear: () => {
        current.current?.liveBookings?.clearCommands();
        current.current?.consultationOpening?.clear();
        current.current = undefined;
      },
    }),
    [],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLiveSession() {
  const context = useContext(Context);
  if (!context) throw new Error("Live session scope missing.");
  return context;
}
