# Egyptian Arabic UI Writing Note

**Owner-directed content principle: Professional Egyptian Arabic.** The direct Refinement 04 brief makes this the default user-facing Arabic direction for future work across EgyHealth 360. Apply it now only to this Patient My Care specimen; this note does not authorize rollout, new screens, production strings or a final Design System.

## Voice and precision

Write short, warm, respectful Egyptian sentences with familiar nouns and a clear action. Prefer `ميعادك`، `الدكتور`، `دور`، `تقدر`، `لسه`، `مفيش` where natural. Keep useful medical terms such as `ملخص الزيارة` and `توصية`; professionalism does not require bureaucratic sentence structure. Avoid `يرجى القيام`، `تمت عملية`، internal model/status names, chat slang, jokes, exaggerated reassurance and unsupported promises. Retain already good labels such as **متابعتي، دور على دكتور، مواعيدك، الملخصات والمتابعة، السجل المتاح، روشتاتك**.

Change UI explanations, never recorded clinical instructions, medication names/units, signed source text, identity, permission policy or medical meaning. A recommendation is not a reservation; a released summary is not every clinical note; missing linkage is not proof that no appointment exists elsewhere. Keep bounded/unavailable meanings clear.

## Main surface and supporting detail

Show the useful fact and next action first. Use a short supportive line on the main page; place the longer explanation in the existing relevant detail layer. Keep source identity/date near its content. At a real consequential decision, necessary scope and consequences must be visible before acting, not hidden merely to simplify a screen.

| Context | Applied Egyptian wording | Meaning retained |
| --- | --- | --- |
| Appointment helper | **الحجز لوحده مش بيشارك معلوماتك الطبية.** | Booking alone does not grant clinical access or share medical data; this does not deny existing legitimate care access. |
| Existing appointment detail | **الحجز لوحده مش بيدي الدكتور صلاحية يشوف معلوماتك الطبية. طلب الرعاية الجديد محتاج موافقتك وقبول الدكتور.** | New-request patient consent and doctor acceptance remain explicit. |
| Follow-up | **الدكتور رشّح لك متابعة.** / **دي توصية من الدكتور، مش ميعاد محجوز.** | Suggestion, not mandatory care, confirmed booking or automatic linkage. |
| Missing association | **لسه مفيش ميعاد مربوط بالمتابعة دي هنا.** | Missing link here, not a claim about all appointments. |
| Released summary | **تقدر تقرا الملخص اللي الدكتور شاركه معاك.** | Only the summary actually shared, without private/draft hints. |
| Prescription limitation | **مش متاحة في المعاينة دي** | No active prescription capability or future-delivery promise. |
| Specimen honesty | **معاينة تصميم · بيانات للتجربة** / **معاينة بس · مفيش خدمات شغّالة** | Synthetic preview, without a false Live service. |

## Dates and times

For the ordinary Egypt-first patient appointment surface, use a familiar 12-hour display with an explicit Arabic period: **2:30 مساءً** and **لحد 3:00 مساءً**. Keep Latin digits, named Gregorian month, full date/year, both interval endpoints and chronology. Give the month enough visual weight to read as part of the date.

This is the owner's explicit presentation amendment to the older CD07 24-hour/visible-offset examples for this surface. It does not rewrite stored instants, timezone/DST conversion, validity/eligibility boundaries or professional clinical evidence. Here the exact source remains **12 November 2026, 14:30–15:00, Africa/Cairo, UTC+02:00**, represented by offset-bearing `datetime` values. The existing detail preview identifies the clinic's Cairo time; the main screen needs no UTC notation or timezone label for this unambiguous single-clinic afternoon event.

In future work, show timezone or boundary precision when it changes understanding, such as cross-zone scheduling, repeated hours, midnight or eligibility decisions. Do not apply “hide technical detail” as a blanket rule that removes necessary meaning. Such states require their own scoped validation; this specimen does not implement them.

## Reuse boundary

Use this rule for future authorized UI writing across roles, preserving accepted task labels and role-specific precision. The register is owner-directed; the individual examples and visual treatment remain reviewable. Existing accepted documents retain historical wording; this latest scoped owner direction controls the display amendment above. No production rollout or policy change occurs here. Agent editorial review is not native Egyptian participant research or comprehension validation.
