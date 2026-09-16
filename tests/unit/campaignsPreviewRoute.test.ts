import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const story = {
  id: 'story-1',
  headline: 'Solar hits Kisumu',
  summary: 'A one-line summary.',
  body: 'Full story body.',
  referenceLink: 'https://example.com/source',
  authorName: 'Nyandieka',
  category: 'Energy',
  tags: 'solar, kenya',
  posterPath: null,
  imageUrl: null,
};

const channels = [
  { id: 'chan-1', name: 'Medium', automationStatus: 'needs_configuration', automationProfile: null },
  { id: 'chan-2', name: 'PRLog', automationStatus: 'automated', automationProfile: { editorType: 'textarea' } },
];

vi.mock('@/lib/db', () => ({
  prisma: {
    story: { findUnique: vi.fn(async () => story) },
    storyVersion: { findUnique: vi.fn(async () => null) },
    channel: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => channels.filter((c) => where.id.in.includes(c.id))),
    },
  },
}));

describe('POST /api/campaigns/preview (section 13)', () => {
  it('resolves what would be submitted for every selected channel, in selection order, without creating anything', async () => {
    const { POST } = await import('../../app/api/campaigns/preview/route');

    const res = await POST(
      new NextRequest('http://localhost/api/campaigns/preview', {
        method: 'POST',
        body: JSON.stringify({ storyId: 'story-1', channelIds: ['chan-2', 'chan-1'] }),
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(2);
    expect(data.items.map((i: { channelId: string }) => i.channelId)).toEqual(['chan-2', 'chan-1']);
    expect(data.items[0].content.title).toBe('Solar hits Kisumu');
    expect(data.items[0].automationMode).toBe('automated');
    expect(data.items[1].automationMode).toBe('manual'); // needs_configuration -> manual by default
    expect(data.items[1].hasAutomationProfile).toBe(false);
  });

  it('returns 404 for an unknown story', async () => {
    const { prisma } = await import('@/lib/db');
    (prisma.story.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const { POST } = await import('../../app/api/campaigns/preview/route');

    const res = await POST(
      new NextRequest('http://localhost/api/campaigns/preview', {
        method: 'POST',
        body: JSON.stringify({ storyId: 'nope', channelIds: ['chan-1'] }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it('rejects a request with no channels selected', async () => {
    const { POST } = await import('../../app/api/campaigns/preview/route');
    const res = await POST(
      new NextRequest('http://localhost/api/campaigns/preview', {
        method: 'POST',
        body: JSON.stringify({ storyId: 'story-1', channelIds: [] }),
      }),
    );
    expect(res.status).toBe(422);
  });
});
