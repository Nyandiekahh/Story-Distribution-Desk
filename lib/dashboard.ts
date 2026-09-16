import { prisma } from './db';

export async function getDashboardStats() {
  const [stories, activeCampaigns, statusCounts, recentAttempts] = await Promise.all([
    prisma.story.count({ where: { archived: false } }),
    prisma.campaign.count({ where: { status: { in: ['running', 'scheduled'] } } }),
    prisma.submissionJob.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.submissionAttempt.findMany({
      orderBy: { timestamp: 'desc' },
      take: 8,
      include: { job: { select: { channelId: true, storyId: true } } },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const row of statusCounts) counts[row.status] = row._count._all;

  return {
    stories,
    activeCampaigns,
    queued: (counts.queued ?? 0) + (counts.paused ?? 0),
    running:
      (counts.starting ?? 0) + (counts.navigating ?? 0) + (counts.filling ?? 0) + (counts.submitting ?? 0),
    waiting: counts.waiting_for_user ?? 0,
    published: counts.success ?? 0,
    failed: counts.failed ?? 0,
    recentAttempts,
  };
}
