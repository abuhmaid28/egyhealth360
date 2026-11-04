import { cp, mkdir } from 'node:fs/promises';
await mkdir('public', { recursive: true });
await cp('../web/public/fonts', 'public/fonts', { recursive: true });
