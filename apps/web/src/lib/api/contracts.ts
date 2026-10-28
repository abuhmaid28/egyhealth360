/** Frontend contracts. Public directory mirrors main OpenAPI; future capabilities are UI-only. */
export type Role =
  | "PATIENT"
  | "CLINICIAN"
  | "PHARMACY_STAFF"
  | "LAB_STAFF"
  | "ADMIN";
export type Mode = "demo" | "live";
export interface Specialty {
  key: string;
  displayName: string;
}
export interface Clinic {
  id: string;
  displayName: string;
  city: string;
  address: string;
}
export interface Provider {
  id: string;
  displayName: string;
  specialty: Specialty;
  clinics: Clinic[];
}
/** Frozen I2 projection ONLY. No patient identity, occupancy, authority or private identifiers. */
export interface Availability {
  id: string;
  providerId: string;
  clinicId: string;
  startAt: string;
  endAt: string;
  timeZone: string;
  bookable: boolean;
}
export interface Profile {
  id: string;
  displayName: string;
  dateOfBirth: string | null;
  sex: string | null;
}
export interface Session {
  role: Role;
  name: string;
  mode: Mode;
}
export interface Appointment {
  id: string;
  patientName: string;
  provider: Provider;
  slot: Availability;
  status: "Upcoming" | "Completed";
  reason: string;
}
export interface Consultation {
  appointmentId: string;
  complaint: string;
  diagnosis: string;
  allergies: string;
  notes: string;
  medication: string;
  dosage: string;
  lab: string;
  instructions: string;
  followUp: string;
  released: boolean;
}
export interface RecordOverview {
  generalConsultationAvailable: boolean;
  encounters: { id: string; occurredAt: string; purpose: "HTN_BP_FOLLOWUP" }[];
  legacyFollowUps: {
    id: string;
    scheduledAt: string;
    status: "SCHEDULED" | "CANCELLED";
  }[];
  consultations: Consultation[];
  measurements: {
    id: string;
    systolic: number;
    diastolic: number;
    measuredAt: string;
  }[];
}
export interface Fulfillment {
  prescription: "Received" | "Preparing" | "Dispensed";
  lab: "Requested" | "In progress" | "Result ready";
  result: string;
}
export interface Operations {
  organizations: { name: string; kind: string; status: string }[];
  users: { name: string; role: string; status: string }[];
}
export interface HealthcareAdapter {
  readonly mode: Mode;
  session(): Promise<Session | null>;
  login(email: string, password: string): Promise<Session>;
  logout(): Promise<void>;
  providers(): Promise<Provider[]>;
  provider(id: string): Promise<Provider>;
  specialties(): Promise<Specialty[]>;
  clinics(): Promise<Clinic[]>;
  profile(): Promise<Profile>;
  saveProfile(profile: Omit<Profile, "id">): Promise<void>;
  availability(providerId?: string): Promise<Availability[]>;
  publishSlot(startAt: string, endAt: string): Promise<void>;
  appointments(): Promise<Appointment[]>;
  book(slotId: string, reason: string): Promise<Appointment>;
  record(): Promise<RecordOverview>;
  consultation(appointmentId: string): Promise<Consultation>;
  release(consultation: Consultation): Promise<void>;
  fulfillment(artifactId?: string): Promise<Fulfillment>;
  updateFulfillment(value: Fulfillment, artifactId?: string): Promise<void>;
  artifacts(): Promise<
    {
      id: string;
      patient: string;
      provider: string;
      medication: string;
      dosage: string;
      lab: string;
    }[]
  >;
  operations(): Promise<Operations>;
}
