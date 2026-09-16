import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const storyStore: Array<Record<string, unknown>> = [];

vi.mock('@/lib/db', () => ({
  prisma: {
    story: {
      findMany: vi.fn(async ({ where }: { where: { archived: boolean } }) =>
        storyStore.filter((s) => s.archived === where.archived).map((s) => ({ ...s, _count: { versions: 0, jobs: 0 } })),
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const story = { id: `story-${storyStore.length + 1}`, archived: false, ...data };
        storyStore.push(story);
        return story;
      }),
    },
  },
}));

describe('Story CRUD API', () => {
  beforeEach(() => {
    storyStore.length = 0;
  });

  it('POST creates a story and GET lists it back', async () => {
    const { POST, GET } = await import('../../app/api/stories/route');

    const createRes = await POST(
      new NextRequest('http://localhost/api/stories', {
        method: 'POST',
        body: JSON.stringify({ headline: 'Solar hits Kisumu', body: 'The full story text.' }),
      }),
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.story.headline).toBe('Solar hits Kisumu');

    const listRes = await GET(new NextRequest('http://localhost/api/stories'));
    const listed = await listRes.json();
    expect(listed.stories).toHaveLength(1);
    expect(listed.stories[0].headline).toBe('Solar hits Kisumu');
  });

  it('POST rejects a story with no headline', async () => {
    const { POST } = await import('../../app/api/stories/route');
    const res = await POST(
      new NextRequest('http://localhost/api/stories', {
        method: 'POST',
        body: JSON.stringify({ headline: '', body: 'Text' }),
      }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.issues).toBeTruthy();
  });
});
