# Arabic UX and English parity — proposal

CURRENT AUTHORITATIVE localization proposal under [owner authorization](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6567540211). [Content system](CONTENT_SYSTEM.md) defines source-specific meaning; [glossary](TERMINOLOGY_GLOSSARY.md) supplies bilingual candidate terms; [CD01–CD07](CONTENT_DECISION_REGISTER.md) remain owner-gated. This defines content behavior, not CSS, layout, typography, parser implementation or a translated runtime catalog. Current UI remains unchanged.

## Recommended register and voice

Recommend clear contemporary Modern Standard Arabic with familiar healthcare vocabulary used in Egypt, without slang or classical/institutional phrasing. Arabic is authored from the task and clinical meaning, not from English sentence structure. Use short verbs, explicit objects, ordinary connectors, calm factual feedback and respectful personal language. Prefer طبيب، عيادة، موعد، وصفة طبية، صرف الدواء، ملخص الزيارة. Avoid transliterated بورتال، أرتيفاكت، فولفيلمنت، روت and نية متابعة. دكتور and روشتة are recognizable Egyptian alternatives, but طبيب and وصفة طبية are recommended for consistent professional product UI.

CD01 evaluates contemporary professional MSA against conversational Egyptian Arabic (warmer/local but less suitable for formal medical/task copy) and formal institutional Arabic (precise but often distant/bureaucratic). This is an editorial recommendation, not a finding from Egyptian participants or licensed clinical translation review. A later native Arabic task review must test naturalness, comprehension and vocabulary before implementation approval.

| Literal/weak wording to reject | Recommended Arabic | Meaning / English equivalent |
| --- | --- | --- |
| تم معالجة الأرتيفاكت بنجاح | حُفظت المسودة. | Draft saved; name actual source/state |
| نية المتابعة الخاصة بالمريض | توصية بالمتابعة | Follow-up recommendation; no reservation |
| الملخص المنشور | ملخص الزيارة · تمت مشاركته معك | Visit summary, shared with you; not public publication |
| فشل تنفيذ العملية. حاول مرة أخرى. after unknown write | تعذّر تأكيد تسجيل الصرف. راجع البند وسجله. لا تسجّل صرفًا آخر. | Could not confirm dispense; check exact item/history; no new dispense |
| المريض الخاص بك في رحلة العناية | من ترعاهم؛ اسم الشخص في سياق الاستشارة | People in your care; exact person identity in consultation |
| الدواء متاح after acceptance | قبلت الصيدلية الوصفة. القبول لا يؤكد توافر الدواء أو صرفه. | Acceptance does not confirm availability/dispense |

Use grammatical whole messages, not fragment concatenation. ملاحظة موقّعة وخاصة; ملخص موقّع ومُشارَك; وصفة موقّعة; تعليمات تمت مشاركتها. Status grammar depends on object/recipient, not a universal translation for SIGNED/RELEASED. “Shared with you” is تمت مشاركته معك for a summary, تمت مشاركتها معك for instructions. Avoid unvocalized ambiguities where a light diacritic makes passive meaning clear: سُجّل صرف الدواء, أُرسل الطلب. Avoid guessed gender/honorifics in greetings; address the task or recorded name. A button can consistently use the verbal noun حجز الموعد while guidance says راجع الطبيب والعيادة والتوقيت.

## Task and terminology parity

Patient P1/P2 retain My care / رعايتي and Find care / ابحث عن رعاية as recommendations, with explicit secondary مواعيدي، وصفاتي الطبية، الملخصات وتعليمات المتابعة، السجل المتاح. Doctor C1/C3 retain جدول المواعيد and من ترعاهم, with requests/current care clearly separated; consultation has local المراجعة والتوثيق، الوصفة الطبية والصيدلية، المتابعة، المراجعة والإغلاق and future diagnostics. These translations do not regroup or move accepted destinations. Personal patient headings do not repeat المريض. Doctor-side identity must never be obscured by a possessive or generic “this person” during a consequential action.

Care request explanation: «طلب الرعاية ينتظر قبول الطبيب. الحجز وحده لا يمنح صلاحية الاطّلاع على المعلومات الطبية.» / “The care request is awaiting doctor acceptance. Booking alone does not give access to medical information.” Active care access derives from the current assignment, not from the request history badge. CD04's role-specific labels require this explanation; they must not become a general patient or doctor directory.

Follow-up: «أوصى الطبيب بمتابعة. هذه التوصية لا تحجز موعدًا.» / “The doctor recommended follow-up. This recommendation does not book an appointment.” Show an actual booking only from its committed state; when no known association, say «لا يوجد موعد مرتبط هنا» / “No appointment is linked here.” Do not say no appointment exists elsewhere when source association is unknown.

Clinical distinctions retain independent Arabic words: موقّعة وخاصة ≠ مُشارَكة; أُغلقت الاستشارة ≠ تمت مشاركة كل الملاحظات; قبلت الصيدلية الوصفة ≠ سُجّل صرف الدواء; أُبطل تسجيل الصرف ≠ يمكن الصرف مجددًا; نتيجة نهائية ≠ راجعها الطبيب. “Final” is FUTURE laboratory verification/finalization, not diagnosis or clinician interpretation.

## Dates, times, quantities and numbers

CD07 recommends Latin digits `0123456789` in both languages for consistent clinical/operational numbers, spelled-out Gregorian months, 24-hour time, and explicit event/clinic timezone. Alternative: Arabic-Indic digits `٠١٢٣٤٥٦٧٨٩` with localized decimal conventions and explicit ص/م. Both are plausible; owner choice plus later Arabic comprehension review is required. Do not invent a user preference feature to avoid deciding. Arabic language does not require one numbering system, and Latin digits do not permit English UI fallback.

| Content | Recommended English | Recommended Arabic | Rules / ambiguity checks |
| --- | --- | --- | --- |
| Appointment absolute date/time | 2 November 2026, 14:30 — Cairo time (UTC+02:00) | 2 نوفمبر 2026، 14:30 — بتوقيت القاهرة (UTC+02:00) | Use actual event zone/offset at that instant; example is not a hard-coded +02 rule |
| Month vocabulary | January…December | يناير، فبراير، مارس، أبريل، مايو، يونيو، يوليو، أغسطس، سبتمبر، أكتوبر، نوفمبر، ديسمبر | Gregorian explicitly; no unannounced Hijri conversion |
| Day/month | 2 November 2026 | 2 نوفمبر 2026 | Never ambiguous 02/11/26; year on clinical/operational evidence/history |
| Relative date | Today · 2 November 2026, 14:30 — Cairo time | اليوم · 2 نوفمبر 2026، 14:30 — بتوقيت القاهرة | Relative label supplementary; same clinic/event timezone as absolute date, not browser's accidental timezone |
| Timezone | Clinic time — Cairo; UTC offset when material | توقيت العيادة — القاهرة؛ فرق التوقيت عند الحاجة | Bind to actual booking/clinic zone. Do not assume every clinic uses Cairo; show IANA identifier only for legitimate ambiguity/configuration |
| Duration | 30 minutes | المدة: 30 دقيقة | State duration, not end instant; derive from exact actual interval, no invented fixed visit length |
| Validity | Valid from {absolute instant} until {absolute instant} | سارية من {التوقيت الكامل} حتى {التوقيت الكامل} | Eligibility is start inclusive, end exclusive, current server time; show timezone and sufficient precision near boundary |
| Quantity | Quantity: 1.25; Unit: {recorded unit} | الكمية: 1.25؛ الوحدة: {الوحدة المسجّلة} | Decimal dot recommended; no digit grouping for clinical decimal quantities; preserve exact numeric value and original unit |
| Medicine instruction | {exact authored instruction} | {النص كما سجّله الطبيب} | No dose conversion, unit expansion, translation, rounding or medical rule generation |
| Phone / email / reference | +20 10 1234 5678; care@example.test; safe reference | Same recorded value with Arabic surrounding labels | Preserve plus, leading zeros, @, hyphen and character order; examples synthetic |
| Date of birth | 2 November 2000 | 2 نوفمبر 2000 | Calendar date stays that date; never shift through timezone or infer unsupported demographic/clinical meaning |

Clinical quantity inputs permit accepted numeric strings; this document does not change their parser or stored decimal precision. Preserve up to the existing three fractional digits and nine integer digits without rounding or treating comma as thousands/decimal interchangeably. A source unit such as `mg`, `mL` or an authored Arabic unit is kept exactly; quantity is not dose. Exact signed medication name/display snapshot remains unchanged when catalog display later changes.

Content must support Arabic zero/one/two/few/many/other meaning without English noun concatenation. Prefer a clear labelled count when natural: «عدد البنود: 2» / “Items: 2,” or author full correct forms (بند واحد، بندان، 3 بنود). Do not force English “item(s)” into Arabic. Zero is only shown for a successfully loaded permitted scope, never for hidden or failed results. No implementation library is selected.

Use the clinic/event's actual timezone and daylight-saving rules; do not store or infer a permanently fixed offset. In repeated/ambiguous clock hours include offset and zone to distinguish two instants with the same local time. Cross-midnight windows show both full dates and times. Displayed minute precision must not assert eligibility at a boundary when server seconds/milliseconds decide it: expose finer time detail if needed and rely on authoritative eligibility, not a client countdown. Never change UTC storage or canonical offset-bearing semantics. Relative words “today,” “tomorrow,” and “yesterday” are not sufficient for booking, validity, signing, dispensing, verification or correction evidence.

## RTL and mixed-direction semantic requirements

Arabic text reads as Arabic. Embedded recorded Latin content keeps its internal reading order. This specifies expected meaning and reading/copy behavior only; no CSS, mirroring, component or layout technique is selected.

| Mixed content / risk | Expected semantic behavior | Review fixture and acceptance condition |
| --- | --- | --- |
| Arabic + English person name | Name remains exact, one recognizable identity; title/parenthetical status stays attached to intended name | «الطبيب: Omar Ali — الموعد محجوز»; rendered/copied name must be `Omar Ali`, not reversed |
| Medicine name plus quantity/unit | Treat name and numeric/unit span as distinct semantic content; do not reorder digits/unit or translate brand | «الدواء: Amoxicillin؛ الكمية: 1.25؛ الوحدة: mL»; `1.25` remains one value, `mL` case/order preserved; synthetic, not a prescription |
| Range / negative / decimal / offset | Keep sign, decimal and full endpoint together; label bounds rather than relying only on dash direction | «من 2 نوفمبر 2026، 23:30 إلى 3 نوفمبر 2026، 00:30»; dates do not swap; `UTC+02:00` plus sign stays with offset |
| Time and date | Date parts/time digits retain order, Arabic month prose natural | «2 نوفمبر 2026، 14:30 — بتوقيت القاهرة»; 14:30 never reads 30:14 |
| Necessary ID/reference | Show exact permitted opaque reference only for legitimate reconciliation; no hidden IDs from failure | «المرجع: RX-AB12-34»; copy remains `RX-AB12-34`, no inserted directional characters in stored value |
| Phone | Preserve full number/leading plus/zero; surrounding Arabic punctuation not part of value | «الهاتف: +20 10 1234 5678»; copied number retains +20 |
| Email | Keep complete local/domain spelling; Arabic sentence punctuation separate | «البريد: care@example.test»; copy exactly `care@example.test` |
| English proper noun / product / clinic | Official name retained as recorded when no authorized Arabic name; no arbitrary transliteration | «العيادة: Nile Care Clinic»; the clinic identity remains intact |
| Screen reader / selection / copy | Spoken/selected sequence reflects person → medicine → quantity/unit → state, without hidden bidi controls leaking into payload | Review both Arabic-first and English-first names, parentheses, slash, hyphen, plus, mixed scripts; no misleading target attribution |

Mixed-direction runs require semantic separation/isolation when later implemented; this is an expected behavior, not a CSS prescription. Never reverse chronology, clinical sequence or state transitions simply because the locale is RTL. Do not insert directional control characters into medication names, signed content, IDs, phone/email or stored clinical data to repair presentation. Later validation must test actual rendering, keyboard selection, copying and screen-reader order on supported clients; the present sprint performs editorial fixture review only.

## English leakage, fallback and transliteration

Arabic screens must have authored Arabic for navigation, buttons, statuses, helpers, empty/loading/error/success messages, accessible names, confirmations and uncertain-write recovery. A missing entry is a localization defect, not permission to return the English key. No full English sentence fallback. Review active language across session expiry, offline/error, permission denial and capability gaps, not just the happy path.

Explicit exceptions:

- Official medication and brand names, including immutable signed display snapshots; preserve exact official/recorded text.
- Person, clinic, organization and product proper names when no authorized Arabic form is recorded. Do not invent Arabic brand lockups here.
- Clinician/patient-authored free text, clinical instructions and opaque recorded units, clearly attributable to their source; never silently machine-translate. This is recorded source content, not untranslated UI copy.
- A genuinely necessary safe technical reference, IANA timezone identifier or email/phone, labelled in Arabic. Raw enum names, error codes, internal model names and operation keys are not routine user content.
- The explicit language selector may name English and العربية in their own languages.

Fallback policy for later implementation: a missing low-risk nonessential label uses an authored generic Arabic label or is omitted only if task meaning and retrieval remain intact; log missing-key metadata without medical/person payload for correction. Missing critical action/consequence/identity/status/recovery copy must prevent that action being offered with incomplete meaning; use an authored Arabic safe state «هذه المهمة غير متاحة بالعربية حاليًا.» / “This task is currently unavailable in Arabic.” No background submission, auto-switch, English fallback or silent Demo replacement. Coverage must be complete before shipping critical workflows; this fallback is containment, not an acceptable permanent gap. Offer a deliberate language choice only where the user remains in control and no write is silently repeated.

Do not transliterate ordinary technical terms when a natural Arabic term exists: وصفة طبية not بريسكريبشن; سجل الصرف not فولفيلمنت; طلب رعاية not أسّاينمنت; الإعدادات not سيتنغز. Proper names may remain as recorded, with any authorized bilingual name used consistently. Never invent a transliterated medication name that could suggest a different medicine.

## Editorial validation and delivery gate

Review English and Arabic from the same semantic specification independently. Check role, object, current state, action, recipient, consequence, known/unknown result, and safe next step in each language. Reject literal English order, robotic passive chains, institutional flourishes, grammatical disagreement, unexplained abbreviations and mixed English UI terms. Prefer «تعذّر تحميل المواعيد» over «حدث خطأ أثناء القيام بعملية تحميل البيانات الخاصة بالمواعيد».

Test all [dangerous misunderstandings](CONTENT_VALIDATION.md#semantic-safety-test--english-and-arabic), every accepted IA destination, medical/proper-name exceptions and directional fixtures above. Current evidence is authored-content/source inspection, not browser QA or empirical Arabic usability. Native Arabic product/clinical review and later rendering/assistive-technology validation remain required before shipping; no product correctness or owner acceptance follows from a docs-only CI pass.

No visual design, font/color/logo selection, screen design, frontend/backend/API/schema/security change, Lab implementation, Brand Research or Design System work occurs here.
