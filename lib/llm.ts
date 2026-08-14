import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject, jsonSchema, type LanguageModel } from 'ai';
import type { Classification, IntentKey } from './triage';

// BYOK: the visitor's key lives in their own localStorage and the model call goes
// browser -> provider. Nothing here ever reaches a server-held credential, and the
// deployed demo cannot bill anyone but the visitor who pasted a key.

export const BYOK_KEY = 'byok';

export type ProviderId = 'anthropic' | 'openai' | 'google' | 'mock';

export interface Byok {
  provider: ProviderId;
  apiKey: string;
  model: string;
}

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  mock: 'Mock (tests)',
};

export const MODELS: Record<ProviderId, string[]> = {
  anthropic: ['claude-haiku-4-5', 'claude-sonnet-4-6', 'claude-opus-4-7'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'o1-mini'],
  google: ['gemini-2.0-flash', 'gemini-2.5-pro'],
  mock: ['mock'],
};

export const BYOK_HINT = 'Choose a provider and paste your API key in Settings to enable live AI.';
export const BYOK_CHANGED_EVENT = 'byok-changed';

export function readByok(): Byok | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(BYOK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Byok>;
    if (!parsed.provider || !parsed.apiKey) return null;
    const provider = parsed.provider as ProviderId;
    if (!MODELS[provider]) return null;
    return { provider, apiKey: parsed.apiKey, model: parsed.model || MODELS[provider][0] };
  } catch {
    return null;
  }
}

export function saveByok(byok: Byok): void {
  window.localStorage.setItem(BYOK_KEY, JSON.stringify(byok));
  window.dispatchEvent(new Event(BYOK_CHANGED_EVENT));
}

export function clearByok(): void {
  window.localStorage.removeItem(BYOK_KEY);
  window.dispatchEvent(new Event(BYOK_CHANGED_EVENT));
}

export interface TriagePayload {
  message: { id: string; from: string; email: string; subject: string; body: string };
  order: {
    orderNumber: string;
    items: string[];
    fulfillmentStatus: string;
    carrier: string;
    tracking: string;
    eta: string;
  } | null;
  templateBody: string;
  fallback: { intent: IntentKey; confidence: number; signals: string[]; draft: string | null };
}

export interface AiTriage {
  classification: Classification;
  draft: string;
}

function modelFor(byok: Byok): LanguageModel {
  // dangerouslyAllowBrowser is what lets the SDK run provider calls from the page.
  const options = {
    apiKey: byok.apiKey,
    dangerouslyAllowBrowser: true,
    headers:
      byok.provider === 'anthropic' ? { 'anthropic-dangerous-direct-browser-access': 'true' } : undefined,
  };

  switch (byok.provider) {
    case 'anthropic':
      return createAnthropic(options)(byok.model);
    case 'openai':
      return createOpenAI(options)(byok.model);
    case 'google':
      return createGoogleGenerativeAI(options)(byok.model);
    default:
      throw new Error(`No live model for provider ${byok.provider}`);
  }
}

const RESULT_SCHEMA = jsonSchema<{
  intent: IntentKey;
  confidence: number;
  signals: string[];
  draft: string;
}>({
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: ['wismo', 'return_exchange', 'damaged', 'product_question', 'other'],
    },
    confidence: { type: 'number' },
    signals: { type: 'array', items: { type: 'string' } },
    draft: { type: 'string' },
  },
  required: ['intent', 'confidence', 'signals', 'draft'],
  additionalProperties: false,
});

function prompt(payload: TriagePayload): string {
  const order = payload.order
    ? [
        `order_number: #${payload.order.orderNumber}`,
        `items: ${payload.order.items.join(', ')}`,
        `fulfillment_status: ${payload.order.fulfillmentStatus}`,
        `carrier: ${payload.order.carrier}`,
        `tracking: ${payload.order.tracking}`,
        `eta: ${payload.order.eta}`,
      ].join('\n')
    : 'no matching order was found for this customer';

  return `You triage inbound customer email for a DTC coffee-and-gear brand.

Classify the message into exactly one intent: wismo (where is my order), return_exchange, damaged, product_question, other.
Give a confidence between 0 and 1. List the literal phrases from the message that drove the decision as "signals".
Then write the reply draft by following the brand template below: keep its structure and voice, and substitute the real order fields. The draft must quote the tracking number and the ETA verbatim when an order exists. No placeholders, no square brackets.

CUSTOMER MESSAGE
from: ${payload.message.from} <${payload.message.email}>
subject: ${payload.message.subject}
body: ${payload.message.body}

ORDER RECORD
${order}

BRAND TEMPLATE
${payload.templateBody}`;
}

export async function runAiTriage(byok: Byok, payload: TriagePayload): Promise<AiTriage> {
  if (byok.provider === 'mock') {
    // Deterministic path used by the behavioural tests — no network, no key.
    const base =
      payload.fallback.draft ??
      `Hi ${payload.message.from.split(' ')[0]}, a human is picking this one up directly.`;
    return {
      classification: {
        intent: payload.fallback.intent,
        confidence: 0.99,
        signals: [...payload.fallback.signals, 'mock model returned a fixed verdict'],
        source: 'Mock model (tests) · mock',
      },
      draft: `${base}\n\nReviewed by the live model before sending.`,
    };
  }

  const { object } = await generateObject({
    model: modelFor(byok),
    schema: RESULT_SCHEMA,
    prompt: prompt(payload),
  });

  return {
    classification: {
      intent: object.intent,
      confidence: Math.max(0, Math.min(1, Number(object.confidence) || 0)),
      signals: object.signals?.length ? object.signals : ['model returned no signal phrases'],
      source: `${PROVIDER_LABEL[byok.provider]} · ${byok.model}`,
    },
    draft: object.draft,
  };
}
