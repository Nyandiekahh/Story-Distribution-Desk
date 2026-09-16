/**
 * Runs once when the Next.js server process starts. Its only job is
 * section 22's failure-recovery guarantee in reverse: if the server was
 * killed while a job was mid-flight, that job's browser window is gone,
 * so we put the job back in Queued rather than let the UI show a job
 * as "running" when nothing is actually driving it.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { reconcileStaleJobsOnBoot } = await import('./lib/jobs/runner');
    await reconcileStaleJobsOnBoot().catch((err) => {
      console.error('Failed to reconcile stale jobs on boot:', err);
    });

    const { startScheduler } = await import('./lib/jobs/scheduler');
    startScheduler();
  }
}
