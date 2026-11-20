# EH-006 authentication/session contract

Approved in Issue #10 comment 6136179437 at baseline
`dc4d432572a9ecb32cdd8eab1809f89969dd39f1`. Implements FR-001/003 and the
authentication portion of NFR-008/FR-060. Resource authorization remains EH-007.

## Password contract

Node 24.21.0 asynchronous `node:crypto.argon2('argon2id', ...)`: version19,
memory65536KiB, passes3, parallelism1, random16-byte salt, key32bytes, no pepper/
associated data. Passwords are unmodified UTF-8, 1–1024 bytes at login. No new
dependencies or pin changes. Store in existing users.password_hash TEXT:

```text
eh-pw-v1$argon2id$v=19$m=65536,t=3,p=1$s=<SALT>$h=<HASH>
```

This is application-specific, **not PHC**. Exactly109 ASCII bytes, six fixed/order
segments; canonical unpadded base64url salt22chars/16bytes and key43chars/32bytes.
Full-input parser rejects unknown/duplicate/reordered fields, versions/parameters,
padding, whitespace and noncanonical unused base64 bits. Stored parameters never
become crypto arguments. Derive asynchronously; compare32bytes with timingSafeEqual.

One startup-generated dummy hash handles invalid/nonexistent identities and
unsupported encodings. Disabled users with supported hashes perform real verification
but fail. Same external401; no timing-equality claim. Existing placeholder hashes
cannot authenticate. No conversion, rehash, registration/password-change or seed.
Missing/failed crypto support prevents startup; native failures are sanitized503.

## Session persistence

Only migration `20261013014000_eh006_auth_sessions` is added; EH-005 is unchanged.
Sessions: UUID id default gen_random_uuid(), RESTRICT user UUID FK, unique CHAR(64)
lowercase SHA256 lookup hash, created/expires TIMESTAMPTZ(3), nullable revoked
TIMESTAMPTZ(3). Three CHECKs enforce hash format, expires>created and revoked>=created.
User/expiry index; no cleanup index, last-used, updated-at, IP/agent or CSRF field.

Credentials:32 CSPRNG bytes, canonical unpadded base64url43chars. Only SHA256 of
decoded bytes reaches persistence. Duplicate/noncanonical cookies fail. Eight-hour
absolute expiry from database time; no sliding/idle timeout. Multiple sessions
allowed. Successful relogin revokes only the currently presented valid browser
session, including account switching; failures preserve it. Rows retained Core V1,
no cleanup machinery. Later maintenance owns retention/deletion decisions.

Creation rechecks ACTIVE status and verified hash under a user NO KEY UPDATE lock,
compatible with audit FK KEY SHARE. Conditional locked session revocation prevents
duplicate audit. Session creation/revocation and shared empty-metadata audit append
commit atomically, before cookie emission. Failed audit rolls back mutation. Lost
HTTP response may leave an unreachable session until expiry.

Resolution checks current ACTIVE user, expiry and revocation. Disabled users lose
access on next resolution; future re-enable/permanent revoke policy is deferred.
Principal: userId/email/role/sessionId/expiresAt only. No public Prisma client or
RBAC/ownership/assignment/admin clinical policy.

## Browser, cookies, CSRF

NODE_ENV must be development/test/production. AUTH_BROWSER_ORIGIN is mandatory,
exact serialized HTTP(S) origin without credentials/path/query/fragment/wildcard.
Production HTTPS; nonproduction HTTP only on loopback. Local browser value:
http://localhost:3000. It is never inferred from API listener/Host/forwarded headers.

Production cookie __Host-eh_session: HttpOnly, Secure, SameSite=Lax, Path=/, no
Domain. Local/test eh_session omits Secure. Max-Age is remaining absolute lifetime
rounded down; Expires matches session expiry. Clearing preserves attributes, empty
value, Max-Age=0 and epoch Expires. No CSRF cookie or signing-secret configuration.

```text
csrfToken=base64url(HMAC-SHA256(key=decoded session credential,
                             message=UTF8("egyhealth360:csrf:v1")))
```

Expose intentionally in successful login/me JSON only; browser memory, me recovery
after refresh. Logout requires canonical32byte X-CSRF-Token and timingSafeEqual.
New session rotates token; invalid/expired/revoked/disabled sessions cannot use it.

Login/logout require exact Origin. Login requires application/json (optional UTF-8
charset) and X-EH-Login:1. Fetch Metadata cross-site rejected; same-site/same-origin/
none never bypass exact Origin. Missing metadata accepted only with mandatory
headers. Middleware covers Express case/trailing-slash variants; login repeats
entry checks. No permissive CORS/proxy. Web3000/API3001 direct browser authentication
remains unavailable; API tests simulate browser Origin. Later UI needs same-origin
routing preserving Origin/Set-Cookie. These controls do not solve XSS/session theft.

## API/audit

OpenAPI is docs/openapi.json. Only POST login/logout and GET me added under
/api/v1/auth. All responses Cache-Control:no-store. Login/me200 project exactly:
data:{user:{id,email,role},session:{expiresAt},csrfToken}. No session credential/id/
hash, password/hash, status or profile JSON. Login sets new cookie; me never renews.
Logout JSON{} returns204, revokes and clears. Generic credential/account failure401
AUTH_INVALID_CREDENTIALS. Unauthenticated me/logout401 AUTH_UNAUTHENTICATED clears
unusable cookie. CSRF403 preserves cookie/session; malformedJSON400, body>16KiB413,
wrong media415, sanitized service503. Errors:{error:{code,message}}.

Only successful AUTH_LOGIN and AUTH_SESSION_REVOKED audit, entity=session UUID,
session owner actor, metadata{}. No failed-login/read/expiry events. Never log/audit
passwords/hashes, session credentials/hashes, CSRF, cookies, arbitrary bodies or
driver/native dumps. CSRF in approved successful JSON is intentional exposure.

## Validation/limits

pnpm test:migrations refuses nonempty DBs; tests fresh deploy/status twice and a
separate EH-005-only DB with identity/profile/assignment/audit sentinels, upgrade,
second deploy/status. Requires disposable database creation rights. No retained-data
reset or production/container migration runner. Existing custom SQL remains checked.

Runtime-only synthetic fixtures, known-answer primitive test, codec/configuration,
all roles/generic failures, cookie/CSRF/session/concurrency, CHECK/FK, audit rollback,
leakage and existing health/worker suites are mandatory. Both audits and remote CI.

```sh
pnpm install --frozen-lockfile
pnpm --filter @egyhealth/db generate
pnpm --filter @egyhealth/db validate
pnpm lint
pnpm build
pnpm typecheck
pnpm test
pnpm test:migrations # empty disposable DB only
pnpm test:integration
node --env-file-if-exists=.env scripts/measure-auth.mjs
pnpm audit --prod --audit-level high
pnpm audit --audit-level high
docker compose config --quiet
docker compose build
docker compose up -d --wait --wait-timeout 120
docker compose exec -T api node --test tests/auth.test.mjs
docker compose exec -T api node scripts/measure-auth.mjs
docker compose exec -T api node scripts/verify-auth-runtime.mjs
```

Measurements:startup dummy cost, hash/verify/wrong/dummy20 warmed samples median/
p95/max, four concurrent HTTP logins, concurrent health, runtime/OpenSSL/platform,
process peak RSS. Uses retained synthetic test rows, not demo seed. Record resource
limits; no production SLA/timing equality claim. Crashes/OOM/derivation failures/
timeouts require review. Independent second-pass review/final approval before merge.
