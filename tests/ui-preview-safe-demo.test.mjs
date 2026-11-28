import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

const approvedAssets = {
  "apps/web/public/brand/dp02/compact-ar-dark.svg": "bbed526c401f31fefdd1b98d8ab62c64663f2b03b1b8b0ef24a5f81498ea922d",
  "apps/web/public/brand/dp02/compact-ar-light.svg": "d83098460ac57d43801314dd5a8f96fa40b72268ae27893b302a0661e8ca89ff",
  "apps/web/public/brand/dp02/compact-en-dark.svg": "6ad7f9b61b1a43308e16e8d0a6a4bf80c389bac29d46d292eef938af8e2120c3",
  "apps/web/public/brand/dp02/compact-en-light.svg": "e49f02c9e4a7619ca8265d9d01e8e8a3b52176ec4654658b72e2cac6bf60b887",
  "apps/web/public/brand/dp02/primary-ar-dark.svg": "f96e38a2a6e1e7273edd57b8e98005f28b0894efa03ffba41ef2c0394a5196da",
  "apps/web/public/brand/dp02/primary-ar-light.svg": "76d14637666b2d9aadbdc211223454c3f216bff38927c11577ed4d77abce4fa4",
  "apps/web/public/brand/dp02/primary-en-dark.svg": "eaa33073140aff82d87d34e134157671f7f8d38ac625618a26b69978641bddd5",
  "apps/web/public/brand/dp02/primary-en-light.svg": "f6935c1441d2e68092109425d31f707621f6ec33b405d6ceb00fc0876f53b54e",
  "apps/web/public/visual-recovery/care-encounter.webp": "ee37f8f323246d28fc0b5b2c7b98fc2b98b12552bd8ff5ec49eba32449af5b9e",
  "apps/web/public/visual-recovery/mariam.webp": "8f4d04fe4e1f1f41c2a46be8faac78740dbda52121c06e47ceb09e79d4c03dfb",
  "apps/web/public/visual-recovery/omar.webp": "d596fe12701029829d574fd6d226f4bcefefa2fec19148c7850fbe933d09f156",
  "apps/web/public/visual-recovery/sara.webp": "ae1d2d5a8c19c1b7d6b2f5cf0f31387b92c3974f5deed2c6f279d2a8a6b27541",
};

test("All 12 owner-attested approved assets exist byte-identically with preserved OFL font notices", () => {
  for (const [path, expectedSha256] of Object.entries(approvedAssets)) {
    assert.equal(existsSync(path), true, `Missing approved asset: ${path}`);
    const actualSha256 = createHash("sha256").update(readFileSync(path)).digest("hex");
    assert.equal(actualSha256, expectedSha256, `Asset digest mismatch: ${path}`);
  }
  for (const notice of [
    "apps/web/public/fonts/Inter-OFL.txt",
    "apps/web/public/fonts/Noto-Sans-Arabic-OFL.txt",
    "apps/web/public/fonts/my-care/manrope-OFL.txt",
    "apps/web/public/fonts/my-care/plex-arabic-OFL.txt",
  ]) {
    assert.equal(existsSync(notice), true, `Missing font license notice: ${notice}`);
  }
});

test("next.config.ts, vercel.preview.json, and untrusted asset 404 route handlers enforce Demo-only isolation", () => {
  const nextConfig = readFileSync("apps/web/next.config.ts", "utf8");
  assert.match(nextConfig, /EH_PREVIEW_DEMO_ONLY/);
  assert.match(nextConfig, /EH_PREVIEW_DEMO_ONLY=1 forbids EH_UI_API_ORIGIN/);
  assert.match(nextConfig, /X-Robots-Tag/);
  const vercelPreview = JSON.parse(readFileSync("apps/web/vercel.preview.json", "utf8"));
  assert.match(vercelPreview.buildCommand, /EH_PREVIEW_DEMO_ONLY=1/);
  assert.equal(vercelPreview.framework, "nextjs");
  const headerList = vercelPreview.headers?.[0]?.headers ?? [];
  const headerMap = Object.fromEntries(headerList.map((entry) => [entry.key, entry.value]));
  assert.equal(headerMap["X-Robots-Tag"], "noindex, nofollow, noarchive");
  assert.equal(headerMap["X-Content-Type-Options"], "nosniff");
  assert.equal(headerMap["Referrer-Policy"], "no-referrer");
  assert.equal(headerMap["Permissions-Policy"], "camera=(), microphone=(), geolocation=()");
  assert.equal(headerMap["X-Frame-Options"], "DENY");
  assert.equal(headerMap["Content-Security-Policy"], "frame-ancestors 'none'");
  assert.equal(headerList.length, 6);
  assert.doesNotMatch(JSON.stringify(vercelPreview), /egyhealth360\.vercel\.app/);

  for (const routeFile of [
    "apps/web/app/brand/[...slug]/route.ts",
    "apps/web/app/visual-recovery/[...slug]/route.ts",
  ]) {
    assert.equal(existsSync(routeFile), true, `Missing negative fallback route handler: ${routeFile}`);
    const src = readFileSync(routeFile, "utf8");
    assert.match(src, /status:\s*404/);
  }
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

test("Restored DP02 BrandLogo and Demo-only ProviderPortrait render approved assets in Demo and withhold WebP portraits in Live", () => {
  const brandMod = {};
  new Function("exports", "require", transpile("apps/web/src/components/brand-logo.tsx"))(
    brandMod,
    (id) => {
      if (id.endsWith(".css")) return { default: new Proxy({}, { get: (_, k) => String(k) }) };
      if (id === "next/image") return { default: (props) => React.createElement("img", props) };
      return webRequire(id);
    },
  );
  for (const language of ["en", "ar"]) {
    const html = renderToStaticMarkup(React.createElement(brandMod.BrandLogo, { language }));
    assert.match(html, /data-dp02-logo/);
    assert.ok(html.includes(`/brand/dp02/primary-${language}-light.svg`));
    assert.ok(html.includes(`/brand/dp02/compact-${language}-dark.svg`));
  }

  let currentMode = "demo";
  const uiCache = new Map();
  const load = (file) => {
    if (uiCache.has(file)) return uiCache.get(file);
    const out = {};
    uiCache.set(file, out);
    new Function("exports", "require", transpile(file))(out, (id) => {
      if (id.endsWith(".css")) return { default: new Proxy({}, { get: (_, k) => String(k) }) };
      if (id === "next/image") return { default: (props) => React.createElement("img", props) };
      if (id === "next/link") return { default: ({ children, ...p }) => React.createElement("a", p, children) };
      if (id.endsWith("i18n/context")) return { useLocale: () => ({ locale: "en", t: (s) => s }) };
      if (id === "../context") return { useApp: () => ({ api: { mode: currentMode }, session: { mode: currentMode } }) };
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

  currentMode = "demo";
  const demoHtml = renderToStaticMarkup(
    React.createElement(portraitMod.ProviderPortrait, {
      providerId: "mariam-hassan",
      name: "Dr. Mariam Hassan",
      discovery: true,
    }),
  );
  assert.ok(demoHtml.includes("/visual-recovery/mariam.webp"));

  currentMode = "live";
  const liveHtml = renderToStaticMarkup(
    React.createElement(portraitMod.ProviderPortrait, {
      providerId: "mariam-hassan",
      name: "Dr. Mariam Hassan",
      discovery: false,
    }),
  );
  assert.doesNotMatch(liveHtml, /\.webp|visual-recovery/);
  assert.ok(liveHtml.includes("MH"));

  const recoveryCss = readFileSync("apps/web/src/components/v2/visual-recovery.module.css", "utf8");
  assert.ok(recoveryCss.includes('url("/visual-recovery/care-encounter.webp")'));
});

test("apps/web/app/[[...path]]/page.tsx and live-session.tsx fail closed to Demo mode when Demo-only preview is active", () => {
  const pageSrc = readFileSync("apps/web/app/[[...path]]/page.tsx", "utf8");
  assert.match(pageSrc, /EH_UI_PREVIEW_DEMO_ONLY/);
  assert.match(pageSrc, /EH_UI_LIVE_CONFIGURED === "1" && !previewDemoOnly/);

  const sessionSrc = readFileSync("apps/web/src/components/live-session.tsx", "utf8");
  assert.match(sessionSrc, /if \(!liveConfigured\) \{\s*selectedMode\.current = "demo";\s*return "demo";\s*\}/);

  const appSrc = readFileSync("apps/web/src/components/application.tsx", "utf8");
  assert.match(appSrc, /if \(!liveConfigured\) \{\s*throw new Error\(/);
  assert.match(appSrc, /entry-mode-note/);
});

test("Asset rights doc records owner attestation explicitly without fabricating third-party clearance", () => {
  const doc = readFileSync(join("docs", "SAFE_DEMO_PREVIEW_DEPLOYMENT.md"), "utf8");
  assert.match(doc, /OWNER-ATTESTED \/ PERMITTED FOR PREVIEW/);
  assert.match(doc, /7083992813/);
  assert.match(doc, /UNVERIFIED IN REPO/);
});
