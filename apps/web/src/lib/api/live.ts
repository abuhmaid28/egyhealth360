import { createConsultationCloseApi, CloseUiError } from "./consultation-close";
import { createLiveFollowUpApi, followUpHttpError } from "./follow-up-intents";
import {
  createLiveDocumentationApi,
  documentationHttpError,
} from "./documentation";
import {
  createConsultationOpeningApi,
  OpeningUiError,
} from "./consultation-opening";
import { BookingUiError, createLiveBookingApi } from "./live-booking";
import { UiError } from "./errors";
import { availabilityPage, ownSlot, publicSlot } from "./availability";
import type {
  HealthcareAdapter,
  RecordOverview,
  Profile,
  Provider,
  Role,
  Session,
  Specialty,
  Clinic,
} from "./contracts";
type Auth = { user: { email: string; role: Role }; csrfToken: string };
/** Same-origin Next rewrite; HttpOnly backend cookie stays browser-managed. Never persist credentials. */
export function createLiveAdapter(): HealthcareAdapter {
  let csrf = "";
  let sessionIdentity = "";
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`/api/v1${path}`, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    if (response.status === 401) {
      csrf = "";
      sessionIdentity = "";
      liveBookings.clearCommands();
      consultationOpening.clear();
      consultationClose.clear();
      documentation.clear?.("expired");
      followUpIntents.clear("expired");
    }
    if (
      !response.ok &&
      (path.endsWith("/close") ||
        (path.endsWith("/consultation") && init?.method !== "POST"))
    )
      throw new CloseUiError(response.status, !path.endsWith("/close"));
    if (!response.ok && /\/follow-up-intents(?:\/|\?|$)/.test(path))
      throw followUpHttpError(response.status, init?.method === "POST");
    if (
      !response.ok &&
      (/^\/consultations\//.test(path) || /\/summaries(?:\/|\?|$)/.test(path))
    )
      throw documentationHttpError(response.status, init?.method === "POST");
    if (!response.ok && path.endsWith("/consultation"))
      throw new OpeningUiError(response.status);
    if (
      !response.ok &&
      (path.startsWith("/me/bookings") || path.startsWith("/me/schedule"))
    )
      throw new BookingUiError(response.status);
    if (!response.ok && path.includes("availability")) {
      const messages: Record<number, string> = {
        400: "Check the clinic and explicit timestamp offsets, interval duration, lead time and horizon against clinic settings.",
        401: "Your session has ended. Please sign in again.",
        403: "Request verification failed. Refresh your session before retrying.",
        404: "This provider or availability resource is unavailable for your current access.",
        409: "Availability conflicts with an existing interval or changed operation. Refresh before retrying.",
        413: "The availability request is too large.",
        415: "The availability request must use JSON.",
      };
      throw new UiError(
        messages[response.status] ??
          "The availability service is unavailable. Please try again.",
      );
    }
    if (!response.ok)
      throw new UiError(
        response.status === 401
          ? "Your session has ended. Please sign in again."
          : response.status === 404
            ? "This resource is unavailable for your current access."
            : "The service could not complete this request. Please try again.",
      );
    return response.status === 204
      ? (undefined as T)
      : (response.json() as Promise<T>);
  };
  const session = (a: Auth): Session => {
    const identity = JSON.stringify([a.user.role, a.user.email]);
    if (sessionIdentity && sessionIdentity !== identity) {
      liveBookings.clearCommands();
      consultationOpening.clear();
      consultationClose.clear();
      documentation.clear?.();
      followUpIntents.clear();
    }
    documentation.activate();
    sessionIdentity = identity;
    csrf = a.csrfToken;
    return { role: a.user.role, name: a.user.email, mode: "live" };
  };
  const unavailable = async (): Promise<never> => {
    throw new UiError(
      "This capability is not integrated on main yet. Use the graduation demo to explore this journey.",
    );
  };
  const liveBookings = createLiveBookingApi(request, () => csrf);
  const consultationClose = createConsultationCloseApi(request, () => csrf);
  const consultationOpening = createConsultationOpeningApi(request, () => csrf);
  const documentation = createLiveDocumentationApi(request, () => csrf);
  const followUpIntents = createLiveFollowUpApi(request, () => csrf);
  return {
    mode: "live",
    followUpIntents,
    documentation,
    liveDocumentation: documentation,
    consultationOpening,
    consultationClose,
    liveBookings,
    async session() {
      try {
        return session((await request<{ data: Auth }>("/auth/me")).data);
      } catch {
        csrf = "";
        sessionIdentity = "";
        liveBookings.clearCommands();
        consultationOpening.clear();
        consultationClose.clear();
        documentation.clear?.("expired");
        followUpIntents.clear("expired");
        return null;
      }
    },
    async login(email, password) {
      return session(
        (
          await request<{ data: Auth }>("/auth/login", {
            method: "POST",
            headers: { "X-EH-Login": "1" },
            body: JSON.stringify({ email, password }),
          })
        ).data,
      );
    },
    async logout() {
      documentation.clear?.();
      followUpIntents.clear();
      await request("/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "X-CSRF-Token": csrf },
      });
      csrf = "";
      sessionIdentity = "";
      liveBookings.clearCommands();
      consultationOpening.clear();
      consultationClose.clear();
    },
    async providers() {
      return (
        await request<{ data: Provider[] }>(
          "/directory/providers?page=1&pageSize=100",
        )
      ).data;
    },
    async provider(id) {
      return (
        await request<{ data: Provider }>(
          `/directory/providers/${encodeURIComponent(id)}`,
        )
      ).data;
    },
    async specialties() {
      return (
        await request<{ data: Specialty[] }>(
          "/directory/specialties?page=1&pageSize=100",
        )
      ).data;
    },
    async clinics() {
      return (
        await request<{ data: Clinic[] }>(
          "/directory/clinics?page=1&pageSize=100",
        )
      ).data;
    },
    async profile() {
      return (await request<{ data: Profile }>("/me/profile")).data;
    },
    async saveProfile(value) {
      await request("/me/profile", {
        method: "PUT",
        headers: { "X-CSRF-Token": csrf },
        body: JSON.stringify(value),
      });
    },
    async record() {
      const p = (await request<{ data: Profile }>("/me/profile")).data;
      const bp = await request<{
        data: {
          id: string;
          systolic: number;
          diastolic: number;
          measuredAt: string;
        }[];
      }>(`/patients/${p.id}/blood-pressure-measurements?page=1&pageSize=20`);
      const [encounters, followUps] = await Promise.all([
        request<{ data: RecordOverview["encounters"] }>(
          `/patients/${p.id}/clinical-encounters?page=1&pageSize=20`,
        ),
        request<{ data: RecordOverview["legacyFollowUps"] }>(
          `/patients/${p.id}/follow-up-appointments?page=1&pageSize=20`,
        ),
      ]);
      return {
        generalConsultationAvailable: false,
        consultations: [],
        measurements: bp.data,
        encounters: encounters.data,
        legacyFollowUps: followUps.data,
      };
    },
    async availability(providerId, query) {
      if (!providerId)
        throw new UiError("Choose a provider to view public availability.");
      return (await this.availabilityPage(providerId, query)).data;
    },
    async availabilityPage(providerId, query = {}) {
      const parameters = new URLSearchParams({
        page: String(query.page ?? 1),
        pageSize: String(query.pageSize ?? 20),
      });
      for (const key of ["clinic", "from", "to"] as const)
        if (query[key]) parameters.set(key, query[key]);
      return availabilityPage(
        await request<unknown>(
          `/directory/providers/${encodeURIComponent(providerId)}/availability?${parameters}`,
        ),
        publicSlot,
      );
    },
    async ownAvailability(page = 1) {
      return availabilityPage(
        await request<unknown>(`/me/availability?page=${page}&pageSize=20`),
        ownSlot,
      );
    },
    async publishSlot(input) {
      const result = await request<{ data: unknown }>("/me/availability", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf },
        body: JSON.stringify({
          clinicId: input.clinicId,
          startAt: input.startAt,
          endAt: input.endAt,
          operationKey: input.operationKey,
        }),
      });
      return ownSlot(result.data);
    },
    async withdrawSlot(input) {
      const result = await request<{ data: unknown }>(
        `/me/availability/${encodeURIComponent(input.slotId)}/withdraw`,
        {
          method: "PUT",
          headers: { "X-CSRF-Token": csrf },
          body: JSON.stringify({
            operationKey: input.operationKey,
            expectedVersion: input.expectedVersion,
          }),
        },
      );
      return ownSlot(result.data);
    },
    appointments: unavailable,
    book: unavailable,
    consultation: unavailable,
    release: unavailable,
    fulfillment: unavailable,
    updateFulfillment: unavailable,
    artifacts: unavailable,
    operations: unavailable,
  };
}
