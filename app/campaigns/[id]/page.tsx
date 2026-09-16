import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { CampaignTracker } from '@/components/CampaignTracker';
import { StatusPill } from '@/components/StatusPill';

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

      <CampaignTracker campaignId={campaign.id} />
    </div>
  );
}
