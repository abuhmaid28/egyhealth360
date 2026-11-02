# Content System + Arabic UX — validation evidence

HISTORICAL EVIDENCE for the **Egyptian Arabic revision of PR #77**, not Product Owner acceptance or runtime/browser proof. Current owner revision request names reviewed head **`1193d05d70b5c0a8441bb9e768af66a20f63c16a`** and materially replaces the MSA recommendation with **natural modern Egyptian Arabic for product UI**. PR base remains `86cc044314c865404a114903bbe417fde00e10ec`. Original [authorization #72 / 6567540211](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6567540211) and accepted IA/clinical/privacy contracts still bind; the new request does not approve final CD01–CD07 wording or enable the next stage.

## Scope and reading evidence

AGENTS → latest issue authorization/supersession check and current PR review → CURRENT_STATUS → charter/source index → existing content proposal and accepted IA/I1/I2/I3 semantics. PR API confirmed reviewed head, unchanged base, open/unmerged and auto_merge=null before editing. Independent review 5731604292 requested P2/C3 label corrections; the owner's current instruction additionally changes the Arabic voice and audience vocabulary throughout this same content package. Both are addressed without treating the review's older MSA/طبيب recommendations as current owner direction.

Only five existing content documents are revised: CONTENT_SYSTEM, ARABIC_UX, TERMINOLOGY_GLOSSARY, CONTENT_DECISION_REGISTER and this evidence file. No new PR, branch, destination, page, route, clinical policy, authority rule, feature, visual specification or implementation. Accepted Stage 2/IA01–IA05, Patient B, Clinician B and exact current-vs-future/Live-gap distinctions remain unchanged. The original candidate and its validation remain available at the named reviewed commit; earlier comprehension/CI results are historical, not the revised-head evidence.

## Revised decision and destination coverage

- CD01 compares polished Egyptian (recommended), formal MSA and heavy conversational slang. Egyptian sentence structure + familiar medical nouns; precise formal language only where warnings, medication, privacy/authorization or clinical/legal sensitivity need it. Recorded source text stays exact.
- CD02 proposes Doctor / دكتور for ordinary physician UI; طبيب where formal clinical precision benefits; broader role only for actual broader professional scope. Internal CLINICIAN unchanged.
- CD03 compares متابعتي، رعايتي، صحتي، رعايتي الصحية in the full accepted navigation context. Recommend متابعتي with مواعيدك وملخصات زياراتك وروشتاتك والخطوة الجاية, including bounded history. It is not a follow-up-only section or complete chart.
- P2/English Find care/IA02 unchanged; Arabic دور على دكتور recommended over selection-stage اختار دكتور and more formal ابحث عن دكتور. No triage or automated recommendation.
- CD04 compares دكاترتي، دكاترتك، أطباؤك، الدكاترة بتوعك for Patient and مرضاي، المرضى، متابعة المرضى for Doctor. Recommend P9 دكاترتي and C3 مرضاي, with طلبات جديدة / متابعة حالية. Labels never grant authority, expose a general directory, create permanent access or equate booking with care permission. Allowed requests carry minimum identity only; independent legacy grants keep their contract.
- CD05 retains ملخص الزيارة, with natural Egyptian surrounding sentences; no forced slang or invented aggregate outcome/source link.
- CD06 distinguishes audience words for one identical source: patient روشتة / روشتتك / روشتاتك; professional الوصفة الطبية. الصيدلية قبلت الروشتة means accepted responsibility, not receipt/review stage, stock/readiness/dispense. Exact supply/reversal meaning unchanged.
- CD07 remains open: Latin digits, Gregorian month names, 24-hour and actual event/clinic timezone, with Egyptian sentence examples; alternatives and safety boundaries retained.

All seven material choices remain **OWNER DECISION REQUIRED**. Formal medical nouns in precise contexts are intentional; old literal/guardian-like primary labels are not active recommendations. English labels and all **43 IA IDs** remain unchanged: G0–G1, P1–P11, C1–C12, F1–F5, L1–L5, A1–A8. Each model retains purpose, bilingual working name, empty/loading/error, action/status meaning and current/future exposure limits. Explicit appointment/prescription/shared-source/history retrieval remains secondary and discoverable independently of the changing current task. All **84 glossary entries** retain the seven required fields; audience-specific synonyms never imply new objects or lifecycle states.

## Semantic safety test — English and Arabic

Method: re-read every state/action/model against accepted semantics, then adversarially test the ten dangerous inferences in both English and revised Egyptian Arabic. This is editorial/source evidence, not measured comprehension or freshly executed backend behavior. The following wording is actually represented in the content/fixtures; stated PASS means it blocks the identified inference, not that a new clinical policy is approved.

| # / dangerous inference | English check | Revised Egyptian Arabic check | Result / preserved meaning |
| --- | --- | --- | --- |
| 1 Booking = chart access | Booking does not give medical-record access; new request requires permission/doctor acceptance | الحجز لوحده مش بيدي الدكتور صلاحية يشوف معلوماتك الطبية. | PASS EN/AR. Current assignment is the clinical grant; legacy independent grants unchanged |
| 2 Booked = consultation started | Booked versus Consultation in progress; explicit Start consultation | ميعادك اتأكد مقابل ابدأ الاستشارة؛ الحضور اتسجل منفصل. | PASS EN/AR. Committed logistics, explicit observation and opening are separate |
| 3 Closed = everything shared | Closing does not save, sign or share other content | الإغلاق مش بيحفظ أو يوقّع أو يشارك المحتوى التاني. | PASS EN/AR. Private SIGNED stays private; summary/follow-up DRAFT→SIGNED_RELEASED explicitly combined, no invented intermediate state |
| 4 Prescription signed = dispensed | Signing does not send the prescription; dispense recorded separately | التوقيع مش بيبعت الوصفة للصيدلية. صرف الدواء اتسجل حالة منفصلة. | PASS EN/AR. Signing, validity, route, acceptance and full-item fact separate |
| 5 Pharmacy accepted = available/ready/supplied | Acceptance records responsibility, no stock/readiness/dispense claim | الصيدلية قبلت الروشتة. ده مش تأكيد إن الدواء متوفر أو جاهز للاستلام أو إن الصرف اتسجل. | PASS EN/AR. No stock, collection, preparation, delivery or review workflow invented |
| 6 Dispensed = consumed | Dispense recorded for this item; no adherence inference | صرف الدواء اتسجل للبند ده. | PASS EN/AR. Full-item supply record, not actual use or delivery |
| 7 Reversal = renewed entitlement | Reversal terminal; original/FULLY_DISPENSED/history retained | تسجيل الصرف اتبطل. التسجيل الأصلي هيفضل في السجل. البند ده مش مسموح بصرفه تاني أو إضافة تصحيح عليه بعد الإبطال. | PASS EN/AR. No return to NOT_DISPENSED, stock return or another correction; fresh source/route needed for new supply |
| 8 Follow-up = booked | Recommendation does not book; missing association never proves no booking elsewhere | الدكتور رشّح لك متابعة. التوصية دي مش حجز ميعاد. لسه مفيش ميعاد مرتبط بالتوصية هنا. | PASS EN/AR. Actual committed booking separate; no unsupported “no appointment anywhere,” auto-book/link/reminder |
| 9 Future Lab final = doctor reviewed | Final does not indicate doctor review | النتيجة النهائية متاحة. ده مش معناه إن دكتور راجعها. — FUTURE | PASS EN/AR. Future explicit lab verification/finalization; same-person permitted; immediate allowed visibility; no doctor-release queue/sample workflow |
| 10 Admin = clinical access | People/Organizations operational only | الأشخاص والجهات لإدارة الحسابات والصلاحيات التشغيلية، مش للاطّلاع على السجل السريري. | PASS EN/AR. No chart/counts, impersonation, clinical override, assignment creation or care action |

**10/10 English and 10/10 Egyptian Arabic editorial semantic checks PASS.** Additional checks retain unknown/unreviewed allergy ≠ negative, request ACCEPTED history ≠ current ACTIVE grant, pending legacy request withdrawal ≠ independent grant end, derived validity/completion ≠ new states, failed atomic replacement/reschedule/reroute ≠ changed original, staff history ≠ retained patient names/instructions, and uniform absent/denied/restricted response ≠ object-existence hint.

Unknown healthcare write wording is separately checked: «مش قادرين نأكد إذا كان صرف الدواء اتسجل ولا لأ. راجع حالة البند وسجل الصرف المرتبط بيه. ما تسجّلش صرف جديد. لو استعادة الطلب الأصلي متاحة، استخدمها.» Recovery requires identical original target/command/key/payload and current checks, explicit user action only; no new command or automatic retry. Read-only “حمّل القائمة تاني” never substitutes for write recovery. Session re-login never auto-resubmits. Original context unavailable blocks a new healthcare request. I1 relationship/profile/registration retain their specific replay/acknowledgement semantics; no universal I3 retry ledger is invented.

## Egyptian fixtures and localization checks

[ARABIC_UX fixtures E01–E24](ARABIC_UX.md#egyptian-arabic-fixtures--proposed-copy) cover all fifteen required categories: Patient navigation, Doctor navigation, booking, change, care permission, summary, follow-up, prescription, acceptance, dispense, expiry, unavailable/denial, empty, read error and uncertain write. Extra fixtures cover personal care access, private signing, combined sign/share, terminal reversal, close and future final result. Before→after examples are explicitly historical/rejected candidates, never current recommendations.

No-silent-English-fallback, official medicine/proper names, attributed clinical text/units, necessary safe identifiers/email/phone and no needless transliteration remain intact. Critical missing Arabic copy blocks incomplete actions rather than auto-switching/submitting. Numeric values, medication units, signed snapshots, timezone/DST/boundary semantics and date-only storage are unchanged. Nine mixed-direction fixture classes remain defined: names, medicine/quantity/unit, range/sign/offset, date/time, safe IDs, phone, email, proper names, reading/copy/assistive sequence. Editorial fixture review only; actual rendering/copy/assistive tests remain a later implementation gate.

## Dedicated Egyptian Arabic naturalness review

A separate fresh read-only agent reviewed all four content documents, all 24 fixtures, the system states and consequential packs; it then re-read the fixes. **Final disposition: PASS — no remaining material Arabic naturalness or semantic-safety defect found.** This is independent agent editorial judgment, not human native-speaker certification or measured Egyptian usability.

| Required naturalness question | Final reviewer answer |
| --- | --- |
| Does this sound like a modern Egyptian app? | Yes: متابعتي، دور على دكتور، دكاترتي، مرضاي and supporting copy are simple, warm and professional |
| Does anything sound translated from English? | No remaining material issue after replacing generic person/source/access phrasing with named patient/document/action wording |
| Does anything sound governmental/formal? | Necessary clinical/operational nouns remain precise inside Egyptian sentences; no material tone defect |
| Is anything too slangy? | No; prohibited street/chat expressions are excluded from recommended copy |
| Are high-risk healthcare meanings precise? | Yes; doctor actor explicit, history review distinct from a new dispense, all ten dangerous inferences blocked |
| Would an ordinary Egyptian user infer the action? | Yes at editorial level: specific verbs/objects, consequence and safe next step; actual usability remains unmeasured |

Findings corrected before final recheck: (1) booking pack omitted the doctor as record reader; now both languages explicitly name the doctor; (2) unvocalized «راجع البند وسجله» could mean “review and record it,” unsafe during uncertain dispense; every active recovery example now says «راجع حالة البند وسجل الصرف المرتبط بيه» followed by no new dispense and original-request recovery; (3) doctor-side generic الشخص replaced by المريض/هوية المريض, while operational Admin still refers to an account/person rather than granting clinical meaning; (4) signed-text immutability stated plainly, close names visible notes/summary/prescription/follow-up, authorization withdrawal uses concrete conditionals, action typo corrected, mode context separated from natural unavailable text, patient/professional prescription variants made explicit in shared state rows, فريق المعمل standardized. The fresh naturalness recheck confirmed all 24 fixtures and cross-document consistency after these corrections.

## Fresh-agent comprehension test

A separate new fresh agent, with no prior chat context, read AGENTS and only CONTENT_SYSTEM, ARABIC_UX, TERMINOLOGY_GLOSSARY and CONTENT_DECISION_REGISTER; it did not read this validation file, edit files or run runtime tests. **20 clear, 0 ambiguous — 20/20.** It identified the same booking-actor wording issue, confirmed its correction in both languages, and confirmed 20/20 remained valid with no new material safety or cross-document meaning contradiction after the targeted reread. This is comprehension evidence, not owner acceptance.

| # | Question / required answer | Content evidence |
| --- | --- | --- |
| 1 | Clear, calm, human, respectful, professional, clinically honest product voice | CONTENT_SYSTEM Voice and tone |
| 2 | Polished natural modern Egyptian Arabic; more precise/formal only where clinical/privacy/medication/legal consequence needs it | ARABIC_UX Recommended register; CD01 |
| 3 | Personal Patient navigation, P1 متابعتي full care scope; P2 دور على دكتور | CD03; Patient model |
| 4 | Ordinary physician Doctor / دكتور; formal طبيب; broader scope only when actual, CLINICIAN unchanged | CD02 |
| 5 | Recommendation ≠ booked; unknown association only says no linked appointment here | ARABIC_UX Task and terminology parity |
| 6 | Private SIGNED stays private; summary/follow-up explicit combined sign/share; prescription separate | CONTENT_SYSTEM source states |
| 7 | Pharmacy acceptance is responsibility; dispense separate full-item record | CD06; prescription/pharmacy statuses |
| 8 | Terminal reversal, original/history/FULLY_DISPENSED retained, no new dispense/correction entitlement | CD06; reversal pack/E22 |
| 9 | Recorded proper/medicine names, attributable clinical text/units, necessary safe references/timezones/email/phone, language selector | ARABIC_UX fallback/exceptions |
| 10 | CD07 proposed Latin digits, named Gregorian months, 24-hour, actual event zone/DST; no value/storage changes | ARABIC_UX Dates, times, quantities and numbers |
| 11 | Exact mixed medicine/name/number/unit order, no stored direction controls | ARABIC_UX RTL requirements |
| 12 | No stock/readiness/delivery/partial/refill/substitution, auto-book/reminder, full chart, triage, specimen or Admin clinical claim | CONTENT_SYSTEM role/system models |
| 13 | All Lab, continuity/reminders and A8 service exposure remain FUTURE | Glossary; CF04/CF05 |
| 14 | All CD01–CD07 still owner-gated; revision direction ≠ final content acceptance | Decision register |
| 15 | Patient My care / متابعتي + Find care / دور على دكتور, same IA02/P1/P2 | Patient model |
| 16 | Doctor Schedule / جدول المواعيد + People in your care / مرضاي, same IA03/C1/C3 | Doctor model |
| 17 | No visual design started | All scope boundaries |
| 18 | No logo/fonts/colors chosen | Scope / next gate |
| 19 | No frontend/runtime strings implemented or changed | Scope boundaries |
| 20 | External independent recheck + explicit owner acceptance + health checkpoint, then separately authorized Brand Research | Decision next gate |

## Technical evidence and limits

Required final checks: complete reviewed-head→candidate whitespace/path check; repository docs reference/classification check; full PR change classification using unchanged classifyPaths/validatePlan; 43 destination IDs, 84 complete glossary rows, seven owner decisions and E01–E24 fixture coverage; blob preservation against reviewed head for every file outside the five content documents, including IA, runtime/schema/migrations/OpenAPI/dependencies/accepted contracts/protected assets. Final focused results: PASS — exactly five revised content files, 13 total files in the existing PR; 43/43 stable IA context IDs and English labels, 84/84 seven-field glossary entries, CD01–CD07 all OWNER DECISION REQUIRED, 24/24 fixtures, DOCS_GOVERNANCE/full=false with only docs-check selected. All 595 other tracked files are byte-identical to the reviewed head, including every IA document, runtime/schema/migration/OpenAPI/dependency/contract/protected asset file. Complete revision-range whitespace check and repository local reference/classification check PASS: 518 references across 32 current Markdown files. No runtime tests/build/browser work was needed or performed.

Original reviewed-head [CI 41379482972](https://github.com/abuhmaid28/egyhealth360/actions/runs/41379482972) succeeded in 26 seconds; it is historical, not revised-head CI. Required revised-head lane remains DOCS_GOVERNANCE → classify → docs-check → validate, with heavy lanes explicitly skipped. Exact new head, actual run/result/duration, final checks and open/unmerged/auto-merge-off state belong in the updated PR handoff to avoid self-referential commit identity here. No CI tooling change or heavy runtime rebuild is part of this revision.

## Health, owner gate and blockers

Arabic voice/terminology recommendations change materially; IA, product meaning, clinical/privacy/authority contracts, current/future exposure and frontend/backend/runtime behavior do not. Existing Health B and V1 integration/content debt remain prior bounded evidence; no new runtime/deployment/clinical health claim or P0/P1 defect follows from an editorial revision. CD01–CD07 remain open, not owner-approved. Independent recheck and owner acceptance remain gates, not blockers to completing the requested proposal. No visual design, Brand Research, Visual Directions, Design System, frontend/backend implementation or deployment has begun.
