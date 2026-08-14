import ByokSettings from '@/components/ByokSettings';

export const metadata = { title: 'Settings — OpsDesk' };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings — bring your own key</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Every screen in this demo works without a key: classification falls back to a deterministic keyword pass and
          drafts are merged straight from the response library. Paste your own provider key here and the classification
          and draft come from your model instead.
        </p>
      </div>

      <ByokSettings />

      <div className="card max-w-2xl p-6 text-sm text-slate-600">
        <h2 className="text-sm font-semibold text-slate-900">Where the key goes</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Stored in this browser’s localStorage under <code className="rounded bg-slate-100 px-1">byok</code>, nowhere else.</li>
          <li>The model call is made from this page directly to your provider — it does not pass through our server.</li>
          <li>The server route <code className="rounded bg-slate-100 px-1">/api/triage</code> holds no credentials; it only returns the deterministic baseline (order fields plus your current template).</li>
          <li>Clearing the key returns the whole demo to offline mode immediately.</li>
        </ul>
      </div>
    </div>
  );
}
