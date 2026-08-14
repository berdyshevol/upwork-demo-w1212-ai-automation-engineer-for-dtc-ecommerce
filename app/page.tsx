import Link from 'next/link';
import { MESSAGES, ORDERS } from '@/lib/seed';
import { CONFIDENCE_THRESHOLD, INTENTS } from '@/lib/triage';

export const metadata = { title: 'OpsDesk — what this proves' };

const STEPS = [
  {
    title: 'Ingest',
    body: `${MESSAGES.length} inbound emails land in one queue with sender, subject and time.`,
  },
  {
    title: 'Classify',
    body: `Each message is scored into one of ${INTENTS.length} intents with a confidence number you can see.`,
  },
  {
    title: 'Enrich',
    body: `The customer's order is pulled from the ${ORDERS.length} seeded records: status, carrier, tracking, ETA.`,
  },
  {
    title: 'Draft',
    body: 'The intent template and the live order fields are merged into a reply in your brand voice.',
  },
  {
    title: 'Human review',
    body: `Anything damaged, unmatched, or under ${CONFIDENCE_THRESHOLD.toFixed(2)} confidence is escalated, not drafted.`,
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Queue 1 of 4 — customer service triage
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Clear a support inbox in minutes, with a human owning every judgement call.
        </h1>
        <p className="max-w-3xl text-slate-600">
          OpsDesk reads each inbound customer email, decides what it is about, attaches the matching order and
          fulfillment status, and writes the reply from your own response library. What it is not sure about, or
          what it should not answer alone, it hands to you with the reason written down. This is the highest-volume
          item on your list, built end to end — the same ingest → classify → enrich → draft → review pattern the
          other three queues need.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/inbox" className="btn-primary">
            Open the inbox →
          </Link>
          <Link href="/library" className="btn-secondary">
            Edit the response library
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, i) => (
          <div key={step.title} className="card p-4">
            <p className="text-xs font-semibold text-slate-400">Step {i + 1}</p>
            <p className="mt-1 font-medium text-slate-900">{step.title}</p>
            <p className="mt-2 text-sm text-slate-600">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900">How it works — and where you edit it</h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="label">Response library</dt>
            <dd className="mt-1 text-sm text-slate-600">
              Five templates, one per intent, editable at <Link className="underline" href="/library">/library</Link>.
              Fields like <code className="rounded bg-slate-100 px-1">{'{{tracking}}'}</code> and{' '}
              <code className="rounded bg-slate-100 px-1">{'{{eta}}'}</code> are filled from the order record at draft
              time, so wording changes take effect on the very next draft.
            </dd>
          </div>
          <div>
            <dt className="label">Escalation rules</dt>
            <dd className="mt-1 text-sm text-slate-600">
              Confidence below {CONFIDENCE_THRESHOLD.toFixed(2)}, intent <em>Damaged item</em>, or no matching order —
              any one of those suppresses the draft and flags the message with the reason stated on the message itself.
            </dd>
          </div>
          <div>
            <dt className="label">The model is yours</dt>
            <dd className="mt-1 text-sm text-slate-600">
              Out of the box this runs on a deterministic keyword classifier, so every screen works with no key and no
              bill. Paste your own Anthropic, OpenAI or Google key in{' '}
              <Link className="underline" href="/settings">Settings</Link> and the classification and draft come from
              your model instead — called from your browser, with your key, never stored on our side.
            </dd>
          </div>
          <div>
            <dt className="label">Seeded data</dt>
            <dd className="mt-1 text-sm text-slate-600">
              {MESSAGES.length} messages and {ORDERS.length} orders are fixtures in the repo — no Shopify OAuth, no
              helpdesk connection, nothing sent. Your edits, drafts and approvals are kept in your own browser cookie.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
