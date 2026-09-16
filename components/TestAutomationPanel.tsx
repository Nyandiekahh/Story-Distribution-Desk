'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FieldCheck {
  field: string;
  selector: string;
  found: boolean;
}

interface Report {
  navigated: boolean;
  fields: FieldCheck[];
  submitSelectorFound: boolean | null;
  screenshotPath: string | null;
  error: string | null;
}

export function TestAutomationPanel({ channelId }: { channelId: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  async function run() {
    setRunning(true);
    setReport(null);
    try {
      const res = await fetch(`/api/channels/${channelId}/test`, { method: 'POST' });
      const data = await res.json();
      setReport(data.report ?? { navigated: false, fields: [], submitSelectorFound: null, screenshotPath: null, error: data.error });
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Test automation</h3>
          <p className="mt-0.5 text-xs text-ink/50">
            Opens a throwaway browser, checks which selectors resolve, and closes again. Submit is never clicked.
          </p>
        </div>
        <button className="btn-secondary" onClick={run} disabled={running}>
          {running ? 'Testing…' : 'Test Automation'}
        </button>
      </div>

      {report && (
        <div className="mt-4 space-y-2 text-sm">
          {report.error && <p className="rounded border border-bad/20 bg-badSoft p-2 text-bad">{report.error}</p>}
          {report.navigated && (
            <>
              <p className="text-ink/70">Navigated to the submission page successfully.</p>
              <ul className="space-y-1">
                {report.fields.map((f) => (
                  <li key={f.field} className="flex items-center gap-2">
                    <span className={f.found ? 'text-good' : 'text-bad'}>{f.found ? '✓' : '✗'}</span>
                    <span className="mono text-ink/70">
                      {f.field}: {f.selector}
                    </span>
                  </li>
                ))}
                {report.submitSelectorFound !== null && (
                  <li className="flex items-center gap-2">
                    <span className={report.submitSelectorFound ? 'text-good' : 'text-bad'}>
                      {report.submitSelectorFound ? '✓' : '✗'}
                    </span>
                    <span className="text-ink/70">submit selector</span>
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
