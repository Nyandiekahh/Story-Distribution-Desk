import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jobRunner } from '@/lib/jobs/runner';
import { jsonError, handleRouteError } from '@/lib/apiHelpers';

// A job already sitting at "waiting_for_user" is already stopped for a
// checkpoint of its own (a manual mode, a review stop, a blocker) —
// Continue/Cancel are the right actions there, not Pause on top of it.
const PAUSABLE_RUNNING_STATUSES = ['starting', 'navigating', 'filling', 'submitting'];

/**
 * Section 33: the user must always be able to Pause a job, distinct
 * from Cancel. A still-queued job is simply pulled off the queue and
 * marked "paused" so it never starts; a running job is asked to pause
 * at its next safe checkpoint (see checkPause() in channelRunner.ts),
 * at which point it shows up as a normal manual-intervention wait with
 * reason "paused_by_user" — resumed the same way any checkpoint is,
 * via POST /api/jobs/:id/continue (or this route's counterpart, resume,
 * for the still-queued case).
 */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const job = await prisma.submissionJob.findUnique({ where: { id: params.id } });
    if (!job) return jsonError('Job not found', 404);

    if (job.status === 'queued' && jobRunner.removeFromQueue(params.id)) {
      await prisma.submissionJob.update({ where: { id: params.id }, data: { status: 'paused' } });
      return NextResponse.json({ ok: true });
    }

    if (PAUSABLE_RUNNING_STATUSES.includes(job.status) && jobRunner.requestPause(params.id)) {
      return NextResponse.json({ ok: true, pending: true });
    }

    return jsonError('This job cannot be paused in its current state.', 409);
  } catch (err) {
    return handleRouteError(err);
  }
}
