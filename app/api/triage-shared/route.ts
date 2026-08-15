import { NextResponse } from 'next/server';
import { getMessage } from '@/lib/seed';
import { readState } from '@/lib/state';
import { triageFor } from '@/lib/queue';
import { DEFAULT_TEMPLATES } from '@/lib/triage';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const POLL_INTERVAL_MS = 2_000;
const GIVE_UP_AFTER_MS = 170_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The keyless path: a visitor who pastes no key still gets a real drafted reply
 * instead of a disabled button.
 *
 * There is no credential in this repo. When DEMO_LLM_URL is set the pipeline
 * points it at the author's gateway, which adds its own token and rate-limits
 * the traffic; when it is unset — someone cloned and deployed this themselves —
 * the caller falls back to the deterministic template, which is what the app
 * did before this route existed.
 *
 * Only the DRAFT comes from the model here. The classification stays the
 * deterministic verdict: this endpoint answers in prose, and inventing a JSON
 * contract on top of it would trade a reliable classifier for a parser that
 * fails on its first surprise.
 */
async function askSharedGateway(prompt: string): Promise<string | null> {
  const base = process.env.DEMO_LLM_URL;
  if (!base) return null;

  const created = await fetch(base, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, profile: 'simple' }),
  });
  if (created.status === 429) {
    throw new Error(
      'The shared demo key is busy right now. Try again in a minute, or add your own key in Settings for an instant reply.',
    );
  }
  if (!created.ok) throw new Error(`The shared endpoint refused the job (${created.status}).`);

  const { id } = (await created.json()) as { id: number | string };
  const startedAt = Date.now();

  for (;;) {
    if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
      throw new Error(
        'The shared demo key is still queueing after three minutes. Add your own key in Settings for an instant reply.',
      );
    }
    await sleep(POLL_INTERVAL_MS);
    const res = await fetch(`${base}/${id}`);
    if (!res.ok) throw new Error(`The shared endpoint lost the job (${res.status}).`);
    const job = (await res.json()) as { status: string; response?: string; error?: string };
    if (job.status === 'running') continue;
    if (job.status === 'done' && job.response?.trim()) return job.response.trim();
    throw new Error(job.error || 'The shared demo key could not answer this one.');
  }
}

export async function POST(request: Request) {
  let messageId = '';
  try {
    const body = (await request.json()) as { messageId?: string };
    messageId = String(body.messageId ?? '');
  } catch {
    return NextResponse.json({ error: 'Expected JSON with a messageId.' }, { status: 400 });
  }

  const message = getMessage(messageId);
  if (!message) return NextResponse.json({ error: `Unknown message: ${messageId}` }, { status: 404 });

  const state = await readState();
  const result = triageFor(message, state);
  const templateBody = state.templates[result.intent] ?? DEFAULT_TEMPLATES[result.intent].body;

  const order = result.order
    ? [
        `order_number: #${result.order.orderNumber}`,
        `items: ${result.order.items.join(', ')}`,
        `fulfillment_status: ${result.order.fulfillmentStatus}`,
        `carrier: ${result.order.carrier}`,
        `tracking: ${result.order.tracking}`,
        `eta: ${result.order.eta}`,
      ].join('\n')
    : 'no matching order was found for this customer';

  const prompt = `You write customer-support replies for a DTC coffee-and-gear brand.

Write the reply draft by following the brand template below: keep its structure and voice, and substitute the real order fields. Quote the tracking number and the ETA verbatim when an order exists. No placeholders, no square brackets, no preamble — output only the reply itself.

CUSTOMER MESSAGE
from: ${message.from} <${message.email}>
subject: ${message.subject}
body: ${message.body}

ORDER RECORD
${order}

BRAND TEMPLATE
${templateBody}`;

  try {
    const draft = await askSharedGateway(prompt);
    if (!draft) {
      return NextResponse.json({
        classification: {
          intent: result.intent,
          confidence: result.confidence,
          signals: result.signals,
          source: 'Deterministic classifier (no key configured)',
        },
        draft: result.draft,
        source: 'seeded template (no key configured)',
      });
    }
    return NextResponse.json({
      classification: {
        intent: result.intent,
        confidence: result.confidence,
        signals: [...result.signals, 'draft written on the shared demo key'],
        source: "The author's shared key (queued, no key needed)",
      },
      draft,
      source: "the author's shared key (queued, no key needed)",
    });
  } catch (cause) {
    // A failure still leaves a usable draft on screen, with the reason attached.
    const detail = cause instanceof Error ? cause.message : 'The shared call failed.';
    return NextResponse.json({
      classification: {
        intent: result.intent,
        confidence: result.confidence,
        signals: result.signals,
        source: 'Deterministic classifier',
      },
      draft: result.draft,
      source: `seeded template — ${detail}`,
    });
  }
}
