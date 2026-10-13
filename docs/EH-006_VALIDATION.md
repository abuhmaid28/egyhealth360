# EH-006 observed validation — 2026-10-13

Baseline: `dc4d432572a9ecb32cdd8eab1809f89969dd39f1`.
Approval: Issue #10 comment 6136179437. No dependency, lockfile, toolchain pin,
Dockerfile or EH-005 migration change.

## Passed local gates

- Frozen install with pnpm10.34.6; Node24.21.0.
- Prisma generate/validate, lint, build and typecheck.
- Nine unit tests, including RFC9106 Argon2id known-answer and strict codec.
- Twenty-one PostgreSQL integration tests: twelve auth/session/security tests plus
  all nine existing catalog/identity/history/audit/API-health/worker regressions.
- Fresh two-migration deployment, second deploy/status unchanged.
- Isolated EH-005-only upgrade preserved users/profiles/assignment/audit rows,
  followed by unchanged second deploy/status.
- Audit-write failure rollback for create, replacement and revocation.
- Express case/trailing-slash CSRF/cache regression; eight concurrent relogin/
  logout rounds without deadlocks or duplicate revocation events.
- Production and development-inclusive high-severity audits: no known vulnerabilities.
- Docker config/build/startup, all four healthy services, web/API HTTP health.
- Five codec/config/cookie/known-answer tests inside the actual runtime image.
- Running Docker API login/me/CSRF logout/cookie clearing/invalidation probe.
- Independent second-pass implementation review: PASS after resolving route
  normalization and audit-FK lock compatibility findings; no remaining findings.

Docker base `node:24.21.0-bookworm-slim` digest:
`sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20`.
The managed build passed the public proxy CA as a BuildKit secret. PostgreSQL18.6.
The first overlapping Compose calls caused a container-name conflict; sequential
startup passed, with the database volume retained. No runtime/design deviation.

## Argon2/resource measurements

Linux x64, Node24.21.0, OpenSSL3.5.8. Frozen memory65536KiB/passes3/parallelism1,
salt16bytes/key32bytes, no pepper/associated data. Twenty warmed sequential samples
per operation; separate four concurrent actual HTTP login requests. Health timing
starts after all four requests enter native password verification.

| Operation | Host median / p95 / max ms | Docker median / p95 / max ms |
|---|---|---|
| Hash | 208.4 / 347.67 / 359.14 | 186.14 / 197.7 / 270.1 |
| Verify success | 210.43 / 519.74 / 562.09 | 184.34 / 201.67 / 257.57 |
| Wrong password | 177.03 / 211.22 / 226.99 | 178.4 / 226.29 / 249.07 |
| Dummy verify | 174.5 / 191.62 / 199.29 | 185.86 / 214.6 / 218.36 |

| Resource | Host | Docker |
|---|---|---|
| Startup dummy ms | 182.61 | 196 |
| Health during four logins ms | 560.35 | 585.61 |
| RSS before concurrent requests MiB | 121.63 | 129.25 |
| Peak process RSS MiB | 431.88 | 437.63 |
| Four-login batch ms | 1006.97 | 884.01 |
| Slowest concurrent login ms | 982.14 | 856.7 |

Host cgroup: 8GiB memory, CPU quota2 cores. Docker reports no separate per-container
CPU/memory cap and shares the managed environment; this is not a production sizing
benchmark. RSS is the measuring API process peak, not aggregate stack memory.
All operations completed without crashes/OOM/derivation failures or regression
timeouts. Measurements show workable demo-scale behavior here; no timing equality,
production throughput or brute-force protection beyond the chosen policy is claimed.
CI repeats runtime measurements on its own environment.

## Remaining boundaries

Only password authentication and server-side sessions. No clinical authorization,
UI/proxy/CORS expansion, seed or rate limiting. Split-port browser auth remains
unavailable until later same-origin routing. Expired/revoked rows remain retained.
Future account re-enable/permanent session revocation policy is deferred. Remote CI
status is reported on the PR; final merge approval remains required.
