'use client';

import { useEffect, useState } from 'react';
import { db, Store, DEFAULT_STORE_ID } from './supabaseClient';

/**
 * Shared store loader implementing the mandated dashboard pattern
 * (AGENTS.md). Resolves the active store from localStorage
 * ('active_store_id') with DEFAULT_STORE_ID fallback, then falls back
 * to the first seeded store. All state updates happen after an await,
 * so it is safe under the react-hooks/set-state-in-effect rule.
 */
export function useStore(): Store | null {
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let id = DEFAULT_STORE_ID;
      if (typeof window !== 'undefined') {
        const s = localStorage.getItem('active_store_id');
        if (s) id = s;
      }
      const stores = await db.getStores();
      if (cancelled) return;
      const cur = stores.find(s => s.id === id) || stores[0];
      if (cur) setStore(cur);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return store;
}
