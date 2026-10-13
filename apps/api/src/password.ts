import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';

const prefix = 'eh-pw-v1$argon2id$v=19$m=65536,t=3,p=1$s=';
const grammar = /^eh-pw-v1\$argon2id\$v=19\$m=65536,t=3,p=1\$s=([A-Za-z0-9_-]{22})\$h=([A-Za-z0-9_-]{43})$/;

export function canonicalBytes(value: string, length: number): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const bytes = Buffer.from(value, 'base64url');
  return bytes.length === length && bytes.toString('base64url') === value ? bytes : null;
}

/** Application-specific v1 envelope, deliberately not PHC. */
export function parsePasswordHash(encoded: string): { salt: Buffer; key: Buffer } | null {
  if (encoded.length !== 109) return null;
  const match = grammar.exec(encoded);
  if (!match) return null;
  const salt = canonicalBytes(match[1], 16);
  const key = canonicalBytes(match[2], 32);
  return salt && key ? { salt, key } : null;
}

function derive(password: Buffer, salt: Buffer): Promise<Buffer> {
  // Stored parameters are never crypto arguments. Node/OpenSSL uses version 19.
  return new Promise((resolve, reject) => {
    argon2('argon2id', {
      message: password, nonce: salt, memory: 65536, passes: 3,
      parallelism: 1, tagLength: 32,
    }, (error, key) => {
      if (error) reject(new Error('Password derivation unavailable'));
      else if (key.length !== 32) reject(new Error('Password derivation unavailable'));
      else resolve(key);
    });
  });
}

export async function hashPassword(password: Buffer): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${prefix}${salt.toString('base64url')}$h=${key.toString('base64url')}`;
}

export async function verifyPassword(password: Buffer, encoded: string): Promise<boolean> {
  const parsed = parsePasswordHash(encoded);
  if (!parsed) return false;
  const actual = await derive(password, parsed.salt);
  return timingSafeEqual(actual, parsed.key);
}

export async function createPasswordVerifier() {
  const dummyPassword = randomBytes(32);
  const dummyHash = await hashPassword(dummyPassword);
  dummyPassword.fill(0);
  return {
    async verify(password: Buffer, encoded: string | undefined): Promise<boolean> {
      const supported = encoded !== undefined && parsePasswordHash(encoded) !== null;
      const matches = await verifyPassword(password, supported ? encoded : dummyHash);
      return supported && matches;
    },
  };
}
