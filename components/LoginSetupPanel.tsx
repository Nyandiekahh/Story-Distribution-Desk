'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BROWSER_PROFILE_STATUS_LABELS, type BrowserProfileStatus } from '@/lib/types';

export function LoginSetupPanel({ channelId, status }: { channelId: string; status: BrowserProfileStatus }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/channels/${channelId}/login/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not open the browser');
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the browser');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/channels/${channelId}/login/confirm`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save the session');
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the session');
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    await fetch(`/api/channels/${channelId}/login/cancel`, { method: 'POST' });
    setOpen(false);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Login session</h3>
          <p className="mt-0.5 text-sm text-ink/60">{BROWSER_PROFILE_STATUS_LABELS[status]}</p>
        </div>
        {!open ? (
          <button className="btn-secondary" onClick={start} disabled={busy}>
            Setup Login
          </button>
        ) : null}
      </div>

      {error && <p className="mt-3 rounded border border-bad/20 bg-badSoft p-2 text-sm text-bad">{error}</p>}

      {open && (
        <div className="mt-3 rounded border border-accent/30 bg-accentSoft p-3 text-sm text-ink/80">
          <p>
            A browser window has opened. Log in to the site yourself, then come back here and press{' '}
            <strong>I&rsquo;m logged in</strong>. Nothing you type is seen by this app.
          </p>
          <div className="mt-2 flex gap-2">
            <button className="btn-primary" onClick={confirm} disabled={busy}>
              I&rsquo;m logged in
            </button>
            <button className="btn-ghost" onClick={cancel} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
