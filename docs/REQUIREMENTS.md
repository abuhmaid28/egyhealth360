# Requirements V1

## Core business rules

- BR-001 Patient can access only own data.
- BR-002 Clinician access requires an active clinician-patient assignment.
- BR-003 Care plans must pin template/rule versions.
- BR-004 Published clinical definitions are immutable.
- BR-005 Critical clinical history is not silently hard-deleted.
- BR-006 EACCE never diagnoses or prescribes.
- BR-007 Missing completion evidence alone does not prove a true gap when relevant coverage is insufficient.
- BR-008 `UNCERTAIN` is allowed under insufficient observed evidence.
- BR-009 `SCHEDULED` requires valid relevant future evidence.
- BR-010 `COMPLETED` requires qualifying completion evidence.
- BR-011 New relevant evidence triggers/requires re-evaluation.
- BR-012 Clinician override preserves original assessment and requires a reason.
- BR-013 Patient cannot arbitrarily self-close restricted clinical actions.
- BR-014 Research ground truth is isolated from engine inputs.
- BR-015 Identical deterministic inputs/evaluation time/rule version produce identical output.

## Closure decision order

1. applicability/exemption
2. not-due check
3. valid completion evidence
4. valid future schedule
5. relevant evidence coverage sufficiency
6. confirmed true gap or uncertainty

## Core acceptance criteria

- Overdue + complete relevant coverage + no completion/schedule/exemption => TRUE_GAP.
- Overdue + insufficient relevant coverage => UNCERTAIN, not confirmed TRUE_GAP.
- Future due date => NOT_DUE.
- Valid future follow-up => SCHEDULED.
- Valid completion evidence => COMPLETED.
- Documented valid exemption => EXEMPT.
- Every assessment has explanation/reason trace.
- Assessment history is immutable and auditable.
- Backend authorization is enforced independently of UI hiding.
- Evaluation runs store versions, seeds/configuration, and metrics for reproducibility.

## Non-functional

- Free-first/self-hostable
- Responsive and RTL-ready
- WCAG 2.2 AA target for critical flows
- Interactive clinician workflows under normal demo load
- Research runs reproducible from pinned configuration
