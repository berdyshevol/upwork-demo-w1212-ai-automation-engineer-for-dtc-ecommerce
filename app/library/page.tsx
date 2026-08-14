import { resetTemplateAction, saveTemplateAction } from '@/app/actions';
import { contentKey } from '@/lib/hash';
import { readState } from '@/lib/state';
import { DEFAULT_TEMPLATES, INTENTS } from '@/lib/triage';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Response library — OpsDesk' };

const TOKENS = [
  '{{customer_first_name}}',
  '{{order_number}}',
  '{{items}}',
  '{{fulfillment_status}}',
  '{{carrier}}',
  '{{tracking}}',
  '{{eta}}',
  '{{subject}}',
];

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const state = await readState();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Response library</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          One template per intent, in your brand voice. Edits take effect on the next draft — open a message and hit
          “Regenerate from template”. The tokens below are replaced with live order fields at draft time, so a reply
          always quotes the real tracking number and ETA.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOKENS.map((token) => (
            <code key={token} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {token}
            </code>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {INTENTS.map((intent) => {
          const override = state.templates[intent.key];
          const body = override ?? DEFAULT_TEMPLATES[intent.key].body;
          return (
            <form
              key={intent.key}
              data-testid="template-card"
              action={saveTemplateAction}
              className="card p-6"
            >
              <input type="hidden" name="intent" value={intent.key} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">{intent.label}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Subject line: {DEFAULT_TEMPLATES[intent.key].subject}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {override ? 'Edited by you' : 'Shipped default'}
                </span>
              </div>
              <textarea
                key={contentKey(intent.key, body)}
                data-testid={`template-body-${intent.key}`}
                name="body"
                rows={10}
                defaultValue={body}
                className="field mt-3 font-mono text-[13px] leading-relaxed"
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="submit" data-testid={`save-template-${intent.key}`} className="btn-primary">
                  Save template
                </button>
                {override ? (
                  <button type="submit" formAction={resetTemplateAction} className="btn-secondary">
                    Reset to default
                  </button>
                ) : null}
                {saved === intent.key ? (
                  <span data-testid={`template-saved-${intent.key}`} className="text-sm text-emerald-700">
                    Saved — the next draft for this intent uses it.
                  </span>
                ) : null}
              </div>
              {intent.key === 'damaged' ? (
                <p className="mt-3 text-xs text-slate-500">
                  Damaged-item messages are always escalated, so this template is a starting point for the human
                  writing the reply — it is never sent automatically.
                </p>
              ) : null}
            </form>
          );
        })}
      </div>
    </div>
  );
}
