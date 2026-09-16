import path from 'node:path';
import fs from 'node:fs/promises';

const PROFILES_ROOT = process.env.PLAYWRIGHT_PROFILES_DIR || './playwright-profiles';

/** Turns a channel id into a filesystem-safe profile folder name. */
export function profileDirNameForChannel(channelId: string, channelName: string) {
  const slug = channelName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${slug || 'channel'}-${channelId.slice(-8)}`;
}

export function resolveProfilePath(profileDir: string) {
  return path.isAbsolute(profileDir) ? profileDir : path.resolve(process.cwd(), PROFILES_ROOT, profileDir);
}

export async function profileExistsOnDisk(profileDir: string) {
  try {
    const full = resolveProfilePath(profileDir);
    const stat = await fs.stat(full);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function ensureProfilesRoot() {
  await fs.mkdir(path.resolve(process.cwd(), PROFILES_ROOT), { recursive: true });
}
