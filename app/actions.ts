'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getMessage } from '@/lib/seed';
import { readState, withSeen, writeState } from '@/lib/state';
import { DEFAULT_TEMPLATES, type Classification, type IntentKey } from '@/lib/triage';

function requireId(form: FormData): string {
  const id = String(form.get('id') ?? '');
  if (!getMessage(id)) throw new Error(`Unknown message: ${id}`);
  return id;
}

/** Opening a message is what runs triage — the verdict becomes the row's status. */
export async function openMessageAction(form: FormData): Promise<void> {
  const id = requireId(form);
  await writeState(withSeen(await readState(), id));
  revalidatePath('/inbox');
  redirect(`/inbox/${id}`);
}

export async function saveDraftAction(form: FormData): Promise<void> {
  const id = requireId(form);
  const draft = String(form.get('draft') ?? '');
  const state = withSeen(await readState(), id);
  await writeState({ ...state, drafts: { ...state.drafts, [id]: draft } });
  revalidatePath(`/inbox/${id}`);
  redirect(`/inbox/${id}?saved=1`);
}

/** Drops the saved draft so the next render re-merges the current template with live order fields. */
export async function regenerateDraftAction(form: FormData): Promise<void> {
  const id = requireId(form);
  const state = withSeen(await readState(), id);
  const drafts = { ...state.drafts };
  delete drafts[id];
  await writeState({ ...state, drafts });
  revalidatePath(`/inbox/${id}`);
  redirect(`/inbox/${id}?regenerated=1`);
}

export async function approveAction(form: FormData): Promise<void> {
  const id = requireId(form);
  const draft = form.get('draft');
  const state = withSeen(await readState(), id);
  const drafts = { ...state.drafts };
  if (typeof draft === 'string') drafts[id] = draft;
  await writeState({
    ...state,
    drafts,
    approved: state.approved.includes(id) ? state.approved : [...state.approved, id],
  });
  revalidatePath('/inbox');
  redirect('/inbox?approved=1');
}

export async function saveTemplateAction(form: FormData): Promise<void> {
  const intent = String(form.get('intent') ?? '') as IntentKey;
  if (!DEFAULT_TEMPLATES[intent]) throw new Error(`Unknown intent: ${intent}`);
  const body = String(form.get('body') ?? '');
  const state = await readState();
  await writeState({ ...state, templates: { ...state.templates, [intent]: body } });
  revalidatePath('/library');
  redirect(`/library?saved=${intent}`);
}

export async function resetTemplateAction(form: FormData): Promise<void> {
  const intent = String(form.get('intent') ?? '') as IntentKey;
  if (!DEFAULT_TEMPLATES[intent]) throw new Error(`Unknown intent: ${intent}`);
  const state = await readState();
  const templates = { ...state.templates };
  delete templates[intent];
  await writeState({ ...state, templates });
  revalidatePath('/library');
  redirect('/library');
}

/**
 * Stores the classification and draft the visitor's own model produced. The call
 * itself happens in their browser with their key; this only records the result.
 */
export async function applyAiTriageAction(
  id: string,
  classification: Classification,
  draft: string,
): Promise<void> {
  if (!getMessage(id)) throw new Error(`Unknown message: ${id}`);
  const state = withSeen(await readState(), id);
  await writeState({
    ...state,
    ai: { ...state.ai, [id]: classification },
    drafts: { ...state.drafts, [id]: draft },
  });
  revalidatePath(`/inbox/${id}`);
}
