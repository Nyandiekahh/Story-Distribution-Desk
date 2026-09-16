import { NextRequest, NextResponse } from 'next/server';
import { jobRunner } from '@/lib/jobs/runner';
import { jsonError } from '@/lib/apiHelpers';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const ok = jobRunner.continueJob(params.id);
  if (!ok) return jsonError('This job is not currently waiting for a manual checkpoint.', 409);
  return NextResponse.json({ ok: true });
}
