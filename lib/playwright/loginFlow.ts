import type { BrowserContext } from 'playwright';
import { prisma } from '../db';
import { launchProfileContext, closeContext } from './browser';
import { profileDirNameForChannel } from './profiles';

/**
 * Section 7 of the spec: the app never touches a password. It opens a
 * real, visible browser, the person logs in themselves, and once they
 * say they're done we simply close the persistent context — Chromium
 * has already written the authenticated cookies/local storage to disk
 * at that point, so there is nothing else to "save".
 */
// Stored on globalThis (mirroring lib/jobs/runner.ts's jobRunner singleton)
// so this survives Next.js dev-mode module reloads — without that, any
// file edit or Fast Refresh while a login setup browser is open makes the
// app "forget" the session even though the window is still on screen.
const globalForLoginFlow = globalThis as unknown as { __loginSetupSessions?: Map<string, BrowserContext> };
const openSessions = globalForLoginFlow.__loginSetupSessions ?? new Map<string, BrowserContext>();
globalForLoginFlow.__loginSetupSessions = openSessions;

export async function startLoginSetup(channelId: string) {
  if (openSessions.has(channelId)) {
    throw new Error('A login setup session is already open for this channel.');
  }

  const channel = await prisma.channel.findUniqueOrThrow({ where: { id: channelId } });
  const browserProfile = await prisma.browserProfile.upsert({
    where: { channelId },
    update: {},
    create: { channelId, profileDir: profileDirNameForChannel(channelId, channel.name), status: 'not_configured' },
  });

  const context = await launchProfileContext(browserProfile.profileDir);
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(channel.website, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {
    // If the site is slow or blocks the initial request, the user can
    // still navigate manually — the window is visible either way.
  });

  openSessions.set(channelId, context);
}

export async function confirmLoginSetup(channelId: string) {
  const context = openSessions.get(channelId);
  if (!context) throw new Error('No login setup session is open for this channel.');
  await closeContext(context);
  openSessions.delete(channelId);

  return prisma.browserProfile.update({
    where: { channelId },
    data: { status: 'logged_in', lastVerifiedAt: new Date() },
  });
}

export async function cancelLoginSetup(channelId: string) {
  const context = openSessions.get(channelId);
  if (context) {
    await closeContext(context);
    openSessions.delete(channelId);
  }
}

export function loginSetupIsOpen(channelId: string) {
  return openSessions.has(channelId);
}
