'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CHANNEL_TYPE_LABELS } from '@/lib/types';
import { SubmissionPreview, type PreviewContent, type PreviewItem } from './SubmissionPreview';

interface StoryOption {
  id: string;
  headline: string;
}

interface ChannelOption {
  id: string;
  name: string;
  channelType: string;
  country: string | null;
  automationStatus: string;
}

export function CampaignForm({
  stories,
  channels,
  versionsByStory,
  defaultStoryId,
}: {
  stories: StoryOption[];
  channels: ChannelOption[];
  versionsByStory?: Record<string, { id: string; label: string }[]>;
  defaultStoryId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<'select' | 'preview'>('select');
  const [name, setName] = useState('');
  const [storyId, setStoryId] = useState(defaultStoryId ?? stories[0]?.id ?? '');
  const [storyVersionId, setStoryVersionId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledStart, setScheduledStart] = useState('');
  const [minDelayMinutes, setMinDelayMinutes] = useState(5);
  const [maxConcurrentJobs, setMaxConcurrentJobs] = useState(2);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<PreviewItem[] | null>(null);

  const filtered = useMemo(() => {
    const term = filter.toLowerCase();
    return channels.filter((c) => c.name.toLowerCase().includes(term) || (c.country ?? '').toLowerCase().includes(term));
  }, [channels, filter]);

  const versions = versionsByStory?.[storyId] ?? [];

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Section 13: before anything is queued, fetch exactly what would be submitted so it can be reviewed and edited. */
  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      setError('Select at least one channel.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/campaigns/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          storyVersionId: storyVersionId || undefined,
          channelIds: Array.from(selected),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not build the submission preview');
      setPreviewItems(data.items);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the submission preview');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm(edited: Record<string, PreviewContent>) {
    setSaving(true);
    setError(null);
    try {
      const contentOverrides = Object.fromEntries(
        Object.entries(edited).map(([channelId, content]) => [
          channelId,
          {
            title: content.title,
            subtitle: content.subtitle,
            summary: content.summary,
            body: content.body,
            tags: content.tags,
            referenceLink: content.referenceLink,
          },
        ]),
      );
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || `Distribution — ${new Date().toLocaleDateString()}`,
          storyId,
          storyVersionId: storyVersionId || undefined,
          channelIds: Array.from(selected),
          scheduledStart: scheduleLater && scheduledStart ? new Date(scheduledStart).toISOString() : undefined,
          minDelayMinutes,
          maxConcurrentJobs,
          contentOverrides,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create campaign');
      router.push(`/campaigns/${data.campaign.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create campaign');
    } finally {
      setSaving(false);
    }
  }

  if (step === 'preview' && previewItems) {
    return (
      <div className="space-y-4">
        {error && <p className="rounded border border-bad/20 bg-badSoft p-3 text-sm text-bad">{error}</p>}
        <SubmissionPreview items={previewItems} onBack={() => setStep('select')} onConfirm={handleConfirm} submitting={saving} />
      </div>
    );
  }

  return (
    <form onSubmit={handleReview} className="space-y-6">
      {error && <p className="rounded border border-bad/20 bg-badSoft p-3 text-sm text-bad">{error}</p>}

      <div>
        <label className="field-label">Campaign name</label>
        <input className="input" placeholder="Africa Climate Technology Launch" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Story</label>
          <select className="input" value={storyId} onChange={(e) => { setStoryId(e.target.value); setStoryVersionId(''); }}>
            {stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.headline}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Content version</label>
          <select className="input" value={storyVersionId} onChange={(e) => setStoryVersionId(e.target.value)} disabled={versions.length === 0}>
            <option value="">Use the story as written</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="field-label">Channels ({selected.size} selected)</label>
          <input
            className="input max-w-xs"
            placeholder="Filter by name or country…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="table-wrap max-h-96 overflow-y-auto">
          <table className="data">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Type</th>
                <th>Country</th>
                <th>Automation</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((channel) => (
                <tr key={channel.id} className="cursor-pointer" onClick={() => toggle(channel.id)}>
                  <td>
                    <input type="checkbox" checked={selected.has(channel.id)} onChange={() => toggle(channel.id)} />
                  </td>
                  <td className="font-medium text-ink">{channel.name}</td>
                  <td className="text-ink/60">{CHANNEL_TYPE_LABELS[channel.channelType as keyof typeof CHANNEL_TYPE_LABELS] ?? channel.channelType}</td>
                  <td className="text-ink/60">{channel.country || '—'}</td>
                  <td className="text-ink/60">{channel.automationStatus.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="field-label">Minimum delay between submissions (minutes)</label>
          <input
            type="number"
            min={0}
            className="input"
            value={minDelayMinutes}
            onChange={(e) => setMinDelayMinutes(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="field-label">Max simultaneous browser jobs</label>
          <input
            type="number"
            min={1}
            max={10}
            className="input"
            value={maxConcurrentJobs}
            onChange={(e) => setMaxConcurrentJobs(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="field-label">Start</label>
          <label className="flex items-center gap-2 py-2 text-sm text-ink/80">
            <input type="checkbox" checked={scheduleLater} onChange={(e) => setScheduleLater(e.target.checked)} />
            Schedule for later
          </label>
          {scheduleLater && (
            <input
              type="datetime-local"
              className="input"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
            />
          )}
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={saving || !storyId}>
        {saving ? 'Preparing preview…' : 'Review submission'}
      </button>
    </form>
  );
}
