/**
 * Seeds the channel directory with the real, named services listed in
 * section 25 of the build spec, and nothing else. No selectors are
 * invented here (section 26) — every seeded channel starts at
 * Needs Configuration or Manual Only until someone actually configures
 * and tests its automation profile.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedChannel {
  name: string;
  website: string;
  channelType: 'press_release' | 'editor_source' | 'self_publishing';
  automationStatus: 'needs_configuration' | 'manual_only';
  description?: string;
  loginRequired?: boolean;
}

const CHANNELS: SeedChannel[] = [
  // Press release
  { name: 'PRLog', website: 'https://www.prlog.org', channelType: 'press_release', automationStatus: 'needs_configuration' },
  { name: 'OpenPR', website: 'https://www.openpr.com', channelType: 'press_release', automationStatus: 'needs_configuration' },
  { name: 'OnlinePRNews', website: 'https://www.onlineprnews.com', channelType: 'press_release', automationStatus: 'needs_configuration' },
  { name: 'IssueWire', website: 'https://www.issuewire.com', channelType: 'press_release', automationStatus: 'needs_configuration' },
  { name: 'PR.com', website: 'https://www.pr.com', channelType: 'press_release', automationStatus: 'needs_configuration' },
  { name: '1888PressRelease', website: 'https://www.1888pressrelease.com', channelType: 'press_release', automationStatus: 'needs_configuration' },
  { name: 'PR Urgent', website: 'https://www.prurgent.com', channelType: 'press_release', automationStatus: 'needs_configuration' },
  { name: '24-7 Press Release', website: 'https://www.24-7pressrelease.com', channelType: 'press_release', automationStatus: 'needs_configuration' },
  { name: 'PressPlugs', website: 'https://pressplugs.co.uk', channelType: 'press_release', automationStatus: 'needs_configuration' },

  // Editor / source platforms — primarily response/pitch platforms rather
  // than direct publishing, so these default to Manual Only per spec.
  { name: 'Source of Sources', website: 'https://www.sourceofsources.com', channelType: 'editor_source', automationStatus: 'manual_only' },
  { name: 'Qwoted', website: 'https://www.qwoted.com', channelType: 'editor_source', automationStatus: 'manual_only', loginRequired: true },
  { name: 'SourceBottle', website: 'https://www.sourcebottle.com', channelType: 'editor_source', automationStatus: 'manual_only', loginRequired: true },
  { name: 'Help a B2B Writer', website: 'https://helpab2bwriter.com', channelType: 'editor_source', automationStatus: 'manual_only' },
  { name: 'Featured', website: 'https://featured.com', channelType: 'editor_source', automationStatus: 'manual_only', loginRequired: true },
  {
    name: 'JournoRequest on X',
    website: 'https://twitter.com/JournoRequest',
    channelType: 'editor_source',
    automationStatus: 'manual_only',
    description: 'A pitch/response feed, not a publishing form — reply to individual requests manually.',
    loginRequired: true,
  },

  // Self-publishing
  { name: 'Medium', website: 'https://medium.com', channelType: 'self_publishing', automationStatus: 'needs_configuration', loginRequired: true },
  { name: 'Substack', website: 'https://substack.com', channelType: 'self_publishing', automationStatus: 'needs_configuration', loginRequired: true },
  { name: 'LinkedIn Articles', website: 'https://www.linkedin.com', channelType: 'self_publishing', automationStatus: 'needs_configuration', loginRequired: true },
  { name: 'WordPress.com', website: 'https://wordpress.com', channelType: 'self_publishing', automationStatus: 'needs_configuration', loginRequired: true },
  { name: 'Blogger', website: 'https://www.blogger.com', channelType: 'self_publishing', automationStatus: 'needs_configuration', loginRequired: true },
  {
    name: 'Reddit',
    website: 'https://www.reddit.com',
    channelType: 'self_publishing',
    automationStatus: 'manual_only',
    description: 'Self-promotion rules vary by subreddit — see each community’s rules before posting.',
    loginRequired: true,
  },
  {
    name: 'Indymedia',
    website: 'https://www.indymedia.org',
    channelType: 'self_publishing',
    automationStatus: 'needs_configuration',
    description: 'A global network of independently run local nodes — confirm the specific node’s submission process.',
  },
];

async function main() {
  for (const channel of CHANNELS) {
    // Channel has no natural unique key besides its generated id, so we
    // make the seed idempotent with a plain existence check by name
    // rather than a fake upsert.
    const existing = await prisma.channel.findFirst({ where: { name: channel.name } });
    if (existing) continue;

    await prisma.channel.create({
      data: {
        name: channel.name,
        website: channel.website,
        channelType: channel.channelType,
        automationStatus: channel.automationStatus,
        automationSupportLevel: 'unknown',
        description: channel.description,
        loginRequired: channel.loginRequired ?? false,
        requiresAccount: channel.loginRequired ?? false,
        isFree: true,
      },
    });
  }

  await prisma.distributionSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', concurrencyLimit: 2, minDelaySeconds: 300, maxRetries: 1, cooldownAfterFailureSec: 600 },
  });

  console.log(`Seeded ${CHANNELS.length} channels.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
