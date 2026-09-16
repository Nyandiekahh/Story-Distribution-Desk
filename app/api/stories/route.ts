import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { storyInputSchema } from '@/lib/validation';
import { handleRouteError } from '@/lib/apiHelpers';

export async function GET(request: NextRequest) {
  const archived = request.nextUrl.searchParams.get('archived') === 'true';
  const stories = await prisma.story.findMany({
    where: { archived },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { versions: true, jobs: true } } },
  });
  return NextResponse.json({ stories });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = storyInputSchema.parse(body);
    const story = await prisma.story.create({ data });
    return NextResponse.json({ story }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
