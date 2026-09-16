import { beforeEach, describe, expect, it, vi } from 'vitest';

// runner.ts pulls in Prisma (via ../db) and the real Playwright-driving
// channelRunner. Neither should ever be touched by this test — we're
// only verifying the queue/concurrency/gate state machine itself, so
// both are replaced with lightweight fakes before importing the module
// under test.
const settingsMock = { concurrencyLimit: 1, minDelaySeconds: 0, cooldownAfterFailureSec: 0 };
vi.mock('../../lib/db', () => ({
  prisma: {
    distributionSetting: {
      findUnique: vi.fn(async () => settingsMock),
    },
    submissionJob: {
      findMany: vi.fn(async () => []),
      update: vi.fn(async () => ({})),
    },
  },
}));

const runChannelJobMock = vi.fn();
vi.mock('../../lib/playwright/channelRunner', () => ({
  runChannelJob: (...args: unknown[]) => runChannelJobMock(...args),
}));

/** The runner chains several un-awaited promises (enqueue -> tick -> runOne -> ...), so tests give that chain real time to settle rather than counting microtask hops. */
function flush(ms = 20) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('JobRunner', () => {
  beforeEach(() => {
    vi.resetModules();
    // runner.ts stashes its singleton on globalThis so Next's dev-mode
    // HMR doesn't lose it — but that means resetModules() alone won't
    // give each test a fresh instance unless we also clear it here.
    delete (globalThis as unknown as Record<string, unknown>).__jobRunner;
    runChannelJobMock.mockReset();
    settingsMock.concurrencyLimit = 1;
    settingsMock.minDelaySeconds = 0;
    settingsMock.cooldownAfterFailureSec = 0;
  });

  it('runs a single enqueued job to completion', async () => {
    const { jobRunner } = await import('../../lib/jobs/runner');
    let resolveJob: () => void = () => {};
    runChannelJobMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveJob = resolve;
        }),
    );

    await jobRunner.enqueue('job-1');
    // give the microtask queue a tick to start the job
    await flush();
    expect(jobRunner.isRunning('job-1')).toBe(true);

    resolveJob();
    await flush();
    expect(jobRunner.isRunning('job-1')).toBe(false);
  });

  it('respects the concurrency limit, queueing extra jobs', async () => {
    settingsMock.concurrencyLimit = 1;
    const { jobRunner } = await import('../../lib/jobs/runner');

    const resolvers: Array<() => void> = [];
    runChannelJobMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    await jobRunner.enqueue('job-a');
    await jobRunner.enqueue('job-b');
    await flush();

    expect(jobRunner.isRunning('job-a')).toBe(true);
    expect(jobRunner.isRunning('job-b')).toBe(false);
    expect(jobRunner.isQueued('job-b')).toBe(true);

    resolvers[0]();
    await flush();

    expect(jobRunner.isRunning('job-b')).toBe(true);
  });

  it('continueJob resolves the pending human gate and returns false when there is none', async () => {
    const { jobRunner } = await import('../../lib/jobs/runner');

    let decision: string | null = null;
    runChannelJobMock.mockImplementation(async (_jobId: string, controls: { waitForHuman: (r: string, m: string) => Promise<string> }) => {
      decision = await controls.waitForHuman('ready_for_review', 'Review and submit yourself.');
    });

    expect(jobRunner.continueJob('nonexistent')).toBe(false);

    await jobRunner.enqueue('job-c');
    await flush();

    expect(jobRunner.pendingGateFor('job-c')).toEqual({
      reason: 'ready_for_review',
      message: 'Review and submit yourself.',
    });

    const resolved = jobRunner.continueJob('job-c');
    expect(resolved).toBe(true);
    await flush();
    expect(decision).toBe('continue');
  });

  it('cancelJob removes a still-queued job without ever starting it', async () => {
    settingsMock.concurrencyLimit = 0; // nothing is allowed to start
    const { jobRunner } = await import('../../lib/jobs/runner');

    await jobRunner.enqueue('job-d');
    expect(jobRunner.isQueued('job-d')).toBe(true);

    const cancelled = jobRunner.cancelJob('job-d');
    expect(cancelled).toBe(true);
    expect(jobRunner.isQueued('job-d')).toBe(false);
    expect(runChannelJobMock).not.toHaveBeenCalled();
  });

  // Section 33's Pause.
  describe('pause', () => {
    it('removeFromQueue takes a not-yet-started job out of the queue', async () => {
      settingsMock.concurrencyLimit = 0;
      const { jobRunner } = await import('../../lib/jobs/runner');

      await jobRunner.enqueue('job-p');
      expect(jobRunner.isQueued('job-p')).toBe(true);
      expect(jobRunner.removeFromQueue('job-p')).toBe(true);
      expect(jobRunner.isQueued('job-p')).toBe(false);
    });

    it('requestPause flags a running job so its controls report isPauseRequested until cleared', async () => {
      const { jobRunner } = await import('../../lib/jobs/runner');

      type Captured = { isPauseRequested: () => boolean; clearPauseRequested: () => void };
      const state: { controls: Captured | null } = { controls: null };
      let resolveJob: () => void = () => {};
      runChannelJobMock.mockImplementation((_jobId: string, controls: Captured) => {
        state.controls = controls;
        return new Promise<void>((resolve) => {
          resolveJob = resolve;
        });
      });

      await jobRunner.enqueue('job-q', { channelId: 'chan-q' });
      await flush();
      expect(jobRunner.isRunning('job-q')).toBe(true);

      expect(jobRunner.requestPause('job-q')).toBe(true);
      expect(state.controls?.isPauseRequested()).toBe(true);
      state.controls?.clearPauseRequested();
      expect(state.controls?.isPauseRequested()).toBe(false);

      resolveJob();
      await flush();
    });

    it('requestPause returns false for a job that is not currently running', async () => {
      const { jobRunner } = await import('../../lib/jobs/runner');
      expect(jobRunner.requestPause('nonexistent')).toBe(false);
    });
  });

  // Section 12/28 rate limiting.
  describe('rate limiting', () => {
    it('applies a per-channel cooldown after a failure before starting another job for that channel', async () => {
      settingsMock.concurrencyLimit = 2;
      settingsMock.cooldownAfterFailureSec = 600;
      const { jobRunner } = await import('../../lib/jobs/runner');

      runChannelJobMock.mockImplementationOnce(async () => {
        throw new Error('boom');
      });
      await jobRunner.enqueue('job-fail', { channelId: 'chan-x' });
      await flush();
      expect(jobRunner.isRunning('job-fail')).toBe(false);

      let started = false;
      runChannelJobMock.mockImplementationOnce(async () => {
        started = true;
      });
      await jobRunner.enqueue('job-next', { channelId: 'chan-x' });
      await flush();

      expect(started).toBe(false);
      expect(jobRunner.isQueued('job-next')).toBe(true);
    });

    it('does not apply a channel’s cooldown to a different channel', async () => {
      settingsMock.concurrencyLimit = 2;
      settingsMock.cooldownAfterFailureSec = 600;
      const { jobRunner } = await import('../../lib/jobs/runner');

      runChannelJobMock.mockImplementationOnce(async () => {
        throw new Error('boom');
      });
      await jobRunner.enqueue('job-fail', { channelId: 'chan-x' });
      await flush();

      let started = false;
      runChannelJobMock.mockImplementationOnce(async () => {
        started = true;
      });
      await jobRunner.enqueue('job-other-channel', { channelId: 'chan-y' });
      await flush();

      expect(started).toBe(true);
    });

    it('applies a campaign’s minimum delay between successive job starts', async () => {
      settingsMock.concurrencyLimit = 2;
      const { jobRunner } = await import('../../lib/jobs/runner');
      jobRunner.setCampaignLimits('camp-1', { maxConcurrentJobs: 5, minDelaySeconds: 600 });

      let resolveFirst: () => void = () => {};
      runChannelJobMock.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      );
      await jobRunner.enqueue('job-1', { channelId: 'chan-a', campaignId: 'camp-1' });
      await flush();
      expect(jobRunner.isRunning('job-1')).toBe(true);
      resolveFirst();
      await flush();
      expect(jobRunner.isRunning('job-1')).toBe(false);

      let secondStarted = false;
      runChannelJobMock.mockImplementationOnce(async () => {
        secondStarted = true;
      });
      await jobRunner.enqueue('job-2', { channelId: 'chan-b', campaignId: 'camp-1' });
      await flush();

      expect(secondStarted).toBe(false);
      expect(jobRunner.isQueued('job-2')).toBe(true);
    });

    it('caps concurrent jobs for a single campaign independently of the global limit', async () => {
      settingsMock.concurrencyLimit = 5;
      const { jobRunner } = await import('../../lib/jobs/runner');
      jobRunner.setCampaignLimits('camp-2', { maxConcurrentJobs: 1, minDelaySeconds: 0 });

      runChannelJobMock.mockImplementation(() => new Promise<void>(() => {}));

      await jobRunner.enqueue('job-a', { channelId: 'chan-a', campaignId: 'camp-2' });
      await jobRunner.enqueue('job-b', { channelId: 'chan-b', campaignId: 'camp-2' });
      await flush();

      expect(jobRunner.isRunning('job-a')).toBe(true);
      expect(jobRunner.isRunning('job-b')).toBe(false);
      expect(jobRunner.isQueued('job-b')).toBe(true);
    });
  });
});
