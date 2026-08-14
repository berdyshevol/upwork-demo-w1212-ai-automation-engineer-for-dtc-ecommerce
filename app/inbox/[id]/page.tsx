import Link from 'next/link';
import { notFound } from 'next/navigation';
import { approveAction, regenerateDraftAction, saveDraftAction } from '@/app/actions';
import AiTriagePanel from '@/components/AiTriagePanel';
import StatusChip from '@/components/StatusChip';
import { contentKey } from '@/lib/hash';
import { statusFor, triageFor } from '@/lib/queue';
import { formatReceived, getMessage } from '@/lib/seed';
import { readState } from '@/lib/state';
import { CONFIDENCE_THRESHOLD, STATUS_LABEL } from '@/lib/triage';

export const dynamic = 'force-dynamic';

export default async function MessagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; regenerated?: string }>;
}) {
  const { id } = await params;
  const { saved, regenerated } = await searchParams;
  const message = getMessage(id);
  if (!message) notFound();

  const state = await readState();
  const result = triageFor(message, state);
  const status = statusFor(message, { ...state, seen: [...state.seen, message.id] }, result);
  const approved = state.approved.includes(message.id);

  return (
    <div className="space-y-6">
      <Link href="/inbox" className="text-sm text-slate-500 hover:text-slate-900">
        ← Back to inbox
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 data-testid="message-subject" className="text-xl font-semibold tracking-tight text-slate-900">
              {message.subject}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {message.from} · {message.email} · {formatReceived(message.receivedAt)}
            </p>
          </div>
          <span data-testid="detail-status">
            <StatusChip status={status} />
          </span>
        </div>
        <p className="mt-4 whitespace-pre-line text-slate-700">{message.body}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AiTriagePanel messageId={message.id} />

          {result.escalated ? (
            <div className="card border-rose-200 p-6">
              <h2 className="text-lg font-semibold text-rose-800">Escalated to a human</h2>
              <ul data-testid="escalation-reason" className="mt-3 space-y-2 text-sm text-rose-800">
                {result.reasons.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <span aria-hidden>•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              <p data-testid="draft-suppressed" className="mt-4 text-sm text-slate-600">
                Auto-drafting is suppressed for this message. Nothing goes out until someone here writes it.
              </p>
              {approved ? null : (
                <form action={approveAction} className="mt-4">
                  <input type="hidden" name="id" value={message.id} />
                  <button type="submit" className="btn-secondary">
                    Approve escalation &amp; clear from queue
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form action={saveDraftAction} className="card p-6">
              <input type="hidden" name="id" value={message.id} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Reply draft</h2>
                <p className="text-xs text-slate-500">
                  {result.draftIsEdited ? 'Your edited version' : 'Generated from the current template'}
                </p>
              </div>
              <textarea
                key={contentKey(message.id, result.draft ?? '')}
                data-testid="draft-editor"
                name="draft"
                rows={14}
                defaultValue={result.draft ?? ''}
                className="field mt-3 font-mono text-[13px] leading-relaxed"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="submit" className="btn-secondary">
                  Save draft
                </button>
                <button type="submit" formAction={regenerateDraftAction} className="btn-secondary">
                  Regenerate from template
                </button>
                <button type="submit" formAction={approveAction} className="btn-primary">
                  Approve reply
                </button>
              </div>
              {saved ? (
                <p data-testid="draft-saved" className="mt-3 text-sm text-emerald-700">
                  Draft saved to your session — it will be here when you come back to this message.
                </p>
              ) : null}
              {regenerated ? (
                <p data-testid="draft-regenerated" className="mt-3 text-sm text-sky-700">
                  Regenerated from the current <Link className="underline" href="/library">response library</Link>{' '}
                  template and the live order fields.
                </p>
              ) : null}
              {approved ? (
                <p className="mt-3 text-sm text-emerald-700">
                  Approved. In production this is the point where the helpdesk sends it.
                </p>
              ) : null}
            </form>
          )}

          <div data-testid="why-panel" className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Why this classification</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="label">Signal phrases</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {result.signals.map((signal) => (
                    <code key={signal} className="rounded bg-slate-100 px-2 py-1 text-[13px] text-slate-700">
                      {signal}
                    </code>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="label">Order lookup key</dt>
                <dd className="mt-1 text-slate-700">
                  <code className="rounded bg-slate-100 px-2 py-1 text-[13px]">{result.lookupKey}</code>{' '}
                  <span className="text-slate-500">— {result.lookupNote}</span>
                  <br />
                  {result.order
                    ? `Matched order #${result.order.orderNumber}, placed ${result.order.placedAt}.`
                    : 'No order matched, so there is nothing to quote back.'}
                </dd>
              </div>
              <div>
                <dt className="label">Decided by</dt>
                <dd className="mt-1 text-slate-700">{result.source}</dd>
              </div>
              <div>
                <dt className="label">Flag decision</dt>
                <dd className="mt-1 text-slate-700">
                  {result.escalated
                    ? result.reasons.join(' ')
                    : `No escalation rule tripped: confidence ${result.confidence.toFixed(
                        2,
                      )} ≥ ${CONFIDENCE_THRESHOLD.toFixed(2)}, intent is not Damaged item, and the order was found.`}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-900">Classification</h2>
            <p data-testid="intent-label" className="mt-2 text-lg font-medium text-slate-900">
              {result.label}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Confidence <span data-testid="confidence" className="font-semibold tabular-nums text-slate-900">
                {result.confidence.toFixed(2)}
              </span>{' '}
              · threshold {CONFIDENCE_THRESHOLD.toFixed(2)}
            </p>
            <p className="mt-3 text-xs text-slate-500">Queue status: {STATUS_LABEL[status]}</p>
          </div>

          <div data-testid="order-panel" className="card p-6">
            <h2 className="text-sm font-semibold text-slate-900">Order record</h2>
            {result.order ? (
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="label">Order</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">#{result.order.orderNumber}</dd>
                </div>
                <div>
                  <dt className="label">Items</dt>
                  <dd className="mt-0.5 text-slate-700">
                    {result.order.items.map((item) => (
                      <span key={item} className="block">
                        {item}
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="label">Fulfillment</dt>
                  <dd className="mt-0.5 text-slate-700">{result.order.fulfillmentStatus}</dd>
                </div>
                <div>
                  <dt className="label">Carrier</dt>
                  <dd className="mt-0.5 text-slate-700">{result.order.carrier}</dd>
                </div>
                <div>
                  <dt className="label">Tracking</dt>
                  <dd className="mt-0.5 break-all font-mono text-[13px] text-slate-700">{result.order.tracking}</dd>
                </div>
                <div>
                  <dt className="label">Estimated delivery</dt>
                  <dd className="mt-0.5 text-slate-700">{result.order.eta}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                No order found for <code className="rounded bg-slate-100 px-1">{result.lookupKey}</code>. Nothing to
                quote, so this one goes to a human.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
