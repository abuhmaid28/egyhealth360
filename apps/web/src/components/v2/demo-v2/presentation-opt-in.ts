export const DEMO_V2_OPT_IN_KEY = "eh360-v2-demo";

// Bounded in-memory SPA presentation intent for Demo mode when sessionStorage is unavailable.
let memoryDemoV2OptIn = false;

export function isDemoV2QueryActive(): boolean {
  if (typeof globalThis.window === "undefined") return false;
  try {
    const search = globalThis.window.location?.search ?? "";
    if (!search) return false;
    return new URLSearchParams(search).get("v2") === "1";
  } catch {
    return false;
  }
}

function readSessionStorageOptIn(): boolean {
  if (typeof globalThis.window === "undefined") return false;
  try {
    const storage = globalThis.window.sessionStorage;
    return storage?.getItem(DEMO_V2_OPT_IN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSessionStorageOptIn(): void {
  if (typeof globalThis.window === "undefined") return;
  try {
    const storage = globalThis.window.sessionStorage;
    storage?.setItem(DEMO_V2_OPT_IN_KEY, "1");
  } catch {
    /* Storage denied: retain bounded in-memory SPA Demo presentation intent only. */
  }
}

function removeSessionStorageOptIn(): void {
  if (typeof globalThis.window === "undefined") return;
  try {
    const storage = globalThis.window.sessionStorage;
    storage?.removeItem(DEMO_V2_OPT_IN_KEY);
  } catch {
    /* Ignore storage denial on cleanup. */
  }
}

export function activateDemoV2PresentationOptIn(): void {
  memoryDemoV2OptIn = true;
  writeSessionStorageOptIn();
}

export function captureDemoV2QueryIntent(): boolean {
  if (!isDemoV2QueryActive()) return false;
  activateDemoV2PresentationOptIn();
  return true;
}

export function clearDemoV2PresentationOptIn(): void {
  memoryDemoV2OptIn = false;
  removeSessionStorageOptIn();
}

export function resolveDemoV2PresentationOptIn(options?: {
  previewDemoOnly?: boolean;
  liveConfigured?: boolean;
}): boolean {
  if (options?.previewDemoOnly === true || options?.liveConfigured === false) {
    return true;
  }
  if (typeof globalThis.window === "undefined") {
    return false;
  }
  if (captureDemoV2QueryIntent()) {
    return true;
  }
  if (memoryDemoV2OptIn) {
    return true;
  }
  if (readSessionStorageOptIn()) {
    memoryDemoV2OptIn = true;
    return true;
  }
  return false;
}
