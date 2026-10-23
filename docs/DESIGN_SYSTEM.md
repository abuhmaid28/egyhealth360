# Design System V1

> **V3 applicability:** Historical V1 visual reference only. **DESIGN FROZEN** under approved D35; this file grants no implementation/design authority. No visual specification is changed by the V3 reconciliation. Separate explicit design-unfreeze approval is required after scope/domain prerequisites. See [approved policy/lineage](PRODUCT_V3_DECISIONS.md).

## Brand direction
Calm Clinical Intelligence: clear, calm, reliable, evidence-driven.

## Core visual rules
- Primary blue with restrained teal secondary
- Neutral surfaces dominate the UI
- Inter for English, Noto Sans Arabic for Arabic
- 4px spacing base
- 8px input/button radius, 12px main-card radius
- borders preferred over heavy shadows
- no dark mode in MVP
- one consistent open-source icon set

## Closure semantics
- COMPLETED: success
- TRUE_GAP: critical/error
- UNCERTAIN: warning/needs review
- SCHEDULED: info
- NOT_DUE: neutral
- EXEMPT: neutral/secondary

Never communicate status by color alone; use text and iconography.

## Layout
- Clinician/Admin desktop-first with sidebar
- Patient mobile-first with bottom navigation
- RTL/LTR supported by the same component hierarchy
- critical touch targets around 44x44px minimum on mobile

## Component inventory
Generic: buttons, inputs, selects, tabs, cards, tables, modal, drawer, toast, alert, skeleton, empty/error states, pagination, timeline.

Healthcare-specific: Patient Summary, Care Plan Header, Care Action Card, Closure Status Badge, Explanation Panel, Evidence List, BP Measurement/Trend, Clinical Timeline Item, System Assessment Item, Follow-up Card, Clinician Review Panel, Record Coverage Indicator.

## Accessibility target
WCAG 2.2 AA for critical flows: visible focus, keyboard navigation, semantic labels, sufficient contrast, status beyond color, logical headings, accessible modal behavior.

## Anti-patterns
No glassmorphism, neon/futuristic AI styling, excessive gradients/shadows, random spacing, fake confidence percentages, fake AI accuracy, or inconsistent component variants.
