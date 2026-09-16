import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { channelInputSchema } from '@/lib/validation';
import { handleRouteError } from '@/lib/apiHelpers';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const search = params.get('q')?.trim();
  const channelType = params.get('channelType');
  const country = params.get('country');
  const automationStatus = params.get('automationStatus');

  const channels = await prisma.channel.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search } },
                { website: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {},
        channelType ? { channelType } : {},
        country ? { country } : {},
        automationStatus ? { automationStatus } : {},
      ],
    },
    orderBy: [{ name: 'asc' }],
    include: { automationProfile: true, browserProfile: true },
  });
  return NextResponse.json({ channels });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = channelInputSchema.parse(body);
    const channel = await prisma.channel.create({ data });
    return NextResponse.json({ channel }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
