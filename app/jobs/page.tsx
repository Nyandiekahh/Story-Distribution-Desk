import { prisma } from '@/lib/db';
import { JobsPanel } from '@/components/JobsPanel';
import { StatusPill } from '@/components/StatusPill';
import { HelpNote } from '@/components/HelpNote';

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const recent = await prisma.submissionJob.findMany({
    where: { status: { in: ['success', 'failed', 'cancelled'] } },
    orderBy: { completedAt: 'desc' },
    take: 40,
    include: { story: { select: { headline: true } }, channel: { select: { name: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Distribution queue</h1>
        <p className="mt-1 text-sm text-ink/60">Everything queued or running now, and what finished recently.</p>
      </div>

      <HelpNote title="Queue status">
        <p>
          Each entry is a single channel submission. A job requiring action is stopped pending Continue, Resume,
          or Cancel, and does not block other jobs. Failed jobs may be retried. Published jobs display a live
          link once available; verify it before considering the submission final.
        </p>
      </HelpNote>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">Active</h2>
        <JobsPanel />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">Recently finished</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-ink/50">Nothing has finished yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Story</th>
                  <th>Status</th>
                  <th>Finished</th>
                  <th>Published URL</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((job: {
                  id: string;
                  status: string;
                  completedAt: string | Date | null;
                  publishedUrl: string | null;
                  error: string | null;
                  channel: { name: string };
                  story: { headline: string };
                }) => (
                  <tr key={job.id}>
                    <td className="font-medium text-ink">{job.channel.name}</td>
                    <td className="text-ink/70">{job.story.headline}</td>
                    <td>
                      <StatusPill status={job.status} />
                    </td>
                    <td className="mono text-ink/50">{job.completedAt ? new Date(job.completedAt).toLocaleString() : '—'}</td>
                    <td className="max-w-xs truncate text-ink/60">
                      {job.publishedUrl ? (
                        <a href={job.publishedUrl} target="_blank" rel="noreferrer" className="text-accent underline">
                          {job.publishedUrl}
                        </a>
                      ) : (
                        job.error ?? '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
