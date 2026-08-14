'use client';

import { useEffect, useState } from 'react';
import { MODELS, PROVIDER_LABEL, clearByok, readByok, saveByok, type ProviderId } from '@/lib/llm';

const PROVIDERS: ProviderId[] = ['anthropic', 'openai', 'google'];

export default function ByokSettings() {
  const [provider, setProvider] = useState<ProviderId>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(MODELS.anthropic[0]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const saved = readByok();
    if (!saved) return;
    setProvider(saved.provider);
    setApiKey(saved.apiKey);
    setModel(saved.model);
  }, []);

  function changeProvider(next: ProviderId) {
    setProvider(next);
    setModel(MODELS[next][0]);
    setStatus(null);
  }

  function save() {
    if (!apiKey.trim()) {
      setStatus('Paste a key first — nothing was saved.');
      return;
    }
    saveByok({ provider, apiKey: apiKey.trim(), model });
    setStatus(`Saved. Calls now go from this browser to ${PROVIDER_LABEL[provider]} with your key.`);
  }

  function clear() {
    clearByok();
    setApiKey('');
    setStatus('Cleared. Back to offline mode — the deterministic classifier and template merge.');
  }

  return (
    <div className="card max-w-2xl space-y-5 p-6">
      <div>
        <label className="label" htmlFor="provider">
          Provider
        </label>
        <select
          id="provider"
          data-testid="provider-select"
          value={provider}
          onChange={(event) => changeProvider(event.target.value as ProviderId)}
          className="field mt-1"
        >
          {PROVIDERS.map((id) => (
            <option key={id} value={id}>
              {PROVIDER_LABEL[id]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" data-testid="apikey-label" htmlFor="apikey">
          {PROVIDER_LABEL[provider]} API key
        </label>
        <input
          id="apikey"
          data-testid="apikey-input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          onChange={(event) => {
            setApiKey(event.target.value);
            setStatus(null);
          }}
          placeholder={provider === 'anthropic' ? 'sk-ant-…' : provider === 'openai' ? 'sk-…' : 'AIza…'}
          className="field mt-1 font-mono"
        />
      </div>

      <div>
        <label className="label" htmlFor="model">
          Model
        </label>
        <select
          id="model"
          data-testid="model-select"
          value={model}
          onChange={(event) => setModel(event.target.value)}
          className="field mt-1"
        >
          {MODELS[provider].map((id, index) => (
            <option key={id} value={id}>
              {id}
              {index === 0 ? ' (default)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" data-testid="save-byok" onClick={save} className="btn-primary">
          Save key
        </button>
        <button type="button" data-testid="clear-byok" onClick={clear} className="btn-secondary">
          Clear key
        </button>
      </div>

      {status ? (
        <p data-testid="byok-status" className="text-sm text-slate-700">
          {status}
        </p>
      ) : null}
    </div>
  );
}
