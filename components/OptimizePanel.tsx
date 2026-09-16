'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHANNEL_TYPES, CHANNEL_TYPE_LABELS, type ChannelType } from '@/lib/types';

interface Draft {
  headlines: string[];
  metaDescription: string;
  keywords: string[];
  hashtags: string[];
  pressRelease: string;
  editorPitch: string;
}

export function OptimizePanel({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [channelType, setChannelType] = useState<ChannelType | ''>('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [label, setLabel] = useState('OpenAI draft');
  const [saving, setSaving] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, channelType: channelType || undefined, instructions: instructions || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate content');
      setDraft(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate content');
    } finally {
      setLoading(false);
    }
  }

  async function saveVersion() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, source: 'openai', ...draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save version');
      setDraft(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save version');
    } finally {
      setSaving(false);
    }
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <div className="card space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">Generate optimized content</h3>
        <p className="mt-1 text-xs text-ink/50">
          Uses your OpenAI key to repackage this story for distribution — it never invents facts, and nothing is
          saved until you review it below and click Save.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label">Optimize for (optional)</label>
          <select className="input" value={channelType} onChange={(e) => setChannelType(e.target.value as ChannelType)}>
            <option value="">General / mixed distribution</option>
            {CHANNEL_TYPES.map((type) => (
              <option key={type} value={type}>
                {CHANNEL_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Extra instructions (optional)</label>
          <input className="input" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. keep it under 400 words" />
        </div>
      </div>

      {error && <p className="rounded border border-bad/20 bg-badSoft p-2 text-sm text-bad">{error}</p>}

      <button className="btn-primary" onClick={generate} disabled={loading}>
        {loading ? 'Generating…' : 'Generate optimized content'}
      </button>

      {draft && (
        <div className="space-y-4 border-t border-line pt-4">
          <div>
            <label className="field-label">Headlines (one per line)</label>
            <textarea
              className="textarea"
              value={draft.headlines.join('\n')}
              onChange={(e) => updateDraft('headlines', e.target.value.split('\n').filter(Boolean))}
            />
          </div>
          <div>
            <label className="field-label">Meta description</label>
            <input className="input" value={draft.metaDescription} onChange={(e) => updateDraft('metaDescription', e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">Keywords (comma separated)</label>
              <input
                className="input"
                value={draft.keywords.join(', ')}
                onChange={(e) => updateDraft('keywords', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))}
              />
            </div>
            <div>
              <label className="field-label">Hashtags (comma separated)</label>
              <input
                className="input"
                value={draft.hashtags.join(', ')}
                onChange={(e) => updateDraft('hashtags', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Press release framing</label>
            <textarea className="textarea min-h-[160px]" value={draft.pressRelease} onChange={(e) => updateDraft('pressRelease', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Editor pitch</label>
            <textarea className="textarea" value={draft.editorPitch} onChange={(e) => updateDraft('editorPitch', e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <input className="input max-w-xs" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Version label" />
            <button className="btn-primary" onClick={saveVersion} disabled={saving}>
              {saving ? 'Saving…' : 'Save as version'}
            </button>
            <button className="btn-ghost" onClick={() => setDraft(null)}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
