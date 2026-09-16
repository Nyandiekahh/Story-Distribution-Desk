import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jobRunner } from '@/lib/jobs/runner';
import { jsonError, handleRouteError } from '@/lib/apiHelpers';

/** Resumes a job that was paused before it started (see pause/route.ts). A job paused mid-run instead resumes via POST /api/jobs/:id/continue, same as any other manual checkpoint. */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const job = await prisma.submissionJob.findUnique({ where: { id: params.id } });
    if (!job) return jsonError('Job not found', 404);
    if (job.status !== 'paused') {
      return jsonError('This job is not paused.', 409);
    }
    await prisma.submissionJob.update({ where: { id: params.id }, data: { status: 'queued' } });
    await jobRunner.enqueue(params.id, { channelId: job.channelId, campaignId: job.campaignId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
