/** Inactive V3-I3 Slice 2 staff READ contract. No network, session store or app registration.
 * A pharmacyId is an untrusted selector, never a grant. S1 must separately implement
 * session/role/org/purpose/route invalidation and stale-result suppression.
 */
export type PharmacyPurpose = "fulfillment" | "history";
type RecordedState = "PENDING" | "ACCEPTED" | "WITHDRAWN";
export type PharmacyRouteState = RecordedState | "COMPLETED" | "CANCELLED" | "REPLACED" | "EXPIRED";
type PageMeta = Readonly<{ page: number; pageSize: number; total: number }>;
export type PharmacyCorrection = Readonly<{ id: string; kind: "CORRECTION" | "REVERSAL"; reason: string; recordedAt: string }>;
export type PharmacyDispense = Readonly<{
  id: string; routeId: string; pharmacyId: string; pharmacyName: string; dispensedAt: string;
  medicationId: string; medicationDisplay: string; quantity: string; unit: string;
  correctionVersion: number; corrections: readonly PharmacyCorrection[];
  correctionHistoryMeta: PageMeta; reversed: boolean;
}>;
type Item = Readonly<{
  id: string; medicationId: string; medicationDisplay: string; quantity: string; unit: string;
  fulfillmentState: "NOT_DISPENSED" | "FULLY_DISPENSED"; dispense: PharmacyDispense | null;
}>;
type Route = Readonly<{
  id: string; prescriptionId: string; pharmacyId: string; pharmacyName: string; version: number;
  state: PharmacyRouteState; recordedState: RecordedState; createdAt: string; validFrom: string; validUntil: string;
  transitions: readonly Readonly<{ state: RecordedState; recordedAt: string; reason: string | null }>[];
}>;
export type PharmacyFulfillmentRoute = Route & Readonly<{
  purpose: "FULFILLMENT"; patientDisplayName: string | null;
  items: readonly (Item & Readonly<{ instructions: string }>)[];
}>;
export type PharmacyHistoryRoute = Route & Readonly<{
  purpose: "CORRECTION_HISTORY"; patientDisplayName: null;
  items: readonly (Item & Readonly<{ instructions: null }>)[];
}>;
export type PharmacyRoute = PharmacyFulfillmentRoute | PharmacyHistoryRoute;
export type PharmacyReadInput = Readonly<{ pharmacyId: string; page?: number; pageSize?: number; purpose?: PharmacyPurpose }>;
export type PharmacyDetailInput = PharmacyReadInput & Readonly<{ routeId: string }>;
export type PharmacyList = Readonly<{ data: readonly PharmacyRoute[]; meta: PageMeta & Readonly<{ purpose: PharmacyPurpose }> }>;
export type PharmacyDetail = Readonly<{ data: PharmacyRoute }>;
export type PharmacyReadRequest = Readonly<{ method: "GET"; path: string; cache: "no-store" }>;
/** Adapter seam only; the caller supplies transport. Auth/hosting/readiness are NOT_VERIFIED. */
export type PharmacyReadTransport = (request: PharmacyReadRequest) => Promise<Readonly<{ status: number; body: unknown }>>;
export type PharmacyReadFailure = "INVALID_INPUT" | "INVALID_RESPONSE" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "UNAVAILABLE" | "TRANSPORT_UNKNOWN";
export class PharmacyReadError extends Error {
  readonly code: PharmacyReadFailure;
  constructor(code: PharmacyReadFailure) { super("Pharmacy read failed."); this.name = "PharmacyReadError"; this.code = code; }
}
const reject = (): never => { throw new PharmacyReadError("INVALID_RESPONSE"); };
const uuid = (v: unknown): string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v) ? v : reject();
function object(v: unknown, keys: string[], optional: string[] = []): Record<string, unknown> {
  if (!v || typeof v !== "object" || ![Object.prototype, null].includes(Object.getPrototypeOf(v))) return reject();
  const d = Object.getOwnPropertyDescriptors(v);
  if (Reflect.ownKeys(v).some(k => typeof k !== "string" || !keys.includes(k) && !optional.includes(k) || !d[k].enumerable || !("value" in d[k])) || keys.some(k => !Object.hasOwn(d, k))) return reject();
  return Object.fromEntries(Object.entries(d).map(([k, descriptor]) => [k, descriptor.value]));
}
function list(v: unknown, max: number): unknown[] {
  if (!Array.isArray(v) || Object.getPrototypeOf(v) !== Array.prototype) return reject();
  const d = Object.getOwnPropertyDescriptors(v) as unknown as Record<string, PropertyDescriptor>;
  const length = integer(d.length?.value, 0, max);
  if (Reflect.ownKeys(v).length !== length + 1 || Array.from({ length }, (_, i) => d[String(i)]).some(x => !x?.enumerable || !("value" in x))) return reject();
  return Array.from({ length }, (_, i) => d[String(i)].value);
}
const text = (v: unknown): string => typeof v === "string" && v.trim().length > 0 ? v : reject();
const integer = (v: unknown, min: number, max = Number.MAX_SAFE_INTEGER): number => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max ? v : reject();
function timestamp(v: unknown): string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(Date.parse(v))) return reject();
  const [year, month, day, hour, minute, second] = v.slice(0, 19).split(/[-T:]/).map(Number);
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (month < 1 || month > 12 || day < 1 || day > days || hour > 23 || minute > 59 || second > 59) return reject();
  return v;
}
const quantity = (v: unknown): string => typeof v === "string" && /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(v) && /[1-9]/.test(v) ? v : reject();
function enumeration<T extends string>(v: unknown, values: readonly T[]): T { return typeof v === "string" && values.includes(v as T) ? v as T : reject(); }
const recorded = (v: unknown) => enumeration(v, ["PENDING", "ACCEPTED", "WITHDRAWN"] as const);
function page(v: unknown): PageMeta {
  const o = object(v, ["page", "pageSize", "total"]);
  return Object.freeze({ page: integer(o.page, 1, 10000), pageSize: integer(o.pageSize, 1, 100), total: integer(o.total, 0) });
}
function correction(v: unknown): PharmacyCorrection {
  const o = object(v, ["id", "kind", "reason", "recordedAt"]), reason = text(o.reason);
  if ([...reason].length > 1000) return reject();
  return Object.freeze({ id: uuid(o.id), kind: enumeration(o.kind, ["CORRECTION", "REVERSAL"] as const), reason, recordedAt: timestamp(o.recordedAt) });
}
function dispense(v: unknown, route: Route, item: Omit<Item, "dispense">, c: Context): PharmacyDispense {
  const o = object(v, ["id", "routeId", "pharmacyId", "pharmacyName", "dispensedAt", "medicationId", "medicationDisplay", "quantity", "unit", "correctionVersion", "corrections", "correctionHistoryMeta", "reversed"]);
  const meta = page(o.correctionHistoryMeta), corrections = list(o.corrections, meta.pageSize).map(correction);
  if (meta.page !== (c.routeId ? c.page : 1) || meta.pageSize !== (c.routeId ? c.pageSize : 1) || o.correctionVersion !== meta.total || new Set(corrections.map(x => x.id)).size !== corrections.length || corrections.some(x => x.kind === "REVERSAL") && o.reversed !== true || corrections.length > 0 && (meta.page - 1) * meta.pageSize + corrections.length > meta.total) return reject();
  if (corrections.length !== Math.min(meta.pageSize, Math.max(0, meta.total - (meta.page - 1) * meta.pageSize))) return reject();
  if (o.routeId !== route.id || o.pharmacyId !== route.pharmacyId || o.pharmacyName !== route.pharmacyName || o.medicationId !== item.medicationId || o.medicationDisplay !== item.medicationDisplay || o.quantity !== item.quantity || o.unit !== item.unit || typeof o.reversed !== "boolean" || meta.total < corrections.length) return reject();
  return Object.freeze({ id: uuid(o.id), routeId: uuid(o.routeId), pharmacyId: uuid(o.pharmacyId), pharmacyName: text(o.pharmacyName), dispensedAt: timestamp(o.dispensedAt), medicationId: uuid(o.medicationId), medicationDisplay: text(o.medicationDisplay), quantity: quantity(o.quantity), unit: text(o.unit), correctionVersion: integer(o.correctionVersion, 0), corrections: Object.freeze(corrections), correctionHistoryMeta: meta, reversed: o.reversed });
}
type Context = Required<PharmacyReadInput> & { routeId?: string };
function context(v: unknown, detail: boolean): Context {
  try {
    const o = object(v, ["pharmacyId", ...(detail ? ["routeId"] : [])], ["page", "pageSize", "purpose"]);
    return { pharmacyId: uuid(o.pharmacyId), ...(detail ? { routeId: uuid(o.routeId) } : {}), page: integer(o.page === undefined ? 1 : o.page, 1, 10000), pageSize: integer(o.pageSize === undefined ? 20 : o.pageSize, 1, 100), purpose: enumeration(o.purpose === undefined ? "fulfillment" : o.purpose, ["fulfillment", "history"] as const) };
  } catch { throw new PharmacyReadError("INVALID_INPUT"); }
}
function route(v: unknown, c: Context): PharmacyRoute {
  const history = c.purpose === "history";
  const o = object(v, ["id", "prescriptionId", "pharmacyId", "pharmacyName", "version", "state", "recordedState", "purpose", "createdAt", "validFrom", "validUntil", "transitions", "items", ...(!history ? ["patientDisplayName"] : [])], history ? ["patientDisplayName"] : []);
  if (o.pharmacyId !== c.pharmacyId || c.routeId !== undefined && o.id !== c.routeId || o.purpose !== (history ? "CORRECTION_HISTORY" : "FULFILLMENT")) return reject();
  if (history && o.patientDisplayName !== undefined && o.patientDisplayName !== null) return reject();
  const r: Route = { id: uuid(o.id), prescriptionId: uuid(o.prescriptionId), pharmacyId: uuid(o.pharmacyId), pharmacyName: text(o.pharmacyName), version: integer(o.version, 1), state: enumeration(o.state, ["PENDING", "ACCEPTED", "WITHDRAWN", "COMPLETED", "CANCELLED", "REPLACED", "EXPIRED"] as const), recordedState: recorded(o.recordedState), createdAt: timestamp(o.createdAt), validFrom: timestamp(o.validFrom), validUntil: timestamp(o.validUntil), transitions: Object.freeze(list(o.transitions, 2).map(v => { const t = object(v, ["state", "recordedAt", "reason"]); return Object.freeze({ state: recorded(t.state), recordedAt: timestamp(t.recordedAt), reason: t.reason === null ? null : text(t.reason) }); })) };
  if (Date.parse(r.validUntil) <= Date.parse(r.validFrom)) return reject();
  const items = list(o.items, 20).map(v => {
    const i = object(v, ["id", "medicationId", "medicationDisplay", "quantity", "unit", "fulfillmentState", "dispense", ...(!history ? ["instructions"] : [])], history ? ["instructions"] : []);
    if (history && i.instructions !== undefined && i.instructions !== null) return reject();
    const item = { id: uuid(i.id), medicationId: uuid(i.medicationId), medicationDisplay: text(i.medicationDisplay), quantity: quantity(i.quantity), unit: text(i.unit), fulfillmentState: enumeration(i.fulfillmentState, ["NOT_DISPENSED", "FULLY_DISPENSED"] as const) };
    if ((item.fulfillmentState === "NOT_DISPENSED") !== (i.dispense === null) || history && item.fulfillmentState !== "FULLY_DISPENSED") return reject();
    return Object.freeze({ ...item, instructions: history ? null : text(i.instructions), dispense: i.dispense === null ? null : dispense(i.dispense, r, item, c) });
  });
  if (new Set(items.map(i => i.id)).size !== items.length) return reject();
  if (history ? r.recordedState !== "ACCEPTED" || ["PENDING", "ACCEPTED", "WITHDRAWN"].includes(r.state) : !["PENDING", "ACCEPTED"].includes(r.state) || r.state !== r.recordedState || !items.some(i => i.fulfillmentState === "NOT_DISPENSED")) return reject();
  // No clock-based eligibility inference and no reconstruction of omitted history.
  return Object.freeze({ ...r, purpose: history ? "CORRECTION_HISTORY" : "FULFILLMENT", patientDisplayName: history || o.patientDisplayName === null ? null : text(o.patientDisplayName), items: Object.freeze(items) }) as PharmacyRoute;
}
function payload(v: unknown): unknown {
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return reject(); }
}
function parseList(v: unknown, c: Context): PharmacyList {
  const o = object(payload(v), ["data", "meta"]), m = object(o.meta, ["page", "pageSize", "total", "purpose"]);
  const meta = page({ page: m.page, pageSize: m.pageSize, total: m.total });
  if (meta.page !== c.page || meta.pageSize !== c.pageSize || m.purpose !== c.purpose) return reject();
  const data = list(o.data, c.pageSize).map(v => route(v, c));
  if (data.length !== Math.min(c.pageSize, Math.max(0, meta.total - (c.page - 1) * c.pageSize))) return reject();
  if (new Set(data.map(r => r.id)).size !== data.length || meta.total < (c.page - 1) * c.pageSize + data.length && data.length > 0) return reject();
  return Object.freeze({ data: Object.freeze(data), meta: Object.freeze({ ...meta, purpose: c.purpose }) });
}
/** Parsers are bound to the requested context; mutation receipts are not list envelopes. */
export function parsePharmacyList(v: unknown, input: PharmacyReadInput): PharmacyList {
  const c = context(input, false); try { return parseList(v, c); } catch { return reject(); }
}
export function parsePharmacyDetail(v: unknown, input: PharmacyDetailInput): PharmacyDetail {
  const c = context(input, true); try { return Object.freeze({ data: route(object(payload(v), ["data"]).data, c) }); } catch { return reject(); }
}
/** Only constructs two canonical GET paths. No generic method/path/headers entry point. */
export function createPharmacyRead(transport: PharmacyReadTransport) {
  if (typeof transport !== "function") throw new PharmacyReadError("INVALID_INPUT");
  async function read(input: unknown, detail: boolean): Promise<PharmacyList | PharmacyDetail> {
    const c = context(input, detail);
    const path = `/api/v1/pharmacies/${c.pharmacyId}/routes${detail ? `/${c.routeId}` : ""}?page=${c.page}&pageSize=${c.pageSize}&purpose=${c.purpose}`;
    let response: unknown;
    try { response = await transport(Object.freeze({ method: "GET", path, cache: "no-store" })); }
    catch { throw new PharmacyReadError("TRANSPORT_UNKNOWN"); }
    let r: Record<string, unknown>, status: number;
    try { r = object(response, ["status", "body"]); status = integer(r.status, 100, 599); }
    catch { return reject(); }
    if (status !== 200) {
      const codes: Partial<Record<number, PharmacyReadFailure>> = { 401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 503: "UNAVAILABLE" };
      throw new PharmacyReadError(codes[status] ?? "TRANSPORT_UNKNOWN");
    }
    try { return detail ? Object.freeze({ data: route(object(payload(r.body), ["data"]).data, c) }) : parseList(r.body, c); }
    catch { return reject(); }
  }
  return Object.freeze({ authority: "NOT_VERIFIED" as const, readiness: "NOT_VERIFIED" as const,
    list: (input: PharmacyReadInput) => read(input, false) as Promise<PharmacyList>,
    detail: (input: PharmacyDetailInput) => read(input, true) as Promise<PharmacyDetail> });
}
