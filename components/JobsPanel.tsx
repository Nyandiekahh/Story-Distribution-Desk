'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { StatusPill } from './StatusPill';
import { CHECKPOINT_REASON_LABELS, OTHER_WAIT_REASON_LABELS } from '@/lib/types';

interface JobRow {
  id: string;
  status: string;
  mode: string;
  manualInterventionRequired: boolean;
  manualInterventionReason: string | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  story: { id: string; headline: string };
  channel: { id: string; name: string };
}

const POLL_MS = 3000;

// A short label for every reason a job can stop and wait on a person —
// section 9's twelve checkpoint reasons (CHECKPOINT_REASON_LABELS) plus
// the non-checkpoint waits (manual mode, ready-for-review, a user pause —
// OTHER_WAIT_REASON_LABELS) — each turned into a full instruction line.
const REASON_COPY: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(CHECKPOINT_REASON_LABELS).map(([key, label]) => [key, `${label}. Interact with the browser window, then press Continue.`]),
  ),
  ...OTHER_WAIT_REASON_LABELS,
};

const PAUSABLE_STATUSES = ['queued', 'starting', 'navigating', 'filling', 'submitting'];

export function JobsPanel({ emptyHint }: { emptyHint?: string }) {
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/jobs?active=true', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  async function act(jobId: string, action: 'continue' | 'cancel' | 'retry' | 'pause' | 'resume') {
    setBusyId(jobId);
    try {
      await fetch(`/api/jobs/${jobId}/${action}`, { method: 'POST' });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (jobs === null) {
    return <p className="text-sm text-ink/50">Loading…</p>;
  }

  if (jobs.length === 0) {
    return <p className="text-sm text-ink/50">{emptyHint ?? 'Nothing queued or running right now.'}</p>;
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-ink">{job.channel.name}</div>
              <div className="text-sm text-ink/60">{job.story.headline}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="pill bg-ink/[0.06] text-ink/70">{job.mode}</span>
              <StatusPill status={job.status} />
            </div>
          </div>

          {job.manualInterventionRequired && (
            <div className="mt-3 rounded border border-warn/30 bg-warnSoft p-3 text-sm text-warn">
              <p className="font-medium">{job.manualInterventionReason === 'paused_by_user' ? 'Paused' : 'Manual action required'}</p>
              <p className="mt-0.5 text-warn/90">
                {REASON_COPY[job.manualInterventionReason ?? ''] ??
                  'Interact with the browser window, then press Continue.'}
              </p>
            </div>
          )}

          {job.status === 'paused' && (
            <div className="mt-3 rounded border border-warn/30 bg-warnSoft p-3 text-sm text-warn">
              <p className="font-medium">Paused</p>
              <p className="mt-0.5 text-warn/90">This job was paused before it started. Press Resume to put it back in the queue.</p>
            </div>
          )}

          {job.error && job.status === 'failed' && (
            <p className="mono mt-3 rounded border border-bad/20 bg-badSoft p-2 text-bad">{job.error}</p>
          )}

          <div className="mt-3 flex gap-2">
            {job.manualInterventionRequired && (
              <button
                className="btn-primary"
                disabled={busyId === job.id}
                onClick={() => act(job.id, 'continue')}
              >
                {job.manualInterventionReason === 'paused_by_user' ? 'Resume' : 'Continue'}
              </button>
            )}
            {job.status === 'paused' && (
              <button className="btn-primary" disabled={busyId === job.id} onClick={() => act(job.id, 'resume')}>
                Resume
              </button>
            )}
            {!job.manualInterventionRequired && PAUSABLE_STATUSES.includes(job.status) && (
              <button className="btn-secondary" disabled={busyId === job.id} onClick={() => act(job.id, 'pause')}>
                Pause
              </button>
            )}
            {job.status === 'failed' && job.retryCount < job.maxRetries && (
              <button className="btn-secondary" disabled={busyId === job.id} onClick={() => act(job.id, 'retry')}>
                Retry
              </button>
            )}
            {!['success', 'failed', 'cancelled'].includes(job.status) && (
              <button className="btn-danger" disabled={busyId === job.id} onClick={() => act(job.id, 'cancel')}>
                Cancel
              </button>
            )}
            <Link href={`/jobs/${job.id}`} className="btn-ghost">
              View logs
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
