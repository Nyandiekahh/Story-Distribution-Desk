import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleRouteError, jsonError } from '@/lib/apiHelpers';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const original = await prisma.story.findUnique({ where: { id: params.id } });
    if (!original) return jsonError('Story not found', 404);

    const { id, createdAt, updatedAt, ...rest } = original;
    const copy = await prisma.story.create({
      data: { ...rest, headline: `${original.headline} (copy)` },
    });
    return NextResponse.json({ story: copy }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
