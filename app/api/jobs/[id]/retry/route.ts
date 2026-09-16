import { NextRequest, NextResponse } from 'next/server';
import { retryJob } from '@/lib/jobs/queue';
import { handleRouteError } from '@/lib/apiHelpers';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const job = await retryJob(params.id);
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
