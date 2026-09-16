'use client';

import { useState } from 'react';
import { ChannelForm, type ChannelFormValues } from './ChannelForm';
import { LoginSetupPanel } from './LoginSetupPanel';
import type { BrowserProfileStatus } from '@/lib/types';

/**
 * Wraps the "Channel details" form together with the "Login session"
 * panel so the panel can appear the instant the Login required checkbox
 * is checked, instead of only after a save + page refresh.
 */
export function ChannelDetailsSection({
  channelId,
  initial,
  browserProfileStatus,
}: {
  channelId: string;
  initial: Partial<ChannelFormValues>;
  browserProfileStatus: BrowserProfileStatus;
}) {
  const [loginRequired, setLoginRequired] = useState(initial.loginRequired ?? false);

  return (
    <>
      {loginRequired && <LoginSetupPanel channelId={channelId} status={browserProfileStatus} />}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/50">Channel details</h2>
        <ChannelForm channelId={channelId} initial={initial} onLoginRequiredChange={setLoginRequired} />
      </section>
    </>
  );
}
