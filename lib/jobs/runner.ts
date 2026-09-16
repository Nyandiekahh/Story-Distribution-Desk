import { prisma } from '../db';
import { runChannelJob, type RunnerControls } from '../playwright/channelRunner';
import { ACTIVE_JOB_STATUSES } from '../types';

interface PendingHumanGate {
  reason: string;
  message: string;
  resolve: (decision: 'continue' | 'cancel') => void;
}

interface QueuedJob {
  jobId: string;
  channelId: string;
  campaignId: string | null;
}

interface CampaignLimits {
  maxConcurrentJobs: number | null;
  minDelaySeconds: number | null;
}

/**
 * The in-process job queue. This is deliberately a plain module-level
 * singleton, not a database-backed task queue — Story Distribution Desk
 * is a single local Next.js server the user runs on their own machine,
 * and every browser window it opens lives for as long as that process
 * does. Restarting `next dev`/`next start` clears any in-flight jobs
 * back to Queued on the next request, which is the correct behaviour:
 * we never want to silently resume driving a browser window that may
 * no longer exist.
 *
 * Section 12/28 rate limiting lives here too: a channel that just
 * failed gets a cooldown before its next job is allowed to start, and a
 * campaign's own minimum-delay/max-concurrency settings (or the global
 * defaults in Settings when a job isn't part of a campaign) gate when
 * the next job in the queue is allowed to start.
 */
class JobRunner {
  private queue: QueuedJob[] = [];
  private running = new Map<string, QueuedJob>();
  private cancelled = new Set<string>();
  private pauseRequested = new Set<string>();
  private gates = new Map<string, PendingHumanGate>();
  private concurrencyLimitOverride: number | null = null;

  private lastFailureAtByChannel = new Map<string, number>();
  private lastStartedAtByCampaign = new Map<string, number>();
  private campaignLimits = new Map<string, CampaignLimits>();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  async enqueue(jobId: string, meta?: { channelId?: string; campaignId?: string | null }) {
    if (this.queue.some((q) => q.jobId === jobId) || this.running.has(jobId)) return;
    this.queue.push({ jobId, channelId: meta?.channelId ?? '', campaignId: meta?.campaignId ?? null });
    void this.tick();
  }

  /**
   * Registers a campaign's own concurrency/delay settings (section 28)
   * so its jobs are throttled independently of unrelated campaigns.
   * Safe to call repeatedly (e.g. every time a batch of its channels is
   * queued) since a fresh server process starts with an empty map.
   */
  setCampaignLimits(campaignId: string, limits: CampaignLimits) {
    this.campaignLimits.set(campaignId, limits);
  }

  async setConcurrencyOverride(limit: number | null) {
    this.concurrencyLimitOverride = limit;
    void this.tick();
  }

  private async concurrencyLimit(): Promise<number> {
    if (this.concurrencyLimitOverride) return this.concurrencyLimitOverride;
    const settings = await prisma.distributionSetting.findUnique({ where: { id: 'default' } });
    return settings?.concurrencyLimit ?? 2;
  }

  private async globalDelaysMs(): Promise<{ minDelayMs: number; cooldownMs: number }> {
    const settings = await prisma.distributionSetting.findUnique({ where: { id: 'default' } });
    return {
      minDelayMs: (settings?.minDelaySeconds ?? 300) * 1000,
      cooldownMs: (settings?.cooldownAfterFailureSec ?? 600) * 1000,
    };
  }

  private runningCountForCampaign(campaignId: string): number {
    let count = 0;
    for (const job of this.running.values()) {
      if (job.campaignId === campaignId) count++;
    }
    return count;
  }

  /** Whether `job` is allowed to start right now, given concurrency caps, the channel's failure cooldown, and the campaign's (or global) minimum delay between starts. */
  private isEligible(job: QueuedJob, globalMinDelayMs: number, cooldownMs: number): boolean {
    if (job.campaignId) {
      const limits = this.campaignLimits.get(job.campaignId);
      const cap = limits?.maxConcurrentJobs ?? Infinity;
      if (this.runningCountForCampaign(job.campaignId) >= cap) return false;

      const minDelayMs = Math.max(globalMinDelayMs, (limits?.minDelaySeconds ?? 0) * 1000);
      const last = this.lastStartedAtByCampaign.get(job.campaignId);
      if (last !== undefined && Date.now() - last < minDelayMs) return false;
    }
    if (job.channelId) {
      const lastFailure = this.lastFailureAtByChannel.get(job.channelId);
      if (lastFailure !== undefined && Date.now() - lastFailure < cooldownMs) return false;
    }
    return true;
  }

  private async tick() {
    const limit = await this.concurrencyLimit();
    const { minDelayMs, cooldownMs } = await this.globalDelaysMs();

    while (this.running.size < limit) {
      const idx = this.queue.findIndex((job) => this.isEligible(job, minDelayMs, cooldownMs));
      if (idx === -1) break;
      const [job] = this.queue.splice(idx, 1);
      this.startJob(job);
    }

    // Something is still queued but blocked purely on a delay/cooldown
    // timer rather than on concurrency — check back once that timer is
    // likely up instead of leaving it stuck until an unrelated job ends.
    if (this.queue.length > 0 && this.running.size < limit) {
      this.scheduleDelayedRecheck();
    }
  }

  private scheduleDelayedRecheck() {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.tick();
    }, 5000);
  }

  private startJob(job: QueuedJob) {
    const { jobId } = job;
    this.running.set(jobId, job);
    if (job.campaignId) this.lastStartedAtByCampaign.set(job.campaignId, Date.now());
    this.runOne(job)
      .catch(() => {
        // runChannelJob already persisted the failure to the job row;
        // swallow here so one bad job can't crash the process.
      })
      .finally(() => {
        this.running.delete(jobId);
        this.gates.delete(jobId);
        this.pauseRequested.delete(jobId);
        void this.tick();
      });
  }

  private async runOne(job: QueuedJob) {
    const { jobId, channelId } = job;
    const controls: RunnerControls = {
      isCancelled: () => this.cancelled.has(jobId),
      isPauseRequested: () => this.pauseRequested.has(jobId),
      clearPauseRequested: () => this.pauseRequested.delete(jobId),
      waitForHuman: (reason, message) =>
        new Promise<'continue' | 'cancel'>((resolve) => {
          this.gates.set(jobId, { reason, message, resolve });
        }),
    };
    try {
      await runChannelJob(jobId, controls);
    } catch (err) {
      if (channelId) this.lastFailureAtByChannel.set(channelId, Date.now());
      throw err;
    } finally {
      this.cancelled.delete(jobId);
    }
  }

  /** Called by POST /api/jobs/:id/continue once the user has handled a manual checkpoint (or a pause — see requestPause). */
  continueJob(jobId: string): boolean {
    const gate = this.gates.get(jobId);
    if (!gate) return false;
    this.gates.delete(jobId);
    gate.resolve('continue');
    return true;
  }

  /** Called by POST /api/jobs/:id/cancel. Works whether or not the job is currently paused/waiting. */
  cancelJob(jobId: string): boolean {
    this.cancelled.add(jobId);
    const gate = this.gates.get(jobId);
    if (gate) {
      this.gates.delete(jobId);
      gate.resolve('cancel');
    }
    const queuedIndex = this.queue.findIndex((q) => q.jobId === jobId);
    if (queuedIndex >= 0) {
      this.queue.splice(queuedIndex, 1);
      return true;
    }
    return gate !== undefined || this.running.has(jobId);
  }

  /** Removes a not-yet-started job from the queue without marking it cancelled — the "queued" half of Pause (section 33). */
  removeFromQueue(jobId: string): boolean {
    const idx = this.queue.findIndex((q) => q.jobId === jobId);
    if (idx === -1) return false;
    this.queue.splice(idx, 1);
    return true;
  }

  /** Asks a currently-running job to pause at its next safe checkpoint — the "in progress" half of Pause (section 33). Resumed the same way a manual checkpoint is: continueJob(). */
  requestPause(jobId: string): boolean {
    if (!this.running.has(jobId)) return false;
    this.pauseRequested.add(jobId);
    return true;
  }

  isRunning(jobId: string) {
    return this.running.has(jobId);
  }

  isQueued(jobId: string) {
    return this.queue.some((q) => q.jobId === jobId);
  }

  activeJobIds() {
    return Array.from(this.running.keys());
  }

  queuedJobIds() {
    return this.queue.map((q) => q.jobId);
  }

  pendingGateFor(jobId: string) {
    const gate = this.gates.get(jobId);
    return gate ? { reason: gate.reason, message: gate.message } : null;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __jobRunner: JobRunner | undefined;
}

export const jobRunner = global.__jobRunner ?? new JobRunner();
if (process.env.NODE_ENV !== 'production') {
  global.__jobRunner = jobRunner;
}

/**
 * Recovers from an unclean shutdown: any job left "in flight" in the
 * database when the server was not actually running it belongs back in
 * Queued, never silently resumed against a browser window that's gone.
 * It's put straight back onto the in-process queue too, so it actually
 * runs again rather than sitting at "Queued" forever waiting for
 * something else to re-enqueue it.
 */
export async function reconcileStaleJobsOnBoot() {
  const stale = await prisma.submissionJob.findMany({
    where: { status: { in: ACTIVE_JOB_STATUSES } },
  });
  for (const job of stale) {
    if (!jobRunner.isRunning(job.id) && !jobRunner.isQueued(job.id)) {
      await prisma.submissionJob.update({
        where: { id: job.id },
        data: { status: 'queued', manualInterventionRequired: false, manualInterventionReason: null },
      });
      await jobRunner.enqueue(job.id, { channelId: job.channelId, campaignId: job.campaignId });
    }
  }
}
