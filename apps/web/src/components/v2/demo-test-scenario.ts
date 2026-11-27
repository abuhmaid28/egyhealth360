/** Runtime uses real adapter state. The isolated test build replaces this module. */
export type DemoScenario = "ready" | "loading" | "empty" | "error" | "uncertain";
export const useDemoTestScenario: (demo: boolean) => DemoScenario = () => "ready";
