import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { formatZodError } from './validation';

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleRouteError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError('Invalid input', 422, { issues: formatZodError(err) });
  }
  const message = err instanceof Error ? err.message : 'Unexpected error';
  // Prisma "record not found" errors carry this code.
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2025') {
    return jsonError('Not found', 404);
  }
  console.error(err);
  return jsonError(message, 500);
}
