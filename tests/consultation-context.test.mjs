import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { beforeI2LiveCloseout, beforeI3Slice1 } from "./support/openapi-baseline.mjs";

test("Live recovery adds only GET/HEAD context and preserves every merged I2 API byte", async () => {
  const raw = beforeI3Slice1(await readFile("docs/openapi.json", "utf8")),
    prior = beforeI2LiveCloseout(raw);
  assert.equal(
    createHash("sha256").update(prior).digest("hex"),
    "d3eb7cd70aea11183e9b89778892b0fb4a9fc7822676ee1dee95938b47f99bd4",
  );
  const api = JSON.parse(raw),
    old = JSON.parse(prior),
    path = "/api/v1/me/bookings/{bookingId}/consultation";
  assert.deepEqual(
    Object.keys(api.paths),
    Object.keys(old.paths),
    "no new broad resource surface",
  );
  assert.deepEqual(Object.keys(api.paths[path]), ["post", "get", "head"]);
  assert.deepEqual(
    api.paths[path].post,
    old.paths[path].post,
    "opening mutation unchanged",
  );
  assert.deepEqual(
    Object.keys(api.components.schemas).filter(
      (k) => !Object.hasOwn(old.components.schemas, k),
    ),
    ["ConsultationContext"],
  );
  for (const r of Object.values(api.paths[path].head.responses))
    assert.equal(r.content, undefined);
  assert.equal(api.paths[path].get.requestBody, undefined);
});
