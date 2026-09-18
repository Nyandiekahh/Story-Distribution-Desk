import Link from 'next/link';
import { getDashboardStats } from '@/lib/dashboard';
import { JobsPanel } from '@/components/JobsPanel';
import { StatusPill } from '@/components/StatusPill';
import { HelpNote } from '@/components/HelpNote';

export const dynamic = 'force-dynamic';

function StatCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <div className="card">
      <div className="text-2xl font-semibold text-ink">{value}</div>
      <div className="text-sm text-ink/60">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink/60">
          Everything that&rsquo;s queued, running, or waiting on you across every campaign.
        </p>
      </div>

      <HelpNote title="Distribution status">
        <p>
          A Story is sent to a set of Channels as a Campaign. Each channel is tracked as an individual job:
          Queued, then Running, ending in Published or Failed.
        </p>
        <p>
          Waiting for you indicates a job has stopped for a required action — see the Queue for details.
        </p>
      </HelpNote>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <StatCard label="Stories" value={stats.stories} href="/stories" />
        <StatCard label="Active campaigns" value={stats.activeCampaigns} href="/campaigns" />
        <StatCard label="Queued jobs" value={stats.queued} href="/jobs" />
        <StatCard label="Running jobs" value={stats.running} href="/jobs" />
        <StatCard label="Waiting for you" value={stats.waiting} href="/jobs" />
        <StatCard label="Published" value={stats.published} href="/jobs" />
        <StatCard label="Failed" value={stats.failed} href="/jobs" />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">
          Queued &amp; running jobs
        </h2>
        <JobsPanel emptyHint="Nothing queued or running. Start a campaign from a story to see it here." />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">Recent activity</h2>
        {stats.recentAttempts.length === 0 ? (
          <p className="text-sm text-ink/50">No automation activity yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Channel</th>
                  <th>Action</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentAttempts.map((attempt: {
                  id: string;
                  timestamp: string | Date;
                  channel: string;
                  action: string;
                  result: string;
                }) => (
                  <tr key={attempt.id}>
                    <td className="mono text-ink/60">{new Date(attempt.timestamp).toLocaleString()}</td>
                    <td>{attempt.channel}</td>
                    <td>{attempt.action}</td>
                    <td>
                      <StatusPill status={attempt.result} />
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
