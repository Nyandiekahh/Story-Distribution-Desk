'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EDITOR_TYPES, type EditorType } from '@/lib/types';
import { serializeFieldMapping } from '@/lib/automation/fieldMapping';

export interface ProfileFormValues {
  enabled: boolean;
  loginRequired: boolean;
  submissionUrl: string;
  editorType: EditorType;
  titleSelector: string;
  subtitleSelector: string;
  summarySelector: string;
  bodySelector: string;
  tagsSelector: string;
  categorySelector: string;
  imageSelector: string;
  linkSelector: string;
  authorSelector: string;
  submitSelector: string;
  successSelector: string;
  successUrlPattern: string;
  requiresManualReview: boolean;
  notes: string;
  /**
   * Section 14's escape hatch for a logical field beyond the named
   * columns above — today just canonicalUrl. Read from and written to
   * ChannelAutomationProfile.fieldMappingJson (see lib/automation/fieldMapping.ts)
   * rather than its own column.
   */
  canonicalUrlSelector: string;
}

const EMPTY: ProfileFormValues = {
  enabled: false,
  loginRequired: false,
  submissionUrl: '',
  editorType: 'textarea',
  titleSelector: '',
  subtitleSelector: '',
  summarySelector: '',
  bodySelector: '',
  tagsSelector: '',
  categorySelector: '',
  imageSelector: '',
  linkSelector: '',
  authorSelector: '',
  submitSelector: '',
  successSelector: '',
  successUrlPattern: '',
  requiresManualReview: true,
  notes: '',
  canonicalUrlSelector: '',
};

const SELECTOR_FIELDS: Array<[key: keyof ProfileFormValues, label: string]> = [
  ['titleSelector', 'Title selector'],
  ['subtitleSelector', 'Subtitle selector'],
  ['summarySelector', 'Summary selector'],
  ['bodySelector', 'Body selector'],
  ['tagsSelector', 'Tags selector'],
  ['categorySelector', 'Category selector'],
  ['imageSelector', 'Image selector'],
  ['linkSelector', 'Reference link selector'],
  ['authorSelector', 'Author selector'],
];

export function AutomationProfileForm({ channelId, initial }: { channelId: string; initial?: Partial<ProfileFormValues> }) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  function set<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedNote(null);
    try {
      const { canonicalUrlSelector, ...rest } = values;
      const fieldMappingJson = canonicalUrlSelector.trim() ? serializeFieldMapping({ canonicalUrl: canonicalUrlSelector.trim() }) : null;
      const res = await fetch(`/api/channels/${channelId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rest, fieldMappingJson }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save automation profile');
      setSavedNote('Saved. Run Test Automation below before switching this channel to Automated.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save automation profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-xs text-ink/50">
        Do not assume this site uses the same field names as any other. Configure only what actually exists on the
        page — anything left blank is simply skipped when filling the form.
      </p>

      {error && <p className="rounded border border-bad/20 bg-badSoft p-3 text-sm text-bad">{error}</p>}
      {savedNote && <p className="rounded border border-good/20 bg-goodSoft p-3 text-sm text-good">{savedNote}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Submission URL</label>
          <input className="input" required value={values.submissionUrl} onChange={(e) => set('submissionUrl', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Editor type</label>
          <select className="input" value={values.editorType} onChange={(e) => set('editorType', e.target.value as EditorType)}>
            {EDITOR_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input type="checkbox" checked={values.enabled} onChange={(e) => set('enabled', e.target.checked)} />
          Enabled
        </label>
        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input type="checkbox" checked={values.loginRequired} onChange={(e) => set('loginRequired', e.target.checked)} />
          Login required
        </label>
        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input
            type="checkbox"
            checked={values.requiresManualReview}
            onChange={(e) => set('requiresManualReview', e.target.checked)}
          />
          Stop before final submit (Assisted)
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SELECTOR_FIELDS.map(([key, label]) => (
          <div key={key}>
            <label className="field-label">{label}</label>
            <input
              className="input mono"
              placeholder="e.g. input[name='title']"
              value={values[key] as string}
              onChange={(e) => set(key, e.target.value as never)}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Submit selector</label>
          <input className="input mono" value={values.submitSelector} onChange={(e) => set('submitSelector', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Success selector</label>
          <input className="input mono" value={values.successSelector} onChange={(e) => set('successSelector', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="field-label">Success URL pattern (a substring the URL contains once published)</label>
        <input className="input mono" value={values.successUrlPattern} onChange={(e) => set('successUrlPattern', e.target.value)} />
      </div>

      <div>
        <label className="field-label">Canonical URL selector</label>
        <input
          className="input mono"
          placeholder="e.g. input[name='canonical_url'] — only sites with a separate canonical-link field need this"
          value={values.canonicalUrlSelector}
          onChange={(e) => set('canonicalUrlSelector', e.target.value)}
        />
      </div>

      <div>
        <label className="field-label">Notes</label>
        <textarea className="textarea" value={values.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save automation profile'}
      </button>
    </form>
  );
}
