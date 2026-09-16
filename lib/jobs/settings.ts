import { prisma } from '../db';

export async function getSettings() {
  const existing = await prisma.distributionSetting.findUnique({ where: { id: 'default' } });
  if (existing) return existing;
  return prisma.distributionSetting.create({
    data: {
      id: 'default',
      concurrencyLimit: Number(process.env.DEFAULT_CONCURRENCY) || 2,
      minDelaySeconds: 300,
      maxRetries: 1,
      cooldownAfterFailureSec: 600,
    },
  });
}

export async function updateSettings(data: {
  concurrencyLimit: number;
  minDelaySeconds: number;
  maxRetries: number;
  cooldownAfterFailureSec: number;
}) {
  await getSettings();
  return prisma.distributionSetting.update({ where: { id: 'default' }, data });
}
