import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { CampaignTracker } from '@/components/CampaignTracker';
import { StatusPill } from '@/components/StatusPill';
import { HelpNote } from '@/components/HelpNote';

export const dynamic = 'force-dynamic';

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: { story: true, channels: true },
  });
  if (!campaign) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{campaign.name}</h1>
          <p className="mt-1 text-sm text-ink/60">{campaign.story.headline}</p>
        </div>
        <StatusPill status={campaign.status} />
      </div>

      <HelpNote>
        <p>
          Each row is one channel in this campaign. Waiting for you indicates a required action on that job.
          Verify a Published result by opening its link before considering it final.
        </p>
      </HelpNote>

      <CampaignTracker campaignId={campaign.id} />
    </div>
  );
}
