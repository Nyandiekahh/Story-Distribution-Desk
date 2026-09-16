import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleRouteError, jsonError } from '@/lib/apiHelpers';
import { jobRunner } from '@/lib/jobs/runner';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const job = await prisma.submissionJob.findUnique({
    where: { id: params.id },
    include: {
      story: { select: { id: true, headline: true } },
      channel: true,
      attempts: { orderBy: { timestamp: 'asc' } },
    },
  });
  if (!job) return jsonError('Job not found', 404);
  const gate = jobRunner.pendingGateFor(job.id);
  return NextResponse.json({ job, gate });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.submissionJob.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
