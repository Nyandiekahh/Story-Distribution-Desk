import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleRouteError } from '@/lib/apiHelpers';
import { jobCreateSchema } from '@/lib/validation';
import { queueChannelsForStory } from '@/lib/jobs/queue';
import { ACTIVE_JOB_STATUSES } from '@/lib/types';

/**
 * Polled by the dashboard's "Active jobs" and Browser Control Panel
 * widgets every few seconds. `?active=true` narrows to jobs that are
 * actually running or waiting on a person right now.
 */
export async function GET(request: NextRequest) {
  const active = request.nextUrl.searchParams.get('active') === 'true';
  const jobs = await prisma.submissionJob.findMany({
    where: active ? { status: { in: [...ACTIVE_JOB_STATUSES, 'queued', 'paused'] } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: active ? undefined : 50,
    include: { story: { select: { id: true, headline: true } }, channel: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ jobs });
}

/** Ad-hoc submission outside of a campaign — one story, one or more channels, right now. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = jobCreateSchema.parse(body);
    const created = await queueChannelsForStory({
      storyId: input.storyId,
      storyVersionId: input.storyVersionId,
      channelIds: input.channelIds,
      modeOverride: input.mode,
      campaignId: input.campaignId,
    });
    return NextResponse.json({ jobs: created }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
