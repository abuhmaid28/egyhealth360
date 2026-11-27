# NOVA refinement — technical and governance evidence

Subject: one Arabic RTL, synthetic, disconnected Patient My Care visual refinement. Base main `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`; primary visual source PR #90 at `5aad95092a74e5818214c71d4263451b9d28eb86`. [Owner package](README.md) and [independent critique](INDEPENDENT_REVIEW.md).

## Technical credibility

- **Chromium 154.0.8037.57**, installed Playwright, Linux, DPR 1. Two primary full-page screenshots: Arabic 390×844 and 1440×1050 viewport. Full-page height extends beyond the viewport to show all content. One comparison board uses clearly labeled mobile viewport excerpts plus complete desktop images. No AI-generated interface images.
- [Five layout cases](evidence/browser-results.json): 1440, 390, 320px; 200% computed text at both 390 and 320px. Final document widths equal their viewports; zero measured horizontal overflow, offscreen essential bounds or scroll-box clipping. One h1, correct Arabic/RTL semantics, logical source order, complete doctor/date/time/action labels and isolated Latin facts. All three used local font faces load.
- All seven design-only preview buttons pass keyboard Enter, modal opening, Tab loop, Escape and opener focus return. Skip link is visible and focuses main. Native controls have names, visible 3px focus and at least 44×44px target dimensions; key phone actions are at least 48px high. Independent review additionally tests Shift+Tab. No fixed overlay obscures focused controls.
- [Contrast](evidence/contrast.json): **62** direct-text observations including explicit lightest appointment-gradient endpoint and dialog button; minimum **5.46:1**, zero sampled text failures below 4.5:1. Focus/surface pairs: dark **17.17:1**, paper **9.58:1**. Sampling is bounded and does not certify every non-text boundary or pixel.
- [Motion/focus](evidence/motion.json): normal color/border/arrow transitions are 140ms; reduced-motion makes all transitions 0s and scrolling automatic. Dark and paper focus use different contrasting rings. Hover feedback is visual only. Loading is specified in the rationale without adding a broader-state screen or a fake operation.
- No runtime/console errors, failed asset responses, external browser request attempts, API call, persistence or clinical command. CSP includes `connect-src 'none'`. Existing local fonts/assets only; all logged specimen requests are local GETs.
- `Africa/Cairo` formatting confirms `UTC+02:00` for the appointment instant. Same exact synthetic booking, independent released recommendation/summary, no associated follow-up appointment here, bounded history, unconnected Rx and explicit booking/access boundary. No private-source existence/count or fabricated clinical meaning.

## Before/after evidence

[Measured geometry](evidence/comparison-metrics.json) renders original A's exact pinned HTML/CSS/fonts through an intercepted localhost route, without editing the original branch. The old PNG copies are byte-identical to source. At 390px: appointment **488.47→326.34px**, primary action bottom **794.45→572.09px**, follow-up title top **907.84→797.16px**. These are geometry observations, not user-task outcomes. Original normal-state captures and refined captures use matched CSS viewport dimensions.

Initial author/reviewer findings prompted documented corrections: the first refinement was judged too flat and table-like; depth, offset shared surface/alignment and natural attribution were strengthened. A further desktop action-placement defect was corrected by placing each action beside its own correspondence group. The independent reviewer verifies fresh screenshots. The motion harness initially expected one CSS duration despite three transitioned properties; the check now inspects all declared durations and verifies actual hover completion. No product assertion was weakened.

## Governance and exact-head CI

Only `docs/nova-evolution-refinement/**` and minimal `docs/CURRENT_STATUS.md` / `docs/SOURCE_OF_TRUTH.md` entries change. [Preservation evidence](evidence/preservation.json) compares all pre-existing tracked files to exact main, excluding only those two authorized current-document updates. Application frontend, backend, packages, API/OpenAPI, database/schema/migrations, security/clinical contracts, dependencies, CI and protected/historical evidence remain byte-identical. Original PR #90 and its immutable source evidence are preserved; its remote head is rechecked at handoff.

Local validation: specimen ESLint, existing 30 CI-policy tests, existing Markdown/reference checker, equal-content/local-reference checks, original-PNG hashes, complete-range whitespace and preservation. Existing Node **24.19.0** and installed tooling are used without installation; remote CI uses pinned repository Node **24.21.0** / pnpm **10.34.6**. No dependency/lockfile change.

One separate branch and one Draft PR. Required CI runs on the final committed HEAD. The unchanged classifier selects full regression for new static artifact paths; actual job results/run URL/head are recorded in the Draft PR handoff, not substituted by PR #90's earlier green run. No CI modification or invented policy skip. No merge, auto-merge, deployment, alias, promotion, final logo, palette/type freeze, Design System or production implementation.

## Limits and cost

No English visual-parity, full state matrix, native-device, native browser zoom, screen-reader, cross-browser, Egyptian participant/editorial research or WCAG conformance claim. Computed 200% text and Linux browser emulation are bounded tests. Loading transition is a concept for later state validation, not an integrated capability. A separate reviewer can still find the design insufficient; readiness is for owner evaluation only.

No additional subscription, purchase, paid API/image service, asset, premium feature or credit transaction. Fonts and Chromium/Playwright are existing free/open-source resources; authoring/review use existing Codex access; required CI uses unchanged standard runners in the verified public repository. Existing account/runtime usage limits and underlying compute costs remain real.
