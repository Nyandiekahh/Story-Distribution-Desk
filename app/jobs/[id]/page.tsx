import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { StatusPill } from '@/components/StatusPill';
import { screenshotPublicUrl } from '@/lib/playwright/screenshots';

export const dynamic = 'force-dynamic';

export default async function JobLogsPage({ params }: { params: { id: string } }) {
  const job = await prisma.submissionJob.findUnique({
    where: { id: params.id },
    include: {
      story: { select: { headline: true } },
      channel: { select: { name: true } },
      attempts: { orderBy: { timestamp: 'asc' } },
    },
  });
  if (!job) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            {job.channel.name} &middot; {job.story.headline}
          </h1>
          <p className="mt-1 text-sm text-ink/60">Mode: {job.mode}</p>
        </div>
        <StatusPill status={job.status} />
      </div>

      {job.error && <p className="rounded border border-bad/20 bg-badSoft p-3 text-sm text-bad">{job.error}</p>}
      {job.publishedUrl && (
        <p className="text-sm">
          Published at:{' '}
          <a href={job.publishedUrl} target="_blank" rel="noreferrer" className="text-accent underline">
            {job.publishedUrl}
          </a>
        </p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">Log</h2>
        {job.attempts.length === 0 ? (
          <p className="text-sm text-ink/50">No log entries yet.</p>
        ) : (
          <div className="space-y-3">
            {job.attempts.map((attempt: {
              id: string;
              timestamp: string | Date;
              result: string;
              action: string;
              error: string | null;
              screenshotPath: string | null;
            }) => (
              <div key={attempt.id} className="card">
                <div className="flex items-center justify-between">
                  <span className="mono text-xs text-ink/50">{new Date(attempt.timestamp).toLocaleString()}</span>
                  <StatusPill status={attempt.result} />
                </div>
                <p className="mt-1 text-sm text-ink">{attempt.action}</p>
                {attempt.error && <p className="mono mt-1 text-xs text-bad">{attempt.error}</p>}
                {attempt.screenshotPath && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={screenshotPublicUrl(attempt.screenshotPath)}
                    alt={`${attempt.action} screenshot`}
                    className="mt-2 max-w-full rounded border border-line"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
