import pg from 'pg';
import type { AuthPrincipal } from './auth.js';

export const CARE_JOURNEY_RESOURCE_CLASSES = Object.freeze([
  'PROFILE',
  'SUMMARY',
  'FOLLOW_UP',
  'PRESCRIPTION',
  'BP',
] as const);

export type CareJourneyResourceClass = (typeof CARE_JOURNEY_RESOURCE_CLASSES)[number];

export type CareJourneyAccessDecision = 'OUTSIDE_COHORT' | 'DENY' | 'ELIGIBLE';

export type CareJourneyDenialReason =
  | 'ROLE_NOT_CLINICIAN'
  | 'ACTOR_INACTIVE_OR_INVALID'
  | 'SESSION_INVALID_OR_EXPIRED'
  | 'CLINICIAN_ACTOR_MISMATCH'
  | 'PATIENT_INACTIVE_OR_MISSING'
  | 'JOURNEY_SCOPE_MISMATCH'
  | 'JOURNEY_NOT_FOUND_IN_COHORT'
  | 'COHORT_PAIR_WITHOUT_JOURNEY'
  | 'PURPOSE_MISMATCH'
  | 'ASSIGNMENT_INACTIVE'
  | 'CLINIC_INACTIVE_OR_STATUS_CHANGED'
  | 'MEMBERSHIP_INACTIVE'
  | 'AFFILIATION_WITHDRAWN_OR_MISSING'
  | 'ADMISSION_MISSING'
  | 'ADMISSION_ENDED'
  | 'ADMISSION_EXPIRED'
  | 'ADMISSION_EPOCH_MISMATCH'
  | 'JOURNEY_ENDED'
  | 'JOURNEY_NOT_STARTED'
  | 'JOURNEY_HARD_EXPIRED'
  | 'PRE_CARE_CEILING_REACHED'
  | 'ANCHOR_BINDING_MISSING'
  | 'ANCHOR_BOOKING_INVALID_STATE';

export type CareJourneyDecisionReason =
  | 'ELIGIBLE'
  | 'NOT_IN_CARE_JOURNEY_COHORT'
  | CareJourneyDenialReason;

export type CareJourneySyntheticProjection = {
  resourceClass: CareJourneyResourceClass;
  synthetic: true;
  classification: string;
  journeyId: string;
  scopeVersion: string;
  policyVersion: string;
  fields: readonly string[];
};

export type CareJourneyProjectionContext = {
  journeyId: string;
  patientId: string;
  clinicianId: string;
  organizationId: string;
  admissionId: string;
  scopeVersion: string;
  policyVersion: string;
  purpose: string;
  resourceClass: CareJourneyResourceClass;
  evaluatedAt: Date;
};

export type EvaluateCareJourneyAccessInput<TProjection = CareJourneySyntheticProjection> = {
  actor: Pick<AuthPrincipal, 'userId' | 'sessionId' | 'role'>;
  patientId: string;
  clinicianId: string;
  organizationId: string;
  journeyId?: string | null;
  resourceClass: CareJourneyResourceClass;
  purpose?: string;
  loadProjection?: (context: CareJourneyProjectionContext) => Promise<TProjection> | TProjection;
};

export type CareJourneyAccessResult<TProjection = CareJourneySyntheticProjection> = {
  decision: CareJourneyAccessDecision;
  reason: CareJourneyDecisionReason;
  evaluatedAt: Date | null;
  journeyId: string | null;
  scopeVersion: string | null;
  policyVersion: string | null;
  resourceClass: CareJourneyResourceClass;
  projection: TProjection | null;
};

export type CareJourneySnapshot = {
  dbNow: Date;
  requested: {
    actorUserId: string;
    actorRole: AuthPrincipal['role'];
    sessionId: string;
    patientId: string;
    clinicianId: string;
    organizationId: string;
    journeyId: string | null;
    resourceClass: CareJourneyResourceClass;
    purpose: string;
  };
  actorUser: { id: string; role: string; status: string } | null;
  session: { id: string; userId: string; expiresAt: Date; revokedAt: Date | null } | null;
  clinicianProfile: { id: string; userId: string; userRole: string } | null;
  patientProfile: { id: string; userId: string; userRole: string; userStatus: string } | null;
  assignment: { id: string; status: string; endedAt: Date | null } | null;
  organization: { id: string; kind: string; status: string; statusVersion: number } | null;
  clinicDirectory: { organizationId: string; organizationKind: string } | null;
  membership: {
    id: string;
    userId: string;
    organizationId: string;
    userRole: string;
    organizationKind: string;
    status: string;
    endedAt: Date | null;
  } | null;
  clinicianDirectory: { id: string; clinicianId: string; clinicianUserId: string } | null;
  affiliation: {
    id: string;
    providerId: string;
    membershipId: string;
    organizationId: string;
    clinicianUserId: string;
    withdrawnAt: Date | null;
  } | null;
  pairExists: boolean;
  journeyById: CareJourneyRow | null;
  matchedJourney: CareJourneyRow | null;
  admission: {
    id: string;
    clinicianId: string;
    clinicianUserId: string;
    organizationId: string;
    providerId: string;
    membershipId: string;
    affiliationId: string;
    policyVersion: string;
    purpose: string;
    verificationEpoch: number;
    participationEpoch: number;
    validUntil: Date;
    endedAt: Date | null;
  } | null;
  activeAnchor: {
    id: string;
    journeyId: string;
    bookingId: string;
    bindingKind: string;
    endedAt: Date | null;
    bookingState: string;
  } | null;
};

export type CareJourneyRow = {
  id: string;
  patientId: string;
  patientUserId: string;
  clinicianId: string;
  clinicianUserId: string;
  organizationId: string;
  providerId: string;
  membershipId: string;
  affiliationId: string;
  admissionId: string;
  assignmentId: string;
  scopeVersion: string;
  policyVersion: string;
  purpose: string;
  clinicStatusVersion: number;
  verificationEpoch: number;
  participationEpoch: number;
  startedAt: Date;
  originalPreCareCeilingAt: Date;
  firstCareCompletedAt: Date | null;
  latestQualifiedCloseAt: Date | null;
  hardExpiresAt: Date;
  endedAt: Date | null;
  effectiveCutoffAt: Date | null;
};

export class CareJourneyGuardError extends Error {
  readonly code: 'CJP_GUARD_VALIDATION' | 'CJP_GUARD_UNAVAILABLE';

  constructor(code: 'CJP_GUARD_VALIDATION' | 'CJP_GUARD_UNAVAILABLE', message: string) {
    super(message);
    this.name = 'CareJourneyGuardError';
    this.code = code;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ROLES = new Set<string>(['PATIENT', 'CLINICIAN', 'ADMIN', 'LAB_STAFF', 'PHARMACY_STAFF']);
const VALID_RESOURCE_CLASSES = new Set<string>(CARE_JOURNEY_RESOURCE_CLASSES);
const ALLOWED_INPUT_KEYS = new Set<string>([
  'actor',
  'patientId',
  'clinicianId',
  'organizationId',
  'journeyId',
  'resourceClass',
  'purpose',
  'loadProjection',
]);
const ALLOWED_ACTOR_KEYS = new Set<string>(['userId', 'sessionId', 'role']);
const PURPOSE_RE = /^[A-Z][A-Z0-9_]{1,31}$/;
const ACTIVE_ANCHOR_BOOKING_STATES = new Set<string>(['BOOKED', 'IN_CONSULTATION', 'CONSULTED']);

function hasOwnPlainProperties(value: unknown, allowedKeys: Set<string>): Record<string, PropertyDescriptor> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CareJourneyGuardError('CJP_GUARD_VALIDATION', 'Invalid Care Journey guard input object');
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new CareJourneyGuardError('CJP_GUARD_VALIDATION', 'Unexpected object prototype');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Object.keys(descriptors)) {
    if (!allowedKeys.has(key)) {
      throw new CareJourneyGuardError('CJP_GUARD_VALIDATION', `Unexpected field: ${key}`);
    }
    if (!('value' in descriptors[key])) {
      throw new CareJourneyGuardError('CJP_GUARD_VALIDATION', `Accessor property rejected: ${key}`);
    }
  }
  return descriptors;
}

function assertUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new CareJourneyGuardError('CJP_GUARD_VALIDATION', `Invalid UUID for ${field}`);
  }
  return value.toLowerCase();
}

export type ValidatedCareJourneyAccessInput<TProjection = CareJourneySyntheticProjection> = {
  actorUserId: string;
  actorRole: AuthPrincipal['role'];
  sessionId: string;
  patientId: string;
  clinicianId: string;
  organizationId: string;
  journeyId: string | null;
  resourceClass: CareJourneyResourceClass;
  purpose: string;
  loadProjection?: (context: CareJourneyProjectionContext) => Promise<TProjection> | TProjection;
};

/** Strictly validates shape, UUIDs, role, resource class, and purpose before any SQL executes. */
export function validateCareJourneyAccessInput<TProjection = CareJourneySyntheticProjection>(
  input: EvaluateCareJourneyAccessInput<TProjection>,
): ValidatedCareJourneyAccessInput<TProjection> {
  const top = hasOwnPlainProperties(input, ALLOWED_INPUT_KEYS);
  if (!top.actor) {
    throw new CareJourneyGuardError('CJP_GUARD_VALIDATION', 'Missing actor');
  }
  const actorDesc = hasOwnPlainProperties(top.actor.value, ALLOWED_ACTOR_KEYS);
  const actorUserId = assertUuid(actorDesc.userId?.value, 'actor.userId');
  const sessionId = assertUuid(actorDesc.sessionId?.value, 'actor.sessionId');
  const rawRole = actorDesc.role?.value;
  if (typeof rawRole !== 'string' || !VALID_ROLES.has(rawRole)) {
    throw new CareJourneyGuardError('CJP_GUARD_VALIDATION', 'Invalid actor role');
  }
  const patientId = assertUuid(top.patientId?.value, 'patientId');
  const clinicianId = assertUuid(top.clinicianId?.value, 'clinicianId');
  const organizationId = assertUuid(top.organizationId?.value, 'organizationId');

  let journeyId: string | null = null;
  if (top.journeyId && top.journeyId.value !== undefined && top.journeyId.value !== null) {
    journeyId = assertUuid(top.journeyId.value, 'journeyId');
  }

  const rawClass = top.resourceClass?.value;
  if (typeof rawClass !== 'string' || !VALID_RESOURCE_CLASSES.has(rawClass)) {
    throw new CareJourneyGuardError('CJP_GUARD_VALIDATION', 'Invalid Care Journey resource class');
  }

  let purpose = 'CARE_JOURNEY';
  if (top.purpose && top.purpose.value !== undefined) {
    if (typeof top.purpose.value !== 'string' || !PURPOSE_RE.test(top.purpose.value)) {
      throw new CareJourneyGuardError('CJP_GUARD_VALIDATION', 'Invalid purpose');
    }
    purpose = top.purpose.value;
  }

  let loadProjection: ((context: CareJourneyProjectionContext) => Promise<TProjection> | TProjection) | undefined;
  if (top.loadProjection && top.loadProjection.value !== undefined) {
    if (typeof top.loadProjection.value !== 'function') {
      throw new CareJourneyGuardError('CJP_GUARD_VALIDATION', 'loadProjection must be a function');
    }
    loadProjection = top.loadProjection.value as (context: CareJourneyProjectionContext) => Promise<TProjection> | TProjection;
  }

  return {
    actorUserId,
    actorRole: rawRole as AuthPrincipal['role'],
    sessionId,
    patientId,
    clinicianId,
    organizationId,
    journeyId,
    resourceClass: rawClass as CareJourneyResourceClass,
    purpose,
    loadProjection,
  };
}

/** Deterministic synthetic non-PHI allowlisted 5-class projection for dark guard validation. */
export function projectSyntheticCareJourneyResource(
  resourceClass: CareJourneyResourceClass,
  context: Pick<CareJourneyProjectionContext, 'journeyId' | 'scopeVersion' | 'policyVersion'>,
): CareJourneySyntheticProjection {
  switch (resourceClass) {
    case 'PROFILE':
      return {
        resourceClass,
        synthetic: true,
        classification: 'ALLOWLISTED_PROFILE',
        journeyId: context.journeyId,
        scopeVersion: context.scopeVersion,
        policyVersion: context.policyVersion,
        fields: ['displayHandleSynthetic', 'cohortStatus'],
      };
    case 'SUMMARY':
      return {
        resourceClass,
        synthetic: true,
        classification: 'ALLOWLISTED_SUMMARY',
        journeyId: context.journeyId,
        scopeVersion: context.scopeVersion,
        policyVersion: context.policyVersion,
        fields: ['continuityWindow', 'visitCountSynthetic'],
      };
    case 'FOLLOW_UP':
      return {
        resourceClass,
        synthetic: true,
        classification: 'ALLOWLISTED_FOLLOW_UP',
        journeyId: context.journeyId,
        scopeVersion: context.scopeVersion,
        policyVersion: context.policyVersion,
        fields: ['intentStateSynthetic', 'followUpWindow'],
      };
    case 'PRESCRIPTION':
      return {
        resourceClass,
        synthetic: true,
        classification: 'ALLOWLISTED_PRESCRIPTION',
        journeyId: context.journeyId,
        scopeVersion: context.scopeVersion,
        policyVersion: context.policyVersion,
        fields: ['fulfillmentClassSynthetic', 'restrictedItemsOmitted'],
      };
    case 'BP':
      return {
        resourceClass,
        synthetic: true,
        classification: 'ALLOWLISTED_BP',
        journeyId: context.journeyId,
        scopeVersion: context.scopeVersion,
        policyVersion: context.policyVersion,
        fields: ['observationClassSynthetic', 'seriesCountSynthetic'],
      };
  }
}

function deny(
  reason: CareJourneyDenialReason,
  snapshot: CareJourneySnapshot,
  journey: CareJourneyRow | null = null,
): { decision: 'DENY'; reason: CareJourneyDenialReason; evaluatedAt: Date; journey: CareJourneyRow | null } {
  return {
    decision: 'DENY',
    reason,
    evaluatedAt: snapshot.dbNow,
    journey,
  };
}

/** Pure fail-closed classifier operating on locked DB state and post-wait DB clock_timestamp(). */
export function classifyCareJourneyAccess(snapshot: CareJourneySnapshot): {
  decision: CareJourneyAccessDecision;
  reason: CareJourneyDecisionReason;
  evaluatedAt: Date;
  journey: CareJourneyRow | null;
} {
  const { requested, dbNow } = snapshot;

  if (requested.actorRole !== 'CLINICIAN') {
    return deny('ROLE_NOT_CLINICIAN', snapshot);
  }
  if (!snapshot.actorUser || snapshot.actorUser.id !== requested.actorUserId || snapshot.actorUser.role !== 'CLINICIAN' || snapshot.actorUser.status !== 'ACTIVE') {
    return deny('ACTOR_INACTIVE_OR_INVALID', snapshot);
  }
  if (
    !snapshot.session
    || snapshot.session.id !== requested.sessionId
    || snapshot.session.userId !== requested.actorUserId
    || snapshot.session.revokedAt !== null
    || snapshot.session.expiresAt.getTime() <= dbNow.getTime()
  ) {
    return deny('SESSION_INVALID_OR_EXPIRED', snapshot);
  }
  if (
    !snapshot.clinicianProfile
    || snapshot.clinicianProfile.id !== requested.clinicianId
    || snapshot.clinicianProfile.userId !== requested.actorUserId
    || snapshot.clinicianProfile.userRole !== 'CLINICIAN'
  ) {
    return deny('CLINICIAN_ACTOR_MISMATCH', snapshot);
  }
  if (
    !snapshot.patientProfile
    || snapshot.patientProfile.id !== requested.patientId
    || snapshot.patientProfile.userRole !== 'PATIENT'
    || snapshot.patientProfile.userStatus !== 'ACTIVE'
  ) {
    return deny('PATIENT_INACTIVE_OR_MISSING', snapshot);
  }

  // #189 OUTSIDE_COHORT vs DENY rule:
  // If journeyId exists in care_journeys for ANY different scope, return DENY (never OUTSIDE_COHORT).
  if (requested.journeyId !== null && snapshot.journeyById !== null) {
    const j = snapshot.journeyById;
    if (
      j.patientId !== requested.patientId
      || j.clinicianId !== requested.clinicianId
      || j.organizationId !== requested.organizationId
    ) {
      return deny('JOURNEY_SCOPE_MISMATCH', snapshot);
    }
  }

  const journey = requested.journeyId !== null ? snapshot.journeyById : snapshot.matchedJourney;

  if (!journey) {
    if (snapshot.pairExists) {
      return deny(requested.journeyId !== null ? 'JOURNEY_NOT_FOUND_IN_COHORT' : 'COHORT_PAIR_WITHOUT_JOURNEY', snapshot);
    }
    return {
      decision: 'OUTSIDE_COHORT',
      reason: 'NOT_IN_CARE_JOURNEY_COHORT',
      evaluatedAt: dbNow,
      journey: null,
    };
  }

  if (
    journey.patientId !== requested.patientId
    || journey.patientUserId !== snapshot.patientProfile.userId
    || journey.clinicianId !== requested.clinicianId
    || journey.clinicianUserId !== requested.actorUserId
    || journey.organizationId !== requested.organizationId
  ) {
    return deny('JOURNEY_SCOPE_MISMATCH', snapshot, journey);
  }

  if (journey.purpose !== requested.purpose) {
    return deny('PURPOSE_MISMATCH', snapshot, journey);
  }

  if (!snapshot.assignment || snapshot.assignment.id !== journey.assignmentId || snapshot.assignment.status !== 'ACTIVE' || snapshot.assignment.endedAt !== null) {
    return deny('ASSIGNMENT_INACTIVE', snapshot, journey);
  }

  if (
    !snapshot.organization
    || snapshot.organization.id !== journey.organizationId
    || snapshot.organization.kind !== 'CLINIC'
    || snapshot.organization.status !== 'ACTIVE'
    || snapshot.organization.statusVersion !== journey.clinicStatusVersion
    || !snapshot.clinicDirectory
    || snapshot.clinicDirectory.organizationId !== journey.organizationId
    || snapshot.clinicDirectory.organizationKind !== 'CLINIC'
  ) {
    return deny('CLINIC_INACTIVE_OR_STATUS_CHANGED', snapshot, journey);
  }

  if (
    !snapshot.membership
    || snapshot.membership.id !== journey.membershipId
    || snapshot.membership.userId !== journey.clinicianUserId
    || snapshot.membership.organizationId !== journey.organizationId
    || snapshot.membership.userRole !== 'CLINICIAN'
    || snapshot.membership.organizationKind !== 'CLINIC'
    || snapshot.membership.status !== 'ACTIVE'
    || snapshot.membership.endedAt !== null
  ) {
    return deny('MEMBERSHIP_INACTIVE', snapshot, journey);
  }

  if (
    !snapshot.clinicianDirectory
    || snapshot.clinicianDirectory.id !== journey.providerId
    || snapshot.clinicianDirectory.clinicianId !== journey.clinicianId
    || snapshot.clinicianDirectory.clinicianUserId !== journey.clinicianUserId
    || !snapshot.affiliation
    || snapshot.affiliation.id !== journey.affiliationId
    || snapshot.affiliation.providerId !== journey.providerId
    || snapshot.affiliation.membershipId !== journey.membershipId
    || snapshot.affiliation.organizationId !== journey.organizationId
    || snapshot.affiliation.clinicianUserId !== journey.clinicianUserId
    || snapshot.affiliation.withdrawnAt !== null
  ) {
    return deny('AFFILIATION_WITHDRAWN_OR_MISSING', snapshot, journey);
  }

  if (!snapshot.admission || snapshot.admission.id !== journey.admissionId) {
    return deny('ADMISSION_MISSING', snapshot, journey);
  }
  if (snapshot.admission.endedAt !== null) {
    return deny('ADMISSION_ENDED', snapshot, journey);
  }
  if (dbNow.getTime() >= snapshot.admission.validUntil.getTime()) {
    return deny('ADMISSION_EXPIRED', snapshot, journey);
  }
  if (
    snapshot.admission.clinicianId !== journey.clinicianId
    || snapshot.admission.clinicianUserId !== journey.clinicianUserId
    || snapshot.admission.organizationId !== journey.organizationId
    || snapshot.admission.providerId !== journey.providerId
    || snapshot.admission.membershipId !== journey.membershipId
    || snapshot.admission.affiliationId !== journey.affiliationId
    || snapshot.admission.policyVersion !== journey.policyVersion
    || snapshot.admission.purpose !== journey.purpose
    || snapshot.admission.verificationEpoch !== journey.verificationEpoch
    || snapshot.admission.participationEpoch !== journey.participationEpoch
  ) {
    return deny('ADMISSION_EPOCH_MISMATCH', snapshot, journey);
  }

  if (journey.endedAt !== null || journey.effectiveCutoffAt !== null) {
    return deny('JOURNEY_ENDED', snapshot, journey);
  }
  if (dbNow.getTime() < journey.startedAt.getTime()) {
    return deny('JOURNEY_NOT_STARTED', snapshot, journey);
  }
  if (dbNow.getTime() >= journey.hardExpiresAt.getTime()) {
    return deny('JOURNEY_HARD_EXPIRED', snapshot, journey);
  }
  if (journey.firstCareCompletedAt === null && dbNow.getTime() >= journey.originalPreCareCeilingAt.getTime()) {
    return deny('PRE_CARE_CEILING_REACHED', snapshot, journey);
  }

  if (
    !snapshot.activeAnchor
    || snapshot.activeAnchor.journeyId !== journey.id
    || snapshot.activeAnchor.bindingKind !== 'ANCHOR'
    || snapshot.activeAnchor.endedAt !== null
  ) {
    return deny('ANCHOR_BINDING_MISSING', snapshot, journey);
  }
  if (!ACTIVE_ANCHOR_BOOKING_STATES.has(snapshot.activeAnchor.bookingState)) {
    return deny('ANCHOR_BOOKING_INVALID_STATE', snapshot, journey);
  }

  return {
    decision: 'ELIGIBLE',
    reason: 'ELIGIBLE',
    evaluatedAt: dbNow,
    journey,
  };
}

type DbJourneyRow = {
  id: string;
  patient_id: string;
  patient_user_id: string;
  clinician_id: string;
  clinician_user_id: string;
  organization_id: string;
  provider_id: string;
  membership_id: string;
  affiliation_id: string;
  admission_id: string;
  assignment_id: string;
  scope_version: string;
  policy_version: string;
  purpose: string;
  clinic_status_version: number;
  verification_epoch: number;
  participation_epoch: number;
  started_at: Date;
  original_pre_care_ceiling_at: Date;
  first_care_completed_at: Date | null;
  latest_qualified_close_at: Date | null;
  hard_expires_at: Date;
  ended_at: Date | null;
  effective_cutoff_at: Date | null;
};

function mapJourneyRow(row: DbJourneyRow): CareJourneyRow {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientUserId: row.patient_user_id,
    clinicianId: row.clinician_id,
    clinicianUserId: row.clinician_user_id,
    organizationId: row.organization_id,
    providerId: row.provider_id,
    membershipId: row.membership_id,
    affiliationId: row.affiliation_id,
    admissionId: row.admission_id,
    assignmentId: row.assignment_id,
    scopeVersion: row.scope_version,
    policyVersion: row.policy_version,
    purpose: row.purpose,
    clinicStatusVersion: row.clinic_status_version,
    verificationEpoch: row.verification_epoch,
    participationEpoch: row.participation_epoch,
    startedAt: new Date(row.started_at),
    originalPreCareCeilingAt: new Date(row.original_pre_care_ceiling_at),
    firstCareCompletedAt: row.first_care_completed_at ? new Date(row.first_care_completed_at) : null,
    latestQualifiedCloseAt: row.latest_qualified_close_at ? new Date(row.latest_qualified_close_at) : null,
    hardExpiresAt: new Date(row.hard_expires_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    effectiveCutoffAt: row.effective_cutoff_at ? new Date(row.effective_cutoff_at) : null,
  };
}

/**
 * Evaluates dark Care Journey read eligibility inside a single READ COMMITTED PG transaction
 * using I1/I2-ordered locks and post-wait clock_timestamp() cutoff verification.
 * Projection loader is never invoked unless decision === 'ELIGIBLE'.
 */
export async function evaluateCareJourneyReadAccess<TProjection = CareJourneySyntheticProjection>(
  tx: pg.PoolClient,
  input: EvaluateCareJourneyAccessInput<TProjection>,
): Promise<CareJourneyAccessResult<TProjection>> {
  const req = validateCareJourneyAccessInput(input);

  if (req.actorRole !== 'CLINICIAN') {
    return {
      decision: 'DENY',
      reason: 'ROLE_NOT_CLINICIAN',
      evaluatedAt: null,
      journeyId: null,
      scopeVersion: null,
      policyVersion: null,
      resourceClass: req.resourceClass,
      projection: null,
    };
  }

  // Canonical M1/I1/I2 lock order.
  await tx.query('LOCK TABLE public.users, public.patient_profiles, public.clinician_profiles, public.clinician_patient_assignments IN ROW EXCLUSIVE MODE');

  const usersRes = await tx.query<{ id: string; role: string; status: string }>(
    `SELECT id, role, status
     FROM public.users
     WHERE id = $1
        OR id = (SELECT user_id FROM public.patient_profiles WHERE id = $2)
     ORDER BY id
     FOR NO KEY UPDATE`,
    [req.actorUserId, req.patientId],
  );
  const actorUser = usersRes.rows.find(u => u.id === req.actorUserId) ?? null;

  const sessionRes = await tx.query<{ id: string; user_id: string; expires_at: Date; revoked_at: Date | null }>(
    `SELECT id, user_id, expires_at, revoked_at
     FROM public.sessions
     WHERE id = $1
     FOR UPDATE`,
    [req.sessionId],
  );
  const sessionRow = sessionRes.rows[0] ?? null;

  const patientRes = await tx.query<{ id: string; user_id: string; user_role: string }>(
    `SELECT id, user_id, user_role
     FROM public.patient_profiles
     WHERE id = $1
     FOR SHARE`,
    [req.patientId],
  );
  const patientRow = patientRes.rows[0] ?? null;
  const patientUser = patientRow ? (usersRes.rows.find(u => u.id === patientRow.user_id) ?? null) : null;

  const clinicianRes = await tx.query<{ id: string; user_id: string; user_role: string }>(
    `SELECT id, user_id, user_role
     FROM public.clinician_profiles
     WHERE id = $1
     FOR SHARE`,
    [req.clinicianId],
  );
  const clinicianRow = clinicianRes.rows[0] ?? null;

  const assignmentRows = (
    await tx.query<{ id: string; status: string; ended_at: Date | null }>(
      `SELECT id, status, ended_at
       FROM public.clinician_patient_assignments
       WHERE clinician_id = $1 AND patient_id = $2
       ORDER BY id
       FOR SHARE`,
      [req.clinicianId, req.patientId],
    )
  ).rows;

  // Discover candidate directory/org/membership/affiliation IDs before locking in canonical I1 order.
  const scopeDiscovery = (
    await tx.query<{
      specialty_id: string | null;
      organization_id: string | null;
      membership_id: string | null;
      provider_id: string | null;
      affiliation_id: string | null;
    }>(
      `SELECT DISTINCT specialty_id, organization_id, membership_id, provider_id, affiliation_id
       FROM (
         SELECT p.specialty_id, a.organization_id, a.membership_id, p.id AS provider_id, a.id AS affiliation_id
         FROM public.clinician_directory p
         LEFT JOIN public.directory_affiliations a
           ON a.provider_id = p.id AND a.organization_id = $2
         WHERE p.clinician_id = $1
         UNION ALL
         SELECT NULL::uuid, m.organization_id, m.id, NULL::uuid, NULL::uuid
         FROM public.organization_memberships m
         WHERE m.user_id = $3 AND m.organization_id = $2
         UNION ALL
         SELECT NULL::uuid, j.organization_id, j.membership_id, j.provider_id, j.affiliation_id
         FROM public.care_journeys j
         WHERE ($4::uuid IS NOT NULL AND j.id = $4)
            OR (j.patient_id = $5 AND j.clinician_id = $1 AND j.organization_id = $2)
       ) candidates`,
      [req.clinicianId, req.organizationId, req.actorUserId, req.journeyId, req.patientId],
    )
  ).rows;

  const specialtyIds = [...new Set(scopeDiscovery.map(r => r.specialty_id).filter((v): v is string => v !== null))].sort();
  const orgIds = [...new Set([req.organizationId, ...scopeDiscovery.map(r => r.organization_id).filter((v): v is string => v !== null)])].sort();
  const membershipIds = [...new Set(scopeDiscovery.map(r => r.membership_id).filter((v): v is string => v !== null))].sort();
  const providerIds = [...new Set(scopeDiscovery.map(r => r.provider_id).filter((v): v is string => v !== null))].sort();
  const affiliationIds = [...new Set(scopeDiscovery.map(r => r.affiliation_id).filter((v): v is string => v !== null))].sort();

  if (specialtyIds.length > 0) {
    await tx.query('SELECT id FROM public.specialties WHERE id = ANY($1::uuid[]) ORDER BY id FOR SHARE', [specialtyIds]);
  }
  const orgRows = (
    await tx.query<{ id: string; kind: string; status: string; status_version: number }>(
      'SELECT id, kind, status, status_version FROM public.organizations WHERE id = ANY($1::uuid[]) ORDER BY id FOR SHARE',
      [orgIds],
    )
  ).rows;
  const clinicDirRows = (
    await tx.query<{ organization_id: string; organization_kind: string }>(
      'SELECT organization_id, organization_kind FROM public.clinic_directory WHERE organization_id = ANY($1::uuid[]) ORDER BY id FOR SHARE',
      [orgIds],
    )
  ).rows;
  const membershipRows = membershipIds.length > 0
    ? (
        await tx.query<{
          id: string;
          user_id: string;
          organization_id: string;
          user_role: string;
          organization_kind: string;
          status: string;
          ended_at: Date | null;
        }>(
          `SELECT id, user_id, organization_id, user_role, organization_kind, status, ended_at
           FROM public.organization_memberships
           WHERE id = ANY($1::uuid[])
           ORDER BY id
           FOR SHARE`,
          [membershipIds],
        )
      ).rows
    : [];
  const clinicianDirRows = providerIds.length > 0
    ? (
        await tx.query<{ id: string; clinician_id: string; clinician_user_id: string }>(
          `SELECT id, clinician_id, clinician_user_id
           FROM public.clinician_directory
           WHERE id = ANY($1::uuid[])
           ORDER BY id
           FOR SHARE`,
          [providerIds],
        )
      ).rows
    : [];
  const affiliationRows = affiliationIds.length > 0
    ? (
        await tx.query<{
          id: string;
          provider_id: string;
          membership_id: string;
          organization_id: string;
          clinician_user_id: string;
          withdrawn_at: Date | null;
        }>(
          `SELECT id, provider_id, membership_id, organization_id, clinician_user_id, withdrawn_at
           FROM public.directory_affiliations
           WHERE id = ANY($1::uuid[])
           ORDER BY id
           FOR SHARE`,
          [affiliationIds],
        )
      ).rows
    : [];

  // Advisory locks in canonical I1/I2 order: patient (1162359376) -> clinician (1162359363).
  await tx.query('SELECT pg_advisory_xact_lock(1162359376, hashtext($1))', [req.patientId]);
  await tx.query('SELECT pg_advisory_xact_lock(1162359363, hashtext($1))', [req.clinicianId]);

  // Sidecar locks in fixed deterministic order.
  const pairRes = await tx.query<{ patient_id: string }>(
    `SELECT patient_id
     FROM public.care_journey_pairs
     WHERE patient_id = $1 AND clinician_id = $2
     FOR SHARE`,
    [req.patientId, req.clinicianId],
  );
  const pairExists = pairRes.rows.length === 1;

  const journeyRows = (
    await tx.query<DbJourneyRow>(
      `SELECT id, patient_id, patient_user_id, clinician_id, clinician_user_id, organization_id,
              provider_id, membership_id, affiliation_id, admission_id, assignment_id,
              scope_version, policy_version, purpose, clinic_status_version,
              verification_epoch, participation_epoch,
              started_at, original_pre_care_ceiling_at, first_care_completed_at,
              latest_qualified_close_at, hard_expires_at, ended_at, effective_cutoff_at
       FROM public.care_journeys
       WHERE ($1::uuid IS NOT NULL AND id = $1)
          OR (patient_id = $2 AND clinician_id = $3)
       ORDER BY id
       FOR SHARE`,
      [req.journeyId, req.patientId, req.clinicianId],
    )
  ).rows.map(mapJourneyRow);

  const admissionIds = [...new Set(journeyRows.map(j => j.admissionId))].sort();
  const admissionRows = (
    await tx.query<{
      id: string;
      clinician_id: string;
      clinician_user_id: string;
      organization_id: string;
      provider_id: string;
      membership_id: string;
      affiliation_id: string;
      policy_version: string;
      purpose: string;
      verification_epoch: number;
      participation_epoch: number;
      valid_until: Date;
      ended_at: Date | null;
    }>(
      `SELECT id, clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id,
              policy_version, purpose, verification_epoch, participation_epoch, valid_until, ended_at
       FROM public.care_journey_clinic_admissions
       WHERE id = ANY($1::uuid[])
          OR (clinician_id = $2 AND organization_id = $3)
       ORDER BY id
       FOR SHARE`,
      [admissionIds, req.clinicianId, req.organizationId],
    )
  ).rows;

  const journeyIds = journeyRows.map(j => j.id).sort();
  const bindingRows = journeyIds.length > 0
    ? (
        await tx.query<{
          id: string;
          journey_id: string;
          booking_id: string;
          binding_kind: string;
          ended_at: Date | null;
        }>(
          `SELECT id, journey_id, booking_id, binding_kind, ended_at
           FROM public.care_journey_bookings
           WHERE journey_id = ANY($1::uuid[])
           ORDER BY id
           FOR SHARE`,
          [journeyIds],
        )
      ).rows
    : [];

  const bookingIds = [...new Set(bindingRows.map(b => b.booking_id))].sort();
  const bookingRows = bookingIds.length > 0
    ? (
        await tx.query<{ id: string; state: string }>(
          `SELECT id, state
           FROM public.bookings
           WHERE id = ANY($1::uuid[])
           ORDER BY id
           FOR SHARE`,
          [bookingIds],
        )
      ).rows
    : [];

  // Sample authoritative DB clock strictly AFTER all locks and waits complete.
  const dbNow = new Date((await tx.query<{ db_now: Date }>('SELECT clock_timestamp()::timestamptz(3) AS db_now')).rows[0].db_now);

  const journeyById = req.journeyId ? (journeyRows.find(j => j.id === req.journeyId) ?? null) : null;
  const scopedJourneys = journeyRows.filter(
    j => j.patientId === req.patientId && j.clinicianId === req.clinicianId && j.organizationId === req.organizationId,
  );
  const matchedJourney = req.journeyId
    ? journeyById
    : (scopedJourneys.find(j => j.endedAt === null) ?? scopedJourneys[0] ?? null);

  const targetJourney = matchedJourney;
  const assignment = targetJourney
    ? (assignmentRows.find(a => a.id === targetJourney.assignmentId) ?? null)
    : (assignmentRows.find(a => a.status === 'ACTIVE' && a.ended_at === null) ?? assignmentRows[0] ?? null);
  const organization = orgRows.find(o => o.id === req.organizationId) ?? null;
  const clinicDirectory = clinicDirRows.find(c => c.organization_id === req.organizationId) ?? null;
  const membership = targetJourney
    ? (membershipRows.find(m => m.id === targetJourney.membershipId) ?? null)
    : null;
  const clinicianDirectory = targetJourney
    ? (clinicianDirRows.find(cd => cd.id === targetJourney.providerId) ?? null)
    : null;
  const affiliation = targetJourney
    ? (affiliationRows.find(af => af.id === targetJourney.affiliationId) ?? null)
    : null;
  const admissionRow = targetJourney
    ? (admissionRows.find(ad => ad.id === targetJourney.admissionId) ?? null)
    : null;
  const anchorBinding = targetJourney
    ? (bindingRows.find(b => b.journey_id === targetJourney.id && b.binding_kind === 'ANCHOR' && b.ended_at === null) ?? null)
    : null;
  const anchorBooking = anchorBinding
    ? (bookingRows.find(bk => bk.id === anchorBinding.booking_id) ?? null)
    : null;

  const outcome = classifyCareJourneyAccess({
    dbNow,
    requested: {
      actorUserId: req.actorUserId,
      actorRole: req.actorRole,
      sessionId: req.sessionId,
      patientId: req.patientId,
      clinicianId: req.clinicianId,
      organizationId: req.organizationId,
      journeyId: req.journeyId,
      resourceClass: req.resourceClass,
      purpose: req.purpose,
    },
    actorUser: actorUser ? { id: actorUser.id, role: actorUser.role, status: actorUser.status } : null,
    session: sessionRow
      ? {
          id: sessionRow.id,
          userId: sessionRow.user_id,
          expiresAt: new Date(sessionRow.expires_at),
          revokedAt: sessionRow.revoked_at ? new Date(sessionRow.revoked_at) : null,
        }
      : null,
    clinicianProfile: clinicianRow
      ? { id: clinicianRow.id, userId: clinicianRow.user_id, userRole: clinicianRow.user_role }
      : null,
    patientProfile: patientRow && patientUser
      ? {
          id: patientRow.id,
          userId: patientRow.user_id,
          userRole: patientRow.user_role,
          userStatus: patientUser.status,
        }
      : null,
    assignment: assignment
      ? {
          id: assignment.id,
          status: assignment.status,
          endedAt: assignment.ended_at ? new Date(assignment.ended_at) : null,
        }
      : null,
    organization: organization
      ? {
          id: organization.id,
          kind: organization.kind,
          status: organization.status,
          statusVersion: organization.status_version,
        }
      : null,
    clinicDirectory: clinicDirectory
      ? { organizationId: clinicDirectory.organization_id, organizationKind: clinicDirectory.organization_kind }
      : null,
    membership: membership
      ? {
          id: membership.id,
          userId: membership.user_id,
          organizationId: membership.organization_id,
          userRole: membership.user_role,
          organizationKind: membership.organization_kind,
          status: membership.status,
          endedAt: membership.ended_at ? new Date(membership.ended_at) : null,
        }
      : null,
    clinicianDirectory: clinicianDirectory
      ? {
          id: clinicianDirectory.id,
          clinicianId: clinicianDirectory.clinician_id,
          clinicianUserId: clinicianDirectory.clinician_user_id,
        }
      : null,
    affiliation: affiliation
      ? {
          id: affiliation.id,
          providerId: affiliation.provider_id,
          membershipId: affiliation.membership_id,
          organizationId: affiliation.organization_id,
          clinicianUserId: affiliation.clinician_user_id,
          withdrawnAt: affiliation.withdrawn_at ? new Date(affiliation.withdrawn_at) : null,
        }
      : null,
    pairExists,
    journeyById,
    matchedJourney,
    admission: admissionRow
      ? {
          id: admissionRow.id,
          clinicianId: admissionRow.clinician_id,
          clinicianUserId: admissionRow.clinician_user_id,
          organizationId: admissionRow.organization_id,
          providerId: admissionRow.provider_id,
          membershipId: admissionRow.membership_id,
          affiliationId: admissionRow.affiliation_id,
          policyVersion: admissionRow.policy_version,
          purpose: admissionRow.purpose,
          verificationEpoch: admissionRow.verification_epoch,
          participationEpoch: admissionRow.participation_epoch,
          validUntil: new Date(admissionRow.valid_until),
          endedAt: admissionRow.ended_at ? new Date(admissionRow.ended_at) : null,
        }
      : null,
    activeAnchor: anchorBinding && anchorBooking
      ? {
          id: anchorBinding.id,
          journeyId: anchorBinding.journey_id,
          bookingId: anchorBinding.booking_id,
          bindingKind: anchorBinding.binding_kind,
          endedAt: anchorBinding.ended_at ? new Date(anchorBinding.ended_at) : null,
          bookingState: anchorBooking.state,
        }
      : null,
  });

  if (outcome.decision !== 'ELIGIBLE' || !outcome.journey) {
    return {
      decision: outcome.decision,
      reason: outcome.reason,
      evaluatedAt: outcome.evaluatedAt,
      journeyId: outcome.journey ? outcome.journey.id : null,
      scopeVersion: outcome.journey ? outcome.journey.scopeVersion : null,
      policyVersion: outcome.journey ? outcome.journey.policyVersion : null,
      resourceClass: req.resourceClass,
      projection: null,
    };
  }

  const projectionContext: CareJourneyProjectionContext = {
    journeyId: outcome.journey.id,
    patientId: outcome.journey.patientId,
    clinicianId: outcome.journey.clinicianId,
    organizationId: outcome.journey.organizationId,
    admissionId: outcome.journey.admissionId,
    scopeVersion: outcome.journey.scopeVersion,
    policyVersion: outcome.journey.policyVersion,
    purpose: outcome.journey.purpose,
    resourceClass: req.resourceClass,
    evaluatedAt: outcome.evaluatedAt,
  };

  const projection = req.loadProjection
    ? await req.loadProjection(projectionContext)
    : (projectSyntheticCareJourneyResource(req.resourceClass, projectionContext) as unknown as TProjection);

  return {
    decision: 'ELIGIBLE',
    reason: 'ELIGIBLE',
    evaluatedAt: outcome.evaluatedAt,
    journeyId: outcome.journey.id,
    scopeVersion: outcome.journey.scopeVersion,
    policyVersion: outcome.journey.policyVersion,
    resourceClass: req.resourceClass,
    projection,
  };
}

/** Internal dark Care Journey guard persistence; intentionally excluded from packages/db public barrel exports. */
export function createCareJourneyGuardPersistence(connectionString: string | undefined) {
  if (!connectionString) {
    throw new CareJourneyGuardError('CJP_GUARD_UNAVAILABLE', 'DATABASE_URL is required');
  }
  const pool = new pg.Pool({
    connectionString,
    max: 4,
    connectionTimeoutMillis: 5000,
    lock_timeout: 5000,
    statement_timeout: 10000,
  });
  pool.on('error', () => {});

  return {
    async evaluateReadAccess<TProjection = CareJourneySyntheticProjection>(
      input: EvaluateCareJourneyAccessInput<TProjection>,
    ): Promise<CareJourneyAccessResult<TProjection>> {
      const validated = validateCareJourneyAccessInput(input);
      if (validated.actorRole !== 'CLINICIAN') {
        return {
          decision: 'DENY',
          reason: 'ROLE_NOT_CLINICIAN',
          evaluatedAt: null,
          journeyId: null,
          scopeVersion: null,
          policyVersion: null,
          resourceClass: validated.resourceClass,
          projection: null,
        };
      }

      let tx: pg.PoolClient | undefined;
      try {
        tx = await pool.connect();
        await tx.query('BEGIN');
        await tx.query("SET LOCAL transaction_timeout='30s'");
        await tx.query("SET LOCAL lock_timeout='5s'");
        await tx.query("SET LOCAL statement_timeout='10s'");
        const result = await evaluateCareJourneyReadAccess(tx, input);
        await tx.query('COMMIT');
        return result;
      } catch (err) {
        if (tx) {
          await tx.query('ROLLBACK').catch(() => {});
        }
        if (err instanceof CareJourneyGuardError) {
          throw err;
        }
        throw new CareJourneyGuardError('CJP_GUARD_UNAVAILABLE', 'Care Journey read guard unavailable');
      } finally {
        tx?.release();
      }
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}
