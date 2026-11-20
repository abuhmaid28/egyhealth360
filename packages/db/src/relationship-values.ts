export type RelationshipCode = 'RELATIONSHIP_INVALID' | 'RELATIONSHIP_UNAUTHENTICATED' | 'RELATIONSHIP_NOT_FOUND' | 'RELATIONSHIP_CONFLICT' | 'RELATIONSHIP_UNAVAILABLE';
export class RelationshipError extends Error {
    constructor(public readonly code: RelationshipCode) { super(code); }
}
export const relationshipFail = (code: RelationshipCode): never => { throw new RelationshipError(code); };
export function relationshipId(value: unknown): string {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value))
        return relationshipFail('RELATIONSHIP_INVALID');
    return value;
}
/** Copy primitives before I/O; no accessors, prototypes, hidden/symbol or extra keys. */
export function relationshipInput(value: unknown, keys: readonly string[]): Record<string, string> {
    if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
        relationshipFail('RELATIONSHIP_INVALID');
    const d = Object.getOwnPropertyDescriptors(value), own = Reflect.ownKeys(value as object);
    if (own.length !== keys.length || own.some(k => typeof k !== 'string' || !keys.includes(k)))
        relationshipFail('RELATIONSHIP_INVALID');
    const copy: Record<string, string> = {};
    for (const k of keys) {
        if (!d[k] || !d[k].enumerable || !('value' in d[k]))
            relationshipFail('RELATIONSHIP_INVALID');
        copy[k] = relationshipId(d[k].value);
    }
    return copy;
}
export function relationshipPage(input: unknown): {
    page: number;
    pageSize: number;
} {
    if (!input || typeof input !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(input)))
        relationshipFail('RELATIONSHIP_INVALID');
    const d = Object.getOwnPropertyDescriptors(input);
    if (Reflect.ownKeys(input as object).some(k => typeof k !== 'string' || !['page', 'pageSize'].includes(k) || !('value' in d[k]) || !d[k].enumerable))
        relationshipFail('RELATIONSHIP_INVALID');
    const parse = (k: string, fallback: number, max: number) => {
        if (!d[k])
            return fallback;
        const v = d[k].value;
        if (typeof v !== 'string' || !/^[1-9][0-9]{0,4}$/.test(v) || Number(v) > max)
            relationshipFail('RELATIONSHIP_INVALID');
        return Number(v);
    };
    return { page: parse('page', 1, 10000), pageSize: parse('pageSize', 20, 100) };
}
/** A public provider locator OR the patient's own exact ACTIVE legacy assignment. */
export function relationshipAuthorization(value: unknown) {
    const provider = value !== null && typeof value === 'object' && Object.hasOwn(value, 'providerId');
    const v = relationshipInput(value, provider ? ['providerId', 'operationKey'] : ['assignmentId', 'operationKey']);
    return { providerId: provider ? v.providerId : null, assignmentId: provider ? null : v.assignmentId, operationKey: v.operationKey };
}
