import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { StoryForm } from '@/components/StoryForm';
import { OptimizePanel } from '@/components/OptimizePanel';

export const dynamic = 'force-dynamic';

export default async function StoryDetailPage({ params }: { params: { id: string } }) {
  const story = await prisma.story.findUnique({
    where: { id: params.id },
    include: { versions: { orderBy: { createdAt: 'desc' } } },
  });
  if (!story) notFound();

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{story.headline}</h1>
          <p className="mt-1 text-sm text-ink/60">
            Created {new Date(story.createdAt).toLocaleDateString()} &middot; updated{' '}
            {new Date(story.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <Link href={`/campaigns/new?storyId=${story.id}`} className="btn-primary">
          Distribute this story
        </Link>
      </div>

      <OptimizePanel storyId={story.id} />

      {story.versions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">Saved versions</h2>
          <div className="space-y-3">
            {story.versions.map((version: {
              id: string;
              label: string;
              source: string;
              createdAt: string | Date;
              headlines: string;
              metaDescription: string | null;
              pressRelease: string | null;
            }) => {
              const headlines: string[] = JSON.parse(version.headlines || '[]');
              return (
                <details key={version.id} className="card">
                  <summary className="cursor-pointer text-sm font-medium text-ink">
                    {version.label}{' '}
                    <span className="ml-2 text-xs text-ink/40">
                      {version.source} &middot; {new Date(version.createdAt).toLocaleDateString()}
                    </span>
                  </summary>
                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      <span className="font-medium text-ink/70">Headlines:</span> {headlines.join(' / ')}
                    </p>
                    {version.metaDescription && (
                      <p>
                        <span className="font-medium text-ink/70">Meta description:</span> {version.metaDescription}
                      </p>
                    )}
                    {version.pressRelease && (
                      <p className="whitespace-pre-wrap text-ink/80">
                        <span className="font-medium text-ink/70">Press release: </span>
                        {version.pressRelease}
                      </p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">Edit story</h2>
        <StoryForm
          storyId={story.id}
          initial={{
            headline: story.headline,
            category: story.category ?? '',
            summary: story.summary ?? '',
            body: story.body,
            imageUrl: story.imageUrl ?? '',
            referenceLink: story.referenceLink ?? '',
            authorName: story.authorName ?? '',
            targetCountries: story.targetCountries ?? '',
            targetRegions: story.targetRegions ?? '',
            keywords: story.keywords ?? '',
            tags: story.tags ?? '',
          }}
        />
      </section>
    </div>
  );
}
