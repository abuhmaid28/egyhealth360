# Arabic UX and English parity — proposal

CURRENT AUTHORITATIVE localization proposal under [owner authorization](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6567540211), revised on the owner's instruction for PR #77 from reviewed head `1193d05d70b5c0a8441bb9e768af66a20f63c16a`. **Natural modern Egyptian Arabic for product UI** supersedes the earlier MSA recommendation. [Content system](CONTENT_SYSTEM.md) defines source meanings; [glossary](TERMINOLOGY_GLOSSARY.md) and [CD01–CD07](CONTENT_DECISION_REGISTER.md) remain proposals requiring owner acceptance. No IA, authority, clinical contract, stored data, CSS/layout, visual or runtime behavior changes.

## Recommended register and voice

Recommend **polished Egyptian Arabic**: modern, friendly, simple, clear, professional, warm without being casual, natural when read aloud and appropriate for healthcare. Write as a thoughtful Egyptian digital product for ordinary Egyptian users. Author the task and meaning directly in Arabic; English does not dictate grammar, navigation wording, status syntax or word order. This is a reasoned content recommendation, not measured Egyptian user research.

CD01 compares three approaches: **A polished Egyptian Arabic (recommended)** for local clarity/familiarity and an approachable Egypt-focused graduation product; **B formal Modern Standard Arabic**, broadly legible but liable to sound translated, governmental or institutional in ordinary app tasks; **C heavy conversational Egyptian slang**, familiar in chat but unsuitable for precise, respectful healthcare UI. The target uses Egyptian structures and clear familiar medical nouns together; it does not turn every noun into slang.

Prefer مواعيدك، روشتتك، الدكتور، ميعاد، مفيش، لسه، اتأكد، اتسجل، اختار، دور where appropriate. Use ordinary direct sentences with exact objects. Avoid bureaucratic قد تم، يرجى، يتعين، المستخدم، الرجاء القيام بـ، تمت عملية and repeating المريض inside the personal patient experience. Avoid street/chat expressions عايز، بتاع، خش، دوس، معلش، تمام كده، يلا, jokes, vulgarity, highly local expressions and unclear abbreviations. Phrases shown as rejected alternatives are evidence, not recommendations.

Keep familiar medical nouns when already clear: ملخص الزيارة، عيادة، حساسية، الكمية، الوحدة، صرف الدواء. Patient-facing دكتور / روشتة and professional طبيب / وصفة طبية can express the same real profession/source; they do not create different identities or security roles. Preserve exact recorded names, signed text and medication instructions; never “Egyptianize” or silently rewrite clinical content.

### Precision when consequences matter

Use more explicit, and where helpful more formal, wording for clinical warnings, medication instructions, privacy/authorization consequences, legally/clinically sensitive descriptions, signing, dispensing, reversal and future result finalization. Precision means naming the actor, target, scope and effect, not adopting government prose. Pair concise action names with understandable Egyptian explanations. For example: **أبطل تسجيل الصرف** with «التسجيل الأصلي هيفضل في السجل. إبطال التسجيل مش بيسمح بصرف البند تاني.» Never shorten this to ارجع or خلاص. Authored medication instructions remain exactly as recorded, regardless of register; this policy changes UI explanations, not clinical instructions or legal policy.

Examples: clinical warning «صلاحية صرف الوصفة انتهت. مش مسموح بتسجيل صرف جديد.»; care permission «الحجز لوحده مش بيدي الدكتور صلاحية يشوف معلوماتك الطبية. طلب الرعاية الجديد محتاج سماحك وقبول الدكتور.»; signing «وقّع الملاحظة الخاصة. التوقيع مش بيشاركها مع المريض.» These retain precision without invented authority or false reassurance. Necessary formal role nouns can remain inside natural Egyptian sentences.

## Task and terminology parity

| Context | English working label | Egyptian Arabic recommendation | Scope / alternatives |
| --- | --- | --- | --- |
| Patient P1 | My care | **متابعتي** | Compare رعايتي (short but abstract), صحتي (may overclaim a full record), رعايتي الصحية (long/institutional). Purpose: مواعيدك وملخصات زياراتك وروشتاتك والخطوة الجاية. Includes bounded history; not just follow-up. CD03 pending |
| Patient P2 | Find care | **دور على دكتور** | Most natural current physician/clinic/time journey; اختار دكتور is clearer at selection after search; ابحث عن دكتور is understandable but more formal. Do not use the old literal care-search translation. No triage, ranking or medical suitability claim; IA02/P2 unchanged |
| Patient retrieval | Appointments; Prescriptions; Shared summaries and follow-up; Available history | **مواعيدك؛ روشتاتك؛ الملخصات والمتابعة؛ السجل المتاح** | Explicit secondary retrieval even with no current task; neither buried nor a complete I4 health record |
| Patient P9 | Your doctors | **دكاترتي** in navigation; **دكاترتك** in messages | أطباؤك is the formal alternative; الدكاترة بتوعك is too colloquial. Helper: الدكاترة اللي سمحت لهم يتابعوا حالتك، حسب صلاحية الرعاية الحالية. Pending requests separate; booking alone grants none. CD04 pending |
| Doctor C1 | Schedule | **جدول المواعيد** | Familiar existing phrase; اليوم is a date scope, not a new primary |
| Doctor C3 | People in your care | **مرضاي** | Compare المرضى (can suggest unrestricted directory) and متابعة المرضى (longer, task-narrowing). Subordinate طلبات جديدة / طلبات الرعاية and متابعة حالية. No guardian-like personal label. IA03/C3 unchanged; CD04 pending |
| Consultation local tasks | Review/documentation; Prescription/pharmacy; Follow-up; Review/close | **المراجعة والتوثيق؛ الوصفة الطبية والصيدلية؛ المتابعة؛ المراجعة والإغلاق** | Precise professional nouns are familiar; no new global modules. Future diagnostics stay FUTURE |
| Visit summary | Visit summary | **ملخص الزيارة** | Already simple, natural and medically clear; do not force slang. Patient state: الدكتور شارك الملخص معاك. Close ≠ sharing |
| Follow-up | Follow-up recommendation | **متابعة مقترحة**; **الدكتور رشّح لك متابعة** | الدكتور طلب متابعة may sound mandatory; الدكتور طلب إنك تتابع is natural but directive. Recommend suggestion wording, while preserving the clinician's exact instruction unchanged |
| Prescription | Prescription | **روشتة** for patient, **الوصفة الطبية** for professional source/work | Same object/status/history. Explain once if needed: الروشتة هي الوصفة الطبية اللي الدكتور وقّعها. No clinical payload translation |

**مرضاي is a user-facing label only**. It is not a general patient directory, access to every patient, permanent authority or access created by booking. Only legitimately current care relationships and permitted minimal request contexts appear; each read/write still rechecks actual authority. Patient دكاترتي likewise excludes the inference “everyone I ever booked with.” New care requests require patient authorization and doctor acceptance; independently valid legacy grants retain their current contract without a new request predicate. Pending/new requests do not expose a clinical chart.

Follow-up explanation: «الدكتور رشّح لك متابعة. التوصية دي مش حجز ميعاد.» / “The doctor recommended follow-up. This recommendation does not book an appointment.” If no association is known, say «لسه مفيش ميعاد مرتبط بالتوصية هنا.» / “No appointment is linked to the recommendation here.” Only an authoritative booking lookup can support «لسه مفيش ميعاد متابعة محجوز ضمن المواعيد المعروضة.» Never assert no appointment exists elsewhere from a missing link. Actual committed booking state remains separate; no automatic booking/link/reminder.

Pharmacy acceptance: patient «الصيدلية قبلت الروشتة»; professional «الصيدلية قبلت الوصفة الطبية». Explain «ده قبول للمسؤولية عن الوصفة، مش تأكيد إن الدواء متوفر أو جاهز للاستلام أو إن الصرف اتسجل.» Reject الصيدلية استلمت الروشتة للمراجعة as acceptance wording: it can mean mere route receipt and invent a review stage. Dispense «صرف الدواء اتسجل» records supply, not consumption/delivery. Reversal «تسجيل الصرف اتبطل. البند ده مش مسموح بصرفه تاني» retains the original fact/history and FULLY_DISPENSED, terminal correction state and no renewed entitlement.

## Dates, times, quantities and numbers

CD07 remains **OWNER DECISION REQUIRED**. Recommendation unchanged in meaning: Latin digits `0123456789`, spelled-out Gregorian month, 24-hour time and actual event/clinic timezone where important. Alternative Arabic-Indic `٠١٢٣٤٥٦٧٨٩` with localized decimal conventions and explicit ص/م remains evaluated; no preference feature invented. Egyptian sentence structure is independent of numeric/data semantics.

| Content | English | Natural Egyptian Arabic example | Safety rule |
| --- | --- | --- | --- |
| Absolute appointment | 2 November 2026, 14:30 — Cairo time (UTC+02:00) | ميعادك يوم 2 نوفمبر 2026، الساعة 14:30 بتوقيت القاهرة (UTC+02:00). | Actual event zone/offset, not a permanent +02 assumption |
| Gregorian months | January…December | يناير، فبراير، مارس، أبريل، مايو، يونيو، يوليو، أغسطس، سبتمبر، أكتوبر، نوفمبر، ديسمبر | No unannounced Hijri conversion; no ambiguous 02/11/26 |
| Relative supplement | Today · 2 November 2026, 14:30 — Cairo time | ميعادك النهارده، 2 نوفمبر 2026، الساعة 14:30 بتوقيت القاهرة. | Relative text supplements full absolute time in same event zone |
| Duration | Duration: 30 minutes | مدة الميعاد: 30 دقيقة. | Use actual interval, no fixed visit-length claim |
| Validity | Valid from {instant} until {instant} | الوصفة سارية من {التوقيت الكامل} لحد {التوقيت الكامل}. | Current server eligibility: start inclusive, end exclusive; zone and enough boundary precision |
| Quantity and unit | Quantity: 1.25; Unit: {recorded unit} | الكمية: 1.25؛ الوحدة: {الوحدة المسجّلة}. | Preserve exact value/unit and numeric precision; quantity ≠ dose |
| Recorded instructions | {exact authored instruction} | تعليمات الدكتور: {النص زي ما اتسجّل}. | No rounding, rewriting, dose conversion or silent translation |
| Birth date | 2 November 2000 | تاريخ الميلاد: 2 نوفمبر 2000. | Date-only value never shifts timezone; no inferred medical meaning |
| Phone/email/reference | +20 10 1234 5678; care@example.test; safe reference | رقم التليفون: +20 10 1234 5678؛ البريد الإلكتروني: care@example.test | Exact recorded spelling/order/plus/leading zeros; synthetic examples |

Clinical quantity strings retain accepted precision (up to three fractional digits and nine integer digits); decimal dot recommended, no digit grouping for clinical decimals and no comma/dot ambiguity. Units such as `mg`, `mL` or recorded Arabic units stay exact, including case. Signed medication display snapshots do not change with later catalog names. No parser, stored values, clinical rules or medication text is changed.

Use the actual clinic/event timezone and daylight-saving rules. Repeated clock hours need zone/offset to distinguish instants; cross-midnight windows show both dates/times. Client minute precision cannot decide eligibility near server seconds/millisecond boundaries; expose enough detail when needed. Relative “today/tomorrow” alone is insufficient for booking, signing, validity, dispense, verification or correction evidence. Do not convert UTC storage or offset-bearing contract semantics.

Counts need natural complete Arabic grammar, not translated English fragments. A clear labelled count such as «عدد البنود: 2» is acceptable; otherwise use correct forms (بند واحد، بندان، 3 بنود). Zero means successfully loaded permitted scope, never a failed/hidden result. No i18n library or rendering implementation is selected.

## RTL and mixed-direction semantic requirements

Arabic prose reads naturally; embedded recorded Latin content keeps its internal order and identity. These requirements concern meaning, reading/copy behavior and assistive order, not CSS/layout or mirroring choices.

| Risk / fixture | Expected result |
| --- | --- |
| «ميعادك مع Omar Ali — الحجز اتأكد» | Name stays exactly `Omar Ali`; state belongs to the same appointment/person |
| «الدواء: Amoxicillin؛ الكمية: 1.25؛ الوحدة: mL» | Exact medicine, decimal and case-sensitive unit order; synthetic, not a prescription |
| «من 2 نوفمبر 2026، 23:30 لحد 3 نوفمبر 2026، 00:30» | Endpoint dates/times do not swap; label each boundary |
| «ميعادك الساعة 14:30 بتوقيت القاهرة (UTC+02:00)» | 14:30 never 30:14; plus stays attached to offset |
| «المرجع: RX-AB12-34» | Exact allowed necessary reference; copy contains no extra direction controls |
| «رقم التليفون: +20 10 1234 5678» | Preserve leading plus and digit order |
| «البريد الإلكتروني: care@example.test» | Preserve complete email, keep sentence punctuation separate |
| «العيادة: Nile Care Clinic» | Official proper name remains exact without invented transliteration |
| Mixed name/medicine/quantity/unit/status read by assistive tech or copied | Preserve semantic sequence/target attribution; test parentheses, slash, hyphen, plus and both script orders |

Later implementation must isolate mixed-direction semantic runs without changing recorded values. RTL does not reverse chronology, clinical task sequence or transitions. Never put presentation direction controls into signed text, medication names, IDs, phone/email or stored data. Actual rendering, keyboard selection, copying and assistive-technology behavior require later authorized client verification; this revision is editorial only.

## English leakage, fallback and transliteration

Keep authored Arabic navigation, buttons, statuses, helper/error/loading/empty/success text, confirmations, accessible names and unknown-write recovery. A missing key is a defect, never permission to return full English UI strings. Language must remain coherent during session expiry, read failure, denied access and capability gaps.

Explicit allowed exceptions: recorded medication/brand/proper names; attributed clinician/patient free text, clinical instructions and exact units; necessary safe references/timezone identifiers; email/phone; and the language selector's English / العربية. No ordinary internal enums, raw server errors, model names, operation keys or arbitrary transliterations. Natural Arabic exists for settings, prescription and record; use it. Do not invent Arabic medication spellings or product brand lockups.

For later implementation, a missing low-risk optional label may use authored generic Arabic only if meaning/retrieval is preserved; record missing-key metadata without clinical/person payload. Missing critical action/identity/status/consequence/recovery copy must block the incomplete action and show a safe Arabic state: «المهمة دي مش متاحة بالعربي دلوقتي.» No automatic language switch, silent English fallback, background write, Demo replacement or new-command retry. Preserve an uncertain original operation for safe recovery when possible. This fallback contains a defect; critical Arabic coverage must be complete before delivery.

## Egyptian Arabic fixtures — proposed copy

These fixtures are newly authored review candidates, not deployed strings or approved final wording. Existing formal phrases in the “before” column are revision evidence only. Sensitive content can be more precise without becoming bureaucratic; none of the fixtures changes a backend meaning.

| # / context | Before / previous candidate | Revised Egyptian Arabic fixture | Meaning check |
| --- | --- | --- | --- |
| E01 Patient P1 navigation | رعايتي | **متابعتي** — مواعيدك وملخصات زياراتك وروشتاتك والخطوة الجاية. | Whole existing-care purpose, not follow-up alone; CD03 pending |
| E02 Patient P2 navigation | Previous literal care-search label | **دور على دكتور** | Current physician discovery, no medical recommendation; P2/English Find care unchanged |
| E03 Patient retrieval | مواعيدي؛ وصفاتي الطبية | **مواعيدك؛ روشتاتك؛ الملخصات والمتابعة؛ السجل المتاح** | Explicit secondary retrieval, bounded history |
| E04 Doctor navigation | Previous guardian-like C3 label | **جدول المواعيد؛ مرضاي** — طلبات جديدة؛ متابعة حالية | Current legitimate scope/minimal requests only; no general directory |
| E05 Booking review/success | راجع الطبيب والعيادة والتوقيت؛ تم حجز الموعد | **راجع الدكتور والعيادة والميعاد. احجز الميعاد.** After commit: **ميعادك اتأكد.** | “Confirmed” only committed booking; not clinical access/start |
| E06 Appointment change | إعادة جدولة الموعد | **غيّر الميعاد.** Review: **الميعاد القديم هيتغيّر بس لو الحجز الجديد اتأكد.** | Atomic change; failure keeps original |
| E07 Care permission | السماح لهذا الطبيب بتقديم الرعاية | **اسمح للدكتور يتابع حالتك.** Helper: **طلب الرعاية الجديد محتاج سماحك وقبول الدكتور. الحجز لوحده مش بيدي الدكتور صلاحية يشوف معلوماتك الطبية.** | No booking-created authority; legacy policy unchanged |
| E08 Patient care relationships | أطباؤك | **دكاترتي** — **الدكاترة اللي سمحت لهم يتابعوا حالتك، حسب صلاحية الرعاية الحالية.** | Not every previously booked doctor; pending request separate |
| E09 Visit summary | تمت مشاركته معك | **ملخص الزيارة** — **الدكتور شارك الملخص معاك.** | Actual shared source only, no private/draft hint |
| E10 Follow-up recommendation | أوصى الطبيب بمتابعة | **الدكتور رشّح لك متابعة. التوصية دي مش حجز ميعاد.** | Recommendation ≠ reservation; exact authored instruction retained |
| E11 Unknown follow-up booking link | No natural Egyptian example | **لسه مفيش ميعاد مرتبط بالتوصية هنا. تقدر تدور على ميعاد.** | Missing link ≠ no appointment elsewhere; no auto-book |
| E12 Patient prescription | وصفتك الطبية متاحة | **روشتتك متاحة. راجع تعليمات الدكتور وفترة الصلاحية.** | Signed permitted source only; no stock/use inference |
| E13 Pharmacy acceptance | قبلت الصيدلية الوصفة | **الصيدلية قبلت الروشتة. ده مش تأكيد إن الدواء متوفر أو جاهز للاستلام أو إن الصرف اتسجل.** | Acceptance distinct from stock/readiness/dispense |
| E14 Dispense fact | سُجّل صرف الدواء لهذا البند | **صرف الدواء اتسجل للبند ده.** | Full-item recorded supply, not consumed or delivered |
| E15 Session expiry | انتهت جلسة الدخول | **الجلسة انتهت. سجّل دخول تاني، وبعدها راجع حالة المهمة الحالية.** | No automatic resubmission on login |
| E16 Uniform unavailable/permission denial | هذا العنصر غير متاح ضمن صلاحياتك الحالية | **العنصر ده مش متاح ضمن صلاحياتك الحالية. ارجع لمساحة العمل.** | Same for absent/denied/restricted, no identifying hints |
| E17 Empty availability | لا توجد مواعيد متاحة لهذا الاختيار | **مفيش مواعيد متاحة للاختيار ده دلوقتي.** | Successfully loaded selected scope, not whole market or no need for care |
| E18 Read error | تعذّر تحميل المواعيد. أعد تحميل القائمة | **حصلت مشكلة وإحنا بنحمّل مواعيدك. حمّل القائمة تاني.** | Read-only retry; no clinical write |
| E19 Uncertain dispense | تعذّر تأكيد تسجيل الصرف | **مش قادرين نأكد إذا كان صرف الدواء اتسجل ولا لأ. راجع حالة البند وسجل الصرف المرتبط بيه. ما تسجّلش صرف جديد. لو استعادة الطلب الأصلي متاحة، استخدمها.** | Explicit identical-request recovery with original key/payload/current checks, never new dispense |
| E20 High-risk private signing | توقيع الملاحظة الخاصة | **وقّع الملاحظة الخاصة. التوقيع مش بيشاركها مع المريض.** | SIGNED private ≠ shared; no casual “Done” |
| E21 Summary action | توقيع الملخص ومشاركته | **وقّع وشارك الملخص. المريض هيقدر يقرأ الملخص ده؛ الملاحظات الخاصة هتفضل خاصة.** | Actual combined sign/share, not share-all |
| E22 Reversal | أُبطل تسجيل الصرف | **تسجيل الصرف اتبطل. التسجيل الأصلي هيفضل في السجل. البند ده مش مسموح بصرفه تاني أو إضافة تصحيح عليه بعد الإبطال.** | Terminal annotation, retained FULLY_DISPENSED, no renewed entitlement |
| E23 Explicit close | إغلاق الاستشارة | **اقفل الاستشارة. الإغلاق مش بيحفظ أو يوقّع أو يشارك المحتوى التاني.** | Close ≠ save/sign/share/all done |
| E24 Future final result — FUTURE | نتيجة نهائية؛ لا تعني مراجعة الطبيب | **النتيجة النهائية متاحة. ده مش معناه إن دكتور راجعها.** — FUTURE | Lab final ≠ doctor reviewed, no current product claim |

## Editorial validation and delivery gate

For each fixture and full content model, review modern Egyptian app naturalness, translated phrasing, governmental/formal tone, excessive slang, precise high-risk healthcare meaning and immediate action comprehension. Read aloud; keep clear source nouns and Egyptian sentence structure. [Validation](CONTENT_VALIDATION.md) records the dedicated independent Egyptian naturalness review and rerun 20-question fresh-agent test with their actual limitations. Editorial review is not a native-speaker certification or measured usability study.

Re-run the ten dangerous semantic inferences in English and Egyptian Arabic, all 43 accepted IA contexts, no-English-fallback policy and nine directional fixture classes. Later native Egyptian product/clinical task review and actual rendering/copy/assistive validation remain delivery gates, not reasons to defer the authorized docs revision. CD01–CD07 remain owner-gated. No visual design, fonts/colors/logo, frontend/backend/runtime, Brand Research, Visual Directions or Design System work occurs.
