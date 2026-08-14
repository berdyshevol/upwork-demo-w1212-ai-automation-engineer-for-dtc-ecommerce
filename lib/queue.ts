import { MESSAGES, type Message } from './seed';
import type { VisitorState } from './state';
import { triage, type Status, type TriageResult } from './triage';

export interface QueueRow {
  message: Message;
  status: Status;
  result: TriageResult;
}

export function triageFor(message: Message, state: VisitorState): TriageResult {
  return triage({
    message,
    templates: state.templates,
    aiClassification: state.ai[message.id] ?? null,
    savedDraft: state.drafts[message.id] ?? null,
  });
}

/**
 * A message stays `Needs review` until the visitor opens it — that is when triage
 * runs and its verdict (escalated / drafted) becomes the row's status.
 */
export function statusFor(message: Message, state: VisitorState, result: TriageResult): Status {
  if (state.approved.includes(message.id)) return 'approved';
  if (!state.seen.includes(message.id)) return 'needs_review';
  return result.escalated ? 'escalated' : 'drafted';
}

export function queue(state: VisitorState): QueueRow[] {
  return MESSAGES.map((message) => {
    const result = triageFor(message, state);
    return { message, status: statusFor(message, state, result), result };
  });
}

export function remainingCount(state: VisitorState): number {
  return MESSAGES.filter((m) => !state.approved.includes(m.id)).length;
}
