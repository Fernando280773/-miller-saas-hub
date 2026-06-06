// IndexedDB helper for product video clips
// Pure browser storage — no uploads, no server, zero network cost

const DB_NAME = 'miller_product_videos';
const STORE  = 'videos';
const VER    = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VER);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

export async function saveProductVideo(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror    = () => reject(tx.error);
  });
}

export async function getProductVideo(id: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
    req.onerror   = () => reject(req.error);
  });
}

export async function deleteProductVideo(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror    = () => reject(tx.error);
  });
}

/** Validate file is ≤ maxSeconds. Returns duration or throws. */
export function checkVideoDuration(file: File, maxSeconds = 10): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v   = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      const dur = v.duration;
      URL.revokeObjectURL(url);
      if (dur > maxSeconds) reject(new Error(`Clip must be ${maxSeconds}s or less (yours: ${dur.toFixed(1)}s)`));
      else resolve(dur);
    };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Cannot read video file')); };
    v.src = url;
  });
}
