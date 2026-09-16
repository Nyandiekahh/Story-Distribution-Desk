import { PrismaClient } from '@prisma/client';

// Standard Next.js dev-mode singleton so hot-reloading doesn't open a
// fresh SQLite connection (and Playwright job map, see lib/jobs/runner.ts)
// on every file save.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
