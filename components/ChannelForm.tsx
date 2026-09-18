'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  CHANNEL_TYPE_LABELS,
  CHANNEL_TYPES,
  type AutomationStatus,
  type AutomationSupportLevel,
  type ChannelType,
} from '@/lib/types';
import { StatusPill } from './StatusPill';

export interface ChannelFormValues {
  name: string;
  website: string;
  submissionUrl: string;
  country: string;
  region: string;
  channelType: ChannelType;
  description: string;
  isFree: boolean;
  requiresAccount: boolean;
  loginRequired: boolean;
  automationStatus: AutomationStatus;
  automationSupportLevel: AutomationSupportLevel;
  enabled: boolean;
  notes: string;
}

const EMPTY: ChannelFormValues = {
  name: '',
  website: '',
  submissionUrl: '',
  country: '',
  region: '',
  channelType: 'other',
  description: '',
  isFree: true,
  requiresAccount: false,
  loginRequired: false,
  automationStatus: 'needs_configuration',
  automationSupportLevel: 'unknown',
  enabled: true,
  notes: '',
};

export function ChannelForm({
  channelId,
  initial,
  onLoginRequiredChange,
}: {
  channelId?: string;
  initial?: Partial<ChannelFormValues>;
  onLoginRequiredChange?: (value: boolean) => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ChannelFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ChannelFormValues>(key: K, value: ChannelFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(channelId ? `/api/channels/${channelId}` : '/api/channels', {
        method: channelId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save channel');
      router.push(`/channels/${data.channel.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save channel');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="rounded border border-bad/20 bg-badSoft p-3 text-sm text-bad">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Name</label>
          <input className="input" required value={values.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Channel type</label>
          <select className="input" value={values.channelType} onChange={(e) => set('channelType', e.target.value as ChannelType)}>
            {CHANNEL_TYPES.map((type) => (
              <option key={type} value={type}>
                {CHANNEL_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Website</label>
          <input className="input" required placeholder="https://" value={values.website} onChange={(e) => set('website', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Submission URL (if different)</label>
          <input className="input" placeholder="https://" value={values.submissionUrl} onChange={(e) => set('submissionUrl', e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Country</label>
          <input className="input" value={values.country} onChange={(e) => set('country', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Region</label>
          <input className="input" value={values.region} onChange={(e) => set('region', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="field-label">Description</label>
        <textarea className="textarea" value={values.description} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input type="checkbox" checked={values.isFree} onChange={(e) => set('isFree', e.target.checked)} />
          Free
        </label>
        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input type="checkbox" checked={values.requiresAccount} onChange={(e) => set('requiresAccount', e.target.checked)} />
          Requires account
        </label>
        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input
            type="checkbox"
            checked={values.loginRequired}
            onChange={(e) => {
              set('loginRequired', e.target.checked);
              onLoginRequiredChange?.(e.target.checked);
            }}
          />
          Login required
        </label>
        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input type="checkbox" checked={values.enabled} onChange={(e) => set('enabled', e.target.checked)} />
          Enabled
        </label>
      </div>

      {channelId && (
        <div>
          <label className="field-label">Distribution status</label>
          <div className="flex items-center gap-2">
            <StatusPill status={values.automationStatus} />
          </div>
          <p className="mt-1 text-xs text-ink/40">
            Determined by testing, not chosen here. Every channel runs through the same distribution pipeline; this
            reflects whether that has been verified to work on its own (see Test Automation below) or still needs a
            person to complete the submission.
          </p>
        </div>
      )}

      <div>
        <label className="field-label">Notes</label>
        <textarea className="textarea" value={values.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'Saving…' : channelId ? 'Save changes' : 'Create channel'}
      </button>
    </form>
  );
}
