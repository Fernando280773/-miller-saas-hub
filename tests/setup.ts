// Shared test setup — minimal browser shims so the mock/localStorage
// persistence layer in src/lib/supabaseClient can be exercised in Node.

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

// localStorage used by getLocalStorageData/setLocalStorageData in
// supabaseClient.ts (guarded by `typeof window !== 'undefined'`).
(globalThis as Record<string, unknown>).localStorage = new MemoryStorage();
(globalThis as Record<string, unknown>).window = globalThis;
