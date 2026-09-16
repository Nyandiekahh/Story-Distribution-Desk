import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveScreenshotPath } from '@/lib/playwright/screenshots';

/** Serves saved automation screenshots for the "View Logs" screen. Never lists a directory, only ever reads one exact file within SCREENSHOTS_DIR. */
export async function GET(_request: NextRequest, { params }: { params: { path: string[] } }) {
  const relative = params.path.join('/');
  // Guard against ../ escaping the screenshots root.
  if (relative.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const fullPath = resolveScreenshotPath(relative);
  try {
    const data = await fs.readFile(fullPath);
    return new NextResponse(data, {
      headers: {
        'Content-Type': path.extname(fullPath) === '.png' ? 'image/png' : 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
  }
}
