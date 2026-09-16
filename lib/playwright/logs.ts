import { prisma } from '../db';
import type { AttemptResult } from '../types';
import { redact } from './redact';

export { redact };

export async function logAction(params: {
  jobId: string;
  channel: string;
  action: string;
  result?: AttemptResult;
  error?: string | null;
  screenshotPath?: string | null;
}) {
  const { jobId, channel, action, result = 'info', error, screenshotPath } = params;
  return prisma.submissionAttempt.create({
    data: {
      jobId,
      channel,
      action: redact(action),
      result,
      error: error ? redact(error) : null,
      screenshotPath: screenshotPath ?? null,
    },
  });
}

export async function getJobLogs(jobId: string) {
  return prisma.submissionAttempt.findMany({
    where: { jobId },
    orderBy: { timestamp: 'asc' },
  });
}
