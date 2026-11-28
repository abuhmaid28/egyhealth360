import { UiError } from "../api/errors";
import type {
  Appointment,
  Availability,
  Consultation,
  Fulfillment,
  HealthcareAdapter,
  OwnAvailability,
  Provider,
  Profile,
  Role,
  Session,
} from "../api/contracts";
import { publicSlot } from "../api/availability";
import {
  blankConsultation,
  clinics,
  operations,
  previous,
  profile,
  providers,
  slots,
  specialties,
} from "./fixtures";
interface State {
  session: Session | null;
  profile: Profile;
  slots: Availability[];
  ownSlots?: OwnAvailability[];
  appointments: Appointment[];
  consultations: Consultation[];
  fulfillment: Record<string, Fulfillment>;
}
const key = "eh360-ui-demo-v1";
const VALID_ROLES: ReadonlySet<string> = new Set([
  "PATIENT",
  "CLINICIAN",
  "PHARMACY_STAFF",
  "LAB_STAFF",
  "ADMIN",
]);
const VALID_RX_STATES: ReadonlySet<string> = new Set([
  "Received",
  "Preparing",
  "Dispensed",
]);
const VALID_LAB_STATES: ReadonlySet<string> = new Set([
  "Requested",
  "In progress",
  "Result ready",
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidState(value: unknown): value is State {
  if (!isPlainRecord(value)) return false;

  if (value.session !== null) {
    if (
      !isPlainRecord(value.session) ||
      typeof value.session.role !== "string" ||
      !VALID_ROLES.has(value.session.role) ||
      typeof value.session.name !== "string" ||
      value.session.mode !== "demo"
    ) {
      return false;
    }
  }

  if (
    !isPlainRecord(value.profile) ||
    typeof value.profile.id !== "string" ||
    typeof value.profile.displayName !== "string" ||
    (value.profile.dateOfBirth !== null && typeof value.profile.dateOfBirth !== "string") ||
    (value.profile.sex !== null && typeof value.profile.sex !== "string")
  ) {
    return false;
  }

  if (
    !Array.isArray(value.slots) ||
    !value.slots.every(
      (s) =>
        isPlainRecord(s) &&
        typeof s.id === "string" &&
        typeof s.providerId === "string" &&
        typeof s.clinicId === "string" &&
        typeof s.startAt === "string" &&
        typeof s.endAt === "string" &&
        typeof s.timeZone === "string" &&
        typeof s.bookable === "boolean",
    )
  ) {
    return false;
  }

  if (value.ownSlots !== undefined) {
    if (
      !Array.isArray(value.ownSlots) ||
      !value.ownSlots.every(
        (s) =>
          isPlainRecord(s) &&
          typeof s.id === "string" &&
          typeof s.providerId === "string" &&
          typeof s.clinicId === "string" &&
          typeof s.startAt === "string" &&
          typeof s.endAt === "string" &&
          (s.state === "PUBLISHED" || s.state === "WITHDRAWN") &&
          typeof s.version === "number",
      )
    ) {
      return false;
    }
  }

  if (
    !Array.isArray(value.appointments) ||
    !value.appointments.every(
      (a) =>
        isPlainRecord(a) &&
        typeof a.id === "string" &&
        typeof a.patientName === "string" &&
        (a.status === "Upcoming" || a.status === "Completed") &&
        typeof a.reason === "string" &&
        isPlainRecord(a.provider) &&
        typeof a.provider.id === "string" &&
        typeof a.provider.displayName === "string" &&
        isPlainRecord(a.slot) &&
        typeof a.slot.id === "string" &&
        typeof a.slot.startAt === "string" &&
        typeof a.slot.clinicId === "string",
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(value.consultations) ||
    !value.consultations.every(
      (c) =>
        isPlainRecord(c) &&
        typeof c.appointmentId === "string" &&
        typeof c.diagnosis === "string" &&
        typeof c.notes === "string" &&
        typeof c.followUp === "string" &&
        typeof c.medication === "string" &&
        typeof c.dosage === "string" &&
        typeof c.instructions === "string" &&
        typeof c.released === "boolean",
    )
  ) {
    return false;
  }

  if (!isPlainRecord(value.fulfillment)) return false;
  for (const entry of Object.values(value.fulfillment)) {
    if (
      !isPlainRecord(entry) ||
      typeof entry.prescription !== "string" ||
      !VALID_RX_STATES.has(entry.prescription) ||
      typeof entry.lab !== "string" ||
      !VALID_LAB_STATES.has(entry.lab) ||
      typeof entry.result !== "string"
    ) {
      return false;
    }
  }

  return true;
}

const fresh = (): State => ({
  session: null,
  profile: { ...profile },
  slots: structuredClone(slots),
  appointments: [],
  consultations: [previous],
  fulfillment: {},
});
// UI simulation only. No API calls, database, backend seeds, consent or assignment creation.
export function createDemoAdapter(
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">,
): HealthcareAdapter & {
  enter(role: Role): Promise<Session>;
  reset(): { persisted: boolean };
  bookPreview(
    provider: Provider,
    slot: Availability,
    reason: string,
  ): Promise<Appointment>;
} {
  let memory = fresh();
  let storageDetached = false;
  const read = (): State => {
    if (storageDetached || !storage) return memory;
    try {
      const raw = storage.getItem(key);
      if (!raw) return memory;
      const parsed: unknown = JSON.parse(raw);
      return isValidState(parsed) ? parsed : memory;
    } catch {
      return memory;
    }
  };
  const write = (state: State) => {
    memory = state;
    if (storageDetached) return;
    try {
      storage?.setItem(key, JSON.stringify(state));
    } catch {
      /* Memory-only demo when browser storage is unavailable. */
    }
  };
  const enter = async (role: Role): Promise<Session> => {
    const s = read();
    s.session = {
      role,
      name:
        role === "PATIENT"
          ? s.profile.displayName
          : role === "CLINICIAN"
            ? providers[0].displayName
            : role === "ADMIN"
              ? "Operations team"
              : role === "LAB_STAFF"
                ? "Hana Ali"
                : "Youssef Salem",
      mode: "demo",
    };
    write(s);
    return s.session;
  };
  const requireRole = (...roles: Role[]) => {
    if (!read().session || !roles.includes(read().session!.role))
      throw new UiError("This demo workspace cannot access this information.");
  };
  const ownHistory = (s: State) =>
    s.ownSlots ??
    s.slots
      .filter((slot) => slot.providerId === providers[0].id)
      .map((slot) => ({
        id: slot.id,
        providerId: slot.providerId,
        clinicId: slot.clinicId,
        startAt: slot.startAt,
        endAt: slot.endAt,
        timeZone: slot.timeZone,
        state: "PUBLISHED" as const,
        version: 1,
        publishedAt: "2026-10-27T09:00:00Z",
        withdrawnAt: null,
      }));
  return {
    mode: "demo",
    async bookPreview(provider, selection, reason) {
      requireRole("PATIENT");
      const slot = publicSlot(selection);
      if (
        !slot.bookable ||
        slot.providerId !== provider.id ||
        !provider.clinics.some((c) => c.id === slot.clinicId)
      )
        throw new UiError(
          "Choose an available slot at this provider’s clinic.",
        );
      const s = read();
      const prior = s.appointments.find(
        (a) => a.availabilitySource === "live" && a.slot.id === slot.id,
      );
      if (prior) return prior;
      const appointment: Appointment = {
        id: `demo-appointment-${s.appointments.length + 1}`,
        patientName: s.profile.displayName,
        provider: {
          id: provider.id,
          displayName: provider.displayName,
          specialty: {
            key: provider.specialty.key,
            displayName: provider.specialty.displayName,
          },
          clinics: provider.clinics.map((c) => ({
            id: c.id,
            displayName: c.displayName,
            city: c.city,
            address: c.address,
          })),
        },
        slot,
        status: "Upcoming",
        reason,
        availabilitySource: "live",
      };
      s.appointments.push(appointment);
      write(s);
      return appointment;
    },
    enter,
    reset() {
      memory = fresh();
      if (!storage) {
        return { persisted: true };
      }
      try {
        storage.removeItem(key);
        storageDetached = false;
        return { persisted: true };
      } catch {
        // Storage removal failed: detach storage in this instance so stale persisted values
        // cannot override fresh memory state; cross-reload persistence remains limited.
        storageDetached = true;
        return { persisted: false };
      }
    },
    async session() {
      return read().session;
    },
    async login() {
      return enter("PATIENT");
    },
    async logout() {
      const s = read();
      s.session = null;
      write(s);
    },
    async providers() {
      return providers;
    },
    async provider(id) {
      const p = providers.find((p) => p.id === id);
      if (!p) throw new UiError("Doctor not found.");
      return p;
    },
    async specialties() {
      return specialties;
    },
    async clinics() {
      return clinics;
    },
    async profile() {
      requireRole("PATIENT", "CLINICIAN");
      return read().profile;
    },
    async saveProfile(value) {
      requireRole("PATIENT");
      const s = read();
      s.profile = { ...s.profile, ...value };
      write(s);
    },
    async availability(providerId) {
      providerId ??=
        read().session?.role === "CLINICIAN" ? providers[0].id : undefined;
      return read().slots.filter(
        (s) => s.bookable && (!providerId || s.providerId === providerId),
      );
    },
    async availabilityPage(providerId, query = {}) {
      const all = (await this.availability(providerId)).filter(
        (s) =>
          (!query.clinic || s.clinicId === query.clinic) &&
          (!query.from || Date.parse(s.startAt) >= Date.parse(query.from)) &&
          (!query.to || Date.parse(s.endAt) <= Date.parse(query.to)),
      );
      const page = query.page ?? 1,
        pageSize = query.pageSize ?? 20;
      return {
        data: all.slice((page - 1) * pageSize, page * pageSize),
        meta: { page, pageSize, total: all.length },
      };
    },
    async ownAvailability(page = 1) {
      requireRole("CLINICIAN");
      const all = ownHistory(read())
        .slice()
        .sort(
          (a, b) =>
            a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id),
        );
      return {
        data: all.slice((page - 1) * 20, page * 20),
        meta: { page, pageSize: 20, total: all.length },
      };
    },
    async withdrawSlot(input) {
      requireRole("CLINICIAN");
      const s = read();
      s.ownSlots = ownHistory(s);
      const slot = s.ownSlots.find((v) => v.id === input.slotId);
      if (!slot) throw new UiError("Availability not found.");
      if (slot.state === "WITHDRAWN") return slot;
      if (slot.version !== input.expectedVersion)
        throw new UiError("Availability changed. Please refresh.");
      slot.state = "WITHDRAWN";
      slot.version = 2;
      slot.withdrawnAt = "2026-10-28T08:00:00Z";
      const publicValue = s.slots.find((v) => v.id === slot.id);
      if (publicValue) publicValue.bookable = false;
      write(s);
      return slot;
    },
    async publishSlot({ clinicId, startAt, endAt }) {
      requireRole("CLINICIAN");
      const s = read();
      if (
        !Number.isFinite(Date.parse(startAt)) ||
        !Number.isFinite(Date.parse(endAt)) ||
        Date.parse(startAt) >= Date.parse(endAt)
      )
        throw new UiError("End time must be after start time.");
      if (
        ownHistory(s).some(
          (v) =>
            v.state === "PUBLISHED" &&
            v.providerId === providers[0].id &&
            Date.parse(v.startAt) < Date.parse(endAt) &&
            Date.parse(startAt) < Date.parse(v.endAt),
        )
      )
        throw new UiError("This interval overlaps an existing slot.");
      s.ownSlots = ownHistory(s);
      if (clinicId !== clinics[0].id)
        throw new UiError("Choose the demo clinician’s clinic.");
      const slot: Availability = {
        id: `demo-slot-${s.slots.length + 1}`,
        providerId: providers[0].id,
        clinicId,
        startAt,
        endAt,
        timeZone: "Africa/Cairo",
        bookable: true,
      };
      s.slots.push(slot);
      const base = {
        id: slot.id,
        providerId: slot.providerId,
        clinicId: slot.clinicId,
        startAt: slot.startAt,
        endAt: slot.endAt,
        timeZone: slot.timeZone,
      };
      const own: OwnAvailability = {
        ...base,
        state: "PUBLISHED",
        version: 1,
        publishedAt: "2026-10-28T08:00:00Z",
        withdrawnAt: null,
      };
      s.ownSlots.push(own);
      write(s);
      return own;
    },
    async appointments() {
      requireRole("PATIENT", "CLINICIAN");
      return read().appointments.filter(
        (a) =>
          read().session?.role !== "CLINICIAN" ||
          a.provider.id === providers[0].id ||
          a.availabilitySource === "live",
      );
    },
    async book(slotId, reason) {
      requireRole("PATIENT");
      const s = read();
      const slot = s.slots.find((v) => v.id === slotId && v.bookable);
      if (!slot)
        throw new UiError(
          "This time is no longer available. Please choose another.",
        );
      const appointment: Appointment = {
        patientName: s.profile.displayName,
        id: `demo-appointment-${s.appointments.length + 1}`,
        provider: providers.find((p) => p.id === slot.providerId)!,
        slot: { ...slot },
        status: "Upcoming",
        reason,
      };
      s.appointments.push(appointment);
      slot.bookable = false;
      write(s);
      return appointment;
    },
    async record() {
      requireRole("PATIENT", "CLINICIAN");
      return {
        generalConsultationAvailable: true,
        encounters: [],
        legacyFollowUps: [],
        consultations: read()
          .consultations.filter((c) => c.released)
          .map((c) => ({ ...c, notes: "" })),
        measurements: [
          {
            id: "bp-demo",
            systolic: 122,
            diastolic: 80,
            measuredAt: "2026-10-20T08:00:00Z",
          },
        ],
      };
    },
    async consultation(id) {
      requireRole("CLINICIAN");
      if (
        !read().appointments.some(
          (a) =>
            a.id === id &&
            (a.provider.id === providers[0].id ||
              a.availabilitySource === "live"),
        )
      )
        throw new UiError("Appointment not found.");
      return (
        read().consultations.find((c) => c.appointmentId === id) ??
        blankConsultation(id)
      );
    },
    async release(value) {
      requireRole("CLINICIAN");
      const s = read();
      const a = s.appointments.find((a) => a.id === value.appointmentId);
      if (
        !a ||
        (a.provider.id !== providers[0].id && a.availabilitySource !== "live")
      )
        throw new UiError("Appointment not found.");
      if (
        s.consultations.some(
          (c) => c.appointmentId === value.appointmentId && c.released,
        )
      )
        throw new UiError("This demo visit is already released.");
      s.consultations.push({ ...value, released: true });
      a.status = "Completed";
      write(s);
    },
    async fulfillment(artifactId = "default") {
      requireRole("PATIENT", "CLINICIAN", "PHARMACY_STAFF", "LAB_STAFF");
      const s = read();
      const f = s.fulfillment[artifactId] ?? {
        prescription: "Received" as const,
        lab: "Requested" as const,
        result: "",
      };
      return s.session?.role === "PHARMACY_STAFF"
        ? { prescription: f.prescription, lab: "Requested", result: "" }
        : s.session?.role === "LAB_STAFF"
          ? { prescription: "Received", lab: f.lab, result: f.result }
          : f;
    },
    async updateFulfillment(value, artifactId = "default") {
      requireRole("PHARMACY_STAFF", "LAB_STAFF");
      const s = read();
      const current = s.fulfillment[artifactId] ?? {
        prescription: "Received",
        lab: "Requested",
        result: "",
      };
      s.fulfillment[artifactId] =
        s.session?.role === "PHARMACY_STAFF"
          ? { ...current, prescription: value.prescription }
          : { ...current, lab: value.lab, result: value.result };
      write(s);
    },
    async artifacts() {
      requireRole("PHARMACY_STAFF", "LAB_STAFF");
      const s = read();
      return s.consultations
        .filter((c) => c.released && c.appointmentId !== "previous-visit")
        .map((c) => ({
          id: c.appointmentId,
          patient: s.profile.displayName,
          provider: providers[0].displayName,
          medication: s.session?.role === "PHARMACY_STAFF" ? c.medication : "",
          dosage: s.session?.role === "PHARMACY_STAFF" ? c.dosage : "",
          lab: s.session?.role === "LAB_STAFF" ? c.lab : "",
        }));
    },
    async operations() {
      requireRole("ADMIN");
      return operations;
    },
  };
}
