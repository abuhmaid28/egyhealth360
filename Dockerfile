FROM node:24.21.0-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=secret,id=proxy_ca NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca npm install --global pnpm@10.34.6
COPY . .
RUN --mount=type=secret,id=proxy_ca NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca pnpm install --frozen-lockfile
# Next materializes rewrites at build time. The image owner must supply an
# explicit credential-free origin; next.config.ts retains URL validation.
ARG EH_UI_API_ORIGIN
RUN --mount=type=secret,id=proxy_ca test -n "$EH_UI_API_ORIGIN" && NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca pnpm build

FROM node:24.21.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# Preserve workspace symlinks and generated client; no host node_modules are copied.
COPY --from=build --chown=node:node /app /app
USER node
CMD ["node", "apps/api/dist/main.js"]
