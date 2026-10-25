export type DirectoryCode = 'DIRECTORY_INVALID' | 'DIRECTORY_UNAUTHENTICATED' | 'DIRECTORY_NOT_FOUND' | 'DIRECTORY_CONFLICT' | 'DIRECTORY_UNAVAILABLE';
export class DirectoryError extends Error {
    constructor(public readonly code: DirectoryCode) { super(code); }
}
export const directoryFail = (code: DirectoryCode): never => { throw new DirectoryError(code); };
export function directoryExact(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
        directoryFail('DIRECTORY_INVALID');
    const d = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(value as object).length !== keys.length || keys.some(k => !d[k] || !d[k].enumerable || !('value' in d[k])))
        directoryFail('DIRECTORY_INVALID');
}
export function directoryId(value: unknown, publicLocator = false): string {
    if (typeof value !== 'string' || value.length !== 36 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) || (publicLocator && value !== value.toLowerCase()))
        directoryFail('DIRECTORY_NOT_FOUND');
    return (value as string).toLowerCase();
}
export function directoryText(value: unknown, limit: number): string {
    if (typeof value !== 'string' || value.trim() !== value || !value.length || [...value].length > limit || /[\p{Cc}\p{Cs}]/u.test(value))
        directoryFail('DIRECTORY_INVALID');
    return value as string;
}
export function specialtyKey(value: unknown): string {
    if (typeof value !== 'string' || value.length > 48 || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value) || value.endsWith('\n'))
        directoryFail('DIRECTORY_INVALID');
    return value as string;
}
export function directoryVersion(value: unknown): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= 2147483647)
        directoryFail('DIRECTORY_INVALID');
    return value as number;
}
export function directoryBoolean(value: unknown): boolean { if (typeof value !== 'boolean')
    directoryFail('DIRECTORY_INVALID'); return value as boolean; }
export type DirectoryPage = {
    page: number;
    pageSize: number;
};
export type ProviderPage = DirectoryPage & {
    specialty: string | null;
    clinic: string | null;
};
export function directoryPage(input: DirectoryPage): DirectoryPage {
    directoryExact(input, ['page', 'pageSize']);
    const page = input.page, pageSize = input.pageSize;
    if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)
        directoryFail('DIRECTORY_INVALID');
    return { page, pageSize };
}
export function providerPage(input: ProviderPage): ProviderPage {
    directoryExact(input, ['page', 'pageSize', 'specialty', 'clinic']);
    return { ...directoryPage({ page: input.page, pageSize: input.pageSize }), specialty: input.specialty === null ? null : specialtyKey(input.specialty), clinic: input.clinic === null ? null : directoryId(input.clinic, true) };
}
export type PublicSpecialty = {
    key: string;
    displayName: string;
};
export type PublicClinic = {
    id: string;
    displayName: string;
    city: string;
    address: string;
};
export type PublicProvider = {
    id: string;
    displayName: string;
    specialty: PublicSpecialty;
    clinics: PublicClinic[];
};
