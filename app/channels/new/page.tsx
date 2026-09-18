import { ChannelForm } from '@/components/ChannelForm';
import { HelpNote } from '@/components/HelpNote';

export default function NewChannelPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">New channel</h1>
        <p className="mt-1 text-sm text-ink/60">
          Add a real, verifiable destination. You can configure its automation profile afterward.
        </p>
      </div>
      <HelpNote>
        <p>
          Automation status defaults to Needs Configuration. The submission form mapping is completed
          afterward, from the channel record.
        </p>
      </HelpNote>
      <ChannelForm />
    </div>
  );
}
