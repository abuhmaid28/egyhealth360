# Bilingual terminology glossary — proposal

CURRENT AUTHORITATIVE content proposal under [authorization](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6567540211). This is canonical **proposed** vocabulary, not final owner approval or a runtime translation catalog. [Decision register](CONTENT_DECISION_REGISTER.md) defines the four statuses and CD01–CD07 owner gates. APPROVED FOUNDATION below means accepted meaning only; the English/Arabic rendering remains proposed. CURRENT means domain capability, never verified Live exposure. All Lab rows are FUTURE.

Use full context rather than translating internal names. Words-to-avoid are prohibited in the stated context, not in developer contracts or quoted audit evidence. [Status/action patterns](CONTENT_SYSTEM.md#status-language-system) control grammar and consequential behavior; [Arabic UX](ARABIC_UX.md) controls numbers and language exceptions.

## Platform, people and navigation

| Internal/domain concept | English user-facing term | Arabic user-facing term | Context | Words to avoid | Reason | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Platform | EgyHealth 360 | EgyHealth 360 | Recorded product name; brand/Arabic lockup deferred | New Arabic brand spelling | No brand choice in content sprint | RECOMMENDATION |
| Workspace | Workspace | مساحة العمل | Authorized context, not authority selector | Portal everywhere / بورتال | Plain task setting | RECOMMENDATION |
| UserRole.PATIENT | Your care; Patient when role identification is necessary | رعايتك؛ المريض عند بيان الدور | Personal app versus legitimate role/doctor identity | Patient journey / رحلة المريض as personal heading | Address the person, preserve doctor-side identity | RECOMMENDATION |
| CLINICIAN in current physician journeys | Doctor | طبيب | Discovery/physician workspace, CD02 | CLINICIAN; مقدم الخدمة indiscriminately | Familiar precise profession; no security rename | OWNER DECISION REQUIRED |
| Broader explicitly represented clinical profession | Clinician / Healthcare professional | ممارس سريري / مقدم رعاية صحية | Only when actual credentials/scope require broader term, CD02 | Doctor for nonphysician actors | Avoid false credential claim | OWNER DECISION REQUIRED |
| PHARMACY_STAFF | Pharmacy team | فريق الصيدلية | Staff role where needed | Pharmacist unless credential known | Membership does not prove licensure | RECOMMENDATION |
| LAB_STAFF | Laboratory team | فريق المختبر | Future role, not credential claim | Verified specialist from role alone | Do not infer qualification | FUTURE |
| ADMIN | Administrator | مسؤول الإدارة | Operational account role | Clinical administrator / مشرف طبي | No clinical authority | RECOMMENDATION |
| P1 | My care | رعايتي | Patient primary, CD03 | Patient dashboard; صحتي as complete record claim | Existing care and next action | OWNER DECISION REQUIRED |
| P2 | Find care | ابحث عن رعاية | Patient primary, includes doctor/clinic/time | Recommended care / الرعاية الأنسب لك | Search, not automated triage | RECOMMENDATION |
| Physician search | Find a doctor | ابحث عن طبيب | Find-care task entry | Best doctor / أفضل طبيب | No ranking/medical suitability claim | RECOMMENDATION |
| C1 | Schedule | جدول المواعيد | Doctor primary; Today / اليوم is a scope | Dashboard + Today as duplicate primaries | Accepted IA meaning | APPROVED FOUNDATION |
| P9 relationship destination | Your doctors | أطباؤك | Patient authorization/requests/active care, CD04 | Assignments; علاقات اجتماعية | Personal entry plus explicit permission explanation | OWNER DECISION REQUIRED |
| C3 relationship destination | People in your care | من ترعاهم | Doctor requests/current authorized people, CD04 | All patients; قائمة المرضى العامة | Not a population directory | OWNER DECISION REQUIRED |
| F1 | Assigned work | الوصفات المسندة | Pharmacy primary; exact assigned prescriptions | Fulfillment; التجهيز | States real responsibility without preparation | RECOMMENDATION |
| F3 | Dispense history | سجل الصرف | Staff reduced-purpose source facts | Patient history / السجل الطبي | No chart access | RECOMMENDATION |
| P8 | Available history | السجل المتاح | Bounded sources/older pages | Complete medical record / السجل الطبي الكامل | Avoid I4 completeness claim | RECOMMENDATION |
| P11 | Shared summaries and follow-up | الملخصات وتعليمات المتابعة | Secondary released-source retrieval, CD05 | Feed; كل نتائجك | Two actual source readers, no inferred aggregation | OWNER DECISION REQUIRED |
| G1 account | Account | الحساب | Shared session/account controls | Profile as role-grant control | Separate identity from authority | RECOMMENDATION |
| Own profile | My profile | ملفي الشخصي | Supported own demographic details | Medical profile as clinical chart | Personal data is not care record | RECOMMENDATION |
| Demo / Live mode | Demo with fictional data / Connected account | عرض ببيانات افتراضية / حساب متصل | Explicit mode; connected remains synthetic pre-final | Real patients; Golden Demo in care content | Mode truth without clinical readiness claim | RECOMMENDATION |

## Discovery, booking and care permission

| Internal/domain concept | English user-facing term | Arabic user-facing term | Context | Words to avoid | Reason | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Specialty | Specialty | التخصص | Search/doctor facts | Specialty recommendation | Published fact only | RECOMMENDATION |
| Public provider profile | Doctor profile | ملف الطبيب | Physician identity/professional facts | ClinicianProfile; credentials verified without evidence | No technical labels or credential inference | RECOMMENDATION |
| ClinicDirectory | Clinic | العيادة | Selected published clinic | Facility / فاسيليتي | Familiar care location | RECOMMENDATION |
| AvailabilitySlot | Available appointments | المواعيد المتاحة | Finite published time; before booking | Reserved; recurring availability | Availability is not commitment | RECOMMENDATION |
| Empty availability | No available appointments | لا توجد مواعيد متاحة | Selected doctor/clinic/date scope only | Doctor unavailable everywhere | Do not overgeneralize empty scope | RECOMMENDATION |
| Booking | Appointment | موعد | Committed logistical visit; list مواعيدي / My appointments | Clinical encounter; appointment grants access | Booking grants no clinical authority | APPROVED FOUNDATION |
| Booking state | Appointment status | حالة الموعد | Explicit current logistics status | Enum string; encounter status interchangeably | Separate visit/state axes | RECOMMENDATION |
| Consultation | Consultation | الاستشارة | Sustained doctor task; patient Visit / الزيارة when explanatory | Clinical artifact workflow | Human task | RECOMMENDATION |
| ClinicianPatientAssignment | Active care permission | صلاحية رعاية نشطة | Explanatory, not repeated primary label; CD04 | Assignment; إسناد المريض | Current clinical grant; never social/administrative assignment | OWNER DECISION REQUIRED |
| RelationshipRequest | Care request | طلب رعاية | Patient authorization sent to exact doctor | Referral; حجز | Not booking or clinical referral | RECOMMENDATION |
| Patient authorization | Allow this doctor to provide care | السماح لهذا الطبيب بتقديم الرعاية | Consequential permission explanation | Share everything; guaranteed permanent access | Doctor acceptance required; permitted data only | RECOMMENDATION |
| Request acceptance | Accept care request | قبول طلب الرعاية | Designated doctor; current contract | Accept patient into appointment | Creates/binds grant, not booking | RECOMMENDATION |
| Assignment end | End care access | إنهاء صلاحية الرعاية | Either participant; exact relationship | Delete history; discharge / خروج | Ends current authority, preserves history | RECOMMENDATION |

## Clinical sources and follow-up

| Internal/domain concept | English user-facing term | Arabic user-facing term | Context | Words to avoid | Reason | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Clinical information | Care information | معلومات الرعاية | Patient permitted sources | Entire chart available | Bounded honest explanation | RECOMMENDATION |
| PRIVATE_NOTE | Private note | ملاحظة خاصة | Exact author/current authority | Shared note by default | Signed note remains private | APPROVED FOUNDATION |
| PATIENT_SUMMARY | Visit summary | ملخص الزيارة | Actual signed/shared document, CD05 | Released artifact; نتيجة التحليل | Names readable source | OWNER DECISION REQUIRED |
| Released outcome association | Your visit | زيارتك | Umbrella only when source linkage exists, CD05 | Unified outcome record from inferred association | Does not create aggregate source | OWNER DECISION REQUIRED |
| SIGNED_RELEASED | Signed and shared with the patient | موقّع ومُشارَك مع المريض | Author view of summary/follow-up | Published publicly / منشور للجميع | Explicit recipient; not public publication | APPROVED FOUNDATION |
| Patient released state | Shared with you | تمت مشاركته معك | Summary; use تمت مشاركتها for instructions | Released / صادر alone | Natural recipient-specific meaning | RECOMMENDATION |
| FollowUpIntent | Follow-up recommendation | توصية بالمتابعة | Human recommendation; state أوصى الطبيب بمتابعة | Intent; نية متابعة; appointment booked | Recommendation and booking independent | RECOMMENDATION |
| Follow-up instruction | Follow-up instructions | تعليمات المتابعة | Released authored instruction | Automatically generated plan | No medical invention | RECOMMENDATION |
| Desired follow-up window | Recommended follow-up period | الفترة المقترحة للمتابعة | Only when clinician supplied both bounds/timezone | Due date / overdue inferred | Window is not a booked time | RECOMMENDATION |
| Follow-up booking link | Linked appointment | الموعد المرتبط | Clinician-established association; actual booking state separate | Auto-booked; تم الحجز from intent | No inferred link or reservation | RECOMMENDATION |
| Allergy UNKNOWN / NOT_REVIEWED | Unknown / Not reviewed | غير معروفة / لم تُراجع | Allergy-specific context | No allergies / لا توجد حساسية | Missing knowledge ≠ negative finding | APPROVED FOUNDATION |
| Addendum | Additional note | إضافة توضيحية | Signed supplemental content with provenance | Edit original | History retained | RECOMMENDATION |
| Correction | Correction | تصحيح | Source-specific signed successor/fact annotation | Delete original; latest always clinically valid | Specify object and current effect | RECOMMENDATION |
| Privacy restriction | Remove from ordinary access | حجب المحتوى عن العرض المعتاد | Exact-author permitted wrong-patient safety operation | Delete permanently; transfer to another patient | Suppression preserves immutable history and denies references | RECOMMENDATION |

## Prescription and pharmacy

| Internal/domain concept | English user-facing term | Arabic user-facing term | Context | Words to avoid | Reason | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Prescription source | Prescription | وصفة طبية | Signed human-authored source, CD06 | Prescription Source; روشتة in professional UI | Familiar medical term | OWNER DECISION REQUIRED |
| Prescription item | Medicine item | بند دواء | Operational item, patient Medicine / الدواء where enough | Artifact item | Exact full-item responsibility | RECOMMENDATION |
| Medication | Medicine | الدواء | Patient wording; Medication acceptable doctor field | Auto-recommended medication | Human prescription/catalog fact | RECOMMENDATION |
| Medication instructions | Instructions for use | تعليمات الاستخدام | Exact clinician-entered text | Standard dose; normalized dosage invented | Never generate/translate clinical instructions silently | RECOMMENDATION |
| Quantity / unit | Quantity / Unit | الكمية / الوحدة | Preserve decimal and source unit | Dose when field means quantity | Quantity ≠ dosage | APPROVED FOUNDATION |
| validFrom / validUntil | Valid from / Valid until | سارية من / سارية حتى | Prescription, explicit time boundaries | Renewal / تجديد | Eligibility interval, not treatment duration | RECOMMENDATION |
| PHARMACY organization | Pharmacy | الصيدلية | Exact selected recipient | Supplier / مزود | Clear healthcare recipient | RECOMMENDATION |
| PharmacyRoute | Sent to pharmacy | أُرسلت إلى الصيدلية | Recorded clinician route | Route; مسار; delivery | Electronic assignment, not physical supply | RECOMMENDATION |
| PENDING route | Awaiting pharmacy acceptance | بانتظار قبول الصيدلية | Patient/author/staff | Preparing / قيد التجهيز | No stock or acceptance claim | RECOMMENDATION |
| ACCEPTED route | Accepted by pharmacy | قبلت الصيدلية الوصفة | Responsibility accepted, CD06 | Ready for collection / جاهزة للاستلام | Acceptance ≠ availability/dispense | OWNER DECISION REQUIRED |
| Eligible remaining items | Items not yet dispensed | بنود لم يُسجّل صرفها | Accepted exact route/current eligibility | Partially dispensed item | Some whole items may remain; no partial quantity | RECOMMENDATION |
| FULLY_DISPENSED fact | Dispense recorded | سُجّل صرف الدواء | Per item, CD06 | Taken; delivered; جاهز; consumed | Recorded supply fact only | OWNER DECISION REQUIRED |
| Dispense correction | Correct dispense record | تصحيح سجل الصرف | Reasoned annotation; original retained | Change prescription instructions | Fact correction only | RECOMMENDATION |
| REVERSAL annotation | Dispense record reversed | أُبطل تسجيل الصرف | Original fact retained, CD06 | Returned to stock; can dispense again | Terminal annotation; no renewed entitlement | OWNER DECISION REQUIRED |
| Prescription CANCELLED / REPLACED | Cancelled / Replaced | ملغاة / استُبدلت بوصفة جديدة | Signed source, read-only history | Deleted; refill; substituted medicine | New source has new validity/items and fresh route | RECOMMENDATION |
| Route WITHDRAWN | Pharmacy assignment withdrawn | سُحب إسناد الوصفة للصيدلية | Before acceptance only | Patient consent withdrawn | Distinguish operational route from care permission | RECOMMENDATION |

## Future diagnostics — all FUTURE

| Internal/domain concept | English user-facing term | Arabic user-facing term | Context | Words to avoid | Reason | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Assigned diagnostics | الفحوصات المسندة | Future Lab primary | All patient tests | Exact order scope | FUTURE |
| Laboratory | Laboratory | المختبر | Future organization/workspace; معمل is familiar alternative, not separate role | Full LIS | Bounded future service | FUTURE |
| Diagnostic order | Test order | طلب فحص | Future clinician-signed designated lab | Sample request unless actual sample workflow | Human order only | FUTURE |
| SIGNED / ROUTED order | Sent to laboratory | أُرسل إلى المختبر | Future atomic sign/route | Sample collected | No sample semantics | FUTURE |
| ACCEPTED / REJECTED order | Accepted by laboratory / Rejected by laboratory | قبله المختبر / رفضه المختبر | Future exact responsibility/reason | Processing / sample rejected | Exact order meaning | FUTURE |
| Result DRAFT | Draft result | مسودة نتيجة | Future exact Lab staff only | Result available to patient | Draft invisible to patients/general clinicians | FUTURE |
| Verification/finalization | Verify and finalize result | التحقق من النتيجة واعتمادها نهائيًا | Future actual verifier/time; same person permitted | Doctor approval; second verification required | Lab verification ≠ clinical review | FUTURE |
| Result FINAL | Final result | نتيجة نهائية | Future immediate permitted patient/current-clinician visibility | Normal; doctor reviewed; released by doctor | No diagnosis or clinician review claim | FUTURE |
| AMENDMENT | Amended final result | نتيجة نهائية معدّلة | Future new verified final; previous superseded | Silently updated result | Preserve current and prior meaning | FUTURE |
| RETRACTION | Result retracted | نتيجة مسحوبة | Future terminal history, prior not current | Deleted; ready to repeat same order | Fresh order for new fulfillment | FUTURE |

## Operational Admin terms

| Internal/domain concept | English user-facing term | Arabic user-facing term | Context | Words to avoid | Reason | Status |
| --- | --- | --- | --- | --- | --- | --- |
| A1 operational accounts | People | الأشخاص | Admin primary; accounts/access only | Patients as clinical directory | Accepted operational scope | APPROVED FOUNDATION |
| A2 Organization | Organizations | الجهات | Admin primary; clinic/pharmacy/lab facts | Hospitals exclusively; clinical institution authority | Covers multiple entity kinds without implying hospital ERP | RECOMMENDATION |
| OrganizationMembership | Organization membership | العضوية في الجهة | Exact person/entity/compatible role | Care relationship; assignment | Operational membership ≠ clinical grant | APPROVED FOUNDATION |
| User ACTIVE / DISABLED | Account active / Account disabled | الحساب نشط / الحساب معطّل | Account status only | Healthy; discharged | Status belongs to account | RECOMMENDATION |
| Organization ACTIVE / SUSPENDED | Organization active / Organization suspended | الجهة نشطة / الجهة معلّقة | Entity operations/current access | Closed permanently; all records deleted | Scope-specific effect | RECOMMENDATION |
| Membership ACTIVE / ENDED | Membership active / Membership ended | العضوية نشطة / انتهت العضوية | Exact membership | Revoke patient care automatically | Separate authority models | RECOMMENDATION |
| Directory publication | Visible in directory / Not visible in directory | ظاهر في الدليل / غير ظاهر في الدليل | Supported public listing | Shared clinical data; accredited | Visibility ≠ authority/credential verification | RECOMMENDATION |
| Configuration | Operational settings | الإعدادات التشغيلية | Actually supported fields only | Clinical override; break glass | No clinical Admin power | RECOMMENDATION |
| Catalog maintenance | Medicine catalog settings | إعدادات دليل الأدوية | Bounded existing name/active/publication maintenance | Prescribing rules; create any drug | No clinical content authority or arbitrary creation | RECOMMENDATION |
| Safe service health A8 | Service status | حالة الخدمة | Separate future exposure decision | Patient health / حالة المرضى | Operational state only | FUTURE |
