import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StatusPill } from '@/components/StatusPill';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: { story: true, channels: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Campaigns</h1>
          <p className="mt-1 text-sm text-ink/60">A campaign groups one story with the channels you&rsquo;re sending it to.</p>
        </div>
        <Link href="/campaigns/new" className="btn-primary">
          New campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <p className="text-sm text-ink/50">No campaigns yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {campaigns.map((campaign: { id: string; name: string; status: string; story: { headline: string }; channels: { status: string }[] }) => {
            const published = campaign.channels.filter((c: { status: string }) => c.status === 'published').length;
            return (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="card block hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-ink">{campaign.name}</h3>
                  <StatusPill status={campaign.status} />
                </div>
                <p className="mt-1 text-sm text-ink/60">{campaign.story.headline}</p>
                <p className="mt-2 text-xs text-ink/50">
                  {published} / {campaign.channels.length} channels published
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
