# Content System + Arabic UX — validation evidence

HISTORICAL EVIDENCE for this documentation-only candidate, not final Product Owner acceptance or a runtime/browser localization result. Authority: [#72 / 6567540211](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6567540211). Exact task base: `86cc044314c865404a114903bbe417fde00e10ec` (accepted Stage 3 PR #76). Exact-base main [CI 41377208348](https://github.com/abuhmaid28/egyhealth360/actions/runs/41377208348) was independently queried: push/main, exact base, COMPLETED / SUCCESS. Final content head, PR and remote CI timing belong in the PR handoff so this file need not embed its own circular commit identity.

## Scope and reading evidence

Followed AGENTS → current #72/latest owner authorization and supersession check → CURRENT_STATUS → charter/source index → accepted Product UX/IA and sitemaps → relevant I1 relationship, I2 booking/documentation/follow-up/close, I3 prescription/pharmacy and accepted future Lab policy → current V1 source/catalog/schema as needed. Main was fetched before branching; exact branch base matches the user-supplied baseline. No later authorization superseding 6567540211 was present at inspection.

New documents: [CONTENT_SYSTEM](CONTENT_SYSTEM.md), [ARABIC_UX](ARABIC_UX.md), [TERMINOLOGY_GLOSSARY](TERMINOLOGY_GLOSSARY.md), [CONTENT_DECISION_REGISTER](CONTENT_DECISION_REGISTER.md), this validation. Current status/source/roadmap/project/UX references and IA acceptance notices are reconciled; historical evidence/accepted behavioral contracts are retained. No new navigation choices or clinical rules are approved here.

Audit [CA01–CA21](CONTENT_SYSTEM.md#current-content-audit) has every required classification: KEEP, REWRITE, STANDARDIZE, LOCALIZE, REMOVE USER-FACING, OWNER DECISION. Direct English staff headings, catalog fallback, inconsistent Arabic shared-source terms, generic retry and unsupported Demo preparation terms have baseline source evidence. Internal model names are identified as domain concepts rather than falsely claiming all appear literally on screens. This is a representative content audit, not an exhaustive extracted active-string count.

## Destination and terminology coverage

All **43 accepted destination/context IDs** are covered in bilingual content models: G0–G1 (2), P1–P11 (11), C1–C12 (12), F1–F5 (5), L1–L5 (5), A1–A8 (8). Each has an English working name, Arabic candidate, purpose, empty/unavailable concept, resource-specific loading/error concept and key status/action language. Details use uniform safe unavailable wording when existence cannot be disclosed; empty-list language is not used to reveal forbidden objects. Loading/errors reference defined patterns rather than inventing extra destinations.

Patient primary P1/P2 and doctor primary C1/C3 remain accepted Candidate B. Appointment/prescription retrieval through P8 and summary/follow-up through P11 remain explicitly named secondary paths, independent of current tasks. Consultation remains sustained C5 with local C6–C10, availability secondary C11; Pharmacy assigned work/history, future Lab assigned diagnostics and operational People/Organizations are preserved. No URL, component, visual layout or CSS decision follows.

Glossary rows each contain internal/domain concept, English, Arabic, context, avoid words, reason and one of the four required statuses. The seven material decisions are bundled as CD01–CD07 with 2–3 substantive alternatives, recommendation, reason/naturalness, risk and explicit owner status. Future Lab, continuity/reminders and service-health exposure are not current claims. APPROVED FOUNDATION marks accepted meaning, not a newly approved translation.

## Semantic safety test — English and Arabic

Method: adversarial editorial interpretation against accepted source-specific contracts, not a new runtime test. Each row tests whether a reader could infer the dangerous equivalence from the proposed copy. English and Arabic reviewed independently for the same prohibition. **10/10 English + 10/10 Arabic pass after editorial correction.** This is documented reasoning evidence, not measured user comprehension.

| # / dangerous inference | Tested English wording | Tested Arabic wording | Result and contract boundary |
| --- | --- | --- | --- |
| 1 Booking = chart access | “Booking does not give medical-record access.” Care request awaits doctor acceptance. | «الحجز لا يمنح صلاحية الاطّلاع على المعلومات الطبية.» والطلب بانتظار قبول الطبيب. | PASS EN/AR. Current assignment is grant; legacy independent assignments remain valid under their own rules. I1 relationship contract |
| 2 Appointment booked = consultation started | “Booked” versus “Consultation in progress”; explicit “Start consultation.” | «محجوز» مقابل «الاستشارة جارية»؛ «بدء الاستشارة» إجراء صريح. | PASS EN/AR. Booking, attendance observation and consultation opening separate; no clock inference. I2 opening |
| 3 Closed = all notes shared | “Closing does not save, sign or share other content.” | «الإغلاق لا يحفظ المحتوى الآخر أو يوقّعه أو يشاركه.» | PASS EN/AR. PRIVATE_NOTE SIGNED stays private; summary/follow-up explicit combined sign-and-share. I2 documentation/close |
| 4 Prescription signed = dispensed | “Signing does not send it to a pharmacy”; separate “Dispense recorded.” | «التوقيع لا يرسل الوصفة إلى صيدلية»؛ «سُجّل صرف الدواء» حالة منفصلة. | PASS EN/AR. SIGNED source, validity, route and per-item fact independent. I3 Slice 1/2 |
| 5 Pharmacy accepted = available | “Acceptance does not confirm medicine availability or dispense.” | «القبول لا يؤكد توافر الدواء أو صرفه.» | PASS EN/AR. No stock/preparation/pickup/delivery promise. I3 Slice 2 |
| 6 Dispensed = taken | “Dispense recorded for this item”; no consumption label. | «سُجّل صرف الدواء لهذا البند»؛ دون ادعاء تناوله. | PASS EN/AR. Full-item supply fact only; no adherence inference. I3 Slice 2 |
| 7 Reversed = can dispense again | “Dispense record reversed. No further dispense is allowed for this item.” | «أُبطل تسجيل الصرف. لا يُسمح بصرف هذا البند مجددًا.» | PASS EN/AR. FULLY_DISPENSED retained with terminal reversal; no further correction or renewed entitlement. Fresh signed source/fresh route for new supply |
| 8 Follow-up recommended = booked | “This action does not book an appointment”; actual linked booking stated separately. | «هذه التوصية لا تحجز موعدًا»؛ يُعرض الموعد المرتبط الفعلي منفصلًا. | PASS EN/AR. Unknown association says “No appointment is linked here,” never “no booking anywhere.” I2 follow-up |
| 9 Lab final = doctor reviewed | FUTURE “Final result … This does not indicate doctor review.” | FUTURE «نتيجة نهائية … هذا لا يعني أن طبيبًا راجعها.» | PASS EN/AR. Lab explicit verification/finalization, same-person allowed, immediate permitted patient visibility; no doctor-release queue. Accepted future I3 §5 only |
| 10 Admin = clinical data access | People/Organizations “Operational accounts only”; no chart links/counts/impersonation. | «الحسابات التشغيلية فقط»؛ دون روابط للسجل السريري أو أعداد سريرية أو انتحال للطبيب. | PASS EN/AR. Admin has no clinical authority/override/signing/assignment creation. Accepted authority policy |

Additional adversarial checks: unknown/unreviewed allergy ≠ negative; request ACCEPTED history ≠ active current assignment; pending legacy confirmation withdrawal ≠ grant end; all assigned items supplied is derived, not a new route state; validity is derived at current server time; summary/follow-up do not acquire an invented signed-unshared state; failed atomic reschedule/reroute/replacement preserves prior state; cancelled/replaced/expired staff history has no patient display name/source instructions; privacy/unavailable response leaks no ID/count/reference; unknown writes cannot be retried automatically or with new keys. PASS by source comparison and copy review, not fresh backend execution.

## Arabic quality and localization checks

Editorial pass rejects literal/robotic/classical wording, English grammar carried into Arabic, inconsistent shared-state vocabulary, generic repeated Patient labels and unsupported English leakage. ARABIC_UX includes weak/recommended examples, noun/verb agreement, full-sentence authoring and recorded clinical-text exceptions. Contemporary professional MSA remains CD01 recommendation, not an empirically validated Egyptian preference.

Date/time/number fixtures cover named Gregorian months, full year, 24-hour time, actual zone/offset at the instant, DST/repeated-hour ambiguity, cross-midnight bounds, date-only birth dates and exact decimal quantity/unit. Proposed Latin digits are CD07, not silently frozen; alternative Arabic-Indic convention evaluated. Relative dates supplement absolute times. No clinical quantity rounding or unit/dose conversion.

Nine mixed-direction fixture classes cover mixed names, medicine/quantity/unit, range/sign/offset, date/time, necessary IDs, phone, email, proper nouns and screen-reader/copy sequence. Expected semantics and storage-preservation requirements are explicit. English exception/fallback policy covers critical actions/errors/accessibility, not only happy-path navigation. Static fixture/editorial review PASS. Actual bidi rendering, copying/selection and assistive-technology validation are deferred to separately authorized implementation; no screenshots were generated and no browser proof is claimed.

## Fresh-agent comprehension test

A separate fresh product/content agent read AGENTS and only the four content documents for answers, relying on cited current owner authorization. It performed read-only review, without prior chat history, edits or runtime tests. **20/20 clear**. This satisfies the requested fresh-agent comprehension check; it is not the later external independent PR review or Product Owner acceptance.

| # | Question / recovered answer | Evidence |
| --- | --- | --- |
| 1 | Voice: clear, calm, competent, human, concise, respectful, non-alarming, clinically honest | CONTENT_SYSTEM: Voice and tone |
| 2 | Arabic: contemporary professional MSA, familiar Egyptian healthcare vocabulary, no slang/literal English | ARABIC_UX: Recommended register; CD01 |
| 3 | Patient: personal My care / رعايتي, Find care / ابحث عن رعاية | Glossary platform/navigation; CD03 |
| 4 | Doctor / طبيب for physician journeys; broader profession only when real scope requires; CLINICIAN internal | CD02 |
| 5 | Recommendation never reserves; committed booking separately; unknown link ≠ no booking elsewhere | ARABIC_UX: Task and terminology parity |
| 6 | Private SIGNED stays private; summary/follow-up explicitly sign-and-share; prescription has separate read meaning | CONTENT_SYSTEM: Appointments and consultation sources |
| 7 | Accepted records pharmacy responsibility; dispense is distinct full-item fact | CONTENT_SYSTEM: Prescription and pharmacy |
| 8 | Terminal reversal retains original/FULLY_DISPENSED/history; restores no entitlement | CD06; prescription/pharmacy statuses |
| 9 | Proper/medicine names, attributed clinical text/units, necessary safe identifiers/zone/email/phone and language selector | ARABIC_UX: English leakage, fallback and transliteration |
| 10 | Proposed Latin digits, named Gregorian month, 24-hour, actual clinic/event zone/DST; CD07 pending | ARABIC_UX: Dates, times, quantities and numbers |
| 11 | Preserve mixed-direction medicine/name/unit sequence and copy; no controls in stored data | ARABIC_UX: RTL and mixed-direction semantic requirements |
| 12 | No stock/readiness/delivery/partial/refill/substitution/auto-book/reminder/complete-chart/triage/sample/Admin-clinical claim | CONTENT_SYSTEM role/system models |
| 13 | Lab, continuity/reminders and A8 safe health exposure are FUTURE, not delivered | CF04/CF05; FUTURE glossary |
| 14 | CD01–CD07 remain owner-gated; routine recommendations are not final approved strings | CONTENT_DECISION_REGISTER |
| 15 | Patient primary P1 My care + P2 Find care; secondary retrieval explicit | CONTENT_SYSTEM Patient model |
| 16 | Doctor primary C1 Schedule + C3 People in your care; pending/current care separate | CONTENT_SYSTEM Doctor model; CF01 |
| 17 | Visual design has not started in this sprint | Content decision approval/next gate |
| 18 | No font/color/logo selection | Content/Arabic scope boundaries |
| 19 | No frontend implementation or runtime string changes | Content/Arabic scope boundaries |
| 20 | Independent review + owner acceptance + health checkpoint, then separately authorized Brand Research; later three directions for owner choice | Content decision approval/next gate |

Reviewer found two actionable issues: (1) follow-up confirmation “No appointment is booked” could overstate absence of an existing booking; replaced with “This action does not book an appointment,” matching Arabic and the source-association rule; (2) Arabic failures personified an action as signer/sharer; changed to natural passive constructions (“لم تُوقّع الملاحظة بهذا الإجراء”، “لم تتم مشاركة الملخص بهذا الإجراء”) and applied consistently. Targeted fresh-agent recheck confirmed both corrections and found no material semantic contradiction or unsafe fallback in the added consequential packs. It flagged one minor phrase, الطبيب المحجوز (“reserved doctor”); corrected to الطبيب المحدد في الموعد (“doctor named in the appointment”) and verified in the final local pass. Native Arabic product/clinical task review remains a delivery requirement; the fresh-agent result is not a substitute.

## Technical evidence and limits

Final local candidate checks: repository `node scripts/ci/check-docs.mjs` (classification/local references); repository `classifyPaths`/`validatePlan` on complete staged diff; `git diff --check` for complete staged range; structural bilingual glossary/destination coverage; tracked-file blob comparison against exact base. Final local results: PASS — 13 changed Markdown files, 518 local references across 32 current/changed Markdown files, 43 destination models, 84 seven-field glossary entries, all seven owner decisions present; DOCS_GOVERNANCE with only docs-check selected; complete-range whitespace clean; all 484 tracked files outside docs Markdown and 35 accepted contract files byte-identical to base. The structural checker explicitly allows the unchanged product proper name EgyHealth 360 in the Arabic field under the documented name exception. Final PR/remote counts and results are recorded in the PR handoff. Only dependency-free docs tools are required; no runtime build, browser, database, Docker, dependency install or heavy regression is appropriate for this docs-only change. Local Node 24.19.0 can run these tools; remote CI uses the repository's pinned Node 24.21.0.

Expected and required remote path: **DOCS_GOVERNANCE → classify → docs-check → validate**; frontend/backend/Postgres/Docker/dependency-audit lanes should be explicitly skipped by policy, not missing. Query actual remote result/duration before claiming 8/8. No CI workflow or classifier is modified to achieve that result. Exact SHA, run URL, job outcomes and measured duration are in the final PR handoff; docs CI does not validate Arabic usability, clinical correctness, deployment or product approval.

Scope proof must show byte-identical apps/web, apps/api, packages, tests, scripts, schema/migrations/OpenAPI, dependencies/configuration, accepted behavioral contracts and protected historical images/assets. Current reading-path document edits are notices/reconciliation, not edits to accepted clinical/security contracts. No visual design, screen generation, branding/logo/font/color choice, Design System or frontend/backend/runtime change occurs. No deployment or final-domain action occurs.

## Health, owner gate and blockers

Accepted Foundation Health B remains the prior bounded assessment; this content audit identifies V1 localization/content debt without establishing a new P0/P1 foundation defect. Current status and sequencing are reconciled; actual architecture, source authority/privacy, immutable clinical history, migration integrity and Live-versus-domain gaps are preserved. Existing frontend integration/structure debt remains in IA dependencies; no architecture/runtime/deployment health re-test is claimed. Exact-base main CI is green. The content package supports review, not automatic progression.

Seven material owner decisions remain CD01–CD07. External independent Content System + Arabic UX review, explicit owner acceptance, and whole-project health disposition are gates before separately authorized Brand Research; they are not unresolved blockers to delivering this complete proposal. No implementation begins and no interim approval is requested. Future actual browser/assistive checks and native Arabic task review remain explicit delivery limitations. Any final CI/access blocker must be reported in the handoff rather than a false READY claim.
