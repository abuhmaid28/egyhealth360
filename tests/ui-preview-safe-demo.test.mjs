import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

const removedAssets = [
  "apps/web/public/visual-recovery/care-encounter.webp",
  "apps/web/public/visual-recovery/mariam.webp",
  "apps/web/public/visual-recovery/omar.webp",
  "apps/web/public/visual-recovery/sara.webp",
  "apps/web/public/brand/dp02/compact-ar-dark.svg",
  "apps/web/public/brand/dp02/compact-ar-light.svg",
  "apps/web/public/brand/dp02/compact-en-dark.svg",
  "apps/web/public/brand/dp02/compact-en-light.svg",
  "apps/web/public/brand/dp02/primary-ar-dark.svg",
  "apps/web/public/brand/dp02/primary-ar-light.svg",
  "apps/web/public/brand/dp02/primary-en-dark.svg",
  "apps/web/public/brand/dp02/primary-en-light.svg",
];

function walkFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".next" || entry.name === "node_modules") continue;
      results.push(...walkFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

test("All 12 AP05-unverified assets are deleted and unreferenced across apps/web", () => {
  for (const path of removedAssets) {
    assert.equal(existsSync(path), false, `Removed asset still exists: ${path}`);
  }
  const files = [
    ...walkFiles("apps/web/app"),
    ...walkFiles("apps/web/src"),
    ...walkFiles("apps/web/public"),
  ];
  for (const file of files) {
    if (/\.(woff2|ttf)$/i.test(file)) continue;
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(
      text,
      /\/brand\/dp02\/|\/visual-recovery\/|care-encounter\.webp|mariam\.webp|omar\.webp|sara\.webp/,
      `Unverified AP05 reference remains in ${file}`,
    );
  }
});

test("apps/web/next.config.ts and vercel.preview.json enforce fail-closed Demo-only preview configuration", () => {
  const nextConfig = readFileSync("apps/web/next.config.ts", "utf8");
  assert.match(nextConfig, /EH_PREVIEW_DEMO_ONLY/);
  assert.match(nextConfig, /EH_PREVIEW_DEMO_ONLY=1 forbids EH_UI_API_ORIGIN/);
  assert.match(nextConfig, /X-Robots-Tag/);
  const vercelPreview = JSON.parse(readFileSync("apps/web/vercel.preview.json", "utf8"));
  assert.match(vercelPreview.buildCommand, /EH_PREVIEW_DEMO_ONLY=1/);
  assert.equal(vercelPreview.framework, "nextjs");
  assert.ok(
    JSON.stringify(vercelPreview.headers).includes("noindex, nofollow, noarchive"),
  );
  assert.doesNotMatch(JSON.stringify(vercelPreview), /egyhealth360\.vercel\.app/);
});

const webRequire = createRequire(resolve("apps/web/package.json"));
const React = webRequire("react");
const { renderToStaticMarkup } = webRequire("react-dom/server");

function transpile(file) {
  return ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
}

test("Text-only BrandLogo and initials ProviderPortrait render zero images or unverified assets", () => {
  const brandMod = {};
  new Function("exports", "require", transpile("apps/web/src/components/brand-logo.tsx"))(
    brandMod,
    (id) => (id.endsWith(".css") ? { default: new Proxy({}, { get: (_, k) => String(k) }) } : webRequire(id)),
  );
  for (const language of ["en", "ar"]) {
    const html = renderToStaticMarkup(React.createElement(brandMod.BrandLogo, { language }));
    assert.match(html, /data-preview-brand="text-only"/);
    assert.doesNotMatch(html, /<img|<svg|dp02|visual-recovery/);
    assert.ok(html.includes(language === "ar" ? "إيجي هيلث" : "EgyHealth"));
  }

  const uiCache = new Map();
  const load = (file) => {
    if (uiCache.has(file)) return uiCache.get(file);
    const out = {};
    uiCache.set(file, out);
    new Function("exports", "require", transpile(file))(out, (id) => {
      if (id.endsWith(".css")) return { default: new Proxy({}, { get: (_, k) => String(k) }) };
      if (id === "next/link") return { default: ({ children, ...p }) => React.createElement("a", p, children) };
      if (id.endsWith("i18n/context")) return { useLocale: () => ({ locale: "en", t: (s) => s }) };
      if (id.startsWith(".")) {
        const base = resolve(dirname(file), id);
        const hit = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
        if (hit) return load(hit);
      }
      return webRequire(id);
    });
    return out;
  };
  const portraitMod = load(resolve("apps/web/src/components/v2/demo-portrait.tsx"));
  for (const discovery of [false, true]) {
    const html = renderToStaticMarkup(
      React.createElement(portraitMod.ProviderPortrait, {
        providerId: "mariam-hassan",
        name: "Dr. Mariam Hassan",
        discovery,
      }),
    );
    assert.doesNotMatch(html, /<img|\.webp|visual-recovery/);
    assert.ok(html.includes("MH"));
  }
});

test("apps/web/app/[[...path]]/page.tsx and live-session.tsx fail closed to Demo mode when Demo-only preview is active", () => {
  const pageSrc = readFileSync("apps/web/app/[[...path]]/page.tsx", "utf8");
  assert.match(pageSrc, /EH_UI_PREVIEW_DEMO_ONLY/);
  assert.match(pageSrc, /EH_UI_LIVE_CONFIGURED === "1" && !previewDemoOnly/);

  const sessionSrc = readFileSync("apps/web/src/components/live-session.tsx", "utf8");
  assert.match(sessionSrc, /if \(!liveConfigured\) \{\s*selectedMode\.current = "demo";\s*return "demo";\s*\}/);
});
