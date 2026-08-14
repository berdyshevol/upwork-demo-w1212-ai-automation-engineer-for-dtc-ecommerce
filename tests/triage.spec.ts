import { test, expect, type Page } from '@playwright/test';

// Seeded fixtures the app ships with (lib/seed.ts). The tests drive the real UI.
const SHIPPING = 'Order hasn’t moved in 5 days';
const DAMAGED = 'Arrived cracked, photo attached';
const EXCHANGE = 'Wrong size — can I exchange for a medium?';
const NO_ORDER = 'Bulk order for our office — 40 tumblers';

async function openMessage(page: Page, subject: string) {
  await page.goto('/inbox');
  await page.getByRole('button', { name: new RegExp(`Open message: ${escapeRe(subject)}`) }).click();
  await expect(page.getByTestId('message-subject')).toHaveText(subject);
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function seedByok(page: Page, blob: Record<string, string>) {
  await page.addInitScript((value) => {
    window.localStorage.setItem('byok', value);
  }, JSON.stringify(blob));
}

test('FR1 — inbox lists the 8 seeded messages with sender, subject, time and a remaining counter', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Open the inbox/i }).click();
  await expect(page).toHaveURL(/\/inbox$/);

  await expect(page.getByTestId('message-row')).toHaveCount(8);
  await expect(page.getByTestId('remaining-count')).toHaveText('8');

  const first = page.getByTestId('message-row').first();
  await expect(first).toContainText('Dana Whitfield');
  await expect(first).toContainText(SHIPPING);
  await expect(first).toContainText(/Aug \d+/);
  await expect(page.getByTestId('status-chip').first()).toHaveText(/Needs review/i);
});

test('AC1 — opening a seeded message shows intent, confidence and the matching order with tracking and ETA', async ({
  page,
}) => {
  await openMessage(page, SHIPPING);

  await expect(page.getByTestId('intent-label')).toHaveText('Where is my order');
  await expect(page.getByTestId('confidence')).toHaveText('0.94');

  const order = page.getByTestId('order-panel');
  await expect(order).toContainText('#1042');
  await expect(order).toContainText('In transit');
  await expect(order).toContainText('UPS');
  await expect(order).toContainText('1Z999AA10123456784');
  await expect(order).toContainText('Aug 18');
  await expect(order).toContainText('Cascade Pour-Over Kettle');

  // A second message classifies into a different intent with its own order.
  await openMessage(page, EXCHANGE);
  await expect(page.getByTestId('intent-label')).toHaveText('Return / exchange');
  await expect(page.getByTestId('confidence')).toHaveText(/0\.\d\d/);
  await expect(page.getByTestId('order-panel')).toContainText('#1044');
});

test('AC2 — the generated draft quotes the tracking number and ETA from the order panel, not generic filler', async ({
  page,
}) => {
  await openMessage(page, SHIPPING);

  const draft = page.getByTestId('draft-editor');
  await expect(draft).toHaveValue(/1Z999AA10123456784/);
  await expect(draft).toHaveValue(/Aug 18/);
  await expect(draft).toHaveValue(/UPS/);
  await expect(draft).toHaveValue(/Dana/);
});

test('AC3 — editing the "Where is my order" template on /library changes the next generated draft', async ({
  page,
}) => {
  await openMessage(page, SHIPPING);
  await expect(page.getByTestId('draft-editor')).not.toHaveValue(/Short and sweet/);

  await page.goto('/library');
  const editor = page.getByTestId('template-body-wismo');
  await editor.fill(
    'Hi {{customer_first_name}} — {{carrier}} has {{order_number}} moving, tracking {{tracking}}, landing {{eta}}. Short and sweet.',
  );
  await page.getByTestId('save-template-wismo').click();
  await expect(page.getByTestId('template-saved-wismo')).toBeVisible();

  await openMessage(page, SHIPPING);
  await page.getByRole('button', { name: /Regenerate from template/i }).click();

  const draft = page.getByTestId('draft-editor');
  await expect(draft).toHaveValue(/Short and sweet/);
  await expect(draft).toHaveValue(/1Z999AA10123456784/);
  await expect(draft).toHaveValue(/Aug 18/);
});

test('AC4 — the "Arrived cracked" message is auto-flagged escalated with a stated reason and shows no draft', async ({
  page,
}) => {
  await openMessage(page, DAMAGED);

  await expect(page.getByTestId('detail-status')).toHaveText(/Escalated/i);
  await expect(page.getByTestId('escalation-reason')).toContainText(/damaged item requires a human/i);
  await expect(page.getByTestId('draft-editor')).toHaveCount(0);
  await expect(page.getByTestId('draft-suppressed')).toBeVisible();

  await page.goto('/inbox');
  const row = page.getByTestId('message-row').filter({ hasText: DAMAGED });
  await expect(row.getByTestId('status-chip')).toHaveText(/Escalated/i);
});

test('FR6 — a message with no matching order is escalated with the lookup failure stated', async ({ page }) => {
  await openMessage(page, NO_ORDER);

  await expect(page.getByTestId('detail-status')).toHaveText(/Escalated/i);
  await expect(page.getByTestId('escalation-reason')).toContainText(/no matching order/i);
  await expect(page.getByTestId('order-panel')).toContainText(/No order found/i);
  await expect(page.getByTestId('draft-editor')).toHaveCount(0);
});

test('FR9 — the "Why this classification" panel lists signal phrases and the order-lookup key', async ({
  page,
}) => {
  await openMessage(page, SHIPPING);

  const why = page.getByTestId('why-panel');
  await expect(why).toContainText('where is my order');
  await expect(why).toContainText('hasn’t moved');
  await expect(why).toContainText(/Order lookup key/i);
  await expect(why).toContainText('1042');
  await expect(why).toContainText(/keyword classifier/i);
});

test('FR5 — draft edits persist across message switches within the session', async ({ page }) => {
  await openMessage(page, SHIPPING);
  const draft = page.getByTestId('draft-editor');
  await draft.fill('Dana — UPS has 1Z999AA10123456784 out for delivery, ETA Aug 18. Edited by the ops lead.');
  await page.getByRole('button', { name: /^Save draft$/i }).click();
  await expect(page.getByTestId('draft-saved')).toBeVisible();

  await openMessage(page, EXCHANGE);
  await expect(page.getByTestId('draft-editor')).not.toHaveValue(/Edited by the ops lead/);

  await openMessage(page, SHIPPING);
  await expect(page.getByTestId('draft-editor')).toHaveValue(/Edited by the ops lead/);
});

test('FR8 — approving a message updates the remaining counter and its status chip', async ({ page }) => {
  await openMessage(page, SHIPPING);
  await page.getByRole('button', { name: /Approve reply/i }).click();

  await expect(page).toHaveURL(/\/inbox/);
  await expect(page.getByTestId('remaining-count')).toHaveText('7');
  const row = page.getByTestId('message-row').filter({ hasText: SHIPPING });
  await expect(row.getByTestId('status-chip')).toHaveText(/Approved/i);
});

test('AC5 — edits and approvals survive a full page reload and the counter reflects them', async ({ page }) => {
  await openMessage(page, SHIPPING);
  await page.getByTestId('draft-editor').fill('Dana — tracking 1Z999AA10123456784, ETA Aug 18. Survives reload.');
  await page.getByRole('button', { name: /^Save draft$/i }).click();
  await expect(page.getByTestId('draft-saved')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('draft-editor')).toHaveValue(/Survives reload/);

  await openMessage(page, EXCHANGE);
  await page.getByRole('button', { name: /Approve reply/i }).click();
  await expect(page.getByTestId('remaining-count')).toHaveText('7');

  await page.reload();
  await expect(page.getByTestId('remaining-count')).toHaveText('7');
  const row = page.getByTestId('message-row').filter({ hasText: EXCHANGE });
  await expect(row.getByTestId('status-chip')).toHaveText(/Approved/i);

  await openMessage(page, SHIPPING);
  await expect(page.getByTestId('draft-editor')).toHaveValue(/Survives reload/);
});

test('FR7 — the response library exposes five editable intent templates and the edit persists after reload', async ({
  page,
}) => {
  await page.goto('/library');
  await expect(page.getByTestId('template-card')).toHaveCount(5);
  for (const key of ['wismo', 'return_exchange', 'damaged', 'product_question', 'other']) {
    await expect(page.getByTestId(`template-body-${key}`)).toBeVisible();
  }

  await page.getByTestId('template-body-product_question').fill('Care answer: {{items}} — hand wash only. — Ravi');
  await page.getByTestId('save-template-product_question').click();
  await expect(page.getByTestId('template-saved-product_question')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('template-body-product_question')).toHaveValue(/hand wash only/);
});

test('FR10 — with no API key the app runs in offline mode: badge visible, AI action gated with a hint', async ({
  page,
}) => {
  await openMessage(page, SHIPPING);

  await expect(page.getByTestId('mode-badge')).toHaveText(/Offline mode/i);
  await expect(page.getByTestId('byok-hint')).toContainText(
    /Choose a provider and paste your API key in Settings to enable live AI/i,
  );
  await expect(page.getByTestId('run-ai')).toBeDisabled();
  // The deterministic path still produced a full classification and draft.
  await expect(page.getByTestId('intent-label')).toHaveText('Where is my order');
  await expect(page.getByTestId('draft-editor')).toHaveValue(/1Z999AA10123456784/);
});

test('BYOK — with a key saved the AI path runs and its classification and draft replace the fallback', async ({
  page,
}) => {
  await seedByok(page, { provider: 'mock', apiKey: 'test', model: 'mock' });

  await openMessage(page, SHIPPING);
  await expect(page.getByTestId('mode-badge')).toHaveText(/Live AI/i);
  await expect(page.getByTestId('byok-hint')).toHaveCount(0);

  await page.getByTestId('run-ai').click();

  await expect(page.getByTestId('confidence')).toHaveText('0.99');
  await expect(page.getByTestId('draft-editor')).toHaveValue(/reviewed by the live model/i);
  await expect(page.getByTestId('draft-editor')).toHaveValue(/1Z999AA10123456784/);
  await expect(page.getByTestId('why-panel')).toContainText(/mock/i);

  // And it survives a reload, because it is written to the visitor's cookie.
  await page.reload();
  await expect(page.getByTestId('draft-editor')).toHaveValue(/reviewed by the live model/i);
});

test('BYOK settings — saving and clearing a provider key round-trips through /settings', async ({ page }) => {
  await page.goto('/settings');
  await page.getByTestId('provider-select').selectOption('openai');
  await expect(page.getByTestId('apikey-label')).toContainText(/OpenAI API key/i);
  await expect(page.getByTestId('model-select')).toHaveValue('gpt-4o-mini');

  await page.getByTestId('apikey-input').fill('sk-test-123');
  await page.getByTestId('save-byok').click();
  await expect(page.getByTestId('byok-status')).toContainText(/Saved/i);

  await page.reload();
  await expect(page.getByTestId('provider-select')).toHaveValue('openai');
  await expect(page.getByTestId('mode-badge')).toHaveText(/Live AI/i);

  await page.getByTestId('clear-byok').click();
  await expect(page.getByTestId('mode-badge')).toHaveText(/Offline mode/i);
  await page.reload();
  await expect(page.getByTestId('apikey-input')).toHaveValue('');
});
