import { NextRequest, NextResponse } from 'next/server';
import { testChannelAutomation } from '@/lib/playwright/testAutomation';
import { handleRouteError } from '@/lib/apiHelpers';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const report = await testChannelAutomation(params.id);
    return NextResponse.json({ report });
  } catch (err) {
    return handleRouteError(err);
  }
}
