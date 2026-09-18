import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StatusPill } from '@/components/StatusPill';
import { CHANNEL_TYPE_LABELS, CHANNEL_TYPES } from '@/lib/types';
import { HelpNote } from '@/components/HelpNote';

export const dynamic = 'force-dynamic';

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: { q?: string; channelType?: string; country?: string; region?: string };
}) {
  const { q, channelType, country, region } = searchParams;

  const channels = await prisma.channel.findMany({
    where: {
      AND: [
        q
          ? { OR: [{ name: { contains: q } }, { website: { contains: q } }, { description: { contains: q } }] }
          : {},
        channelType ? { channelType } : {},
        country ? { country: { contains: country } } : {},
        region ? { region: { contains: region } } : {},
      ],
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Channels</h1>
          <p className="mt-1 text-sm text-ink/60">Every place this tool knows how to reach.</p>
        </div>
        <Link href="/channels/new" className="btn-primary">
          New channel
        </Link>
      </div>

      <HelpNote title="Channel directory">
        <p>
          Each record is a distribution destination. Automation indicates the configuration state of that
          destination&rsquo;s submission form. Login indicates the destination requires an authenticated
          session, set up once from the channel record.
        </p>
      </HelpNote>

      <form className="flex flex-wrap gap-3" method="get">
        <input name="q" defaultValue={q} placeholder="Search name, site, description…" className="input max-w-xs" />
        <select name="channelType" defaultValue={channelType ?? ''} className="input max-w-[220px]">
          <option value="">All channel types</option>
          {CHANNEL_TYPES.map((type) => (
            <option key={type} value={type}>
              {CHANNEL_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <input name="country" defaultValue={country} placeholder="Country" className="input max-w-[180px]" />
        <input name="region" defaultValue={region} placeholder="Region" className="input max-w-[180px]" />
        <button type="submit" className="btn-secondary">
          Filter
        </button>
        {(q || channelType || country || region) && (
          <Link href="/channels" className="btn-ghost">
            Clear
          </Link>
        )}
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Country</th>
              <th>Region</th>
              <th>Automation</th>
              <th>Login</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((channel: {
              id: string;
              name: string;
              website: string;
              channelType: string;
              country: string | null;
              region: string | null;
              automationStatus: string;
              loginRequired: boolean;
              enabled: boolean;
            }) => (
              <tr key={channel.id}>
                <td>
                  <Link href={`/channels/${channel.id}`} className="font-medium text-ink hover:text-accent">
                    {channel.name}
                  </Link>
                  <div className="text-xs text-ink/40">{channel.website}</div>
                </td>
                <td className="text-ink/70">{CHANNEL_TYPE_LABELS[channel.channelType as keyof typeof CHANNEL_TYPE_LABELS] ?? channel.channelType}</td>
                <td className="text-ink/70">{channel.country || '—'}</td>
                <td className="text-ink/70">{channel.region || '—'}</td>
                <td>
                  <StatusPill status={channel.automationStatus} />
                </td>
                <td className="text-ink/70">{channel.loginRequired ? 'Required' : '—'}</td>
                <td className="text-ink/70">{channel.enabled ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {channels.length === 0 && <p className="text-sm text-ink/50">No channels match those filters.</p>}
    </div>
  );
}
