import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleRouteError, jsonError } from '@/lib/apiHelpers';
import { queueChannelsForStory } from '@/lib/jobs/queue';

/**
 * "Add to Distribution Queue" (section 11) for a campaign that hasn't
 * been queued yet, or a re-queue of whichever of its channels are
 * still sitting at To Do / Skipped / Failed.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: { channels: true },
    });
    if (!campaign) return jsonError('Campaign not found', 404);

    const requested: string[] | undefined = body.channelIds;
    const eligible = campaign.channels.filter((c: { channelId: string; status: string }) =>
      requested ? requested.includes(c.channelId) : ['to_do', 'skipped', 'failed'].includes(c.status),
    );
    if (eligible.length === 0) {
      return jsonError('No eligible channels to queue.', 422);
    }

    const created = await queueChannelsForStory({
      storyId: campaign.storyId,
      storyVersionId: campaign.storyVersionId,
      channelIds: eligible.map((c: { channelId: string }) => c.channelId),
      campaignId: campaign.id,
    });

    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'running' } });

    return NextResponse.json({ queued: created });
  } catch (err) {
    return handleRouteError(err);
  }
}
