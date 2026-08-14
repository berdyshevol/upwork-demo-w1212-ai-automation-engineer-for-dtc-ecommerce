import { NextResponse } from 'next/server';
import { getMessage } from '@/lib/seed';
import { readState } from '@/lib/state';
import { triageFor } from '@/lib/queue';
import { DEFAULT_TEMPLATES } from '@/lib/triage';
import type { TriagePayload } from '@/lib/llm';

export const dynamic = 'force-dynamic';

/**
 * Classify + draft, deterministically. This route holds NO API key and never calls a
 * paid provider: it returns the offline-mode verdict, which is also the baseline the
 * browser hands to the visitor's own model when they have pasted a key in Settings.
 */
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

  const payload: TriagePayload = {
    message: {
      id: message.id,
      from: message.from,
      email: message.email,
      subject: message.subject,
      body: message.body,
    },
    order: result.order
      ? {
          orderNumber: result.order.orderNumber,
          items: result.order.items,
          fulfillmentStatus: result.order.fulfillmentStatus,
          carrier: result.order.carrier,
          tracking: result.order.tracking,
          eta: result.order.eta,
        }
      : null,
    templateBody,
    fallback: {
      intent: result.intent,
      confidence: result.confidence,
      signals: result.signals,
      draft: result.draft,
    },
  };

  return NextResponse.json({ ...payload, escalated: result.escalated, reasons: result.reasons });
}
