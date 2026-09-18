import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StoryRowActions } from '@/components/StoryRowActions';
import { HelpNote } from '@/components/HelpNote';

export const dynamic = 'force-dynamic';

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: { archived?: string };
}) {
  const archived = searchParams.archived === 'true';
  const stories = await prisma.story.findMany({
    where: { archived },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { versions: true, jobs: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Stories</h1>
          <p className="mt-1 text-sm text-ink/60">Everything you&rsquo;ve written and might distribute.</p>
        </div>
        <Link href="/stories/new" className="btn-primary">
          New story
        </Link>
      </div>

      <HelpNote>
        <p>
          Stories are the source content for distribution. Open a story to generate channel-specific versions
          or begin a distribution campaign.
        </p>
      </HelpNote>

      <div className="flex gap-1 text-sm">
        <Link href="/stories" className={`rounded px-2.5 py-1 ${!archived ? 'bg-accentSoft text-accent' : 'text-ink/50'}`}>
          Active
        </Link>
        <Link
          href="/stories?archived=true"
          className={`rounded px-2.5 py-1 ${archived ? 'bg-accentSoft text-accent' : 'text-ink/50'}`}
        >
          Archived
        </Link>
      </div>

      {stories.length === 0 ? (
        <p className="text-sm text-ink/50">
          {archived ? 'No archived stories.' : 'No stories yet — create your first one to get started.'}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Headline</th>
                <th>Category</th>
                <th>Versions</th>
                <th>Submissions</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stories.map((story: {
                id: string;
                headline: string;
                summary: string | null;
                category: string | null;
                archived: boolean;
                updatedAt: string | Date;
                _count: { versions: number; jobs: number };
              }) => (
                <tr key={story.id}>
                  <td>
                    <Link href={`/stories/${story.id}`} className="font-medium text-ink hover:text-accent">
                      {story.headline}
                    </Link>
                    {story.summary && <div className="mt-0.5 text-xs text-ink/50">{story.summary}</div>}
                  </td>
                  <td className="text-ink/70">{story.category || '—'}</td>
                  <td className="text-ink/70">{story._count.versions}</td>
                  <td className="text-ink/70">{story._count.jobs}</td>
                  <td className="mono text-ink/50">{new Date(story.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <StoryRowActions storyId={story.id} archived={story.archived} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
