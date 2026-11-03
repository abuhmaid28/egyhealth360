# Clinician — Active Consultation Master Spec

Status: **DESIGN MASTER SPEC — implementation candidate, not Final Brand V2 / not Design System V2 freeze**.

Authority and dependency:
- Patient — My Care final optical baseline: `f0d94e7e2579dc9bd1e2ef87ba493172b0f4cfb0`.
- Accepted IA: Clinician primary goals are **Schedule** + **People in your care / مرضاي**; consultation tasks remain local to the exact consultation.
- Repository contracts and security semantics override visual convenience.
- No merge, deployment, backend/API/schema/security change is authorized by this document.

## 1. Non-negotiable visual inheritance

The Clinician workspace must look like the **same product** as the approved Patient My Care screen, with a denser professional mode.

Use the exact Patient baseline tokens:

```text
Navy            #0B2545
Teal            #0B6E7F
Teal Dark       #084E5A
Aqua            #14B8A6
Blue            #3B82F6
Canvas          #F7F9FC
Surface         #FFFFFF
Surface Alt     #F1F5F9
Border          #E2E8F0
Border Strong   #CBD5E1
Text Primary    #0F172A
Text Secondary  #475569
Text Muted      #526178
Success         #16A34A / #ECFDF3
Warning         #B7791F / #FFF8E6
Error           #DC2626 / #FEF2F2
Info            #2563EB / #EFF6FF
```

Typography:
- English: existing local **Manrope** asset used by Patient My Care.
- Arabic: existing local **IBM Plex Sans Arabic** asset used by Patient My Care.
- Do not add another font service or visual type family.

Brand presentation:
- Render **text wordmark only: `EgyHealth 360`**.
- **NO logo symbol, shield, heart, cross, stethoscope, E-mark, icon mark or generated brand mark.**
- Final logo remains a separate later gate.

Visual rules inherited from Patient:
- 8px spacing rhythm.
- Default radius around 12px; anchors up to 16px; smaller controls 6–10px.
- Borders and spacing before shadows.
- Shadows very restrained; no glassmorphism, glow, neon, random gradients or purple.
- Touch targets >=44px; mobile primary actions >=48px where practical.
- Visible focus ring, reduced-motion behavior, true RTL and bidi isolation.

## 2. Product truth that controls this screen

### Currently supported Live consultation capabilities

The real current Live consultation flow is:

1. exact scheduled booking
2. explicit consultation opening
3. current-authority recheck
4. clinical documentation
5. independent follow-up authoring/release
6. independent consultation review/close

The active consultation must never imply that opening the visit automatically saves, signs, releases or closes anything.

### Documentation truth

Supported clinical documentation includes:
- Complaint / findings
- Problems
- Diagnoses
- Allergy review with explicit uncertainty
- Private note
- Patient-facing visit summary
- Patient instructions
- Saved drafts
- Separate sign of private note
- Separate sign + release of patient summary
- Immutable signed history
- Addendum / correction
- Wrong-patient restriction workflow

Private note and patient summary are purpose-separated sources. Private content never silently becomes patient-visible.

### Follow-up truth

Follow-up is a separate source:
- separate draft
- review
- explicit sign/release
- optional desired follow-up window
- released follow-up is **not** a booked appointment
- summary release and follow-up release are independent

### Close truth

`Review & close consultation` is a separate deliberate action.

Closing:
- changes consultation to CLOSED
- changes booking to CONSULTED
- is irreversible under current contract
- does **not** automatically save editor changes
- does **not** sign private notes
- does **not** release patient summaries
- does **not** release follow-up instructions
- does **not** complete unrelated care work

Therefore there must be **no** generic `Complete & Close`, `Save All`, or bundled mutation CTA.

### Prescription / Lab visibility

Prescription is a CURRENT domain capability and belongs conceptually inside consultation, but the current Live clinician consultation frontend does not expose an integrated prescription authoring workflow in this workspace.

For this master screen:
- **Do not render an active Prescription tab/action unless the current branch provides a real integrated clinician prescription surface.**
- It may be documented as a future/conditional local task slot, not visible product chrome.

Lab order/result inside clinician consultation is still FUTURE / not authorized for this screen.
- No active Lab / Results tab.
- No fake result cards.
- No CBC, vitals, medications, diagnosis suggestions, dosing suggestions, or clinical analytics merely to fill space.

## 3. Information architecture

### Global Clinician header

Use the same structural family as Patient My Care.

Desktop:
- left: `EgyHealth 360` text wordmark
- primary destinations only:
  - Schedule
  - People in your care / مرضاي
- secondary/utility access may include availability/settings only when already supported
- right: language + account/avatar treatment using the same visual weight rules as Patient

Do not create global `Consultations`, `Orders`, `Results`, `Clinical Tools`, `Prescriptions` or `Patients` modules.

During an active consultation, global navigation remains an intentional exit. The exact consultation local task context must visually dominate.

## 4. Desktop master composition

Target viewport: **1600×1000**.

Container:
- outer max width: 1440px
- useful width: ~1360px at 1600px viewport
- 40px horizontal page padding
- align header and workspace to the same grid

### A. Product header — 72px

Same visual DNA as Patient.
- white surface
- subtle bottom border
- no dark full-width clinician-only navbar
- no new logo mark

### B. Consultation context ribbon — compact, persistent orientation

Full useful width, approximately 88–104px depending EN/AR wrapping.

Must show only factual/current values available from the exact consultation context:
- patient display name
- visit date/time/timezone
- provider name when available
- clinic name when available
- consultation state: `Consultation open` / `Closed visit`
- back/return affordance to Schedule or exact booking

Do not invent:
- MRN
- age
- sex
- portrait
- allergy value
- medication list
- vitals
- diagnosis

unless the current real source explicitly supplies it to this workspace.

Patient identity treatment should be initials/monogram only if derived from the real display name.

### C. Local consultation task bar

One connected local task surface below the context ribbon.

Visible current tasks:
1. Clinical documentation
2. Follow-up instructions
3. Review & close

These are anchors/work modes within the exact consultation, not global navigation.

Presentation:
- compact horizontal treatment on desktop
- active/current section uses teal emphasis, not a large filled pill
- status may show truthful source state such as Draft / Signed private / Signed and released where directly known
- no decorative feature icons required for every item

Do not show active Prescription or Lab tasks until a real integrated surface exists.

### D. Main workspace — three-plane professional layout

Use a **connected clinical workspace**, not independent dashboard cards.

Recommended desktop geometry inside 1360px:
- left outline: ~200px
- center authoring plane: flexible ~800px
- right context rail: ~300px
- 20–24px gaps

At narrower desktop widths, left outline may collapse before the right context rail does.

#### Left — Documentation outline

Sticky within workspace when possible.

Use the existing source sections:
- Complaint and findings
- Allergy review
- Private note
- Visit summary and instructions
- Signed history

This is section navigation, not a separate clinical module.

Keep visible distinction between:
- private clinician-only source
- patient-visible source

#### Center — Authoring plane

This is the visual priority after patient identity.

Design principles:
- mostly flat white connected plane
- restrained separators
- one clear section heading at a time
- fields should look like professional documentation tools, not consumer form cards
- long narrative fields get generous width
- counters/hints remain quiet but legible
- destructive/restrict controls stay low-emphasis until intentionally reached

Preserve exact action semantics:

Private note:
- Save private note draft
- Sign private note
- Start separate private draft where supported

Patient summary:
- Save summary draft
- Review sign and release
- Start separate summary draft where supported

Signed history:
- immutable presentation
- addendum / correction actions
- wrong-patient restriction where authorized

Never relabel `Review sign and release` as generic Save/Publish.

#### Right — Clinical context / source-state rail

The right rail is **not** a fake medical summary dashboard.

It may show only context already available to this exact workspace, for example:
- Consultation state (Open/Closed)
- Patient display name
- Provider / clinic
- Opened visit timestamp/timezone
- Current allergy review state when that documentation source is loaded
- Private note state: none / draft / signed private
- Patient summary state: none / draft / signed and released
- Follow-up source state when loaded/available

Use uncertainty honestly:
- `Not reviewed` is not `No allergies`.
- Missing data should be omitted or explicitly described without turning absence into a negative clinical finding.

Do not add vitals, results, medicines or trend charts unless the existing integrated service for this exact screen supplies them.

## 5. Review & close treatment

Keep `Review & close` locally reachable without making it a destructive always-on primary button.

Preferred desktop behavior:
- persistent low-profile consultation control at the bottom/right of the local workspace **or** local task bar anchor
- action opens the existing deliberate review surface
- final modal/confirmation retains the current acknowledgement that close does not sign/release other sources

Never use:
- `Complete consultation`
- `Complete & Close`
- `Finish all`
- `Save and close`

unless the underlying contract changes in a separately authorized task.

## 6. Professional density without dashboard noise

Desired character:
- calm
- precise
- high-density
- clinician-efficient
- current-generation SaaS quality
- same brand family as Patient

Avoid:
- giant hero area
- metric/KPI dashboard cards
- dark developer-console workspace
- six colored clinical cards
- fake analytics
- unnecessary avatars/photos
- pill-heavy UI
- excessive rounded containers
- full-screen dark navy
- generic shadcn/admin skin

Premium quality comes from alignment, typography, density, clear planes and source-state clarity.

## 7. Arabic / RTL

Arabic must be independently composed, not coordinate-mirrored mechanically.

Required:
- IBM Plex Sans Arabic
- true RTL flow
- English names/timezones/IDs isolated with `bdi`
- Latin digits for clinical/logistics values under accepted content rules
- 24-hour time where current content system requires it
- directional arrows mirror only when direction represents navigation
- chronological/history meaning must not reverse
- private versus patient-visible source hierarchy must remain equally clear

Use existing accepted translation/content catalog where available. Do not invent a new terminology system in the visual implementation.

## 8. Responsive / mobile principle

The first implementation gate is **Desktop EN + Desktop AR**.

Mobile is a later bounded adaptation, not a squeezed three-column desktop.

When mobile is authorized:
- sticky patient/visit context becomes compact
- local consultation tasks remain reachable
- one content plane at a time
- clinical context becomes disclosure/drawer/secondary section
- no loss of identity, uncertainty, source visibility or close consequences

## 9. States required for the desktop master

At minimum design/verify:
- loading
- consultation open
- consultation closed/read-only orientation
- no draft yet
- saved private draft
- signed private note
- saved summary draft
- signed + released summary
- allergy `NOT_REVIEWED`
- uncertain command / explicit retry
- access/restriction redaction state
- long English content
- long Arabic content
- 200% text
- keyboard focus

State visuals must not rely only on color.

## 10. First implementation slice

The first Clinician visual slice is deliberately narrow:

**Clinician — Active Consultation / Clinical Documentation shell**

Include:
- approved-product header inheritance
- consultation context ribbon
- local task bar
- documentation outline
- documentation center plane
- truthful source-state rail
- existing follow-up and review-close entry points
- EN desktop
- AR desktop / RTL
- responsive structural sanity only; no full mobile redesign yet

Do not implement new clinical capability.

## 11. Acceptance bar

A successful result must pass all of these:

- Looks unmistakably like the same product as Patient My Care.
- Has no invented logo mark.
- Uses exact inherited color/type system.
- Does not resemble a generic admin dashboard.
- Feels denser and more professional than Patient without becoming dark/cyber/tooling-heavy.
- Patient/visit/source purpose remains obvious during scrolling.
- Private note vs patient-visible summary is visually impossible to confuse.
- Close is clearly independent from save/sign/release.
- No unsupported prescription/lab/vitals/results/medication capability is fabricated.
- Arabic RTL is first-class.
- Visual craft is strong enough to become the professional half of the project Design Language.
