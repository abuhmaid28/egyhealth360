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
    if (!response.ok)
      throw new Error(
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
    csrf = a.csrfToken;
    return { role: a.user.role, name: a.user.email, mode: "live" };
  };
  const unavailable = async (): Promise<never> => {
    throw new Error(
      "This capability is not integrated on main yet. Use the graduation demo to explore this journey.",
    );
  };
  return {
    mode: "live",
    async session() {
      try {
        return session((await request<{ data: Auth }>("/auth/me")).data);
      } catch {
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
      await request("/auth/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf },
      });
      csrf = "";
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
    // No speculative Slice 2 URL or PR #50 dependency; replace after main's approved OpenAPI lands.
    availability: unavailable,
    publishSlot: unavailable,
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
