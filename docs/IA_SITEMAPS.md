# Stage 3 — proposed workspace sitemaps

CURRENT AUTHORITATIVE proposal detail; read [Information Architecture](INFORMATION_ARCHITECTURE.md) for rationale/candidates and [decisions](IA_DECISION_REGISTER.md) for owner gates. All labels are **WORKING LABELS ONLY**. IDs are review references, not URLs. These sitemaps describe the recommended candidates, subject to owner choice; they do not authorize implementation.

## Reading the destination records

Each table gives purpose/user goal, Stage 2 priority, capability and exposure, navigation level, canonical parent, entry, major actions, dependencies and authority. P0/P1 use [Stage 2 tasks](UX_FOUNDATION.md#3-task-priorities--recommendations-for-review), not a requirement that each task has a page. A contextual record is an information/task destination, not a requirement for its own screen. Source histories and action review remain subordinate to their source.

**Capability:** CURRENT = domain exists; FUTURE = domain/exposure not delivered. **Exposure:** V1 = some existing Live integration at inspected base, not final V2 UI or verified exact-main deployment; GAP = no complete Live integration; MIXED = source-specific V1 and gaps. Every proposed V2 grouping is unimplemented. Bounded Admin services are CURRENT foundations, but public management API/UI availability must be checked operation by operation. No GAP record becomes active merely because it is on this sitemap; [dependency register](INFORMATION_ARCHITECTURE.md#8-dependencies-and-capability-gaps) governs.

**Levels:** primary = recurring workspace destination; secondary = related retrieval/management; contextual = exact task/object. Root means authorized workspace root. “Read” always means permitted current source, never cached historical authority. All links/counts must be scoped before display; no clinical object reference in an unavailable response. All mutation feedback remains with its exact target, and uncertain commands retain explicit recovery there.

## Shared entry and account

| ID / working label | Purpose / user goal; priority | Capability / exposure | Level / parent | Main entry points | Major actions / feedback | Dependencies | Authority constraints |
| --- | --- | --- | --- | --- | --- | --- | --- |
| G0 — Account entry | Establish/recover own authenticated session; P0 P01 | CURRENT / MIXED | Contextual / platform entry | Signed-out entry; expired session; booking continuation | Login, supported registration, sign out of current session if needed; exact session/registration acknowledgement | Identity/session; registration integration GAP | No privileged-role selection; registration acknowledgement ≠ login or reservation; revalidate return target |
| G1 — Account/profile | Review/update permitted own details and language; P2 P10 | CURRENT / V1 own profile | Secondary / shared account | All authorized workspace contexts | Own profile action where supported; language/session status; sign out is an action | Profile/session/localization | No role/org self-grant; professional configuration remains scoped |

## Patient

Recommended Candidate B. Primary: **P1 My care**, **P2 Find care**. Account G1 is secondary. Patient does not need to know internal assignment, intent, route or artifact names.

```text
Patient
  P1 My care [primary]
    P4 Appointment [contextual; all-appointment retrieval within P8]
    P5 Released outcome [contextual; cross-visit retrieval P11]
      P6 Follow-up recommendation [contextual]
    P7 Prescription and supply status [contextual; retrieval within P8]
    P8 Available history [secondary; bounded source lists]
    P9 Care relationships [secondary; contextual continuation when needed]
    P10 Diagnostic order/final result [contextual, FUTURE]
    P11 Shared outcomes and recommendations [secondary index → P5/P6]
  P2 Find care [primary]
    P3 Clinician / clinic / availability / booking [contextual task]
  G1 Account/profile [shared secondary]
```

| ID / working label | Purpose / user goal; priority | Capability / exposure | Level / parent | Main entry points | Major actions / feedback | Dependencies | Authority constraints |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1 — My care | Understand changing current care and next responsibility; P0 P04–P06 | CURRENT / MIXED | Primary / Patient root; default entry | Login; return from details; workspace entry | Select exact next task; see confirmed state and responsible actor; no clinical mutation here | Own bookings, released sources; I3 integration GAP | Own permitted information; no drafts/counts/private content or inferred completeness |
| P2 — Find care | Seek clinician and eligible time; P0 P02/P03 | CURRENT / V1 | Primary / Patient root | P1 empty/current task; P6 book continuation; independent entry | Explore published choices, select clinician/clinic; clear unavailable state | Public directory/finite availability | Public facts only; no triage/recommendation or clinical grant |
| P3 — Care selection and booking | Retain selected clinician/clinic/time through review and booking; P0 P02/P03 | CURRENT / V1 | Contextual / P2 | Directory selection; eligible follow-up continuation | Inspect profile/clinic/time/timezone, review, submit, explicit uncertain-command recovery; committed success → P4 | Directory/availability/booking, G0 if needed | Own booking; no slot reserved before commit; capacity conflict reveals no other patient |
| P4 — Appointment | Understand/manage exact existing visit; P0 P04, P1 P07 | CURRENT / V1 | Contextual / P1 | P1; P8 appointment list; P3 success; authorized direct entry | Status/location/time; eligible cancel/reschedule review here; replacement success updates current visit, failure keeps original; open released outcome if known | Own booking/change/history | Logistics only; no implied relationship/clinical access; no auto-attendance |
| P5 — Released outcome | Understand what was actually shared for the visit; P0 P05 | CURRENT / V1 source readers; association GAP | Contextual / P1 | P1, P4 when source linkage exists, P11 | Read released summary/instructions/current correction; open P6/P7/P10 if permitted and source-linked; truthful no-release state | I2 release reads; validated source association | No private/draft existence/counts; CLOSED ≠ shared or complete |
| P6 — Follow-up recommendation | Understand recommendation versus actual next booking; P0 P05, P1 P09 | CURRENT / V1 recommendation/booking; composed continuation GAP | Contextual / P5; P11 indexes same source when visit link unavailable | P5, P11, P1 relevant next action | Read instruction/window; book via P2/P3; show actual linked booking/change status and return; patient cannot author link | Released follow-up, booking; clinician link C8 | Recommendation ≠ reservation; no automatic link/reminder/action completion |
| P7 — Prescription and supply status | Understand exact signed medicine and actual fulfillment; P0 P06 | CURRENT / GAP | Contextual / P1 | P1 relevant task; P5 permitted source reference; P8 prescription list | Read medication/instructions/quantity/unit/validity, route acceptance, per-item supply and correction/history | I3 signed-source and pharmacy reads; frontend integration | Own signed unrestricted sources only; no edit, route, stock/pickup/adherence or renewed supply on reversal |
| P8 — Available history | Independently retrieve own appointments, prescriptions and bounded legacy records; P2 P10; retrieval supports P0 P04/P06 | CURRENT / MIXED | Secondary / P1 | Explicit history entry from P1; source detail return | Select source list, older page/version and canonical P4/P7/P5 source; see bounds | Own source history/legacy projections; I3 integration GAP | Not complete I4 timeline; no new BP/clinical authoring flow; source-specific privacy applies |
| P9 — Care relationships | Understand/control own clinician authorization; P1 P08 | CURRENT / GAP | Secondary / P1; contextual prerequisite entry from P4 | P1 secondary; missing-grant task on P4 | Request/withdraw/end as eligible; show pending clinician acceptance/current status; return to original appointment | Bilateral relationship integration | Patient authorization + designated clinician acceptance; no booking-created grant or clinical data in request |
| P10 — Diagnostic order/final result | Read signed order/current verified final and corrections; P0 P11 | FUTURE / no Live | Contextual / P1; later source retrieval under P8 | Future P1/P5/source-list entries only after delivery | Read final/current amendment/retraction/history; no clinical interpretation | Authorized Lab sources/results; later integration | Own permitted signed orders/finals only; hide drafts/IDs/counts; no doctor-release queue |
| P11 — Shared outcomes and recommendations | Retrieve prior released material without knowing its original visit; supports P0 P05/P1 P09 | CURRENT / V1 readers; combined retrieval GAP | Secondary / P1 | Explicit shared-care retrieval from P1; P8 source reference | Select a permitted summary or recommendation → canonical P5/P6; bounded paging/status | Existing released-summary/follow-up readers; no aggregate assumed | Read-only index, no duplicate clinical record; unknown association stays source-labelled |

P8 owns retrieval of logistical/prescription/legacy history; P11 owns released summary/recommendation retrieval. P8 may point to P11, but must not reproduce its list as a second destination. All-appointment retrieval is explicit within P8, not dependent on P1's changing next task. This secondary placement is a specific owner choice and later discoverability test.

## Clinician

Recommended Candidate B. Primary: **C1 Schedule** (Today is its default scope), **C3 Care relationships**. C3 serves relationship requests/currently authorized people, not a population directory. C5 consultation is entered from work and has local task grouping, never another global feature menu.

```text
Clinician
  C1 Schedule [primary; Today/current and other dates are scopes]
    C2 Appointment logistics [contextual, optional before C5]
    C5 Consultation [sustained contextual workspace]
      C6 Review and documentation
      C7 Prescription and routing
      C8 Follow-up
      C9 Review and close
      C10 Diagnostics [FUTURE]
    C11 Availability [secondary]
  C3 Care relationships [primary; requests/current authorized scope]
    C4 Authorized patient context [contextual]
      Links to permitted C5/C6/C7/C8 sources, with exact authority
  C12 Professional/operational settings [secondary]
  G1 Account/profile [shared secondary]
```

| ID / working label | Purpose / user goal; priority | Capability / exposure | Level / parent | Main entry points | Major actions / feedback | Dependencies | Authority constraints |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 — Schedule | Identify today's and future/past booked work; P0 C01, P1 C07 | CURRENT / V1 | Primary / Clinician root; default entry | Login; consultation return; date scope selection | Inspect exact visit/state; enter eligible C5 or C2; no generic dashboard metrics | Own booking schedule, clinic names/timezones | Minimum logistics before relationship; no complaint/record preview |
| C2 — Appointment logistics | Manage exact booked visit/attendance/opening prerequisites; P0 C02, P1 C07 | CURRENT / V1 | Contextual / C1 | C1 visit selection; direct permitted entry | Eligible cancel/reschedule/attendance; begin consultation after current checks; missing grant → C3 | Booking/opening/current clinic scope | Exact booked clinician; explicit attendance, no clock inference or substitute/delegated recorder |
| C3 — Care relationships | Resolve requests and revisit ongoing authorized care; P1 C08/C11 | CURRENT / GAP | Primary / Clinician root | C2 missing grant; independent request/aftercare work | Request review, accept/decline/end as eligible; current relationship scope → C4 | Bilateral APIs and permitted current relationship list; exposure check | Minimal pending-request identity only; no clinical data before grant; not a general patient directory |
| C4 — Authorized patient context | Review relevant permitted source information and aftercare; P0 C03, P1 C10/C11, P2 C12 | CURRENT / MIXED | Contextual / C3 | Active relationship; C5 relevant-history continuation; authorized direct entry | Read bounded released histories, choose exact prior consultation/source for correction/linking | Current assignment and per-source reads; combined entry GAP | Current authority each access; no other authors' private notes or permanent author access; no new unbooked consultation |
| C5 — Consultation | Sustain actual treatment/documentation for one eligible visit; P0 C02–C06 | CURRENT / V1 core; I3 GAP | Contextual / C1 | Direct eligible C1 work entry; C2 after checks; C4 existing permitted source | Explicit open/recover; move among local task groups; retain exact identity/access/source state | I2 opening/context, booking/clinic/current assignment | Actual treating clinician = booked clinician; OPEN for new independent draft where required; leaving does not save/close |
| C6 — Review and documentation | Review findings/allergy uncertainty, author private note/summary, share/correct deliberately; P0 C03/C04, P1 C11 | CURRENT / V1 | Contextual / C5 | C5 task entry; C4 exact permitted source | Human findings, purpose-specific save/sign, explicit summary release; addendum/restriction/history and exact feedback | I2 documentation/release; source current authority | Private note stays author-only; release independent of signing private note/follow-up/close; source-specific wrong-patient restriction |
| C7 — Prescription and routing | Prescribe if needed and manage exact source/fulfillment; P0 C05, P1 C09/C10 | CURRENT / GAP | Contextual / C5 | C5 treatment choice; C4 exact existing source | Draft/review/sign; route selected items; pre-acceptance withdraw/reroute; reconcile prior dispense before cancel/replace/restrict; source history | I3 catalog/prescription/pharmacy integration | Human instructions/validity; source author + current clinical/originating-clinic authority for mutations; current other clinicians read only; no auto-route or carryover routing on replacement |
| C8 — Follow-up | Communicate recommendation and maintain explicit booking association; P0 C06, P1 C11 | CURRENT / V1 | Contextual / C5 | C5; C4 exact existing intent | Save/review/sign/release; correct/restrict; explicitly link valid same-patient booking; show independent booking state/history | Follow-up and booking linkage | Author/current authority; no inferred interval/auto-book/auto-link; closed consultation stays closed |
| C9 — Review and close | Review visible source states and explicitly finish visit; P0 C06 | CURRENT / V1 | Contextual / C5 | C5 local task entry; after any selected task | Review exact saved/signed/released/pending facts; explicit close and uncertain-command recovery | I2 close contract, paged source-state limits | No auto-save/sign/release, no new all-artifacts-required rule, no reopen or complete-care inference |
| C10 — Diagnostics | Author exact diagnostic order/review finals if needed; P0 C13 | FUTURE / no Live | Contextual / C5 | Future C5 clinical choice; C4 permitted final | Human order/sign/routing and permitted corrections; read final/current amendment/retraction | Separately authorized Lab implementation/integration | No automated test choice, mandatory pharmacy step or clinician release of lab final |
| C11 — Availability | Manage finite published clinic times; P1 C07 | CURRENT / V1 | Secondary / C1 | Explicit availability management entry from Schedule | Publish/withdraw eligible finite time; confirmed availability/conflict feedback | Availability + current clinic scope | Own permitted clinician/clinic; no recurring scheduler or clinical permission effect |
| C12 — Professional/operational settings | Inspect permitted professional/clinic configuration; P2 supporting C07 | CURRENT bounded foundation / GAP for management | Secondary / Clinician root | Workspace secondary entry; G1 scoped link | Inspect permitted configuration; supported changes only | Profile/clinic exposure verification | Publication/configuration ≠ clinical grant; no organization-wide clinical administration |

After close, C4 can re-enter the same exact existing consultation/source for contract-permitted corrections, releases and routing; C5 does not reopen. A new consultation still requires the accepted booking/opening prerequisites. Source history is on demand within C6/C7/C8, not an additional global history module.

## Pharmacy

Primary: **F1 Assigned work**. Pending responsibility, accepted responsibility and remaining items are scopes of that queue, not separate primary pages or new backend states.

```text
Pharmacy
  F1 Assigned work [primary]
    F2 Exact assigned work [contextual]
  F3 Dispense history [secondary; reduced-purpose records]
    F4 Dispense fact / correction [contextual]
  F5 Operational context [secondary]
  G1 Account/profile [shared secondary]
```

| ID / working label | Purpose / user goal; priority | Capability / exposure | Level / parent | Main entry points | Major actions / feedback | Dependencies | Authority constraints |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1 — Assigned work | Identify exact current pending/accepted responsibility; P0 F01/F04 | CURRENT / GAP | Primary / Pharmacy root | Authorized pharmacy entry; F2 return | Select eligible exact work; distinguish awaiting acceptance/accepted with remaining items | Current pharmacy routes and integration | Filter exact org/membership/artifact before payload/count/page; no patient/search directory |
| F2 — Exact assigned work | Inspect/accept and record remaining full items; P0 F02–F04 | CURRENT / GAP | Contextual / F1 | F1; authorized exact work entry | Read minimized valid fulfillment projection; explicit accept; eligible full-item dispense; receipt/remaining state and explicit identical-command recovery | Route/item/source eligibility; accepted responsibility before supply | Acceptance can precede validity; dispense cannot. No partial/refill/substitution, stock readiness or prescriber clinical grant needed |
| F3 — Dispense history | Retrieve actual completed/stopped-work supply/corrections; P1 F06 | CURRENT / GAP | Secondary / Pharmacy root | Explicit history entry; F2 completion/stopped-purpose continuation | Bounded history paging → F4 actual fact; no copied original fulfillment detail | Explicit history-purpose API and current privacy | Actual dispensed items only; no patient display name/source instructions; withdrawn pending route gives no staff history entitlement |
| F4 — Dispense fact / correction | Reconcile and correct genuine own-route fact; P1 F05/F06 | CURRENT / GAP | Contextual / F3 | F3 fact; eligible fact reference while F2 purpose applies | Read permitted fact/history; reasoned correction/reversal with expected version, explicit feedback | Genuine fact and current exact staff/org/membership/privacy | FULLY_DISPENSED remains; reversal terminal, no renewed entitlement; no forbidden identity/source detail borrowed from F2 |
| F5 — Operational context | Understand legitimate current access scope; P2 F07 | CURRENT scope foundation / GAP | Secondary / Pharmacy root | Workspace context/secondary entry; safe unavailable guidance | Read permitted organization/membership context; seek legitimate access resolution outside a new ticket workflow | Auth/current organization facts, permitted exposure | No self-grant, patient payload, artifact lookup bypass or general history entitlement |

Completing/stopping work changes its purpose: a receipt may confirm the committed result, but later entry uses F3/F4's reduced projection. An accepted expired/cancelled record with zero actual dispense facts does not become a historical patient record; history may be empty. Reauthorization can remove even previously accepted work. Patient/current-clinician history remains independently authorized.

## Laboratory — FUTURE

Entire workspace is FUTURE, hidden as an active Live destination. Primary requirement: **L1 Assigned diagnostics**. Responsibility groupings are conceptual, not new backend state names; no sample/LIS workflow is specified.

```text
Laboratory [FUTURE]
  L1 Assigned diagnostics [primary]
    L2 Exact order [contextual]
      L3 Result entry / verification [contextual]
  L4 Completed order/result history [secondary; exact authorized correction]
  L5 Operational context [secondary]
  G1 Account/profile [shared secondary when workspace is delivered]
```

| ID / working label | Purpose / user goal; priority | Capability / exposure | Level / parent | Main entry points | Major actions / feedback | Dependencies | Authority constraints |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L1 — Assigned diagnostics | Identify authorized assigned responsibility; P0 L01 | FUTURE / no Live | Primary / future Lab root | Later authorized lab entry | Select exact order by permitted responsibility/work scope | Separate Lab implementation and exposure | Exact order/org/current membership; no patient directory or unrelated orders/counts |
| L2 — Exact order | Understand tests/current responsibility and accept/reject; P0 L01/L02 | FUTURE / no Live | Contextual / L1 | L1; permitted exact entry | Inspect allowed source/minimum identity; explicit accept/reasoned reject; stopped-state feedback | Accepted I3 order/routing policy | Membership alone insufficient; no prescription dependency or new timing/sample promises |
| L3 — Result entry / verification | Enter/review draft and deliberately finalize; P0 L03/L04, P1 L05 | FUTURE / no Live | Contextual / L2 | Accepted exact work; L4 authorized amendment entry | Draft entry; explicit verify/finalize; reasoned amendment/retraction; current/version feedback | Future results/version/privacy implementation | Same person may enter/verify with truthful provenance; drafts hidden from patient/general clinician; final directly available under current privacy, no doctor-release queue |
| L4 — Completed order/result history | Revisit permitted completed/stopped work and corrections; P1 L05/L06 | FUTURE / no Live | Secondary / future Lab root | Explicit history entry; L2 completion/stopped continuation | Read bounded exact order/final versions; enter eligible L3 correction; distinguish current/superseded/retracted | Future purpose-specific history contract/exposure | No fresh fulfillment entitlement after terminal retraction; no general medical record; no copying pharmacy-specific projection fields as Lab policy |
| L5 — Operational context | Understand permitted current lab scope; P2 L07 | FUTURE / no Live | Secondary / future Lab root | Workspace secondary/context entry | Read permitted operational facts/access guidance | Future lab workspace exposure | No self-grant, LIS, inventory or broad clinical access |

## Admin

Primary: **A1 People**, **A2 Organizations**. Enter the relevant task directly; no standalone operations dashboard is required. Operational users may include accounts with Patient role, but this never permits patient clinical detail, clinical counts or a chart link.

```text
Admin
  A1 People [primary]
    A3 Operational account [contextual]
  A2 Organizations [primary]
    A4 Operational organization [contextual]
      A5 Membership [contextual; referenced from A3]
  A6 Directory configuration [secondary]
  A7 Permitted operational settings [secondary]
  A8 Safe service health [FUTURE secondary exposure decision]
  G1 Account/profile [shared secondary]
```

| ID / working label | Purpose / user goal; priority | Capability / exposure | Level / parent | Main entry points | Major actions / feedback | Dependencies | Authority constraints |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 — People | Locate exact operational account and access scope; P0 A01/P1 A02 | CURRENT bounded services / GAP | Primary / Admin root; default entry | Authorized admin entry; independent access task | Select permitted account; distinguish account versus membership states | Supported account lookup/exposure verification | Operational identity only; no chart/patient-record browser, clinical counts or impersonation |
| A2 — Organizations | Locate exact organization and compatible access/configuration; P0 A01/P1 A02/A03 | CURRENT bounded services / GAP | Primary / Admin root | Independent organization task; A3 organization reference | Select allowed clinic/pharmacy/lab operational entity; current kind/status | Organizations/current operation exposure | No clinical-content authority from entity kind/status |
| A3 — Operational account | Resolve exact account's supported operational changes; P0 A01/P1 A02 | CURRENT bounded services / GAP | Contextual / A1 | A1; membership account reference | Inspect account/status; supported status action; select membership → A5 | Safe account/version/current operation exposure | No assignment manufacture, passwords/session impersonation, sign/release/clinical override |
| A4 — Operational organization | Resolve supported organization/configuration changes; P0 A01/P1 A02/A03 | CURRENT bounded services / GAP | Contextual / A2 | A2; A3 permitted organization reference | Inspect/change supported status/configuration; memberships → A5 | Current organization/version/role compatibility | No patient-related payload or clinical side effect implied by activation/suspension |
| A5 — Membership | Review exact person + organization + role relationship; P1 A02 | CURRENT bounded services / GAP | Contextual / A4 | A4; A3 reference to same canonical membership | Supported compatible provisioning/end/status operation; exact committed effect/provenance | Actual bounded membership operations/exposure | No new generalized IAM, role switch grant, clinical assignment, break-glass or clinical shortcut |
| A6 — Directory configuration | Maintain approved publication/catalog/clinic facts; P1 A03 | CURRENT where supported / GAP | Secondary / Admin root | Explicit configuration entry; A4 related scope | Supported public directory/catalog/configuration actions and publication status | Per-operation API verification; future test-catalog actions gated | No clinical advice/content editing, retroactive signed-source mutation or grant from publication |
| A7 — Permitted operational settings | Inspect bounded supported configuration/provenance; P2 A04 | CURRENT bounded foundation / GAP | Secondary / Admin root | Explicit settings; A4 scoped reference | Read/change only actually exposed configuration; safe operational provenance | Exposure and supported operations must be inventoried later | No generic audit browser, clinical payload, research datasets or monitoring product implied |
| A8 — Safe service health | Investigate permitted service-health exceptions; P2 A05 | FUTURE UI/exposure / no Live | Secondary / Admin root only if separately approved | Later approved operational entry | Safe service state only; no new tooling selected | Separate exposure/security decision | No clinical counts/payload or diagnosis of hidden patient condition |

## Reserved future locations and excluded destinations

Integrated I4 longitudinal continuity can later evolve P8 and C4; it is **not** a current consolidated record. Notifications/reminders have no active shared destination. EACCE/research/evaluation has no primary or contextual destination in this proposal: its data/authority/interaction contract requires later separate work. This avoids implying that an Admin operational account already has research clinical-data access. No standalone Cancel, Sign, Route, Accept, Dispense, Release, Close, Artifact, Assignment, Timeline, Clinical Override or Help desk destination is proposed.
