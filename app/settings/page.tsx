import { getSettings } from '@/lib/jobs/settings';
import { SettingsForm } from '@/components/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink/60">Rate limiting and concurrency for browser automation.</p>
      </div>
      <SettingsForm
        initial={{
          concurrencyLimit: settings.concurrencyLimit,
          minDelaySeconds: settings.minDelaySeconds,
          maxRetries: settings.maxRetries,
          cooldownAfterFailureSec: settings.cooldownAfterFailureSec,
        }}
      />
    </div>
  );
}
