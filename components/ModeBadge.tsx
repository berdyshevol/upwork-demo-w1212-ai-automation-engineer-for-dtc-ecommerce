'use client';

import { useEffect, useState } from 'react';
import { BYOK_CHANGED_EVENT, PROVIDER_LABEL, readByok, type Byok } from '@/lib/llm';

/** Header badge: offline (deterministic) until the visitor saves a key of their own. */
export default function ModeBadge() {
  const [byok, setByok] = useState<Byok | null>(null);

  useEffect(() => {
    const sync = () => setByok(readByok());
    sync();
    window.addEventListener(BYOK_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(BYOK_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
    <span
      data-testid="mode-badge"
      className={
        byok
          ? 'chip bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'chip bg-amber-50 text-amber-800 ring-amber-200'
      }
      title={
        byok
          ? 'Calls go from your browser straight to your provider with your key.'
          : 'Deterministic keyword classifier and template-only drafts.'
      }
    >
      <span className={byok ? 'h-1.5 w-1.5 rounded-full bg-emerald-500' : 'h-1.5 w-1.5 rounded-full bg-amber-500'} />
      {byok ? `Live AI · ${PROVIDER_LABEL[byok.provider]} ${byok.model}` : 'Offline mode'}
    </span>
  );
}
