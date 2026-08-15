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
  type AiTriage,
  type Byok,
  type TriagePayload,
} from '@/lib/llm';

/**
 * The AI path. With the visitor's own key the provider call happens here, in the
 * browser — the server route only supplies the deterministic baseline (order fields and
 * the current template) and never sees a key.
 *
 * With no key the drafting goes through /api/triage-shared instead, on the author's
 * shared endpoint. That path is slower and queues, so it is never the one the copy
 * pushes you toward — but a visitor who pastes nothing still sees a real draft rather
 * than a disabled button.
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
    setBusy(true);
    setError(null);
    try {
      if (!byok) {
        // No key pasted: draft on the author's shared endpoint rather than
        // leaving a dead button. Slow by nature — it queues — so the copy above
        // says so and points at Settings for the instant path.
        const shared = await fetch('/api/triage-shared', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ messageId }),
        });
        if (!shared.ok) throw new Error(`Shared drafting failed (${shared.status})`);
        const { classification, draft } = (await shared.json()) as AiTriage;
        await applyAiTriageAction(messageId, classification, draft);
        router.refresh();
        return;
      }

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
              : "No key set: drafting runs on the author's shared key. It queues, so it takes a while — add your own key in Settings for instant replies."}
          </p>
        </div>
        <button
          type="button"
          data-testid="run-ai"
          onClick={run}
          disabled={busy}
          className="btn-secondary"
        >
          {busy ? (byok ? 'Running…' : 'Drafting on the shared key…') : byok ? 'Re-run with my model' : 'Draft on the shared key'}
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
