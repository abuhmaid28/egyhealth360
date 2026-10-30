/** Explicit local presentation host. Synthetic, memory-only, never a Live flag. */
import { startDocumentationHost } from "./support/ui-documentation-host.mjs";
const host = await startDocumentationHost();
console.log(
  `Controlled clinical documentation preview (NOT LIVE): ${host.origin}`,
);
for (const event of ["SIGINT", "SIGTERM"])
  process.once(event, async () => {
    await host.stop();
    process.exit(0);
  });
