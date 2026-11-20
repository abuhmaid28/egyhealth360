import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch (error) {
  if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
    throw new Error('Unable to load local environment configuration');
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL },
});
