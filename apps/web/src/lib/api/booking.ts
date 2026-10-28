import { UiError } from "./errors";
import type { Appointment, HealthcareAdapter } from "./contracts";

/** Presentation capabilities, not a future backend API contract. No HTTP paths here. */
export interface BookingService {
  readonly implementation: "demo" | "unavailable";
  create(slotId: string, reason: string): Promise<Appointment>;
  listOwn(): Promise<Appointment[]>;
  detail(id: string): Promise<Appointment | undefined>;
  clinicianSchedule(): Promise<Appointment[]>;
}

/** The existing adapter remains responsible for current workspace scope.
 * Live booking is deliberately unavailable even when live availability exists.
 * Replace this factory after a separately reviewed integration with merged contracts.
 */
export function createBookingService(api: HealthcareAdapter): BookingService {
  const unavailable = async (): Promise<never> => {
    throw new UiError(
      "This capability is not integrated on main yet. Use the graduation demo to explore this journey.",
    );
  };
  if (api.mode === "live")
    return {
      implementation: "unavailable",
      create: unavailable,
      listOwn: unavailable,
      detail: unavailable,
      clinicianSchedule: unavailable,
    };
  return {
    implementation: "demo",
    create: (slotId, reason) => api.book(slotId, reason),
    listOwn: () => api.appointments(),
    detail: async (id) => (await api.appointments()).find((a) => a.id === id),
    clinicianSchedule: () => api.appointments(),
  };
}
