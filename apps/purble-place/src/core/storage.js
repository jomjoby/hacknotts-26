// Namespaced JSON storage. Hosts can pass any {getItem,setItem,removeItem} adapter
// (e.g. one backed by their virtual Windows 7 file system / registry).
// Falls back to memory when localStorage is unavailable or blocked.

function memoryAdapter() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

function resolveAdapter(adapter) {
  if (adapter && typeof adapter.getItem === 'function') return adapter;
  try {
    const ls = globalThis.localStorage;
    const probe = '__pp_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryAdapter();
  }
}

export function createStorage(adapter, prefix = 'purble-place') {
  const backend = resolveAdapter(adapter);
  const make = (ns) => ({
    get(key, fallback = null) {
      try {
        const raw = backend.getItem(`${ns}:${key}`);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try { backend.setItem(`${ns}:${key}`, JSON.stringify(value)); } catch { /* quota / blocked */ }
    },
    remove(key) {
      try { backend.removeItem(`${ns}:${key}`); } catch { /* ignore */ }
    },
    /** Child namespace, e.g. storage.sub('comfy-cakes') */
    sub(name) { return make(`${ns}:${name}`); },
  });
  return make(prefix);
}
