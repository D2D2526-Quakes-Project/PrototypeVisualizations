const DB_NAME = "QuakesCache";
const RAW_STORE_NAME = "files";
const PROCESSED_STORE_NAME = "processed";
const DB_VERSION = 2;
const RAW_CACHE_VERSION = 1;

function getRawCacheKey(url: string): string {
  return `raw:${RAW_CACHE_VERSION}:${url}`;
}

/**
 * 1. Initialize IndexedDB
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(RAW_STORE_NAME)) {
        db.createObjectStore(RAW_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(PROCESSED_STORE_NAME)) {
        db.createObjectStore(PROCESSED_STORE_NAME);
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

/**
 * 2. Cache Helpers
 */
const getFromCache = async (url: string): Promise<ArrayBuffer | undefined> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(RAW_STORE_NAME, "readonly");
      const store = tx.objectStore(RAW_STORE_NAME);
      const request = store.get(getRawCacheKey(url));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Cache read failed", e);
    return undefined;
  }
};

const saveToCache = async (url: string, data: ArrayBuffer) => {
  try {
    const db = await openDB();
    const tx = db.transaction(RAW_STORE_NAME, "readwrite");
    const store = tx.objectStore(RAW_STORE_NAME);
    store.put(data, getRawCacheKey(url));
  } catch (e) {
    console.warn("Cache write failed (likely quota exceeded)", e);
  }
};

export const removeFromCache = async (url: string) => {
  try {
    const db = await openDB();
    const tx = db.transaction(RAW_STORE_NAME, "readwrite");
    const store = tx.objectStore(RAW_STORE_NAME);
    store.delete(getRawCacheKey(url));
  } catch (e) {
    console.warn("Cache write failed (likely quota exceeded)", e);
  }
};

export const clearCache = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction([RAW_STORE_NAME, PROCESSED_STORE_NAME], "readwrite");
    const rawStore = tx.objectStore(RAW_STORE_NAME);
    rawStore.clear();
    const processedStore = tx.objectStore(PROCESSED_STORE_NAME);
    processedStore.clear();
  } catch (e) {
    console.warn("Cache write failed (likely quota exceeded)", e);
  }
};

export const clearProcessedCache = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(PROCESSED_STORE_NAME, "readwrite");
    const processedStore = tx.objectStore(PROCESSED_STORE_NAME);
    processedStore.clear();
  } catch (e) {
    console.warn("Processed cache clear failed", e);
  }
};

export async function getProcessedFromCache<T>(cacheKey: string): Promise<T | undefined> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PROCESSED_STORE_NAME, "readonly");
      const store = tx.objectStore(PROCESSED_STORE_NAME);
      const request = store.get(cacheKey);

      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Processed cache read failed", e);
    return undefined;
  }
}

export async function saveProcessedToCache<T>(cacheKey: string, value: T) {
  try {
    const db = await openDB();
    const tx = db.transaction(PROCESSED_STORE_NAME, "readwrite");
    const store = tx.objectStore(PROCESSED_STORE_NAME);
    store.put(value, cacheKey);
  } catch (e) {
    console.warn("Processed cache write failed (likely quota exceeded)", e);
  }
}

/**
 * 3. The Smart Fetcher
 */
export async function fetchWithProgressAndCache(
  url: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<ArrayBuffer | undefined> {
  // A. Check Cache First
  const cached = await getFromCache(url);
  if (cached) {
    if (onProgress) onProgress(1.0); // 100% immediately
    return cached;
  }
  if (signal?.aborted) return;

  // B. Perform Network Fetch
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

  const contentLength = response.headers.get("Content-Length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  // If no content-length (or chunked encoding), we can't calc percentage
  // but we can still stream.

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    if (onProgress) onProgress(1.0);
    await saveToCache(url, buffer);
    return buffer;
  }
  if (signal?.aborted) return;

  // C. Stream Reader for Progress
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedLength = 0;

  while (true) {
    if (signal?.aborted) return;
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (value) {
      chunks.push(value);
      receivedLength += value.length;

      if (total > 0 && onProgress) {
        onProgress(receivedLength / total);
      }
    }
  }

  // D. Reassemble Chunks into single ArrayBuffer
  const combined = new Uint8Array(receivedLength);
  let position = 0;
  for (const chunk of chunks) {
    combined.set(chunk, position);
    position += chunk.length;
  }

  const finalBuffer = combined.buffer;

  if (signal?.aborted) return;

  // E. Save to Cache for next time
  await saveToCache(url, finalBuffer);

  return finalBuffer;
}
