import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Prevent the real job queue from ever touching Playwright — this test
// is only about campaign creation (section 35: "Campaign creation"),
// not about what happens once a job actually runs.
vi.mock('@/lib/playwright/channelRunner', () => ({
  runChannelJob: vi.fn(async () => {}),
}));

const db = {
  channels: [{ id: 'chan-1', name: 'Medium', enabled: true, automationStatus: 'needs_configuration' }],
  campaigns: [] as Array<Record<string, unknown>>,
  campaignChannels: [] as Array<Record<string, unknown>>,
  jobs: [] as Array<Record<string, unknown>>,
  settings: { id: 'default', concurrencyLimit: 2, minDelaySeconds: 300, maxRetries: 1, cooldownAfterFailureSec: 600 },
};

vi.mock('@/lib/db', () => ({
  prisma: {
    campaign: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const campaign = { id: 'campaign-1', ...data };
        db.campaigns.push(campaign);
        return campaign;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const campaign = db.campaigns.find((c) => c.id === where.id);
        if (!campaign) return null;
        return {
          ...campaign,
          story: { id: campaign.storyId, headline: 'Solar hits Kisumu' },
          channels: db.campaignChannels.filter((c) => c.campaignId === where.id),
        };
      }),
    },
    channel: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        db.channels.filter((c) => where.id.in.includes(c.id)),
      ),
    },
    campaignChannel: {
      upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => {
        const row = { id: `cc-${db.campaignChannels.length + 1}`, ...create };
        db.campaignChannels.push(row);
        return row;
      }),
    },
    submissionJob: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const job = { id: `job-${db.jobs.length + 1}`, ...data };
        db.jobs.push(job);
        return job;
      }),
    },
    distributionSetting: {
      findUnique: vi.fn(async () => db.settings),
    },
  },
}));

describe('Campaign creation API', () => {
  beforeEach(() => {
    db.campaigns.length = 0;
    db.campaignChannels.length = 0;
    db.jobs.length = 0;
  });

  it('creates a campaign, a tracker row per channel, and queues a job for each', async () => {
    const { POST } = await import('../../app/api/campaigns/route');

    const res = await POST(
      new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({ name: 'Launch', storyId: 'story-1', channelIds: ['chan-1'] }),
      }),
    );

    expect(res.status).toBe(201);
    expect(db.campaignChannels).toHaveLength(1);
    expect(db.jobs).toHaveLength(1);
    expect(db.jobs[0].mode).toBe('manual'); // needs_configuration -> manual by default
  });

  it('rejects a campaign with no channels selected', async () => {
    const { POST } = await import('../../app/api/campaigns/route');
    const res = await POST(
      new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({ name: 'Launch', storyId: 'story-1', channelIds: [] }),
      }),
    );
    expect(res.status).toBe(422);
  });

  it('carries a Submission Preview content override through to the queued job (section 13)', async () => {
    const { POST } = await import('../../app/api/campaigns/route');

    const res = await POST(
      new NextRequest('http://localhost/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Launch',
          storyId: 'story-1',
          channelIds: ['chan-1'],
          contentOverrides: { 'chan-1': { title: 'Edited title for Medium' } },
        }),
      }),
    );

    expect(res.status).toBe(201);
    expect(db.jobs).toHaveLength(1);
    expect(JSON.parse(db.jobs[0].contentOverrideJson as string)).toEqual({ title: 'Edited title for Medium' });
  });
});
