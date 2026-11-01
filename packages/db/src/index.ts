import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from './generated/prisma/client.js';

export function createDatabase(connectionString: string | undefined) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, query_timeout: 3000, statement_timeout: 3000, max: 4 });
  // Driver errors are handled by readiness checks, never exposed in logs.
  pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  return {
    async check(): Promise<void> { await client.$queryRaw`SELECT 1`; },
    async close(): Promise<void> { await client.$disconnect(); await pool.end(); },
  };
}
export type Database = ReturnType<typeof createDatabase>;

export { canonicalizeEmail, createPersistence } from './persistence.js';
export type { CreateUserInput, AppendAuditInput } from './persistence.js';
export { createAuthPersistence } from './auth.js';
export type { AuthPersistence, AuthPrincipal } from './auth.js';
export { createAuthorizationPersistence } from './authorization.js';
export type { AuthorizationPersistence, PatientProfileId, PatientAccessTarget, PatientProfileProjection, PatientAccessEvidence } from './authorization.js';
export { createDemoPersistence, DEMO_DATASET, DEMO_FIXTURES, DemoStateError } from './demo.js';
export type { DemoFixtureKey, DemoPasswordCheck, DemoIdentityState, DemoSeedResult } from './demo.js';
export { createClinicalCatalogPersistence, ClinicalCatalogError } from './clinical-catalog.js';
export type { ClinicalCatalogPersistence, ClinicalCatalogSnapshot, ClinicalTemplateVersionId } from './clinical-catalog.js';
export { createCarePlanPersistence, CarePlanError } from './care-plans.js';
export type { CarePlanPersistence, CarePlanId, ClinicalRuleDefinitionId, CarePlanStatus, CarePlanSnapshot, PlanTarget, PlanMutationResult, DeferredActionSpecification } from './care-plans.js';
export { createBloodPressureMeasurementPersistence } from './blood-pressure.js';
export type { BloodPressureMeasurementPersistence, BloodPressureMeasurementSnapshot, BloodPressureMeasurementId } from './blood-pressure.js';
export { BloodPressureError, bpInvalid, exactBpKeys, validateBpValues, bpTimestamp } from './blood-pressure-values.js';
export { createFollowUpAppointmentPersistence } from './follow-up-appointments.js';
export type { FollowUpAppointmentPersistence, FollowUpAppointmentId, FollowUpAppointmentSnapshot } from './follow-up-appointments.js';
export { createClinicalEncounterPersistence } from './clinical-encounters.js';
export type { ClinicalEncounterPersistence, ClinicalEncounterId, ClinicalEncounterSnapshot, EncounterBloodPressureAssociationSnapshot } from './clinical-encounters.js';
export { ClinicalEvidenceError, evidenceKeys, evidenceValues } from './followup-common.js';
export { RecordCoverageError } from './record-coverage.js';
export type { RecordCoverageSourceType, RecordCoverageStatus, RecordCoverageWindowSnapshot, CreateRecordCoverageWindowInput } from './record-coverage.js';
export { createNormalizedEvidencePersistence, NormalizedEvidenceError } from './normalized-evidence.js';
export type {
  NormalizedEvidencePersistence,
  NormalizedPatientEvidence,
  NormalizedBpMeasurement,
  NormalizedClinicalEncounter,
  StructuralEncounterBpCandidate,
  OperationalAppointmentCandidate,
  NormalizedCoverageWindow,
  EffectiveCoverageSegment,
  UnassertedCoverageSegment,
  GetNormalizedPatientEvidenceInput,
} from './normalized-evidence.js';
export { createObservedApplicabilityPersistence } from './observed-applicability.js';
export type { ObservedApplicabilityPersistence } from './observed-applicability.js';
export { ObservedApplicabilityError } from './observed-applicability-values.js';
export type {
  GetObservedApplicabilitySnapshotsInput,
  ObservedApplicabilityPoint,
  ObservedApplicabilitySnapshot,
  ObservedApplicabilityRetraction,
  ObservedTupleComparison,
  ObservedApplicabilitySourceType,
  ObservedAgeAssertionState,
  ObservedPregnancyStatus,
  ObservedConditionStatus,
} from './observed-applicability-values.js';


export { createBpAmendmentPersistence, BpAmendmentError, BP_EXCLUSION_REASONS } from './bp-amendments.js';
export type { BpExclusionReason, BpAmendmentKind, BpAmendmentResult } from './bp-amendments.js';
export { createCareActionPersistence, CareActionError } from './care-actions.js';
export type { CareActionPersistence, CareActionTarget, CareActionSelection, GenerateInitialCareActionInput, CareActionSnapshot } from './care-actions.js';

export { createOrganizationPersistence, OrganizationError } from './organizations.js';
export type { OrganizationPersistence, OrganizationKind, OrganizationStatus, OrganizationSnapshot, MembershipSnapshot } from './organizations.js';

export { createPatientEntryPersistence, PatientEntryError, profileValues, registrationIdentity } from './patient-entry.js';
export type { PatientEntryPersistence, OwnProfile } from './patient-entry.js';

export { createDirectoryPersistence } from './directory.js';
export type { DirectoryPersistence, PublicDirectory } from './directory.js';
export { DirectoryError, directoryExact, directoryId, directoryText, specialtyKey, directoryPage, providerPage } from './directory-values.js';
export type { DirectoryPage, ProviderPage, PublicClinic, PublicProvider, PublicSpecialty } from './directory-values.js';

export { createRelationshipPersistence } from './relationships.js';
export type { RelationshipPersistence } from './relationships.js';
export { RelationshipError, relationshipId, relationshipInput, relationshipAuthorization, relationshipPage } from './relationship-values.js';
export {createAvailabilityPersistence} from './availability.js';
export type {AvailabilityPersistence,AvailabilityProjection} from './availability.js';
export {AvailabilityError,availabilityExact,availabilityId,availabilityInteger,availabilityTime,schedulingZone,schedulingValues,offsetMatches,availabilityPage} from './availability-values.js';
export {createBookingPersistence,BookingError,bookingInput} from './bookings.js';
export type {BookingPersistence} from './bookings.js';

export {createConsultationPersistence,consultationInput,consultationCloseInput} from './consultations.js';
export type {ConsultationPersistence} from './consultations.js';

export {createDocumentationPersistence} from './documentation.js';
export type {DocumentationPersistence} from './documentation.js';
export {DocumentationError,documentationInput,documentationJson,documentContent,documentText} from './documentation-values.js';
export type {DocumentCommand} from './documentation-values.js';

export {createFollowUpIntentPersistence,type FollowUpIntentPersistence} from './follow-up-intents.js';
export {FollowUpIntentError,intentInput,intentJson,intentWindow,intentPage,type IntentCommand} from './follow-up-intent-values.js';

export {createPrescriptionPersistence,type PrescriptionPersistence} from './prescriptions.js';
export {PrescriptionError,prescriptionInput,prescriptionContent,prescriptionJson,prescriptionPage,medicationInput,type PrescriptionCommand} from './prescription-values.js';
