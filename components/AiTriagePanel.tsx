'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { applyAiTriageAction } from '@/app/actions';
import {
  BYOK_CHANGED_EVENT,
  BYOK_HINT,
  PROVIDER_LABEL,
  readByok,
  runAiTriage,
  type Byok,
  type TriagePayload,
} from '@/lib/llm';

/**
 * The AI path, gated on the visitor's own key. The provider call happens here, in the
 * browser — the server route only supplies the deterministic baseline (order fields and
 * the current template) and never sees a key.
 */
export default function AiTriagePanel({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [byok, setByok] = useState<Byok | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setByok(readByok());
    sync();
    window.addEventListener(BYOK_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(BYOK_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  async function run() {
    if (!byok) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      if (!response.ok) throw new Error(`Baseline triage failed (${response.status})`);
      const payload = (await response.json()) as TriagePayload;

      const { classification, draft } = await runAiTriage(byok, payload);
      await applyAiTriageAction(messageId, classification, draft);
      router.refresh();
    } catch (cause) {
      // FR10: a failed model call leaves the deterministic verdict on screen.
      setError(cause instanceof Error ? cause.message : 'The model call failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">Model</p>
          <p className="mt-1 text-sm text-slate-600">
            {byok
              ? `Re-run classification and drafting on ${PROVIDER_LABEL[byok.provider]} ${byok.model}, called from this browser with your key.`
              : 'Running on the deterministic keyword classifier and template merge.'}
          </p>
        </div>
        <button
          type="button"
          data-testid="run-ai"
          onClick={run}
          disabled={!byok || busy}
          className="btn-secondary"
        >
          {busy ? 'Running…' : 'Re-run with my model'}
        </button>
      </div>

      {byok ? null : (
        <p data-testid="byok-hint" className="mt-3 text-sm text-amber-800">
          {BYOK_HINT}{' '}
          <Link className="underline" href="/settings">
            Open settings
          </Link>
          .
        </p>
      )}

      {error ? (
        <p data-testid="ai-error" className="mt-3 text-sm text-rose-700">
          {error} — kept the offline-mode classification and draft below.
        </p>
      ) : null}
    </div>
  );
}
