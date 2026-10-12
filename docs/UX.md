# UX Architecture V1

## Strategy

- One responsive web application
- Clinician: desktop-first
- Patient: mobile-first
- Admin/Evaluation Lab: desktop-first

## Clinician navigation

Dashboard / Patients / Care Actions / Schedule / Account

Patient workspace tabs: Overview / Care Plan / Timeline / Measurements

## Patient navigation

Home / My Plan / Measurements / Profile

Patient wording is simplified:
- TRUE_GAP -> Needs attention
- UNCERTAIN -> More information needed
- SCHEDULED -> Scheduled
- COMPLETED -> Completed
- NOT_DUE -> Upcoming
- EXEMPT -> Not required

## Critical screens

1. Clinician Dashboard
2. Patient List
3. Patient Overview
4. Care Action Detail
5. Patient Home
6. Patient My Plan
7. BP Measurement
8. Evaluation Lab
9. Experiment Results

## Golden clinician flow

Dashboard -> Needs Attention -> Patient -> Care Action -> classification/explanation/evidence -> confirm or override.

## Golden research flow

Evaluation Lab -> configure run -> execute -> compare Baseline vs EACCE -> inspect metrics/metadata.

## Required states

Critical screens must define loading, empty, error, stale, and permission-denied states. TRUE_GAP and UNCERTAIN must be distinguishable by text/icon semantics, not color alone. Clinical events and system assessments must not be presented as the same kind of event.

## High-fidelity reference corrections

The current visual reference establishes direction only. Active product source-of-truth excludes Reports navigation, Add Patient as a core feature, and clinical `Stable` terminology; use `No Active Gaps/Issues` instead. Brand name is `EgyHealth 360`.
