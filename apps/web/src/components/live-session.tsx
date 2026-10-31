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
import { createDemoAdapter } from "../lib/mock/adapter";
type LiveSession = {
  adapter: () => HealthcareAdapter;
  demo: () => ReturnType<typeof createDemoAdapter>;
  clear: () => void;
};
const Context = createContext<LiveSession | null>(null);
/** A persistent client-only Live capability scope, not an authorization cache.
 * Each page still resolves /auth/me; all reads/writes recheck on the server.
 * Live identity never enters browser storage or the separate explicit Demo adapter. */
export function LiveSessionProvider({ children }: { children: ReactNode }) {
  const current = useRef<HealthcareAdapter | undefined>(undefined);
  const demo = useRef<ReturnType<typeof createDemoAdapter> | undefined>(
    undefined,
  );
  const value = useMemo<LiveSession>(
    () => ({
      adapter: () => (current.current ??= createLiveAdapter()),
      demo: () => {
        if (!demo.current) {
          let storage: Storage | undefined;
          try {
            storage = window.localStorage;
          } catch {
            /* Memory-only demo. */
          }
          demo.current = createDemoAdapter(storage);
        }
        return demo.current;
      },
      clear: () => {
        current.current?.documentation?.clear?.();
        current.current?.followUpIntents?.clear();
        current.current?.liveBookings?.clearCommands();
        current.current?.consultationOpening?.clear();
        current.current?.consultationClose?.clear();
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
