import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/jobs/settings';
import { settingsInputSchema } from '@/lib/validation';
import { handleRouteError } from '@/lib/apiHelpers';
import { jobRunner } from '@/lib/jobs/runner';

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const data = settingsInputSchema.parse(body);
    const settings = await updateSettings(data);
    await jobRunner.setConcurrencyOverride(data.concurrencyLimit);
    return NextResponse.json({ settings });
  } catch (err) {
    return handleRouteError(err);
  }
}
