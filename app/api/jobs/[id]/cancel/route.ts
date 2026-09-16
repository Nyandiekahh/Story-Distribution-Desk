import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jobRunner } from '@/lib/jobs/runner';
import { handleRouteError } from '@/lib/apiHelpers';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const stopped = jobRunner.cancelJob(params.id);
    if (!stopped) {
      // The job may have already finished by the time this arrives —
      // that's fine, just make sure the record agrees.
      const job = await prisma.submissionJob.findUnique({ where: { id: params.id } });
      if (job && !['success', 'failed', 'cancelled'].includes(job.status)) {
        await prisma.submissionJob.update({ where: { id: params.id }, data: { status: 'cancelled', completedAt: new Date() } });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
