import { cookies } from 'next/headers';
import type { Classification, IntentKey } from './triage';

// Everything the visitor writes — template edits, draft edits, per-message status —
// rides in one cookie. See .claude/adr/0001: a Vercel deploy is several instances
// with no shared memory, so a module-level store loses writes intermittently.

const COOKIE = 'opsdesk_state';
const MAX_BYTES = 3400; // browsers cap a cookie at ~4 KB
const MAX_DRAFT_CHARS = 1200;
const MAX_TEMPLATE_CHARS = 900;
const MAX_DRAFTS = 4;

export interface VisitorState {
  /** Messages the visitor has opened — triage has run and its verdict is now their status. */
  seen: string[];
  approved: string[];
  /** messageId -> draft text (edited by hand, or produced by the visitor's own model). */
  drafts: Record<string, string>;
  /** messageId -> classification returned by the visitor's model. */
  ai: Record<string, Classification>;
  /** intent -> template body override saved on /library. */
  templates: Partial<Record<IntentKey, string>>;
}

export const EMPTY_STATE: VisitorState = { seen: [], approved: [], drafts: {}, ai: {}, templates: {} };

function coerce(raw: unknown): VisitorState {
  const partial = (raw ?? {}) as Partial<VisitorState>;
  return {
    seen: Array.isArray(partial.seen) ? partial.seen.filter((v) => typeof v === 'string') : [],
    approved: Array.isArray(partial.approved) ? partial.approved.filter((v) => typeof v === 'string') : [],
    drafts: partial.drafts && typeof partial.drafts === 'object' ? partial.drafts : {},
    ai: partial.ai && typeof partial.ai === 'object' ? partial.ai : {},
    templates: partial.templates && typeof partial.templates === 'object' ? partial.templates : {},
  };
}

/** Safe in any server component or route handler. Never throws on a bad cookie. */
export async function readState(): Promise<VisitorState> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return EMPTY_STATE;
  try {
    return coerce(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return EMPTY_STATE; // tampered or truncated: fall back to the seed
  }
}

/** Keeps the blob under the browser's per-cookie limit: newest drafts win. */
export function trim(state: VisitorState): VisitorState {
  const next: VisitorState = {
    seen: state.seen.slice(-40),
    approved: state.approved.slice(-40),
    drafts: {},
    ai: { ...state.ai },
    templates: {},
  };

  for (const [key, body] of Object.entries(state.templates)) {
    if (typeof body === 'string') next.templates[key as IntentKey] = body.slice(0, MAX_TEMPLATE_CHARS);
  }

  const draftKeys = Object.keys(state.drafts).slice(-MAX_DRAFTS);
  for (const key of draftKeys) next.drafts[key] = String(state.drafts[key]).slice(0, MAX_DRAFT_CHARS);

  while (encodeURIComponent(JSON.stringify(next)).length > MAX_BYTES) {
    const oldest = Object.keys(next.drafts)[0];
    if (oldest) {
      delete next.drafts[oldest];
      delete next.ai[oldest];
      continue;
    }
    const template = Object.keys(next.templates)[0] as IntentKey | undefined;
    if (template) {
      delete next.templates[template];
      continue;
    }
    break;
  }

  return next;
}

/** ONLY callable from a server action or a route handler — cookies().set throws in a render. */
export async function writeState(state: VisitorState): Promise<void> {
  (await cookies()).set(COOKIE, encodeURIComponent(JSON.stringify(trim(state))), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function withSeen(state: VisitorState, id: string): VisitorState {
  return state.seen.includes(id) ? state : { ...state, seen: [...state.seen, id] };
}
