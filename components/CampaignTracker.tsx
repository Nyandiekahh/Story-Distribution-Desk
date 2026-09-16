'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { StatusPill } from './StatusPill';
import { AUTOMATION_MODES, AUTOMATION_MODE_LABELS, type AutomationMode } from '@/lib/types';

interface JobRow {
  id: string;
  status: string;
  campaignChannelId: string | null;
  error: string | null;
  publishedUrl: string | null;
  retryCount: number;
  maxRetries: number;
  manualInterventionRequired: boolean;
  manualInterventionReason: string | null;
}

interface CampaignChannelRow {
  id: string;
  channelId: string;
  status: string;
  automationMode: string;
  submissionUrl: string | null;
  publishedUrl: string | null;
  notes: string | null;
  error: string | null;
  channel: { id: string; name: string; automationStatus: string };
}

interface CampaignData {
  id: string;
  status: string;
  channels: CampaignChannelRow[];
  jobs: JobRow[];
}

const POLL_MS = 3000;
const PAUSABLE_JOB_STATUSES = ['queued', 'starting', 'navigating', 'filling', 'submitting'];

export function CampaignTracker({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<CampaignData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${campaignId}`, { cache: 'no-store' });
    if (res.ok) {
      const payload = await res.json();
      setData(payload.campaign);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  function latestJobFor(campaignChannelId: string) {
    return data?.jobs.find((j) => j.campaignChannelId === campaignChannelId) ?? null;
  }

  async function queueChannel(channelId: string) {
    setBusyId(channelId);
    await fetch(`/api/campaigns/${campaignId}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelIds: [channelId] }),
    });
    await load();
    setBusyId(null);
  }

  async function jobAction(jobId: string, action: 'continue' | 'cancel' | 'retry' | 'pause' | 'resume') {
    setBusyId(jobId);
    await fetch(`/api/jobs/${jobId}/${action}`, { method: 'POST' });
    await load();
    setBusyId(null);
  }

  async function skip(row: CampaignChannelRow) {
    setBusyId(row.id);
    await fetch(`/api/campaigns/${campaignId}/channels/${row.channelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'skipped' }),
    });
    await load();
    setBusyId(null);
  }

  async function switchMode(row: CampaignChannelRow, mode: AutomationMode) {
    setBusyId(row.id);
    await fetch(`/api/campaigns/${campaignId}/channels/${row.channelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ automationMode: mode }),
    });
    await load();
    setBusyId(null);
  }

  if (!data) return <p className="text-sm text-ink/50">Loading…</p>;

  const counts = data.channels.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="pill bg-ink/[0.06] text-ink/70">{data.channels.length} channels</span>
        {Object.entries(counts).map(([status, count]) => (
          <span key={status} className="pill bg-ink/[0.06] text-ink/70">
            {count} {status.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Channel</th>
              <th>Status</th>
              <th>Mode</th>
              <th>Result</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.channels.map((row) => {
              const job = latestJobFor(row.id);
              const busy = busyId === row.id || (job && busyId === job.id);
              return (
                <tr key={row.id}>
                  <td className="font-medium text-ink">{row.channel.name}</td>
                  <td>
                    <StatusPill status={row.status} />
                    {job?.manualInterventionRequired && (
                      <div className="mt-1 text-xs text-warn">{job.manualInterventionReason?.replace(/_/g, ' ')}</div>
                    )}
                  </td>
                  <td>
                    <select
                      className="input py-1 text-xs"
                      value={row.automationMode}
                      disabled={!!busy}
                      onChange={(e) => switchMode(row, e.target.value as AutomationMode)}
                    >
                      {AUTOMATION_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {AUTOMATION_MODE_LABELS[mode]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="max-w-xs text-xs text-ink/60">
                    {row.publishedUrl && (
                      <a href={row.publishedUrl} target="_blank" rel="noreferrer" className="text-accent underline">
                        {row.publishedUrl}
                      </a>
                    )}
                    {row.error && <p className="text-bad">{row.error}</p>}
                    {row.notes && <p>{row.notes}</p>}
                  </td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1">
                      {row.status === 'to_do' && (
                        <button className="btn-ghost" disabled={!!busy} onClick={() => queueChannel(row.channelId)}>
                          Queue
                        </button>
                      )}
                      {job?.manualInterventionRequired && (
                        <button className="btn-primary" disabled={!!busy} onClick={() => jobAction(job.id, 'continue')}>
                          {job.manualInterventionReason === 'paused_by_user' ? 'Resume' : 'Continue'}
                        </button>
                      )}
                      {job?.status === 'paused' && (
                        <button className="btn-primary" disabled={!!busy} onClick={() => jobAction(job.id, 'resume')}>
                          Resume
                        </button>
                      )}
                      {job && !job.manualInterventionRequired && PAUSABLE_JOB_STATUSES.includes(job.status) && (
                        <button className="btn-ghost" disabled={!!busy} onClick={() => jobAction(job.id, 'pause')}>
                          Pause
                        </button>
                      )}
                      {row.status === 'failed' && job && job.retryCount < job.maxRetries && (
                        <button className="btn-secondary" disabled={!!busy} onClick={() => jobAction(job.id, 'retry')}>
                          Retry
                        </button>
                      )}
                      {!['published', 'submitted', 'skipped'].includes(row.status) && (
                        <button className="btn-ghost" disabled={!!busy} onClick={() => skip(row)}>
                          Skip
                        </button>
                      )}
                      {job && (
                        <Link href={`/jobs/${job.id}`} className="btn-ghost">
                          Logs
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
