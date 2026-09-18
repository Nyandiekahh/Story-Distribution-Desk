/**
 * A reference note for a page — styled to match the app's existing
 * section-header convention (uppercase, tracked label) rather than a
 * separate "assistant tip" visual language, so it reads as part of the
 * product rather than an added-on explanation.
 */
export function HelpNote({ title = 'Reference', children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-ink/15 bg-ink/[0.025] py-2.5 pl-4 pr-3 text-sm text-ink/70">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink/40">{title}</p>
      <div className="space-y-1.5 leading-relaxed">{children}</div>
    </div>
  );
}
