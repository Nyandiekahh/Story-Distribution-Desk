import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleRouteError, jsonError } from '@/lib/apiHelpers';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      story: true,
      channels: { include: { channel: true }, orderBy: { createdAt: 'asc' } },
      jobs: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!campaign) return jsonError('Campaign not found', 404);
  return NextResponse.json({ campaign });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const allowed = ['name', 'status', 'scheduledStart', 'minDelayMinutes', 'maxConcurrentJobs'] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = key === 'scheduledStart' && body[key] ? new Date(body[key]) : body[key];
    }
    const campaign = await prisma.campaign.update({ where: { id: params.id }, data });
    return NextResponse.json({ campaign });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.campaign.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
