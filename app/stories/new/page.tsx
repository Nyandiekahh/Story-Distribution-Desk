import { StoryForm } from '@/components/StoryForm';

export default function NewStoryPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">New story</h1>
        <p className="mt-1 text-sm text-ink/60">
          Write it once here — you&rsquo;ll be able to generate channel-specific versions afterward.
        </p>
      </div>
      <StoryForm />
    </div>
  );
}
