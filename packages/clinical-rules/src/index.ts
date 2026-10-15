/** Approved by Issue #16 / 6157539102. Declarations only: no patient evaluator. */
const definition = {
  schemaVersion: 'eh-cr-htn-fu-001/v1',
  domain: 'HYPERTENSION',
  applicability: {
    combination: 'ALL',
    requiredKnownFacts: ['age_years_at_trigger', 'pregnancy_status_at_trigger', 'hypertension_diagnosis', 'known_CVD', 'diabetes_mellitus', 'chronic_kidney_disease'],
    age: { field: 'age_years_at_trigger', operator: 'GTE', value: 18 },
    pregnancy: { field: 'pregnancy_status_at_trigger', requirement: 'KNOWN_NON_PREGNANT' },
    hypertensionDiagnosis: { field: 'hypertension_diagnosis', equals: true },
    knownCvd: { field: 'known_CVD', equals: false },
    diabetesMellitus: { field: 'diabetes_mellitus', equals: false },
    chronicKidneyDisease: { field: 'chronic_kidney_disease', equals: false },
    missingOrUnknownRequiredFact: 'DO_NOT_ASSUME_ELIGIBLE',
  },
  trigger: {
    kind: 'QUALIFYING_OBSERVED_BP_ASSESSMENT', combination: 'ALL',
    systolic: { unit: 'mmHg', operator: 'LT', value: 140 },
    diastolic: { unit: 'mmHg', operator: 'LT', value: 90 }, triggerTime: 'ASSESSMENT_TIME',
  },
  action: { code: 'HTN_BP_FOLLOWUP', label: 'Hypertension BP reassessment / follow-up' },
  timing: {
    anchor: 'TRIGGER_TIME', recommendedWindowStart: { operation: 'ADD_CALENDAR_MONTHS', value: 3 },
    dueBy: { operation: 'ADD_CALENDAR_MONTHS', value: 6 }, overdueBoundary: 'STRICTLY_AFTER_DUE_BY',
  },
  completion: {
    combination: 'ALL', relevantFollowupEncounter: 'REQUIRED', bpAssessmentAssociatedWithFollowup: 'REQUIRED',
    followupTime: { afterTrigger: 'STRICT', atOrBeforeDueBy: true }, beforeRecommendedWindowStartAllowed: true,
  },
  scheduleEvidence: { kind: 'FUTURE_APPOINTMENT', explicitLinkToActionRequired: true, finalScheduledDecisionContract: 'DEFERRED' },
  exemptionPolicy: {
    automaticMedicalExemption: 'NONE', manualExemptionRequirements: ['EXPLICIT', 'AUDITABLE', 'REASONED'], manualWorkflow: 'DEFERRED',
  },
  coverageRequirement: {
    trueGapRequires: 'SUFFICIENT_RELEVANT_RECORD_COVERAGE',
    relevantPeriod: { start: 'AFTER_TRIGGER_TIME', end: 'EXPLICIT_EVALUATION_TIME' },
    insufficientCoverageWithoutStrongerResolvingEvidence: 'UNCERTAIN', outsideRelevantPeriodAloneForcesUncertain: false,
    sufficiencyAlgorithm: 'DEFERRED',
  },
  sourceReferences: [
    { sourceKey: 'WHO-HTN-2021', publicationIdentity: '2021', section: '3.6', recommendation: 6, purpose: 'CONTROL_TARGET' },
    { sourceKey: 'WHO-HTN-2021', publicationIdentity: '2021', section: '3.7', recommendation: 7, purpose: 'FOLLOWUP_INTERVAL' },
  ],
  repositoryEvidence: {
    baselineCommit: 'a4b2f2a4a496daba32aead5b612cb105e8873d27',
    catalog: 'docs/research/CLINICAL_RULE_CATALOG_V1.md',
    sourceAudit: 'docs/research/CLINICAL_RULE_SOURCE_AUDIT.md',
    researchProtocol: 'docs/research/EXPERIMENT_PROTOCOL_V1.md',
  },
} as const;

function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export const APPROVED_CLINICAL_CATALOG = freeze({
  manifestId: 'eh-clinical-catalog-v1',
  source: {
    sourceKey: 'WHO-HTN-2021', title: 'Guideline for the pharmacological treatment of hypertension in adults',
    publisher: 'World Health Organization', publicationIdentity: '2021', publicationYear: 2021,
    referenceIdentifier: 'ISBN:978-92-4-003398-6', referenceUrl: null,
  },
  template: {
    templateKey: 'CPT-HTN-FU-001', name: 'Controlled uncomplicated hypertension follow-up',
    conditionDomain: 'HYPERTENSION', version: '1.0.0-draft',
  },
  rule: { ruleKey: 'CR-HTN-FU-001', ruleVersion: '1.0.0-draft', actionType: 'HTN_BP_FOLLOWUP', definition },
} as const);
export type ApprovedClinicalDefinition = typeof definition;

/** Structural equality for JSON values; no defaults, coercion, getters or unknown keys. */
export function matchesClinicalValue(actual: unknown, expected: unknown): boolean {
  if (expected === null || typeof expected !== 'object') return actual === expected;
  if (actual === null || typeof actual !== 'object' || Array.isArray(actual) !== Array.isArray(expected)) return false;
  const prototype = Object.getPrototypeOf(actual);
  if (Array.isArray(actual) ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) return false;
  const keys = Reflect.ownKeys(expected);
  const actualKeys = Reflect.ownKeys(actual);
  if (keys.length !== actualKeys.length || actualKeys.some(key => !keys.includes(key))) return false;
  return keys.every(key => {
    const a = Object.getOwnPropertyDescriptor(actual, key);
    const e = Object.getOwnPropertyDescriptor(expected, key);
    return a && e && 'value' in a && 'value' in e && matchesClinicalValue(a.value, e.value);
  });
}

export function validateClinicalDefinition(value: unknown): ApprovedClinicalDefinition {
  if (!matchesClinicalValue(value, definition)) throw new Error('CLINICAL_CATALOG_INVALID');
  // Return the canonical deeply frozen value, never the caller's mutable object.
  return definition;
}

/** Declarations only. Never evidence, eligibility, an occurrence or permission to persist. */
export function projectDeferredActionSpecification(value: unknown) {
  const approved = validateClinicalDefinition(value);
  return freeze({
    actionType: approved.action.code,
    triggerRequirement: approved.trigger.kind,
    timing: {
      recommendedWindowStart: approved.timing.recommendedWindowStart,
      dueBy: approved.timing.dueBy,
    },
    persistence: 'DEFERRED' as const,
    unmetGates: ['PERSISTED_QUALIFYING_EVIDENCE', 'APPROVED_CALENDAR_ARITHMETIC', 'OCCURRENCE_RETRIGGER_SELECTION'] as const,
  });
}
