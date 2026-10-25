# Product V3 — Approved Policy and Supersession Record

Current delivery: Product V3 APPROVED; V3-G0 and M0–M2 COMPLETE. Security hotfix and Slices 1–4 COMPLETE; PR #44 merged at `e75671ec0adfdf0f0d71485eebb104728b619e91`, exact-main [Bootstrap 40195060034](https://github.com/abuhmaid28/egyhealth360/actions/runs/40195060034) SUCCESS. [Slice 5 bilateral lifecycle](V3_I1_SLICE5.md) IMPLEMENTED / IN REVIEW under [authorization 6401378826](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6401378826). V3-I1 INCOMPLETE; Issue #39 OPEN; Slice 6 NOT AUTHORIZED; EACCE NOT STARTED; design/UI FROZEN.

## Authoritative status

| Area | Status |
|---|---|
| Product V3 policy | **APPROVED** — [final Product Owner approval](https://github.com/abuhmaid28/egyhealth360/issues/35#issuecomment-6346537901) |
| V3-G0 documentation reconciliation | **COMPLETE**; PR #36 merged, exact-main CI PASS, Issue #35 CLOSED/completed; [closeout evidence](PROJECT.md#v3-g0-completion-evidence) |
| M0 / M1 / M2 | **COMPLETE**; accepted historical IDs, contracts and evidence preserved |
| V3-I1 | **Contract APPROVED**; Slice 1 merged/verified; [Slice 2 implementation](V3_I1_SLICE2.md) COMPLETE; I1 overall **NOT COMPLETE**, Slice 3 **COMPLETE**; Slice 4 **IMPLEMENTED / IN REVIEW** (6391008285); Slice 5+ **NOT AUTHORIZED** |
| EACCE implementation | **NOT STARTED**; old M3 is superseded/resequenced to V3-I5 |
| Product UI/design | **NOT STARTED / DESIGN FROZEN**; separate explicit design-unfreeze approval required |

Product V3 is now the repository source of truth. Policy approval is not implementation completion or blanket implementation authorization; it does not retroactively redefine M0–M2.

## Approval lineage and precedence

Issue [#35 — Product Scope V3](https://github.com/abuhmaid28/egyhealth360/issues/35) is CLOSED/completed; [final verification — 6355210754](https://github.com/abuhmaid28/egyhealth360/issues/35#issuecomment-6355210754) confirms V3-G0 COMPLETE.

1. [Initial planning report — 6331091738](https://github.com/abuhmaid28/egyhealth360/issues/35#issuecomment-6331091738).
2. [Decision consolidation — 6331360070](https://github.com/abuhmaid28/egyhealth360/issues/35#issuecomment-6331360070).
3. [Product Owner selections — 6331430636](https://github.com/abuhmaid28/egyhealth360/issues/35#issuecomment-6331430636).
4. [Final freeze-readiness package — 6331569851](https://github.com/abuhmaid28/egyhealth360/issues/35#issuecomment-6331569851).
5. [Final Product Owner approval — 6346537901](https://github.com/abuhmaid28/egyhealth360/issues/35#issuecomment-6346537901).

Final approval accepts the complete 36-decision package: 24 unchanged defaults, seven revised defaults, four owner selections and D36. The revised consolidation defaults and selected values replace earlier alternatives and arbitrary planning numbers. The original report is lineage, not an independent source of conflicting current defaults.

Original PR #36 reconciliation baseline: `ea777ce71c3639a37ec015739a12f0fadc0b4dcc`. No V3 implementation existed on the verified main, remote branch inventory or open-PR inventory when this work began. Issue #28 is CLOSED/completed. This documentation branch changes no application behavior.

## Approved decision register — D01–D36

All 36 decisions below are APPROVED at product-policy level. This is a transcription of the final approved package, not a new implementation contract. No D37+ decision, new clinical rule, permission engine, database layout, endpoint, final enum registry or visual specification is introduced.

### Four owner-selected values

| Decision | Recorded selection | Approved scope and boundaries |
|---|---|---|
| **D06-A** | **Patient self-registration included** | Patients can register, log in and manage permitted own-profile information in the bounded synthetic graduation scope. Clinician/lab/pharmacy/ADMIN accounts remain managed; registration cannot select a privileged role. No paid identity verification, production-grade identity-assurance claim or mandatory full password-recovery subsystem. Preserve the deterministic M1 seed; the integrated fixture is separately versioned |
| **D11-A** | **Continuing clinician relationship until explicitly ended** | Booking alone gives no clinical access. Patient authorization plus clinician acceptance establishes the relationship before or at consultation. Either side may explicitly end it; history is preserved, ended history is not reactivated, and later access checks current authority. Authorship does not give permanent access. Another clinician requires their own current relationship; private-note visibility remains restricted |
| **D18-A** | **Bounded full-item dispensing** | Each prescribed item is not dispensed or fully dispensed; different items can be fulfilled separately. Preserve actual quantity/unit, actor and time. No partial-quantity accumulation, refill subsystem, substitution, inventory ERP, payments/e-commerce/delivery or adherence inference. The designated pharmacy is a routing scope, not a hard platform maximum of one pharmacy |
| **D23-B** | **Laboratory MUST; imaging SHOULD** | The required diagnostic journey uses laboratory ordering/fulfillment/results. Imaging is optional if capacity and a separate approved implementation scope permit it. Never claim imaging complete without proof; if added, prefer shared diagnostic principles, with no sixth portal, PACS/DICOM, image AI or required image-upload infrastructure |

### 24 unchanged defaults

| Decision | Approved wording — unchanged consolidation default |
|---|---|
| D01 | Journey → continuity → research hierarchy; ordinary patient access/care does not require hypertension, a CarePlan or EACCE. |
| D03 | Synthetic-only, free-first/self-hostable graduation prototype; preserve prohibited production/AI claims and the existing execution/research boundary. |
| D04 | Retain the current TypeScript/Next.js/NestJS/PostgreSQL/Prisma architecture, one application and five workspaces. |
| D05 | Bounded lab/pharmacy staff authority, current organization membership and fixed operation permissions; no generalized permission-management or multi-role IAM product. |
| D09 | Believable booking, cancellation, attendance and explicit no-show semantics with preserved history and safe retries. Own patient/booked-clinician cancellation or rescheduling is before start/consultation opening; failed replacement preserves the original; no fees. |
| D12 | General consultation/encounter, actual treating participation/provider, booking linkage and signed clinical documentation; preserve EH-012 history and BP associations. |
| D13 | Separate author-only clinician notes under current clinical authority from explicitly released patient summaries/instructions; preserve signed addenda/corrections. |
| D14 | Human-entered problems/diagnoses and minimal allergy/intolerance review context, including unknown/not-reviewed. Optional curated codes; no automated clinical inference. |
| D15 | Preserved signed source history, reasoned amendments/retractions/reversals, and independent wrong-patient privacy; no silent destructive overwrite or cross-patient move. |
| D16 | Small deterministic medication catalog; preserve prescribed medication identity, quantity/unit and clinician-entered instructions. No software dose selection. |
| D17 | Authorized clinician signing/cancellation/replacement with history and respected clinician-entered validity. Reconcile prior dispensing; never fabricate medical expiry or renew entitlement by accident. |
| D19 | Prescribed, dispensed and separately reported actual use remain distinct. No adherence inference; do not call an unreconciled prescription history a confirmed current-use list. |
| D21 | Authorized lab entry and explicit verification/finalization; the same person may do both with truthful provenance. Corrections/retractions preserve prior versions; no mandatory second verifier. |
| D22 | Verified final lab results become available to the patient and currently authorized doctor in the synthetic demo. Drafts stay hidden; amendments/retractions are identified. No mandatory doctor-release queue. |
| D25 | Authorized source-linked longitudinal projection with clinical/recording provenance and correction visibility; clinical sources, timeline and immutable audit remain distinct. |
| D26 | Retain accepted BP, exact plan/rule pins, bounded INITIAL actions, protected generation decisions and current privacy behavior. No automatic applicability/closure bridge or recurrence. |
| D27 | In-app important updates and bounded reminders only, with deduplication, status and privacy safeguards; no paid delivery dependency. |
| D28 | Bounded operational users/providers/membership/status/config/demo and Evaluation Lab administration. ADMIN alone grants no clinical record, impersonation, clinical authoring or fulfillment entitlement. |
| D29 | Retain bounded HTN research, the six EACCE product classifications and isolated reproducible B0/B1/P1 evaluation; no broader disease/recurrence study. |
| D30 | Later explicit action–appointment relevance and qualifying completion contracts. Operational booking, order, result or dispense events never close clinical actions by implication. |
| D31 | Complete thin backend/domain journeys, authorization/history verification and honest implementation claims. Scope tiers follow the selected registration/full-item/lab-required/imaging-optional choices. |
| D32 | Preserve M0–M2 history; use Roadmap V3 and the V3-G0/I1–I8 namespace with the dependency qualifications below. EACCE moves later. |
| D34 | After explicit V3 approval and separately authorized documentation work, reconcile scope/ADRs/requirements/domain/security/roadmap/traceability together while retaining historical evidence. |
| D35 | Design stays frozen until a later separate explicit design-unfreeze decision after scope/domain prerequisites; V3 approval alone does not permit visual work. |

### Seven revised defaults

| Decision | Approved wording — revised consolidation default |
|---|---|
| D02 | Small representative synthetic fixtures sufficient for meaningful provider choice, fulfillment and isolation. Doctor/site/specialty counts are fixture choices, not architectural minimums or maximums; no mandatory two-site/two-specialty topology. |
| D07 | Simple curated provider/clinic/location/specialty and public-doctor information with explicit organization affiliation for access/routing. No mandatory enterprise facility hierarchy, separate site layer or catalog-management platform. |
| D08 | Finite clinician-published availability with explicit start/end, declared clinic timezone, overlap/capacity protection and a clear booking cutoff. Duration, lead time and horizon are bounded configuration/demo choices; no universal 30-minute/30-day rules. |
| D10 | Booking provides only minimal logistics/identity/time access. Patient authorization plus clinician acceptance may establish a genuine ACTIVE relationship before or at consultation; booking itself never does. Clinical complaint/history is not pre-relationship scheduling metadata. |
| D20 | Real clinician order → designated lab fulfillment → verified final result, with meaningful progress and reasoned cancellation/rejection. Order and result remain distinct; receipt/sample substeps and exact state names are not mandatory LIS requirements. |
| D24 | One operational booking authority for the new journey; preserve clinician follow-up intent even without a booked slot. Keep EH-012 behavior/history intact; use a legacy link only when needed, without twin editable bookings or a compulsory universal adapter. |
| D33 | Re-estimate selected V3 scope after policy freeze using the actual academic deadline, available capacity and explicit contingency. Old dates/weights/buffer percentages do not become V3 commitments; no delivery feasibility is asserted here. |

### D36 — Fulfillment authorization and suspension

D36 is accepted by the final Product Owner approval:

1. **Independent authority:** ending a clinician relationship denies that clinician’s subsequent clinical access; it does not silently cancel an otherwise valid routed prescription/test order.
2. **Artifact scope:** lab/pharmacy access concerns the specific routed order/prescription and its own fulfillment history, not the patient’s general record.
3. **Current authority required:** recipient staff may work only while the user, organization and membership are active and the artifact authority remains valid. Clinical role, prior session, patient identity or original authorship alone is insufficient.
4. **Completed artifacts:** access after fulfillment is limited to bounded source-correction/audit purposes under current organization/artifact authority and current privacy restrictions. It does not grant future orders, unrelated records or a permanent personal entitlement.
5. **Suspension/revocation:** effective staff/membership/organization suspension or revocation blocks subsequent clinical reads/writes immediately on the next current-authority check, including further work on pending artifacts. No grandfathering through authorship or an earlier session.
6. **History preserved:** suspension, ending or cancellation never silently deletes source records, final results or actual dispense history.
7. **Independent patient/doctor access:** patient own access and another currently authorized clinician’s access use their own authority and current release/privacy rules. A source organization’s suspension does not automatically hide already released final records from them.
8. **Cancellation/withdrawal:** an authorized cancellation/withdrawal blocks future fulfillment but preserves prior results/dispenses. Reasoned corrections/reversals do not silently restore entitlement.
9. **ADMIN boundary and recovery:** ADMIN may administer operational status/escalation, but cannot inspect clinical payload, sign/finalize results, dispense or grant themselves clinical authority merely through ADMIN. Pending work remains preserved; restoration or authorized rerouting requires fresh authority and history, not silent reassignment of accepted/fulfilled artifacts.
10. **No exceptional entitlement:** no break-glass role, forensic view, permanent-author access or exception to legacy ACTIVE-assignment rules is introduced.

**Compatibility result: PASS at product-policy level.** Existing patient/clinician resources retain their existing authorization; lab/pharmacy receive only new, separately scoped fulfillment authority. “Immediately” means subsequent access must fail once revocation is effective; it does not claim recall of already authorized responses or reversal of already committed clinical facts. This preserves the current M0–M2 concurrency/visibility limitations without defining a new technical transaction contract here.

## Cross-provider routing and privacy interpretation

The authorized clinician signs/routes to an approved lab/pharmacy, considering patient preference communicated in consultation. Patients do not rewrite signed prescriptions/orders. Authorized pre-acceptance rerouting preserves history; processing/dispensing already performed requires reasoned cancellation/reissue/reconciliation, not silent transfer.

Private notes are author-only under current clinical authority. Patient-released summaries and final results have separate visibility. Wrong-patient restrictions mask payload, revealing references, counts and notifications; source correction authority never grants a general clinical-record editor. Patients/ADMIN may flag concerns without acquiring clinical editing rights. Audit contains safe operational provenance rather than clinical narrative or result values.

## Supersession and preserved history

ADR-031 in [DECISIONS](DECISIONS.md) supersedes Product V2's chronic-care-first positioning, clinician-primary/patient-secondary framing, bounded booking/lab/pharmacy exclusions and broad exclusion of human-entered diagnosis/prescribing. It amends future role/workspace and relationship policies without weakening existing ACTIVE-assignment enforcement. The earlier 2026 reboot's rejection of ML/FastAPI, diabetes-risk prediction, enterprise scope and production deployment remains in force.

Existing M0–M2 contracts, migrations, validation reports, issue/PR evidence and deterministic M1 seed are preserved. Slice-era statements in those records describe their time, not today's current scope/status. EH-012 remains HTN follow-up evidence, not a complete booking system. EH-014 remains immutable INITIAL-only generation; CareActionDecision is generation provenance, not a ClosureAssessment. FR-024 is foundation-only/incomplete; AC-004/AC-005 remain unsatisfied until later explicit evidence contracts and implementation.

See [PRODUCT](PRODUCT.md), [REQUIREMENTS](REQUIREMENTS.md), [ROADMAP](IMPLEMENTATION_ROADMAP.md) and [SECURITY](SECURITY.md) for the current direction. Design remains frozen after policy approval and the verified PR #36 merge. The subsequent [I1 contract](V3_I1_CONTRACT.md) is approved in Issue #39; Slice 1 is merged/verified and Slice 2 is separately authorized by comment 6366843150. Its [organization/membership implementation](V3_I1_SLICE2.md) is COMPLETE; I1 NOT COMPLETE, Slice 3 COMPLETE after PR #43 / CI 40116846242; [Slice 4](V3_I1_SLICE4.md) COMPLETE via PR #44 / exact-main CI 40195060034; [Slice 5](V3_I1_SLICE5.md) authorized by comment 6401378826 and implemented / in review; Slice 6 NOT AUTHORIZED. D01–D36 above are unchanged.
