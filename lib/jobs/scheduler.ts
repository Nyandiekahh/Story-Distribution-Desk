import { prisma } from '../db';
import { queueChannelsForStory } from './queue';

const CHECK_INTERVAL_MS = 30_000;

/**
 * Section 28: a scheduled campaign should queue its jobs itself once
 * its start time arrives, without the user needing to be looking at
 * the app. This is a plain in-process poll rather than a real cron —
 * appropriate for a local single-server tool, but it only fires while
 * `npm run dev` / `npm run start` is actually running (see the README's
 * "Known limitations").
 */
async function tick() {
  const due = await prisma.campaign.findMany({
    where: { status: 'scheduled', scheduledStart: { lte: new Date() } },
    include: { channels: true },
  });

  for (const campaign of due) {
    const toDoChannelIds = campaign.channels
      .filter((c: { status: string; channelId: string }) => c.status === 'to_do')
      .map((c: { channelId: string }) => c.channelId);

    if (toDoChannelIds.length > 0) {
      await queueChannelsForStory({
        storyId: campaign.storyId,
        storyVersionId: campaign.storyVersionId,
        channelIds: toDoChannelIds,
        campaignId: campaign.id,
      });
    }

    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'running' } });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __schedulerStarted: boolean | undefined;
}

export function startScheduler() {
  if (global.__schedulerStarted) return;
  global.__schedulerStarted = true;
  setInterval(() => {
    tick().catch((err) => console.error('Campaign scheduler tick failed:', err));
  }, CHECK_INTERVAL_MS);
}
