import {createConsultationPersistence} from '@egyhealth/db';
import { createBookingPersistence, createAvailabilityPersistence, createRelationshipPersistence, createDirectoryPersistence, createPatientEntryPersistence, createFollowUpAppointmentPersistence, createClinicalEncounterPersistence, createBloodPressureMeasurementPersistence, createAuthPersistence, createAuthorizationPersistence, createDatabase } from '@egyhealth/db';
import { authConfiguration, positiveInteger } from '@egyhealth/config';
import { patientEntryRuntime } from './patient-entry.js';
import { createApp } from './app.js';
import { createPasswordVerifier } from './password.js';

async function main() {
  const config = authConfiguration(process.env);
  const passwords = await createPasswordVerifier();
  const consultations = createConsultationPersistence(process.env.DATABASE_URL);
  const bookings = createBookingPersistence(process.env.DATABASE_URL);
  const availability = createAvailabilityPersistence(process.env.DATABASE_URL);
  const relationships = createRelationshipPersistence(process.env.DATABASE_URL);
  const directory = createDirectoryPersistence(process.env.DATABASE_URL);
  const patientEntry = createPatientEntryPersistence(process.env.DATABASE_URL);
  const database = createDatabase(process.env.DATABASE_URL);
  const store = createAuthPersistence(process.env.DATABASE_URL);
  const authorization = createAuthorizationPersistence(process.env.DATABASE_URL);
  const bloodPressure = createBloodPressureMeasurementPersistence(process.env.DATABASE_URL);
  const appointments = createFollowUpAppointmentPersistence(process.env.DATABASE_URL);
  const encounters = createClinicalEncounterPersistence(process.env.DATABASE_URL);
  const app = await createApp(database, { config, passwords, store }, authorization, bloodPressure, { appointments, encounters }, patientEntryRuntime(patientEntry), directory, relationships, availability, bookings, consultations);
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await app.close();
    await database.close();
    await relationships.close();
    await availability.close();
    await bookings.close();
    await consultations.close();
    await directory.close();
    await patientEntry.close();
    await store.close();
    await authorization.close();
    await bloodPressure.close();
    await appointments.close();
    await encounters.close();
  };
  const shutdown = () => { void close().catch(() => { console.error('API shutdown failed'); process.exitCode = 1; }); };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  await app.listen(positiveInteger(process.env.API_PORT, 3001), '0.0.0.0');
  console.log('API started');
}
main().catch(() => { console.error('API startup failed'); process.exit(1); });
