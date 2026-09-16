import path from 'node:path';
import fs from 'node:fs/promises';
import type { Page } from 'playwright';

const SCREENSHOTS_ROOT = process.env.SCREENSHOTS_DIR || './storage/screenshots';

export const SCREENSHOT_STAGES = [
  'started',
  'form_loaded',
  'form_filled',
  'manual_checkpoint',
  'submitted',
  'success',
  'failure',
] as const;
export type ScreenshotStage = (typeof SCREENSHOT_STAGES)[number];

/** Saves a PNG under storage/screenshots/<jobId>/<stage>-<timestamp>.png and returns the relative path stored on the job/log row. */
export async function captureScreenshot(page: Page, jobId: string, stage: ScreenshotStage): Promise<string> {
  const dir = path.resolve(process.cwd(), SCREENSHOTS_ROOT, jobId);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${stage}-${Date.now()}.png`;
  const fullPath = path.join(dir, filename);
  await page.screenshot({ path: fullPath, fullPage: false });
  return path.join(jobId, filename);
}

export function screenshotPublicUrl(relativePath: string) {
  return `/api/screenshots/${relativePath}`;
}

export function resolveScreenshotPath(relativePath: string) {
  return path.resolve(process.cwd(), SCREENSHOTS_ROOT, relativePath);
}
