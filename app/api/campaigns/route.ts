import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { campaignInputSchema } from '@/lib/validation';
import { handleRouteError } from '@/lib/apiHelpers';
import { queueChannelsForStory } from '@/lib/jobs/queue';

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      story: true,
      channels: { include: { channel: true } },
    },
  });
  return NextResponse.json({ campaigns });
}

/**
 * Creates the campaign, its per-channel tracker rows, and immediately
 * queues a SubmissionJob for each channel (section 11's "Add to
 * Distribution Queue"). Scheduling a future start is handled by
 * passing scheduledStart — see section 28; a scheduled campaign is
 * created in "scheduled" status and its jobs are queued by the
 * scheduler tick rather than here.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = campaignInputSchema.parse(body);

    const campaign = await prisma.campaign.create({
      data: {
        name: input.name,
        storyId: input.storyId,
        storyVersionId: input.storyVersionId ?? null,
        status: input.scheduledStart ? 'scheduled' : 'running',
        scheduledStart: input.scheduledStart ? new Date(input.scheduledStart) : null,
        minDelayMinutes: input.minDelayMinutes,
        maxConcurrentJobs: input.maxConcurrentJobs,
        channels: {
          // A scheduled campaign's reviewed content (section 13) is
          // captured here and carried forward until the scheduler
          // actually queues the job later — see lib/jobs/queue.ts.
          create: input.channelIds.map((channelId) => ({
            channelId,
            status: 'to_do',
            contentOverrideJson: input.contentOverrides?.[channelId] ? JSON.stringify(input.contentOverrides[channelId]) : null,
          })),
        },
      },
      include: { channels: true },
    });

    if (!input.scheduledStart) {
      await queueChannelsForStory({
        storyId: input.storyId,
        storyVersionId: input.storyVersionId,
        channelIds: input.channelIds,
        campaignId: campaign.id,
        contentOverrides: input.contentOverrides,
      });
    }

    const full = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: { story: true, channels: { include: { channel: true } } },
    });

    return NextResponse.json({ campaign: full }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
