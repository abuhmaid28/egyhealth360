# EgyHealth 360 — Premium Synthesis Design Tokens v1

Status: implementation reference candidate, not Final Brand V2.

## Design principles
- Modern, premium, digitally native.
- Patient-first, clinician-strong.
- Calm information density.
- Minimal decorative UI.
- No journal/paper/editorial metaphors.
- Avoid generic admin-dashboard appearance.
- Arabic and English are first-class.
- Responsive behavior is intentional, not stacked desktop.

## Color

### Brand / orientation
- Deep Navy: `#0B2545`
- Primary Teal: `#0B6E7F`
- Teal Dark: `#084E5A`
- Accent Aqua: `#14B8A6`
- Accent Blue: `#3B82F6`

### Neutrals
- Canvas: `#F7F9FC`
- Surface: `#FFFFFF`
- Surface Alt: `#F1F5F9`
- Border: `#E2E8F0`
- Border Strong: `#CBD5E1`
- Text Primary: `#0F172A`
- Text Secondary: `#475569`
- Text Muted: `#64748B`

### Semantic
- Success: `#16A34A`
- Success Surface: `#ECFDF3`
- Warning: `#B7791F`
- Warning Surface: `#FFF8E6`
- Error: `#DC2626`
- Error Surface: `#FEF2F2`
- Info: `#2563EB`
- Info Surface: `#EFF6FF`

Do not use brand color as a medical semantic state.

## Typography

### English / Latin
Primary: Manrope
Fallbacks: Inter, system-ui, sans-serif

### Arabic
Primary: IBM Plex Sans Arabic
Fallbacks: Noto Sans Arabic, system-ui, sans-serif

### Scale
- Display / Page title: 32px / 600 / 1.20
- H2: 24px / 600 / 1.30
- H3: 20px / 600 / 1.35
- Card title: 16px / 600 / 1.40
- Body: 15px / 400 / 1.60
- Small: 13px / 400 / 1.55
- Meta: 12px / 500 / 1.45
- Button: 14px / 600 / 1.20

Arabic line-height should generally be 8–15% more generous than Latin at the same nominal size.

Use tabular numerals for dates, times, measurements and IDs.
Use bidi isolation for mixed Arabic/Latin values.

## Radius
- XS: 6px
- SM: 8px
- MD: 12px
- LG: 16px
- XL: 20px
- Pill: 999px

Default application surfaces should NOT all use the same radius.
Use 12px as normal card radius and 16px only for strong anchors.

## Shadows
Use extremely restrained shadows.

- Surface: `0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.04)`
- Floating / menu only: `0 12px 32px rgba(15,23,42,.10)`

Prefer border + spacing over shadow.

## Spacing
8pt base scale:
- 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

Desktop:
- page horizontal padding: 40px
- section gap: 32px
- grid gap: 24px

Tablet:
- page horizontal padding: 28px
- grid gap: 20px

Mobile:
- horizontal padding: 20px
- section gap: 24px
- item gap: 12–16px

## Controls
- Desktop primary button height: 44px
- Mobile primary button height: 48px
- Icon button min target: 44×44px
- Input height: 44–48px
- Focus ring: 3px visible outline, never color-only
- Disabled state must remain readable

## Icons
- 18–20px standard
- 22–24px emphasized
- simple outline style
- consistent 1.75–2px stroke
- no mixed icon families
- no decorative medical clichés

## Motion
- 140–180ms ease-out for hover/pressed/open transitions
- no animated clinical-success celebration
- reduced-motion: remove non-essential movement

---

# Patient — My Care

## Purpose
The first screen should answer:
1. What is my next important care event?
2. Is there anything I need to do?
3. Where can I quickly access my care information?
4. What happened recently?

It must feel like a premium consumer product, not an admin dashboard.

## Desktop shell
Recommended reference viewport: 1440–1600px.

Header:
- height: 68–72px
- white / lightly translucent surface
- logo left
- primary navigation centered/left
- utilities right
- search may be compact; do not dominate the page

Primary navigation:
- My Care
- Find Care
- Appointments
- Records
- Prescriptions
- Lab & Tests

Do not add destinations that contradict accepted IA.

## Page intro
Desktop:
- greeting + short supporting sentence
- optional subtle Cairo/local visual atmosphere may appear in presentation art,
  but the production UI must not depend on decorative photography.

Keep greeting compact.
Do not make the top area a marketing hero.

## Main desktop composition
12-column layout.

Suggested:
- primary care column: 8 columns
- action/context column: 4 columns

### Next Appointment
This is the strongest visual anchor.

Requirements:
- deep navy → teal restrained gradient or equivalent premium surface
- 16px radius
- no excessive glow
- clear:
  - status
  - specialty / appointment type
  - clinician
  - date
  - time
  - location / modality
  - clear action

Important semantic text:
Booking alone does not grant clinical access.

Do not imply that booking = assignment/medical authority.

### Next for you
A short prioritized list.
Examples:
- refill/request prescription action
- complete lab action
- review care plan / follow-up

Rules:
- maximum 3 prominent items in first viewport
- each row: icon, title, secondary context, chevron/action
- do not make every row a colorful card
- color only for orientation/semantics

### Your care at a glance
Compact quick-access modules:
- Prescriptions
- Lab & Tests
- Medical Records
- Appointments / Care Plan if authorized by IA

These should feel like lightweight tiles, not dashboard KPI cards.

### Recent care
List format preferred.
Each item should expose:
- source/type
- clinician/source
- date
- state
- exact action

Avoid vanity metrics.

## Mobile
Reference width: 390px.

Priority:
1. greeting/context
2. next appointment
3. next actions
4. care shortcuts
5. recent care

Bottom navigation:
- My Care
- Find Care
- Appointments or Records (based on accepted IA/product gate)
- Profile/account

Do not duplicate every desktop destination.

### Mobile behavior
- single column
- no desktop sidebar
- appointment becomes full-width
- primary action is thumb-friendly
- no tiny metadata
- no 3-column card rows
- min touch target 44px

## RTL
- all layout directions must mirror intentionally
- mixed medication names, IDs, measurements and times must use bidi isolation
- numbers remain readable
- Arabic copy should not be literal English translation if Egyptian product wording is already accepted

## Visual rejection rules
Do not introduce:
- beige
- paper textures
- journal styling
- giant empty hero space
- excessive pills
- excessive glass
- generic shadcn defaults
- six identical rounded cards in a row

---

# Clinician — Active Consultation

## Purpose
A high-density clinical workspace with strong patient context and clear local task boundaries.

The screen should feel professional and efficient without becoming a dark developer console.

## Desktop layout
Primary viewport: 1440–1600px.

Use a restrained shell:
- compact top bar or left navigation
- consultation-specific local navigation
- persistent patient identity
- clear active/in-progress state

## Patient context header
Must clearly show:
- patient name
- stable identifier
- age / sex if product contract allows
- assignment / authority context where relevant
- allergy review state
- chronic conditions
- active medications summary

Important:
"Not reviewed" is NOT equivalent to "none known."

## Main workspace
Preferred structure:
- center: documentation/work area
- secondary context rail: source/context
- optional compact local nav or section rail

Avoid a pile of floating cards.

Use flat connected planes, borders, grouping and typography before adding shadows.

## Visit note
Local tabs may include:
- Visit Note
- Assessment
- Plan
- Orders / Prescription / Follow-up when authorized by product scope

The editor is a visual specimen until implementation is explicitly authorized.

Private note semantics must remain private after signing where the accepted domain contract says so.

## Clinical context rail
Examples:
- last vitals
- active medications
- recent lab sources
- care plan / follow-up context

Do not imply:
- lab final = clinician reviewed
- prescription signed = dispensed
- pharmacy accepted = medicine available
- close = save/sign/share

## Actions
Clear hierarchy:
- save draft
- review/sign
- close/end consultation only when allowed by workflow

Dangerous or irreversible actions must not compete visually with ordinary navigation.

## Density
Clinician UI may be denser than Patient UI.

Targets:
- 12–14px meta
- 14–15px body
- 16–20px task headings
- 20–24px patient/workspace headings

Avoid excessive 32–40px headings inside clinical workspaces.

## Light / graphite synthesis
Primary working surfaces should remain light.

Use deep graphite/navy selectively for:
- shell orientation
- active navigation
- bounded focus
- not the entire consultation canvas

## Mobile clinician
Do NOT squeeze full desktop prescribing/signing into mobile.

Mobile should support:
- schedule
- selected visit review
- key identity/context
- safe bounded actions

Direct high-risk/full documentation actions back to full workspace when appropriate.

---

# Implementation Contract for Codex

## Core rule
IMPLEMENT THE APPROVED REFERENCE. DO NOT REDESIGN IT.

Codex is acting as implementation engineer, not art director.

## Source order
1. Accepted product/security/domain contracts
2. This implementation contract
3. Screen-specific specs
4. Design tokens
5. Reference image

If implementation requires a visual deviation, record it before applying it.

## Allowed
- reusable React components
- responsive CSS
- RTL support
- accessibility improvements that preserve visual intent
- tokenization
- semantic HTML
- existing repository architecture when compatible
- implementation-only refactors needed to produce the approved screen

## Not allowed
- invent a new visual direction
- replace the design with default component-library styling
- change typography without approval
- change brand palette without approval
- add random gradients
- add glassmorphism
- turn every section into a card
- add unsupported product capabilities
- alter backend/API/database/schema/security behavior
- change access-control semantics
- add new clinical claims
- silently change copy meaning

## Architecture
Prefer:
- shared design tokens
- reusable primitives
- composition over screen-specific monoliths
- visual components separated from data adapters
- clear loading / empty / error / uncertain states

Do not couple demo UI to fake assumptions that could leak into Live mode.

## Acceptance
Implementation is not accepted because:
- build passes
- tests pass
- page renders

It must also pass visual QA against the reference and written spec.

---

# Visual QA Checklist

## Before implementation
- [ ] Confirm exact GitHub base/head.
- [ ] Confirm no production/backend scope change.
- [ ] Confirm accepted IA/terminology source.
- [ ] Confirm reference assets and specs are present.

## Patient — My Care
- [ ] Appointment is the strongest visual anchor.
- [ ] "Next for you" is clear and short.
- [ ] Quick access does not look like KPI dashboard cards.
- [ ] Recent care uses list hierarchy.
- [ ] Desktop composition is balanced.
- [ ] Mobile is purpose-built, not stacked desktop.
- [ ] Arabic RTL is visually intentional.
- [ ] Mixed Latin/Arabic values are isolated correctly.

## Clinician — Consultation
- [ ] Persistent patient context is obvious.
- [ ] Allergy "not reviewed" state is explicit.
- [ ] Documentation workspace is denser than Patient UI.
- [ ] Clinical context is available without card clutter.
- [ ] Signed/accepted/dispensed/consumed meanings remain distinct.
- [ ] Close does not imply save/sign/share.
- [ ] Full workspace is not forced into mobile.

## Visual craft
- [ ] Typography matches token scale.
- [ ] Spacing follows 8pt system.
- [ ] Radius usage is intentional.
- [ ] Borders are consistent.
- [ ] Shadows are restrained.
- [ ] Icons use one family/style.
- [ ] Brand colors are not reused as medical semantics.
- [ ] No generic shadcn/admin-dashboard appearance.

## Accessibility
- [ ] Visible keyboard focus.
- [ ] 44px minimum touch targets where relevant.
- [ ] Contrast meets expected thresholds.
- [ ] 200% text scaling does not break content.
- [ ] No horizontal overflow at 320px.
- [ ] Reduced-motion honored.
- [ ] Status is not color-only.

## Final review package
- [ ] Reference screenshot.
- [ ] Implementation screenshot at same viewport.
- [ ] Mobile screenshot at same viewport.
- [ ] Arabic screenshot.
- [ ] Visual diff / discrepancy notes.
- [ ] CI results.
- [ ] No auto-merge.
