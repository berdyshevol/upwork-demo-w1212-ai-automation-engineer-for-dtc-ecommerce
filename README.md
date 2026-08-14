# OpsDesk — support triage & reply drafting

A working demo of the highest-volume queue on a DTC ecommerce ops list: inbound
customer email, triaged end to end. Ingest → classify → enrich with the order →
draft in brand voice → hand anything doubtful to a human.

## What it demonstrates

- **A seeded inbox of 8 customer emails** with sender, subject, time and a triage
  status chip (`Needs review` / `Drafted` / `Escalated` / `Approved`), plus a
  remaining-messages counter.
- **Intent classification** into five intents — where is my order, return /
  exchange, damaged item, product question, other — each with a confidence score.
- **Order enrichment**: the customer's order is looked up from the seeded store
  and the detail view shows items, fulfillment status, carrier, tracking number
  and estimated delivery.
- **Reply drafting** that merges the intent template with the live order fields,
  so the draft quotes the real tracking number and ETA rather than filler.
- **Escalation with a stated reason**: intent `Damaged item`, no matching order,
  or confidence under 0.70 suppresses the auto-draft and flags the message.
- **An editable response library** (`/library`) — five templates with
  `{{tracking}}`-style tokens. Edit one, regenerate a draft, see the new wording.
- **A "Why this classification" panel** listing the signal phrases, the order
  lookup key, what decided the intent, and which escalation rule tripped.
- **Offline mode by default**: with no API key the deterministic keyword
  classifier and template merge run the whole app, and the header says so.

## Bring your own key

There is no server-side API key and no `*_API_KEY` environment variable. Open
`/settings`, pick Anthropic, OpenAI or Google, paste your key and choose a model;
it is stored only in your browser's localStorage under `byok`, and the model call
goes from your browser straight to the provider through the Vercel AI SDK. The
server route `/api/triage` holds no credentials — it returns the deterministic
baseline (order record plus your current template) that the browser then hands to
your model. Clear the key and everything falls back to offline mode.

## Visitor state

Template edits, draft edits and approvals are written to a single cookie
(`opsdesk_state`, httpOnly, trimmed to stay under the browser's per-cookie
limit). Nothing the visitor does is held in server memory, so the demo behaves
the same across serverless instances and reloads. Seeded messages, orders and
default templates are read-only fixtures in `lib/seed.ts` and `lib/triage.ts`.

## Run locally

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Tests (Playwright, one block per acceptance criterion):

```bash
pnpm exec playwright install --with-deps chromium
pnpm test
# another app already on :3000? PORT=3210 pnpm test
```

Production build:

```bash
pnpm build && pnpm start
```

## What is deliberately not here

No Shopify API or OAuth, no real email ingestion or sending, no Meta comment
responder, inventory replenishment or Amazon PPC files, no auth, no database, no
analytics. Scope is one queue built properly rather than four sketched.
