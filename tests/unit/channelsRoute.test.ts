import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const channelStore: Array<Record<string, unknown>> = [];

vi.mock('@/lib/db', () => ({
  prisma: {
    channel: {
      findMany: vi.fn(async () => channelStore),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const channel = { id: `channel-${channelStore.length + 1}`, ...data };
        channelStore.push(channel);
        return channel;
      }),
    },
  },
}));

describe('Channel CRUD API', () => {
  beforeEach(() => {
    channelStore.length = 0;
  });

  it('creates a channel with sane defaults and lists it', async () => {
    const { POST, GET } = await import('../../app/api/channels/route');

    const res = await POST(
      new NextRequest('http://localhost/api/channels', {
        method: 'POST',
        body: JSON.stringify({ name: 'Medium', website: 'https://medium.com' }),
      }),
    );
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.channel.automationStatus).toBe('needs_configuration');

    const list = await GET(new NextRequest('http://localhost/api/channels'));
    const data = await list.json();
    expect(data.channels).toHaveLength(1);
  });

  it('rejects a channel with an unknown channelType', async () => {
    const { POST } = await import('../../app/api/channels/route');
    const res = await POST(
      new NextRequest('http://localhost/api/channels', {
        method: 'POST',
        body: JSON.stringify({ name: 'X', website: 'https://x.com', channelType: 'made-up' }),
      }),
    );
    expect(res.status).toBe(422);
  });
});
