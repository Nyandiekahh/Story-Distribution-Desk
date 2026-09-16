import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { storyInputSchema } from '@/lib/validation';
import { handleRouteError, jsonError } from '@/lib/apiHelpers';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const story = await prisma.story.findUnique({
    where: { id: params.id },
    include: { versions: { orderBy: { createdAt: 'desc' } }, campaigns: true },
  });
  if (!story) return jsonError('Story not found', 404);
  return NextResponse.json({ story });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    if (typeof body.archived === 'boolean' && Object.keys(body).length === 1) {
      const story = await prisma.story.update({ where: { id: params.id }, data: { archived: body.archived } });
      return NextResponse.json({ story });
    }
    const data = storyInputSchema.partial().parse(body);
    const story = await prisma.story.update({ where: { id: params.id }, data });
    return NextResponse.json({ story });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.story.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
