import Link from 'next/link';
import { openMessageAction } from '@/app/actions';
import StatusChip from '@/components/StatusChip';
import { queue, remainingCount } from '@/lib/queue';
import { formatReceived } from '@/lib/seed';
import { readState } from '@/lib/state';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inbox — OpsDesk' };

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ approved?: string }>;
}) {
  const { approved } = await searchParams;
  const state = await readState();
  const rows = queue(state);
  const remaining = remainingCount(state);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Support inbox</h1>
          <p className="mt-1 text-sm text-slate-600">
            Seeded overnight batch. Open a message to run triage: intent, order lookup, draft or escalation.
          </p>
        </div>
        <div className="card px-4 py-3 text-right">
          <p className="label">Remaining</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">
            <span data-testid="remaining-count">{remaining}</span>
            <span className="text-base font-normal text-slate-400"> / {rows.length}</span>
          </p>
        </div>
      </div>

      {approved ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Reply approved and removed from the queue. In production this is where it would be sent from your helpdesk.
        </p>
      ) : null}

      <ul className="card divide-y divide-slate-200">
        {rows.map(({ message, status }) => (
          <li key={message.id}>
            <form action={openMessageAction} data-testid="message-row">
              <input type="hidden" name="id" value={message.id} />
              <button
                type="submit"
                aria-label={`Open message: ${message.subject}`}
                className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-slate-50"
              >
                <span className="flex w-full flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium text-slate-900">{message.from}</span>
                  <span className="text-xs text-slate-500">{message.email}</span>
                  <span className="ml-auto text-xs tabular-nums text-slate-500">
                    {formatReceived(message.receivedAt)}
                  </span>
                </span>
                <span className="flex w-full flex-wrap items-center gap-3">
                  <span className="text-slate-800">{message.subject}</span>
                  <span className="ml-auto">
                    <StatusChip status={status} />
                  </span>
                </span>
                <span className="line-clamp-1 text-sm text-slate-500">{message.body}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>

      <p className="text-sm text-slate-500">
        Templates live in the{' '}
        <Link className="underline" href="/library">
          response library
        </Link>
        ; escalation thresholds are stated on every message that trips them.
      </p>
    </div>
  );
}
