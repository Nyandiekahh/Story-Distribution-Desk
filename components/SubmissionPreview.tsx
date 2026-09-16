'use client';

import { useState } from 'react';

export interface PreviewContent {
  title: string;
  subtitle: string;
  summary: string;
  body: string;
  tags: string;
  referenceLink: string;
  category: string;
  author: string;
}

export interface PreviewItem {
  channelId: string;
  channelName: string;
  automationMode: string;
  automationModeLabel: string;
  hasAutomationProfile: boolean;
  imagePresent: boolean;
  content: PreviewContent;
}

/**
 * Section 13's Submission Preview: shows exactly what will be typed
 * into each channel's form before anything is queued, and lets the
 * user edit any of it. Nothing is submitted until "Start Submission".
 */
export function SubmissionPreview({
  items,
  onBack,
  onConfirm,
  submitting,
}: {
  items: PreviewItem[];
  onBack: () => void;
  onConfirm: (edited: Record<string, PreviewContent>) => void;
  submitting: boolean;
}) {
  const [edited, setEdited] = useState<Record<string, PreviewContent>>(() =>
    Object.fromEntries(items.map((item) => [item.channelId, { ...item.content }])),
  );
  const [openId, setOpenId] = useState<string | null>(items[0]?.channelId ?? null);

  function update(channelId: string, field: keyof PreviewContent, value: string) {
    setEdited((prev) => ({ ...prev, [channelId]: { ...prev[channelId], [field]: value } }));
  }

  function updateSummary(channelId: string, value: string) {
    // The story only has one "one-line summary" — it fills both a
    // channel's subtitle field and its summary field, so editing it
    // here keeps the two in sync rather than exposing two near-duplicate
    // boxes.
    setEdited((prev) => ({ ...prev, [channelId]: { ...prev[channelId], subtitle: value, summary: value } }));
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">Submission preview</h2>
        <p className="mt-1 text-sm text-ink/60">
          Exactly what will be typed into each channel&apos;s form. Edit anything below — nothing is queued
          until you press Start Submission.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const content = edited[item.channelId];
          const isOpen = openId === item.channelId;
          return (
            <div key={item.channelId} className="card">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setOpenId(isOpen ? null : item.channelId)}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{item.channelName}</div>
                  <div className="truncate text-xs text-ink/50">
                    {content.title || <span className="italic text-ink/40">No title yet</span>}
                  </div>
                </div>
                <span className="pill shrink-0 bg-ink/[0.06] text-ink/70">{item.automationModeLabel}</span>
              </button>

              {isOpen && (
                <div className="mt-4 space-y-3 border-t border-ink/10 pt-4">
                  {!item.hasAutomationProfile && item.automationMode !== 'manual' && (
                    <p className="rounded border border-warn/30 bg-warnSoft p-2 text-xs text-warn">
                      No automation profile is configured for this channel yet — it will run in Manual mode
                      regardless of what's shown here.
                    </p>
                  )}
                  <div>
                    <label className="field-label">Title</label>
                    <input className="input" value={content.title} onChange={(e) => update(item.channelId, 'title', e.target.value)} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="field-label">Summary / subtitle</label>
                      <input className="input" value={content.subtitle} onChange={(e) => updateSummary(item.channelId, e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Tags</label>
                      <input className="input" value={content.tags} onChange={(e) => update(item.channelId, 'tags', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Body</label>
                    <textarea
                      className="input min-h-[160px]"
                      value={content.body}
                      onChange={(e) => update(item.channelId, 'body', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Reference link</label>
                    <input
                      className="input"
                      value={content.referenceLink}
                      onChange={(e) => update(item.channelId, 'referenceLink', e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-ink/50">
                    Image: {item.imagePresent ? "attached to the story — uploaded automatically where the channel supports it" : 'none on this story'}
                    {' · '}Automation mode: {item.automationModeLabel}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn-ghost" onClick={onBack} disabled={submitting}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={() => onConfirm(edited)} disabled={submitting}>
          {submitting ? 'Starting…' : 'Start Submission'}
        </button>
      </div>
    </div>
  );
}
