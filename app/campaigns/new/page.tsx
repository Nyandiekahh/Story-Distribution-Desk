import Link from 'next/link';
import { prisma } from '@/lib/db';
import { CampaignForm } from '@/components/CampaignForm';

export const dynamic = 'force-dynamic';

export default async function NewCampaignPage({ searchParams }: { searchParams: { storyId?: string } }) {
  const [stories, channels] = await Promise.all([
    prisma.story.findMany({ where: { archived: false }, orderBy: { updatedAt: 'desc' } }),
    prisma.channel.findMany({ where: { enabled: true }, orderBy: { name: 'asc' } }),
  ]);

  const storyVersions = stories.length
    ? await prisma.storyVersion.findMany({
        where: { storyId: { in: stories.map((s: { id: string }) => s.id) } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, storyId: true, label: true },
      })
    : [];
  const versionsByStory: Record<string, { id: string; label: string }[]> = {};
  for (const v of storyVersions as { id: string; storyId: string; label: string }[]) {
    (versionsByStory[v.storyId] ??= []).push({ id: v.id, label: v.label });
  }

  if (stories.length === 0) {
    return (
      <div className="max-w-2xl space-y-3">
        <h1 className="text-xl font-semibold text-ink">New campaign</h1>
        <p className="text-sm text-ink/60">
          You need a story first.{' '}
          <Link href="/stories/new" className="text-accent underline">
            Create one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">New campaign</h1>
        <p className="mt-1 text-sm text-ink/60">Pick a story, choose channels, and review the plan before it queues.</p>
      </div>
      <CampaignForm
        stories={stories.map((s: { id: string; headline: string }) => ({ id: s.id, headline: s.headline }))}
        channels={channels.map((c: { id: string; name: string; channelType: string; country: string | null; automationStatus: string }) => ({
          id: c.id,
          name: c.name,
          channelType: c.channelType,
          country: c.country,
          automationStatus: c.automationStatus,
        }))}
        versionsByStory={versionsByStory}
        defaultStoryId={searchParams.storyId}
      />
    </div>
  );
}
