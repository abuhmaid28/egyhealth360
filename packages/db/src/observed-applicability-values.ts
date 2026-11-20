import { bpTimestamp } from './blood-pressure-values.js';

export type ObservedApplicabilityErrorCode =
  | 'APPLICABILITY_INVALID'
  | 'APPLICABILITY_CONFLICT'
  | 'APPLICABILITY_UNAUTHENTICATED'
  | 'APPLICABILITY_NOT_FOUND'
  | 'APPLICABILITY_SERVICE_UNAVAILABLE';

export type ApplicabilityField =
  | 'patientId'
  | 'snapshotId'
  | 'ageAssertionState'
  | 'ageYearsAtAssessment'
  | 'pregnancyStatus'
  | 'hypertensionStatus'
  | 'cvdStatus'
  | 'diabetesStatus'
  | 'ckdStatus'
  | 'effectiveAt'
  | 'assertedAt'
  | 'sourceType'
  | 'sourceReference'
  | 'assertionReference'
  | 'retractionReference'
  | 'reasonCode'
  | '$';

export type ApplicabilityReason =
  | 'required'
  | 'type'
  | 'integer'
  | 'representation'
  | 'format'
  | 'precision'
  | 'future'
  | 'chronology'
  | 'unknown_fields';

export type ApplicabilityFieldError = Readonly<{
  field: ApplicabilityField;
  reason: ApplicabilityReason;
}>;

export class ObservedApplicabilityError extends Error {
  constructor(
    public readonly code: ObservedApplicabilityErrorCode,
    public readonly fields: readonly ApplicabilityFieldError[] = []
  ) {
    super(code);
  }
}

export function applicabilityInvalid(field: ApplicabilityField, reason: ApplicabilityReason): never {
  throw new ObservedApplicabilityError('APPLICABILITY_INVALID', [{ field, reason }]);
}

export type ObservedApplicabilitySourceType = 'SYNTHETIC_OBSERVED_INPUT';
export type ObservedAgeAssertionState = 'NO_ASSERTION' | 'UNKNOWN' | 'ASSERTED_VALUE';
export type ObservedPregnancyStatus = 'PREGNANT' | 'NOT_PREGNANT' | 'UNKNOWN';
export type ObservedConditionStatus = 'PRESENT' | 'ABSENT' | 'UNKNOWN';
export type ObservedTupleComparison =
  | 'NO_NON_RETRACTED_ROWS'
  | 'IDENTICAL_TUPLES'
  | 'DIFFERING_TUPLES';

export type ObservedAgeAssertion =
  | Readonly<{ ageAssertionState: 'NO_ASSERTION'; ageYearsAtAssessment: null }>
  | Readonly<{ ageAssertionState: 'UNKNOWN'; ageYearsAtAssessment: null }>
  | Readonly<{ ageAssertionState: 'ASSERTED_VALUE'; ageYearsAtAssessment: number }>;

export type ObservedApplicabilitySnapshot = Readonly<{
  id: string;
  patientId: string;
  sourceType: ObservedApplicabilitySourceType;
  sourceReference: string;
  assertionReference: string;
  effectiveAt: Date;
  assertedAt: Date;
  recordedAt: Date;
  ageAssertionState: ObservedAgeAssertionState;
  ageYearsAtAssessment: number | null;
  pregnancyStatus: ObservedPregnancyStatus | null;
  hypertensionStatus: ObservedConditionStatus | null;
  cvdStatus: ObservedConditionStatus | null;
  diabetesStatus: ObservedConditionStatus | null;
  ckdStatus: ObservedConditionStatus | null;
  retraction: ObservedApplicabilityRetraction | null;
}>;

export type ObservedApplicabilityRetraction = Readonly<{
  id: string;
  snapshotId: string;
  patientId: string;
  sourceType: ObservedApplicabilitySourceType;
  sourceReference: string;
  retractionReference: string;
  assertedAt: Date;
  recordedAt: Date;
  reasonCode: string;
}>;

export type ObservedApplicabilityPoint = Readonly<{
  patientId: string;
  effectiveAt: string;
  snapshots: readonly ObservedApplicabilitySnapshot[];
  tupleComparison: ObservedTupleComparison;
  nonRetractedSnapshotIds: readonly string[];
  differingTupleSnapshotIds: readonly string[];
}>;

export type GetObservedApplicabilitySnapshotsInput = Readonly<{
  patientId: string;
  effectiveAt: string;
}>;

export type InsertObservedApplicabilitySnapshotInput = Readonly<{
  patientId: string;
  sourceType: ObservedApplicabilitySourceType;
  sourceReference: string;
  assertionReference: string;
  effectiveAt: string;
  assertedAt: string;
  ageAssertionState: ObservedAgeAssertionState;
  ageYearsAtAssessment: number | null;
  pregnancyStatus: ObservedPregnancyStatus | null;
  hypertensionStatus: ObservedConditionStatus | null;
  cvdStatus: ObservedConditionStatus | null;
  diabetesStatus: ObservedConditionStatus | null;
  ckdStatus: ObservedConditionStatus | null;
}>;

export type RetractObservedApplicabilitySnapshotInput = Readonly<{
  patientId: string;
  snapshotId: string;
  sourceType: ObservedApplicabilitySourceType;
  sourceReference: string;
  retractionReference: string;
  assertedAt: string;
  reasonCode: string;
}>;

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const REFERENCE_REGEX = /^[A-Za-z0-9_.-]{1,128}$/;

export function exactApplicabilityKeys(
  value: unknown,
  allowedKeys: readonly string[]
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    applicabilityInvalid('$', 'type');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some(key => typeof key !== 'string' || !allowedKeys.includes(key))) {
    applicabilityInvalid('$', 'unknown_fields');
  }
  for (const key of allowedKeys) {
    if (!Object.hasOwn(descriptors, key)) {
      applicabilityInvalid('$', 'required');
    }
    if (!('value' in descriptors[key])) {
      applicabilityInvalid('$', 'type');
    }
  }
}

export function parseApplicabilityUuid(value: unknown, field: 'patientId' | 'snapshotId'): string {
  if (typeof value !== 'string') applicabilityInvalid(field, 'type');
  if (!UUID_REGEX.test(value)) applicabilityInvalid(field, 'format');
  return value.toLowerCase();
}

export function parseApplicabilityReference(
  value: unknown,
  field: 'sourceReference' | 'assertionReference' | 'retractionReference'
): string {
  if (typeof value !== 'string') applicabilityInvalid(field, 'type');
  if (!REFERENCE_REGEX.test(value)) applicabilityInvalid(field, 'format');
  return value;
}

export function parseApplicabilityTimestamp(
  value: unknown,
  field: 'effectiveAt' | 'assertedAt'
): Date {
  if (typeof value !== 'string') applicabilityInvalid(field, 'type');
  let d: Date;
  try {
    d = bpTimestamp(value);
  } catch {
    applicabilityInvalid(field, 'format');
  }
  return d;
}

export function validateAgeAssertion(
  stateValue: unknown,
  numericValue: unknown
): { ageAssertionState: ObservedAgeAssertionState; ageYearsAtAssessment: number | null } {
  if (typeof stateValue !== 'string') {
    applicabilityInvalid('ageAssertionState', 'type');
  }
  if (!['NO_ASSERTION', 'UNKNOWN', 'ASSERTED_VALUE'].includes(stateValue)) {
    applicabilityInvalid('ageAssertionState', 'format');
  }
  const ageAssertionState = stateValue as ObservedAgeAssertionState;

  if (ageAssertionState === 'NO_ASSERTION' || ageAssertionState === 'UNKNOWN') {
    if (numericValue !== null) {
      applicabilityInvalid('ageYearsAtAssessment', 'representation');
    }
    return { ageAssertionState, ageYearsAtAssessment: null };
  }

  // ASSERTED_VALUE
  if (typeof numericValue !== 'number') {
    applicabilityInvalid('ageYearsAtAssessment', 'type');
  }
  if (!Number.isInteger(numericValue) || !Number.isFinite(numericValue)) {
    applicabilityInvalid('ageYearsAtAssessment', 'integer');
  }
  if (Object.is(numericValue, -0) || numericValue < 0 || numericValue > 2147483647) {
    applicabilityInvalid('ageYearsAtAssessment', 'representation');
  }
  return { ageAssertionState, ageYearsAtAssessment: numericValue };
}

export function validatePregnancyStatus(value: unknown): ObservedPregnancyStatus | null {
  if (value === null) return null;
  if (typeof value !== 'string') applicabilityInvalid('pregnancyStatus', 'type');
  if (!['PREGNANT', 'NOT_PREGNANT', 'UNKNOWN'].includes(value)) {
    applicabilityInvalid('pregnancyStatus', 'format');
  }
  return value as ObservedPregnancyStatus;
}

export function validateConditionStatus(
  value: unknown,
  field: 'hypertensionStatus' | 'cvdStatus' | 'diabetesStatus' | 'ckdStatus'
): ObservedConditionStatus | null {
  if (value === null) return null;
  if (typeof value !== 'string') applicabilityInvalid(field, 'type');
  if (!['PRESENT', 'ABSENT', 'UNKNOWN'].includes(value)) {
    applicabilityInvalid(field, 'format');
  }
  return value as ObservedConditionStatus;
}

const SNAPSHOT_INPUT_KEYS = [
  'patientId',
  'sourceType',
  'sourceReference',
  'assertionReference',
  'effectiveAt',
  'assertedAt',
  'ageAssertionState',
  'ageYearsAtAssessment',
  'pregnancyStatus',
  'hypertensionStatus',
  'cvdStatus',
  'diabetesStatus',
  'ckdStatus',
] as const;

export function validateInsertSnapshotInput(rawInput: unknown): {
  patientId: string;
  sourceType: ObservedApplicabilitySourceType;
  sourceReference: string;
  assertionReference: string;
  effectiveAt: Date;
  assertedAt: Date;
  ageAssertionState: ObservedAgeAssertionState;
  ageYearsAtAssessment: number | null;
  pregnancyStatus: ObservedPregnancyStatus | null;
  hypertensionStatus: ObservedConditionStatus | null;
  cvdStatus: ObservedConditionStatus | null;
  diabetesStatus: ObservedConditionStatus | null;
  ckdStatus: ObservedConditionStatus | null;
} {
  exactApplicabilityKeys(rawInput, SNAPSHOT_INPUT_KEYS);

  const patientId = parseApplicabilityUuid(rawInput.patientId, 'patientId');

  if (typeof rawInput.sourceType !== 'string') applicabilityInvalid('sourceType', 'type');
  if (rawInput.sourceType !== 'SYNTHETIC_OBSERVED_INPUT') applicabilityInvalid('sourceType', 'format');
  const sourceType = 'SYNTHETIC_OBSERVED_INPUT' as const;

  const sourceReference = parseApplicabilityReference(rawInput.sourceReference, 'sourceReference');
  const assertionReference = parseApplicabilityReference(rawInput.assertionReference, 'assertionReference');

  const effectiveAt = parseApplicabilityTimestamp(rawInput.effectiveAt, 'effectiveAt');
  const assertedAt = parseApplicabilityTimestamp(rawInput.assertedAt, 'assertedAt');

  if (effectiveAt.getTime() > assertedAt.getTime()) {
    applicabilityInvalid('assertedAt', 'chronology');
  }

  const { ageAssertionState, ageYearsAtAssessment } = validateAgeAssertion(
    rawInput.ageAssertionState,
    rawInput.ageYearsAtAssessment
  );

  const pregnancyStatus = validatePregnancyStatus(rawInput.pregnancyStatus);
  const hypertensionStatus = validateConditionStatus(rawInput.hypertensionStatus, 'hypertensionStatus');
  const cvdStatus = validateConditionStatus(rawInput.cvdStatus, 'cvdStatus');
  const diabetesStatus = validateConditionStatus(rawInput.diabetesStatus, 'diabetesStatus');
  const ckdStatus = validateConditionStatus(rawInput.ckdStatus, 'ckdStatus');

  return {
    patientId,
    sourceType,
    sourceReference,
    assertionReference,
    effectiveAt,
    assertedAt,
    ageAssertionState,
    ageYearsAtAssessment,
    pregnancyStatus,
    hypertensionStatus,
    cvdStatus,
    diabetesStatus,
    ckdStatus,
  };
}

const RETRACTION_INPUT_KEYS = [
  'patientId',
  'snapshotId',
  'sourceType',
  'sourceReference',
  'retractionReference',
  'assertedAt',
  'reasonCode',
] as const;

export function validateRetractSnapshotInput(rawInput: unknown): {
  patientId: string;
  snapshotId: string;
  sourceType: ObservedApplicabilitySourceType;
  sourceReference: string;
  retractionReference: string;
  assertedAt: Date;
  reasonCode: string;
} {
  exactApplicabilityKeys(rawInput, RETRACTION_INPUT_KEYS);

  const patientId = parseApplicabilityUuid(rawInput.patientId, 'patientId');
  const snapshotId = parseApplicabilityUuid(rawInput.snapshotId, 'snapshotId');

  if (typeof rawInput.sourceType !== 'string') applicabilityInvalid('sourceType', 'type');
  if (rawInput.sourceType !== 'SYNTHETIC_OBSERVED_INPUT') applicabilityInvalid('sourceType', 'format');
  const sourceType = 'SYNTHETIC_OBSERVED_INPUT' as const;

  const sourceReference = parseApplicabilityReference(rawInput.sourceReference, 'sourceReference');
  const retractionReference = parseApplicabilityReference(rawInput.retractionReference, 'retractionReference');

  const assertedAt = parseApplicabilityTimestamp(rawInput.assertedAt, 'assertedAt');

  if (typeof rawInput.reasonCode !== 'string') applicabilityInvalid('reasonCode', 'type');
  if (rawInput.reasonCode !== 'SOURCE_ASSERTION_WITHDRAWN') applicabilityInvalid('reasonCode', 'format');
  const reasonCode = 'SOURCE_ASSERTION_WITHDRAWN';

  return {
    patientId,
    snapshotId,
    sourceType,
    sourceReference,
    retractionReference,
    assertedAt,
    reasonCode,
  };
}

const GET_INPUT_KEYS = ['patientId', 'effectiveAt'] as const;

export function validateGetApplicabilityInput(rawInput: unknown): {
  patientId: string;
  effectiveAt: Date;
  effectiveAtCanonicalUtc: string;
} {
  exactApplicabilityKeys(rawInput, GET_INPUT_KEYS);
  const patientId = parseApplicabilityUuid(rawInput.patientId, 'patientId');
  const effectiveAt = parseApplicabilityTimestamp(rawInput.effectiveAt, 'effectiveAt');
  const effectiveAtCanonicalUtc = effectiveAt.toISOString();
  return { patientId, effectiveAt, effectiveAtCanonicalUtc };
}
