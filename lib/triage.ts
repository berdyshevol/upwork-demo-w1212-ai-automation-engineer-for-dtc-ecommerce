import { findOrder, type Message, type Order } from './seed';

export type IntentKey = 'wismo' | 'return_exchange' | 'damaged' | 'product_question' | 'other';

export interface IntentSpec {
  key: IntentKey;
  label: string;
  /** Signal phrases the deterministic classifier looks for. Shown in the why-panel. */
  phrases: string[];
}

export const INTENTS: IntentSpec[] = [
  {
    key: 'wismo',
    label: 'Where is my order',
    phrases: [
      'where is my order',
      'tracking hasn’t updated',
      'hasn’t moved',
      'says delivered',
      'nothing on my porch',
      'still not here',
      'when will it arrive',
      'shipping status',
    ],
  },
  {
    key: 'return_exchange',
    label: 'Return / exchange',
    phrases: ['exchange', 'refund', 'wrong size', 'send it back', 'the return', 'store credit'],
  },
  {
    key: 'damaged',
    label: 'Damaged item',
    phrases: ['cracked', 'broken', 'damaged', 'shattered', 'dented', 'leaking', 'arrived smashed'],
  },
  {
    key: 'product_question',
    label: 'Product question',
    phrases: [
      'dishwasher safe',
      'hand wash',
      'care instructions',
      'roast date',
      'what size',
      'how do i clean',
      'does it come with',
    ],
  },
  { key: 'other', label: 'Other', phrases: [] },
];

export const CONFIDENCE_THRESHOLD = 0.7;
export const BASE_CONFIDENCE = 0.55;
export const CONFIDENCE_PER_SIGNAL = 0.13;
export const NO_SIGNAL_CONFIDENCE = 0.42;
export const CLASSIFIER_NAME = 'Deterministic keyword classifier v2';

export function intentLabel(key: IntentKey): string {
  return INTENTS.find((i) => i.key === key)?.label ?? 'Other';
}

/** Curly and straight apostrophes are the same character for matching purposes. */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[’']/g, "'");
}

export interface Classification {
  intent: IntentKey;
  confidence: number;
  signals: string[];
  source: string;
}

export function classify(message: Pick<Message, 'subject' | 'body'>): Classification {
  const haystack = normalise(`${message.subject}\n${message.body}`);

  let best: { key: IntentKey; hits: string[] } = { key: 'other', hits: [] };
  for (const intent of INTENTS) {
    const hits = intent.phrases.filter((p) => haystack.includes(normalise(p)));
    if (hits.length > best.hits.length) best = { key: intent.key, hits };
  }

  const confidence =
    best.hits.length === 0
      ? NO_SIGNAL_CONFIDENCE
      : Math.round(Math.min(BASE_CONFIDENCE + CONFIDENCE_PER_SIGNAL * best.hits.length, 0.96) * 100) / 100;

  return {
    intent: best.key,
    confidence,
    signals: best.hits.length ? best.hits : ['no intent phrase matched'],
    source: CLASSIFIER_NAME,
  };
}

export interface Template {
  intent: IntentKey;
  subject: string;
  body: string;
}

export const DEFAULT_TEMPLATES: Record<IntentKey, Template> = {
  wismo: {
    intent: 'wismo',
    subject: 'Re: {{subject}} — order {{order_number}} is moving',
    body: `Hi {{customer_first_name}},

Thanks for the nudge — I pulled up order {{order_number}} just now. It is {{fulfillment_status}} with {{carrier}} on tracking {{tracking}}, and the carrier's current estimate is {{eta}}.

Nothing is stuck on our side: {{items}} left the warehouse and the next scan should come from your local delivery hub. If it has not reached you by {{eta}}, reply here and I will send a replacement the same day.

— Ravi, Customer Care`,
  },
  return_exchange: {
    intent: 'return_exchange',
    subject: 'Re: {{subject}} — sorted for order {{order_number}}',
    body: `Hi {{customer_first_name}},

Happy to fix this. Order {{order_number}} ({{items}}) is showing as {{fulfillment_status}} with {{carrier}}, tracking {{tracking}}.

I have started the exchange on our side — a prepaid label is on its way to this address within the hour, and the replacement ships the moment the return scans. Reference point on the original shipment: {{eta}}.

— Ravi, Customer Care`,
  },
  damaged: {
    intent: 'damaged',
    subject: 'Re: {{subject}} — replacement for order {{order_number}}',
    body: `Hi {{customer_first_name}},

I am sorry — {{items}} should not have arrived like that. Order {{order_number}} shipped {{carrier}} on tracking {{tracking}}.

A replacement is going out today and you do not need to send the damaged one back. I have flagged the batch to our packing lead so it does not repeat.

— Ravi, Customer Care`,
  },
  product_question: {
    intent: 'product_question',
    subject: 'Re: {{subject}}',
    body: `Hi {{customer_first_name}},

Good question. {{items}} from order {{order_number}} is dishwasher safe on the top rack, though hand washing keeps the finish sharper for longer. The lid gasket lifts out for a rinse and pushes straight back in.

Order status while I have it open: {{fulfillment_status}} with {{carrier}}, tracking {{tracking}}, estimate {{eta}}.

— Ravi, Customer Care`,
  },
  other: {
    intent: 'other',
    subject: 'Re: {{subject}}',
    body: `Hi {{customer_first_name}},

Thanks for writing in. I have your order {{order_number}} in front of me — {{items}}, currently {{fulfillment_status}} with {{carrier}} on tracking {{tracking}}, estimate {{eta}}.

Tell me what you would like to happen and I will take it from there.

— Ravi, Customer Care`,
  },
};

export function renderTemplate(body: string, message: Message, order: Order): string {
  const tokens: Record<string, string> = {
    customer_first_name: message.from.split(' ')[0],
    subject: message.subject,
    order_number: `#${order.orderNumber}`,
    items: order.items.join(', '),
    fulfillment_status: order.fulfillmentStatus.toLowerCase(),
    carrier: order.carrier,
    tracking: order.tracking,
    eta: order.eta,
  };
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key: string) => tokens[key] ?? whole);
}

export interface TriageResult {
  intent: IntentKey;
  label: string;
  confidence: number;
  signals: string[];
  source: string;
  order: Order | null;
  lookupKey: string;
  lookupNote: string;
  escalated: boolean;
  reasons: string[];
  draft: string | null;
  draftIsEdited: boolean;
}

export interface TriageInput {
  message: Message;
  /** Template body overrides saved by the visitor on /library. */
  templates: Partial<Record<IntentKey, string>>;
  /** A classification returned by the visitor's own LLM, if they ran one. */
  aiClassification?: Classification | null;
  /** A draft the visitor edited, or one the LLM produced. */
  savedDraft?: string | null;
}

export function triage({ message, templates, aiClassification, savedDraft }: TriageInput): TriageResult {
  const classification = aiClassification ?? classify(message);
  const order = findOrder(message.orderRef, message.email) ?? null;

  const lookupKey = message.orderRef ? `order #${message.orderRef}` : message.email;
  const lookupNote = message.orderRef
    ? 'order number quoted in the message body'
    : 'sender email address (no order number in the message)';

  const reasons: string[] = [];
  if (classification.intent === 'damaged') {
    reasons.push('Damaged item requires a human — replacement and goodwill calls are not auto-sent.');
  }
  if (!order) {
    reasons.push(`No matching order for lookup key ${lookupKey} — nothing to quote back to the customer.`);
  }
  if (classification.confidence < CONFIDENCE_THRESHOLD) {
    reasons.push(
      `Intent confidence ${classification.confidence.toFixed(2)} is below the ${CONFIDENCE_THRESHOLD.toFixed(
        2,
      )} threshold.`,
    );
  }

  const escalated = reasons.length > 0;
  const templateBody = templates[classification.intent] ?? DEFAULT_TEMPLATES[classification.intent].body;

  let draft: string | null = null;
  if (!escalated && order) {
    draft = savedDraft ?? renderTemplate(templateBody, message, order);
  }

  return {
    intent: classification.intent,
    label: intentLabel(classification.intent),
    confidence: classification.confidence,
    signals: classification.signals,
    source: classification.source,
    order,
    lookupKey,
    lookupNote,
    escalated,
    reasons,
    draft,
    draftIsEdited: Boolean(!escalated && order && savedDraft),
  };
}

export type Status = 'needs_review' | 'drafted' | 'escalated' | 'approved';

export const STATUS_LABEL: Record<Status, string> = {
  needs_review: 'Needs review',
  drafted: 'Drafted',
  escalated: 'Escalated',
  approved: 'Approved',
};
