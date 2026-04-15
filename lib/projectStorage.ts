import type { GeneratedContent, ScrapeResult } from '@/types';

const DB_NAME = 'da-gen';
const STORE = 'project';
const KEY = 'current';
const DB_VERSION = 1;

export type ProjectSnapshot = {
  scrapeResult: ScrapeResult | null;
  selectedLogo: string;
  activePageIndex: number;
  cardImage: string | null;
  cardLogoScale: number;
  localFontFile: string | null;
  sitemapUrls: string[];
  sitemapSource: string | null;
  sitemapStatus: 'idle' | 'loading' | 'loaded' | 'empty' | 'error';
  sitemapError: string | null;
  generatedContent: GeneratedContent | null;
  contentChips: string[];
  contentBrief: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function saveProject(snapshot: ProjectSnapshot): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(snapshot, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[projectStorage] save failed:', e);
  }
}

export async function loadProject(): Promise<ProjectSnapshot | null> {
  try {
    const db = await getDb();
    return await new Promise<ProjectSnapshot | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as ProjectSnapshot) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[projectStorage] load failed:', e);
    return null;
  }
}

export async function clearProject(): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[projectStorage] clear failed:', e);
  }
}
