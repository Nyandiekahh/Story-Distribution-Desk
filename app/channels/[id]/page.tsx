import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AutomationProfileForm } from '@/components/AutomationProfileForm';
import { ChannelDetailsSection } from '@/components/ChannelDetailsSection';
import { TestAutomationPanel } from '@/components/TestAutomationPanel';
import { StatusPill } from '@/components/StatusPill';
import { parseFieldMapping } from '@/lib/automation/fieldMapping';

export const dynamic = 'force-dynamic';

export default async function ChannelDetailPage({ params }: { params: { id: string } }) {
  const channel = await prisma.channel.findUnique({
    where: { id: params.id },
    include: { automationProfile: true, browserProfile: true },
  });
  if (!channel) notFound();

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{channel.name}</h1>
          <p className="mt-1 text-sm text-ink/60">{channel.website}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={channel.automationStatus} />
          {channel.failureCount > 0 && (
            <span className="pill bg-warnSoft text-warn">{channel.failureCount} recent failure(s)</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-ink/50">
        <span>
          Last tested: {channel.lastTestedAt ? new Date(channel.lastTestedAt).toLocaleString() : 'Never — run Test Automation below'}
        </span>
        <span>
          Last successful submission:{' '}
          {channel.lastSuccessfulSubmission ? new Date(channel.lastSuccessfulSubmission).toLocaleString() : 'None yet'}
        </span>
      </div>

      <ChannelDetailsSection
        channelId={channel.id}
        browserProfileStatus={(channel.browserProfile?.status ?? 'not_configured') as never}
        initial={{
          name: channel.name,
          website: channel.website,
          submissionUrl: channel.submissionUrl ?? '',
          country: channel.country ?? '',
          region: channel.region ?? '',
          channelType: channel.channelType as never,
          description: channel.description ?? '',
          isFree: channel.isFree,
          requiresAccount: channel.requiresAccount,
          loginRequired: channel.loginRequired,
          automationStatus: channel.automationStatus as never,
          automationSupportLevel: channel.automationSupportLevel as never,
          enabled: channel.enabled,
          notes: channel.notes ?? '',
        }}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">Automation profile</h2>
        <AutomationProfileForm
          channelId={channel.id}
          initial={
            channel.automationProfile
              ? {
                  enabled: channel.automationProfile.enabled,
                  loginRequired: channel.automationProfile.loginRequired,
                  submissionUrl: channel.automationProfile.submissionUrl,
                  editorType: channel.automationProfile.editorType as never,
                  titleSelector: channel.automationProfile.titleSelector ?? '',
                  subtitleSelector: channel.automationProfile.subtitleSelector ?? '',
                  summarySelector: channel.automationProfile.summarySelector ?? '',
                  bodySelector: channel.automationProfile.bodySelector ?? '',
                  tagsSelector: channel.automationProfile.tagsSelector ?? '',
                  categorySelector: channel.automationProfile.categorySelector ?? '',
                  imageSelector: channel.automationProfile.imageSelector ?? '',
                  linkSelector: channel.automationProfile.linkSelector ?? '',
                  authorSelector: channel.automationProfile.authorSelector ?? '',
                  submitSelector: channel.automationProfile.submitSelector ?? '',
                  successSelector: channel.automationProfile.successSelector ?? '',
                  successUrlPattern: channel.automationProfile.successUrlPattern ?? '',
                  requiresManualReview: channel.automationProfile.requiresManualReview,
                  notes: channel.automationProfile.notes ?? '',
                  canonicalUrlSelector: parseFieldMapping(channel.automationProfile.fieldMappingJson).canonicalUrl ?? '',
                }
              : { submissionUrl: channel.submissionUrl ?? channel.website }
          }
        />
      </section>

      {channel.automationProfile && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">Verify</h2>
          <TestAutomationPanel channelId={channel.id} />
        </section>
      )}
    </div>
  );
}
