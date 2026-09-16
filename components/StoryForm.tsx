'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface StoryFormValues {
  headline: string;
  category: string;
  summary: string;
  body: string;
  imageUrl: string;
  referenceLink: string;
  authorName: string;
  targetCountries: string;
  targetRegions: string;
  keywords: string;
  tags: string;
}

const EMPTY: StoryFormValues = {
  headline: '',
  category: '',
  summary: '',
  body: '',
  imageUrl: '',
  referenceLink: '',
  authorName: '',
  targetCountries: '',
  targetRegions: '',
  keywords: '',
  tags: '',
};

export function StoryForm({
  storyId,
  initial,
}: {
  storyId?: string;
  initial?: Partial<StoryFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<StoryFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posterPath, setPosterPath] = useState<string | null>(null);
  const [posterUploading, setPosterUploading] = useState(false);

  function set<K extends keyof StoryFormValues>(key: K, value: StoryFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePosterChange(file: File) {
    setPosterUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setPosterPath(data.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setPosterUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...values, ...(posterPath ? { posterPath } : {}) };
      const res = await fetch(storyId ? `/api/stories/${storyId}` : '/api/stories', {
        method: storyId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save story');
      router.push(`/stories/${data.story.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save story');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="rounded border border-bad/20 bg-badSoft p-3 text-sm text-bad">{error}</p>}

      <div>
        <label className="field-label" htmlFor="headline">
          Headline
        </label>
        <input
          id="headline"
          className="input"
          required
          maxLength={300}
          value={values.headline}
          onChange={(e) => set('headline', e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="category">
            Category
          </label>
          <input id="category" className="input" value={values.category} onChange={(e) => set('category', e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="authorName">
            Author name
          </label>
          <input
            id="authorName"
            className="input"
            value={values.authorName}
            onChange={(e) => set('authorName', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="summary">
          One-line summary
        </label>
        <input id="summary" className="input" maxLength={500} value={values.summary} onChange={(e) => set('summary', e.target.value)} />
      </div>

      <div>
        <label className="field-label" htmlFor="body">
          Body
        </label>
        <textarea id="body" className="textarea min-h-[280px]" required value={values.body} onChange={(e) => set('body', e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="referenceLink">
            Reference / source link
          </label>
          <input
            id="referenceLink"
            className="input"
            placeholder="https://"
            value={values.referenceLink}
            onChange={(e) => set('referenceLink', e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="imageUrl">
            Image URL (optional, instead of an upload)
          </label>
          <input id="imageUrl" className="input" placeholder="https://" value={values.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="poster">
          Poster / featured image
        </label>
        <input
          id="poster"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePosterChange(file);
          }}
        />
        {posterUploading && <p className="mt-1 text-xs text-ink/50">Uploading…</p>}
        {posterPath && <p className="mt-1 text-xs text-good">Uploaded — will be saved with this story.</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="field-label" htmlFor="targetCountries">
            Target countries
          </label>
          <input
            id="targetCountries"
            className="input"
            placeholder="Kenya, Nigeria"
            value={values.targetCountries}
            onChange={(e) => set('targetCountries', e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="targetRegions">
            Target regions
          </label>
          <input
            id="targetRegions"
            className="input"
            placeholder="East Africa"
            value={values.targetRegions}
            onChange={(e) => set('targetRegions', e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="tags">
            Tags
          </label>
          <input id="tags" className="input" placeholder="solar, energy" value={values.tags} onChange={(e) => set('tags', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="keywords">
          Keywords
        </label>
        <input id="keywords" className="input" value={values.keywords} onChange={(e) => set('keywords', e.target.value)} />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : storyId ? 'Save changes' : 'Create story'}
        </button>
      </div>
    </form>
  );
}
