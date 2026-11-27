import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as dbIndex from '../packages/db/dist/index.js';
import {
  CARE_JOURNEY_RESOURCE_CLASSES,
  CareJourneyGuardError,
  classifyCareJourneyAccess,
  createCareJourneyGuardPersistence,
  evaluateCareJourneyReadAccess,
  projectSyntheticCareJourneyResource,
  validateCareJourneyAccessInput,
} from '../packages/db/dist/care-journey-guard.js';

function makeIds() {
  return {
    actorUserId: randomUUID(),
    sessionId: randomUUID(),
    patientId: randomUUID(),
    patientUserId: randomUUID(),
    clinicianId: randomUUID(),
    organizationId: randomUUID(),
    providerId: randomUUID(),
    membershipId: randomUUID(),
    affiliationId: randomUUID(),
    admissionId: randomUUID(),
    assignmentId: randomUUID(),
    journeyId: randomUUID(),
    bindingId: randomUUID(),
    bookingId: randomUUID(),
  };
}

function makeEligibleSnapshot(overrides = {}, base = null) {
  if (base) {
    return { ...base, ...overrides };
  }
  const ids = makeIds();
  const dbNow = new Date('2026-11-27T12:00:00.000Z');
  const startedAt = new Date('2026-11-27T10:00:00.000Z');
  const preCareCeiling = new Date('2026-11-27T14:00:00.000Z');
  const hardExpiresAt = new Date('2027-11-27T10:00:00.000Z');

  const baseJourney = {
    id: ids.journeyId,
    patientId: ids.patientId,
    patientUserId: ids.patientUserId,
    clinicianId: ids.clinicianId,
    clinicianUserId: ids.actorUserId,
    organizationId: ids.organizationId,
    providerId: ids.providerId,
    membershipId: ids.membershipId,
    affiliationId: ids.affiliationId,
    admissionId: ids.admissionId,
    assignmentId: ids.assignmentId,
    scopeVersion: 'cjp-scope.v1',
    policyVersion: 'cjp-policy.v1',
    purpose: 'CARE_JOURNEY',
    clinicStatusVersion: 1,
    verificationEpoch: 1,
    participationEpoch: 1,
    startedAt,
    originalPreCareCeilingAt: preCareCeiling,
    firstCareCompletedAt: null,
    latestQualifiedCloseAt: null,
    hardExpiresAt,
    endedAt: null,
    effectiveCutoffAt: null,
  };

  return {
    dbNow,
    requested: {
      actorUserId: ids.actorUserId,
      actorRole: 'CLINICIAN',
      sessionId: ids.sessionId,
      patientId: ids.patientId,
      clinicianId: ids.clinicianId,
      organizationId: ids.organizationId,
      journeyId: ids.journeyId,
      resourceClass: 'SUMMARY',
      purpose: 'CARE_JOURNEY',
    },
    actorUser: { id: ids.actorUserId, role: 'CLINICIAN', status: 'ACTIVE' },
    session: {
      id: ids.sessionId,
      userId: ids.actorUserId,
      expiresAt: new Date('2026-11-27T18:00:00.000Z'),
      revokedAt: null,
    },
    clinicianProfile: { id: ids.clinicianId, userId: ids.actorUserId, userRole: 'CLINICIAN' },
    patientProfile: {
      id: ids.patientId,
      userId: ids.patientUserId,
      userRole: 'PATIENT',
      userStatus: 'ACTIVE',
    },
    assignment: { id: ids.assignmentId, status: 'ACTIVE', endedAt: null },
    organization: { id: ids.organizationId, kind: 'CLINIC', status: 'ACTIVE', statusVersion: 1 },
    clinicDirectory: { organizationId: ids.organizationId, organizationKind: 'CLINIC' },
    membership: {
      id: ids.membershipId,
      userId: ids.actorUserId,
      organizationId: ids.organizationId,
      userRole: 'CLINICIAN',
      organizationKind: 'CLINIC',
      status: 'ACTIVE',
      endedAt: null,
    },
    clinicianDirectory: { id: ids.providerId, clinicianId: ids.clinicianId, clinicianUserId: ids.actorUserId },
    affiliation: {
      id: ids.affiliationId,
      providerId: ids.providerId,
      membershipId: ids.membershipId,
      organizationId: ids.organizationId,
      clinicianUserId: ids.actorUserId,
      withdrawnAt: null,
    },
    pairExists: true,
    journeyById: baseJourney,
    matchedJourney: baseJourney,
    admission: {
      id: ids.admissionId,
      clinicianId: ids.clinicianId,
      clinicianUserId: ids.actorUserId,
      organizationId: ids.organizationId,
      providerId: ids.providerId,
      membershipId: ids.membershipId,
      affiliationId: ids.affiliationId,
      policyVersion: 'cjp-policy.v1',
      purpose: 'CARE_JOURNEY',
      verificationEpoch: 1,
      participationEpoch: 1,
      validUntil: new Date('2027-06-01T00:00:00.000Z'),
      endedAt: null,
    },
    activeAnchor: {
      id: ids.bindingId,
      journeyId: ids.journeyId,
      bookingId: ids.bookingId,
      bindingKind: 'ANCHOR',
      endedAt: null,
      bookingState: 'BOOKED',
    },
    ...overrides,
  };
}

test('Stage B2 dark guard remains completely excluded from packages/db barrel exports', () => {
  const exportedKeys = Object.keys(dbIndex);
  assert.equal(exportedKeys.some(k => /careJourney|CareJourney|CJP/i.test(k)), false);
  assert.throws(
    () => createCareJourneyGuardPersistence(undefined),
    err => err instanceof CareJourneyGuardError && err.code === 'CJP_GUARD_UNAVAILABLE',
  );
});

test('validateCareJourneyAccessInput enforces strict shape, UUIDs, roles, resource classes, and purpose before SQL', async () => {
  const valid = {
    actor: { userId: randomUUID(), sessionId: randomUUID(), role: 'CLINICIAN' },
    patientId: randomUUID(),
    clinicianId: randomUUID(),
    organizationId: randomUUID(),
    journeyId: randomUUID(),
    resourceClass: 'PROFILE',
  };
  const parsed = validateCareJourneyAccessInput(valid);
  assert.equal(parsed.purpose, 'CARE_JOURNEY');
  assert.equal(parsed.resourceClass, 'PROFILE');

  for (const rc of CARE_JOURNEY_RESOURCE_CLASSES) {
    assert.equal(validateCareJourneyAccessInput({ ...valid, resourceClass: rc }).resourceClass, rc);
  }

  class NonPlainInput {}
  const getterObj = { ...valid };
  Object.defineProperty(getterObj, 'purpose', { enumerable: true, get: () => 'CARE_JOURNEY' });

  const invalidCases = [
    null,
    [],
    new NonPlainInput(),
    getterObj,
    { ...valid, extraField: true },
    { ...valid, actor: null },
    { ...valid, actor: { ...valid.actor, extra: 1 } },
    { ...valid, actor: { ...valid.actor, userId: 'not-a-uuid' } },
    { ...valid, actor: { ...valid.actor, sessionId: 'bad' } },
    { ...valid, actor: { ...valid.actor, role: 'SUPERUSER' } },
    { ...valid, patientId: 'bad' },
    { ...valid, clinicianId: '1234' },
    { ...valid, organizationId: '' },
    { ...valid, journeyId: 'not-a-uuid' },
    { ...valid, resourceClass: 'LAB_ORDER' },
    { ...valid, purpose: 'invalid lower' },
    { ...valid, loadProjection: 'not-fn' },
  ];

  for (const bad of invalidCases) {
    assert.throws(
      () => validateCareJourneyAccessInput(bad),
      err => err instanceof CareJourneyGuardError && err.code === 'CJP_GUARD_VALIDATION',
    );
  }

  // Non-CLINICIAN roles fail closed cleanly before touching any SQL client or invoking loader.
  let sqlCalled = false;
  let loaderCalled = false;
  const fakeTx = {
    async query() {
      sqlCalled = true;
      throw new Error('SQL must not run for non-CLINICIAN roles');
    },
  };
  for (const role of ['PATIENT', 'ADMIN', 'LAB_STAFF', 'PHARMACY_STAFF']) {
    const res = await evaluateCareJourneyReadAccess(fakeTx, {
      ...valid,
      actor: { ...valid.actor, role },
      loadProjection: () => {
        loaderCalled = true;
        return { shouldNeverRun: true };
      },
    });
    assert.equal(res.decision, 'DENY');
    assert.equal(res.reason, 'ROLE_NOT_CLINICIAN');
    assert.equal(res.projection, null);
  }
  assert.equal(sqlCalled, false);
  assert.equal(loaderCalled, false);
});

test('classifyCareJourneyAccess separates ELIGIBLE, OUTSIDE_COHORT, and #189 DENY pitfalls across cutoff equalities', () => {
  const base = makeEligibleSnapshot();
  assert.equal(classifyCareJourneyAccess(base).decision, 'ELIGIBLE');

  // Post-care completion allows past original pre-care ceiling while strictly < hardExpiresAt.
  const postCare = makeEligibleSnapshot({
    dbNow: new Date('2026-12-01T00:00:00.000Z'),
    session: {
      ...base.session,
      expiresAt: new Date('2026-12-02T00:00:00.000Z'),
    },
    journeyById: {
      ...base.journeyById,
      firstCareCompletedAt: new Date('2026-11-27T13:00:00.000Z'),
      latestQualifiedCloseAt: new Date('2026-11-27T13:30:00.000Z'),
    },
  }, base);
  assert.equal(classifyCareJourneyAccess(postCare).decision, 'ELIGIBLE');

  // True OUTSIDE_COHORT: active clinician + active patient + no pair + no matching/cross-scope journeyId.
  const outside = makeEligibleSnapshot({
    requested: { ...base.requested, journeyId: null },
    pairExists: false,
    journeyById: null,
    matchedJourney: null,
    assignment: null,
    admission: null,
    activeAnchor: null,
  }, base);
  const outsideRes = classifyCareJourneyAccess(outside);
  assert.equal(outsideRes.decision, 'OUTSIDE_COHORT');
  assert.equal(outsideRes.reason, 'NOT_IN_CARE_JOURNEY_COHORT');

  // #189 pitfall 1: journeyId exists in care_journeys for a DIFFERENT patient/clinician/clinic -> DENY, never OUTSIDE_COHORT.
  for (const field of ['patientId', 'clinicianId', 'organizationId']) {
    const crossScope = makeEligibleSnapshot({
      pairExists: false,
      journeyById: { ...base.journeyById, [field]: randomUUID() },
      matchedJourney: null,
    }, base);
    const res = classifyCareJourneyAccess(crossScope);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.reason, 'JOURNEY_SCOPE_MISMATCH');
  }

  // #189 pitfall 2: care_journey_pairs exists for (patientId, clinicianId) without active Journey -> DENY, never OUTSIDE_COHORT.
  const pairOnly = makeEligibleSnapshot({
    requested: { ...base.requested, journeyId: null },
    pairExists: true,
    journeyById: null,
    matchedJourney: null,
  }, base);
  const pairOnlyRes = classifyCareJourneyAccess(pairOnly);
  assert.equal(pairOnlyRes.decision, 'DENY');
  assert.equal(pairOnlyRes.reason, 'COHORT_PAIR_WITHOUT_JOURNEY');

  // Exact cutoff equality boundaries (>= cutoff -> DENY).
  assert.equal(
    classifyCareJourneyAccess(makeEligibleSnapshot({
      session: { ...base.session, expiresAt: new Date(base.dbNow.getTime()) },
    }, base)).reason,
    'SESSION_INVALID_OR_EXPIRED',
  );
  assert.equal(
    classifyCareJourneyAccess(makeEligibleSnapshot({
      admission: { ...base.admission, validUntil: new Date(base.dbNow.getTime()) },
    }, base)).reason,
    'ADMISSION_EXPIRED',
  );
  assert.equal(
    classifyCareJourneyAccess(makeEligibleSnapshot({
      journeyById: { ...base.journeyById, originalPreCareCeilingAt: new Date(base.dbNow.getTime()) },
    }, base)).reason,
    'PRE_CARE_CEILING_REACHED',
  );
  assert.equal(
    classifyCareJourneyAccess(makeEligibleSnapshot({
      journeyById: {
        ...base.journeyById,
        firstCareCompletedAt: new Date('2026-11-27T11:00:00.000Z'),
        hardExpiresAt: new Date(base.dbNow.getTime()),
      },
    }, base)).reason,
    'JOURNEY_HARD_EXPIRED',
  );
  assert.equal(
    classifyCareJourneyAccess(makeEligibleSnapshot({
      dbNow: new Date(base.journeyById.startedAt.getTime() - 1),
    }, base)).reason,
    'JOURNEY_NOT_STARTED',
  );

  // Legacy & sidecar revocations all DENY cleanly.
  assert.equal(classifyCareJourneyAccess(makeEligibleSnapshot({ actorUser: { ...base.actorUser, status: 'SUSPENDED' } }, base)).reason, 'ACTOR_INACTIVE_OR_INVALID');
  assert.equal(classifyCareJourneyAccess(makeEligibleSnapshot({ session: { ...base.session, revokedAt: new Date() } }, base)).reason, 'SESSION_INVALID_OR_EXPIRED');
  assert.equal(classifyCareJourneyAccess(makeEligibleSnapshot({ clinicianProfile: { ...base.clinicianProfile, userId: randomUUID() } }, base)).reason, 'CLINICIAN_ACTOR_MISMATCH');
  assert.equal(classifyCareJourneyAccess(makeEligibleSnapshot({ patientProfile: { ...base.patientProfile, userStatus: 'SUSPENDED' } }, base)).reason, 'PATIENT_INACTIVE_OR_MISSING');
  assert.equal(classifyCareJourneyAccess(makeEligibleSnapshot({ assignment: { ...base.assignment, status: 'ENDED', endedAt: new Date() } }, base)).reason, 'ASSIGNMENT_INACTIVE');
  assert.equal(classifyCareJourneyAccess(makeEligibleSnapshot({ organization: { ...base.organization, status: 'INACTIVE' } }, base)).reason, 'CLINIC_INACTIVE_OR_STATUS_CHANGED');
  assert.equal(classifyCareJourneyAccess(makeEligibleSnapshot({ organization: { ...base.organization, statusVersion: 2 } }, base)).reason, 'CLINIC_INACTIVE_OR_STATUS_CHANGED');
  assert.equal(classifyCareJourneyAccess(makeEligibleSnapshot({ membership: { ...base.membership, status: 'ENDED', endedAt: new Date() } }, base)).reason, 'MEMBERSHIP_INACTIVE');
  assert.equal(classifyCareJourneyAccess(makeEligibleSnapshot({ affiliation: { ...base.affiliation, withdrawnAt: new Date() } }, base)).reason, 'AFFILIATION_WITHDRAWN_OR_MISSING');
  assert.equal(classifyCareJourneyAccess(makeEligibleSnapshot({ admission: { ...base.admission, endedAt: new Date() } }, base)).reason, 'ADMISSION_ENDED');
  assert.equal(classifyCareJourneyAccess(makeEligibleSnapshot({ admission: { ...base.admission, verificationEpoch: 2 } }, base)).reason, 'ADMISSION_EPOCH_MISMATCH');
  assert.equal(classifyCareJourneyAccess(makeEligibleSnapshot({ journeyById: { ...base.journeyById, endedAt: new Date(), effectiveCutoffAt: new Date() } }, base)).reason, 'JOURNEY_ENDED');
  assert.equal(classifyCareJourneyAccess(makeEligibleSnapshot({ activeAnchor: { ...base.activeAnchor, bookingState: 'CANCELLED' } }, base)).reason, 'ANCHOR_BOOKING_INVALID_STATE');
});

test('projectSyntheticCareJourneyResource supports all 5 allowlisted classes with zero PHI fields', () => {
  const ctx = {
    journeyId: randomUUID(),
    scopeVersion: 'cjp-scope.v1',
    policyVersion: 'cjp-policy.v1',
  };
  for (const rc of CARE_JOURNEY_RESOURCE_CLASSES) {
    const p = projectSyntheticCareJourneyResource(rc, ctx);
    assert.equal(p.resourceClass, rc);
    assert.equal(p.synthetic, true);
    assert.equal(p.journeyId, ctx.journeyId);
    assert.equal(Object.keys(p).some(k => /email|password|token|systolic|diastolic|dosage/i.test(k)), false);
  }
});
