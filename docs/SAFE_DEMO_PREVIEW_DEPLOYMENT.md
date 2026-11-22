# EgyHealth 360 — Isolated Safe Synthetic Demo Preview Specification

Status: `CURRENT AUTHORITATIVE` — Preview-only isolation specification for branch `preview/egyhealth360-safe-demo` stacked on Node `24.22.3` ([Draft PR #155](https://github.com/abuhmaid28/egyhealth360/pull/155)) + PR `#154` / PR `#156`.
Scope boundary: **Synthetic browser-only Demo preview ONLY.** Does **NOT** grant AP05 production clearance, final Brand/Design System approval, `F06/E2` hosted E2E acceptance, Pharmacy Live mutation UI, Laboratory Live support, or `main` merge/production release.

---

## 1. AP05 Asset Removal & Temporary Substitutions

All 12 unverified AP05 assets identified in [RELEASE_READINESS_135_149.md](RELEASE_READINESS_135_149.md) are **deleted** from `apps/web/public/` on `preview/egyhealth360-safe-demo`:

- Deleted DP02 SVG lockups (`8` files): `apps/web/public/brand/dp02/{compact,primary}-{en,ar}-{light,dark}.svg`
- Deleted WebP portraits & entry photo (`4` files): `apps/web/public/visual-recovery/{care-encounter,mariam,omar,sara}.webp`

Temporary preview-only visual substitutions (preserving approved Violet × Apricot tokens, bilingual EN/AR switching, RTL/LTR layout, 320px/390px/1440px responsiveness, Dark/Light/System themes, and WCAG AA contrast):

| Surface | Previous AP05 Asset | Temporary Preview Substitution | Implementation |
| :--- | :--- | :--- | :--- |
| Global header & boot wordmark | 8 `/brand/dp02/*.svg` `<Image>` lockups | Accessible text-only wordmark (`EgyHealth 360` / `إيجي هيلث 360` with `[data-preview-brand="text-only"]`) | [`brand-logo.tsx`](../apps/web/src/components/brand-logo.tsx), [`brand-logo.module.css`](../apps/web/src/components/brand-logo.module.css) |
| `/login` entry hero visual | `care-encounter.webp` CSS background | Pure CSS Violet × Apricot geometric radial/linear gradients (`0` external/bitmap URLs) | [`visual-recovery.module.css`](../apps/web/src/components/v2/visual-recovery.module.css) |
| Patient Discovery & Doctor Profile | `mariam.webp`, `omar.webp`, `sara.webp` | Accessible initials badges (`DiscoveryPortrait` `[data-discovery-initials]` & `<Avatar large />`) | [`demo-portrait.tsx`](../apps/web/src/components/v2/demo-portrait.tsx) |
| Removed asset HTTP routes | Static files returning `200` / catch-all `200` | Dedicated Next.js Route Handlers returning empty HTTP **`404`** | [`brand/[...slug]/route.ts`](../apps/web/app/brand/%5B...slug%5D/route.ts), [`visual-recovery/[...slug]/route.ts`](../apps/web/app/visual-recovery/%5B...slug%5D/route.ts) |

Licensed SIL OFL 1.1 local fonts (`Inter`, `Noto Sans Arabic`, `Manrope`, `IBM Plex Sans Arabic`) and internal geometric SVGs remain preserved under `apps/web/public/fonts/` with their OFL notice files.

---

## 2. Fail-Closed Demo-Only Hosting Isolation

1. **Build-time lock (`EH_PREVIEW_DEMO_ONLY=1`):** In [`next.config.ts`](../apps/web/next.config.ts), setting `EH_PREVIEW_DEMO_ONLY=1` (or unconfigured `VERCEL=1` with absent `EH_UI_API_ORIGIN`) forces `EH_UI_LIVE_CONFIGURED=0`, `EH_UI_PREVIEW_DEMO_ONLY=1`, zero `/api/v1/:path*` rewrites (`rewrites() === []`), and privacy/noindex response headers (`X-Robots-Tag: noindex, nofollow, noarchive`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`). Defining both `EH_PREVIEW_DEMO_ONLY=1` and `EH_UI_API_ORIGIN` throws at build time (fail-closed).
2. **SSR & Client Session Fence:** [`app/[[...path]]/page.tsx`](../apps/web/app/%5B%5B...path%5D%5D/page.tsx), [`live-session.tsx`](../apps/web/src/components/live-session.tsx), and [`application.tsx`](../apps/web/src/components/application.tsx) enforce `mode(false) === "demo"` regardless of tampered `localStorage.getItem("eh360-ui-mode") === "live"`, disable the Live credential form, refuse `onLive`/`chooseMode("live")`, and display `.entry-mode-note` in English and Arabic.
3. **Zero Backend / Secrets / PHI Exposure:** An isolated preview Vercel project must **never** receive `EH_UI_API_ORIGIN`, `DATABASE_URL`, `AUTH_*`, or Render/Neon secrets, and must **never** reuse or alter the protected `egyhealth360.vercel.app` domain.

---

## 3. Isolated Vercel Project Recipe (After Final Owner Approval)

Reference template: [`apps/web/vercel.preview.json`](../apps/web/vercel.preview.json) (not named `vercel.json` so it cannot auto-bind existing hosting projects).

- **Project Type:** Dedicated brand-new Vercel project targeting Root Directory `apps/web`, with Vercel Deployment Protection / Password Protection enabled until the Product Owner authorizes public link sharing.
- **Node Runtime:** `24.22.3` (`.nvmrc` & `package.json`).
- **Build Command:** `cd ../.. && pnpm --filter @egyhealth/ui build && EH_PREVIEW_DEMO_ONLY=1 pnpm --filter @egyhealth/web build`
- **Required Env Vars:** `EH_PREVIEW_DEMO_ONLY=1` (no `EH_UI_API_ORIGIN`, no `DATABASE_URL`, no backend secrets).
- **Protected Exclusions:** Do not deploy `apps/api`, do not run live database migrations, do not activate `F06/E2`, Pharmacy Live mutations, or Laboratory Live backend, and do not promote to `egyhealth360.vercel.app`.

---

## 4. Provenance & Rollback

- Inherited PR `#154` historical visual evidence (`docs/visual-evidence/135/**`, 78 PNGs) remains byte-identical internally on this branch with `safeDemoPreviewOverlay` added solely for [`application.tsx`](../apps/web/src/components/application.tsx) in [`ui-v2-combined-integration.test.mjs`](../tests/ui-v2-combined-integration.test.mjs) and [`ui-pharmacy-live.test.mjs`](../tests/ui-pharmacy-live.test.mjs).
- Verified via [`ui-preview-safe-demo.test.mjs`](../tests/ui-preview-safe-demo.test.mjs), [`ui-safe-demo-preview-browser.mjs`](../scripts/support/ui-safe-demo-preview-browser.mjs), [`test-ui-deployment-browser.mjs`](../scripts/test-ui-deployment-browser.mjs), full `pnpm test`, and `pnpm test:ui:browser`.
- Rollback / promotion separation: PR `#154` (`integrate/135-149-final-candidate`) and PR `#155` (`security/node24-lts-hardening`) remain clean and untouched; this preview branch targets `security/node24-lts-hardening` strictly for isolated synthetic preview deployment review.
