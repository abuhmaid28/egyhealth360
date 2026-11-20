import type { Availability, Provider } from "../api/contracts";
import type { createDemoAdapter } from "./adapter";

/** Explicit live-to-demo transition. Never reserves a live slot or grants authority. */
export async function previewDemoBooking(
  demo: ReturnType<typeof createDemoAdapter>,
  provider: Provider,
  slot: Availability,
  reason: string,
) {
  const session = await demo.enter("PATIENT");
  const appointment = await demo.bookPreview(provider, slot, reason);
  return { session, appointment };
}
