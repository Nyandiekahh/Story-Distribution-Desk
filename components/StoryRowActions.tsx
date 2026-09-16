'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function StoryRowActions({ storyId, archived }: { storyId: string; archived: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleArchive() {
    setBusy(true);
    await fetch(`/api/stories/${storyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: !archived }),
    });
    setBusy(false);
    router.refresh();
  }

  async function duplicate() {
    setBusy(true);
    const res = await fetch(`/api/stories/${storyId}/duplicate`, { method: 'POST' });
    const data = await res.json();
    setBusy(false);
    if (res.ok) router.push(`/stories/${data.story.id}`);
  }

  async function remove() {
    if (!confirm('Delete this story? This also removes its saved versions.')) return;
    setBusy(true);
    await fetch(`/api/stories/${storyId}`, { method: 'DELETE' });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button className="btn-ghost" disabled={busy} onClick={duplicate} title="Duplicate">
        Duplicate
      </button>
      <button className="btn-ghost" disabled={busy} onClick={toggleArchive} title={archived ? 'Restore' : 'Archive'}>
        {archived ? 'Restore' : 'Archive'}
      </button>
      <button className="btn-ghost text-bad" disabled={busy} onClick={remove} title="Delete">
        Delete
      </button>
    </div>
  );
}
