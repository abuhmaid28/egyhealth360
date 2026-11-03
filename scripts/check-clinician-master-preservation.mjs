/** Exact-base scope plus AST preservation of existing handlers, hooks and service calls. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import ts from "typescript";
const base = "fcff95f2dc1d13a399b5b04423da6897c7a45077";
const git = (...args) =>
  execFileSync("git", args, { maxBuffer: 16 * 1024 * 1024 });
const modified = new Set([
  "apps/web/src/components/application.tsx",
  "apps/web/src/components/live-documentation.tsx",
  "apps/web/src/components/documentation.tsx",
  "apps/web/src/components/consultation-close.tsx",
  "apps/web/src/components/follow-up-intents.tsx",
  "scripts/test-ui-browser.mjs",
  "docs/CURRENT_STATUS.md",
  "docs/SOURCE_OF_TRUTH.md",
  "docs/PROJECT.md",
  "docs/IMPLEMENTATION_ROADMAP.md",
]);
const added = new Set([
  "apps/web/src/components/clinician-consultation.tsx",
  "apps/web/src/components/clinician-consultation-presentation.tsx",
  "apps/web/src/components/clinician-consultation.module.css",
  "apps/web/src/lib/clinician-consultation-copy.ts",
  "scripts/capture-clinician-master.mjs",
  "scripts/support/ui-clinician-master-browser.mjs",
  "scripts/check-clinician-master-preservation.mjs",
  "docs/ui-reference/CLINICIAN_ACTIVE_CONSULTATION_IMPLEMENTATION.md",
]);
const tracked = git("ls-tree", "-r", "--name-only", base)
  .toString()
  .trim()
  .split("\n");
const preserved = [];
for (const path of tracked.filter((p) => !modified.has(p))) {
  const current = readFileSync(path);
  assert.ok(
    current.equals(git("show", `${base}:${path}`)),
    `Out-of-scope change: ${path}`,
  );
  preserved.push([path, createHash("sha256").update(current).digest("hex")]);
}
const changed = [
  ...new Set(
    [
      ...git("diff", "--name-only", base).toString().trim().split("\n"),
      ...git("ls-files", "--others", "--exclude-standard")
        .toString()
        .trim()
        .split("\n"),
    ].filter(Boolean),
  ),
].sort();
for (const path of changed)
  assert.ok(
    modified.has(path) ||
      added.has(path) ||
      (!tracked.includes(path) &&
        path.startsWith("docs/ui-reference/clinician-evidence/")),
    path,
  );
const source = (s) =>
  ts.createSourceFile(
    "view.tsx",
    s,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
const printer = ts.createPrinter({ removeComments: true });
const canonical = (s) => printer.printFile(source(s));
const application = "apps/web/src/components/application.tsx";
const cleanApplication = ts.transform(
  source(readFileSync(application, "utf8")),
  [
    (context) => {
      const visit = (node) => {
        if (
          ts.isImportDeclaration(node) &&
          node.moduleSpecifier.text === "./clinician-consultation"
        )
          return undefined;
        if (
          ts.isIfStatement(node) &&
          /<ClinicianConsultation(?:Boot)?[\s/>]/u.test(
            node.thenStatement.getText(),
          )
        )
          return undefined;
        return ts.visitEachChild(node, visit, context);
      };
      return (node) => ts.visitNode(node, visit);
    },
  ],
);
assert.equal(
  printer.printFile(cleanApplication.transformed[0]),
  canonical(git("show", `${base}:${application}`).toString()),
  "Dispatch changed beyond the exact opt-in route",
);
cleanApplication.dispose();
const signatures = (s) => {
  const root = source(s),
    events = [],
    hooks = [],
    services = [];
  const print = (node) =>
    printer.printNode(ts.EmitHint.Unspecified, node, root);
  const walk = (node) => {
    if (ts.isJsxAttribute(node) && /^on[A-Z]/u.test(node.name.getText()))
      events.push(print(node));
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText();
      if (
        /^use(?:State|Effect|Memo|Ref|Resource|SyncExternalStore)$/u.test(name)
      )
        hooks.push(print(node));
      if (/^(?:api|service|docs|followUp)\./u.test(name))
        services.push(print(node));
    }
    ts.forEachChild(node, walk);
  };
  walk(root);
  return { events, hooks, services };
};
const behavior = [];
for (const path of [...modified].filter(
  (p) => p.endsWith(".tsx") && p !== application,
)) {
  assert.deepEqual(
    signatures(readFileSync(path, "utf8")),
    signatures(git("show", `${base}:${path}`).toString()),
    `Existing event/hook/service contract changed: ${path}`,
  );
  behavior.push(path);
}
const css = readFileSync(
  "apps/web/src/components/clinician-consultation.module.css",
  "utf8",
);
assert.ok(!/#[\da-f]{3,8}\b/iu.test(css), "New palette literal introduced");
assert.ok(!/@font-face/u.test(css), "New font assets introduced");
assert.ok(
  readFileSync(
    "apps/web/src/components/clinician-consultation.tsx",
    "utf8",
  ).includes('from "./patient-my-care.module.css"'),
);
const prior = preserved.filter(([p]) =>
  /^docs\/ui-reference\/(?:evidence|refinement-evidence|composition-evidence|polish-evidence)\//u.test(
    p,
  ),
);
const evidencePath = 'docs/ui-reference/clinician-evidence/after/checks.json';
const capture = JSON.parse(readFileSync(evidencePath, 'utf8')).find((item) => item.runtimeSourcesSha256);
assert.ok(capture, 'Final production capture source manifest is required');
for (const [path, hash] of Object.entries(capture.runtimeSourcesSha256))
  assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), hash, `Stale screenshot source: ${path}`);
const result = {
  base,
  captureSourcesVerified: true,
  changedPaths: changed,
  preservedExistingFiles: preserved.length,
  priorPatientEvidenceFiles: prior.length,
  preservedInventorySha256: createHash("sha256")
    .update(JSON.stringify(preserved))
    .digest("hex"),
  existingHandlersHooksAndServiceCallsIdentical: behavior,
  dispatch:
    "Exact-documentation-URL text-only bootstrap plus authenticated Live CLINICIAN master presentation; all previous dispatch is canonical-AST identical after removing those two presentation branches",
  sourceRail:
    "Derived in the existing authorized editor render; erased with editor redaction/invalidation; no extra read or clinical snapshot",
  protected:
    "Patient-specific files/assets/reports/evidence, fonts/tokens, accepted master/prompt, API/adapters/clinical models, backend/OpenAPI/DB/schema/migrations/security, unrelated portals/workflows, CI/hosting/dependencies; shared presentation defaults remain unchanged outside the opt-in clinician shell",
};
mkdirSync("docs/ui-reference/clinician-evidence", { recursive: true });
writeFileSync(
  "docs/ui-reference/clinician-evidence/preservation.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  `PASS: ${preserved.length} other existing files and ${prior.length} Patient evidence files preserved; existing handlers/hooks/service calls identical in ${behavior.length} components; ${changed.length} bounded paths.`,
);
