"use client";

import { useSyncExternalStore } from "react";

export type DemoScenario = "ready" | "loading" | "empty" | "error" | "uncertain";

const ready = () => "ready" as const;
const noopSubscribe = () => () => {};

/** Overlaid into a disposable browser-test checkout only. */
export function useDemoTestScenario(enabled: boolean): DemoScenario {
  return useSyncExternalStore(
    enabled ? subscribe : noopSubscribe,
    enabled ? snapshot : ready,
    ready,
  );
}

function snapshot(): DemoScenario {
  const candidate = new URLSearchParams(window.location.search).get("__eh_ui_test_scenario");
  switch (candidate) {
    case "loading":
    case "empty":
    case "error":
    case "uncertain":
      return candidate;
    default:
      return "ready";
  }
}

function subscribe(update: () => void) {
  window.addEventListener("eh-visual-test-scenario", update);
  return () => window.removeEventListener("eh-visual-test-scenario", update);
}
