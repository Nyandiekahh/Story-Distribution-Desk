'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface SettingsValues {
  concurrencyLimit: number;
  minDelaySeconds: number;
  maxRetries: number;
  cooldownAfterFailureSec: number;
}

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof SettingsValues>(key: K, value: number) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-lg space-y-5">
      <div>
        <label className="field-label">Concurrent browser jobs</label>
        <input
          type="number"
          min={1}
          max={10}
          className="input"
          value={values.concurrencyLimit}
          onChange={(e) => set('concurrencyLimit', Number(e.target.value))}
        />
        <p className="mt-1 text-xs text-ink/40">Default: 2. Do not launch dozens of browsers at once.</p>
      </div>

      <div>
        <label className="field-label">Minimum delay before a submission (seconds)</label>
        <input
          type="number"
          min={0}
          className="input"
          value={values.minDelaySeconds}
          onChange={(e) => set('minDelaySeconds', Number(e.target.value))}
        />
      </div>

      <div>
        <label className="field-label">Default max retries</label>
        <input
          type="number"
          min={0}
          max={5}
          className="input"
          value={values.maxRetries}
          onChange={(e) => set('maxRetries', Number(e.target.value))}
        />
        <p className="mt-1 text-xs text-ink/40">Default: 1. Failed jobs are never retried endlessly.</p>
      </div>

      <div>
        <label className="field-label">Cooldown after a failure (seconds)</label>
        <input
          type="number"
          min={0}
          className="input"
          value={values.cooldownAfterFailureSec}
          onChange={(e) => set('cooldownAfterFailureSec', Number(e.target.value))}
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-sm text-good">Saved.</span>}
      </div>
    </form>
  );
}
