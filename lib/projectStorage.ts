import type { ProjectSnapshot, ProjectMeta, StoredProject, SectorAsset } from '@/types';
import { migrateAssetShape } from './sectorThemes';

export type { ProjectSnapshot, ProjectMeta, StoredProject };

const DB_NAME = 'da-gen';
const DB_VERSION = 3;
const PROJECTS = 'projects'; // id -> StoredProject (heavy)
const META = 'meta';         // id -> ProjectMeta (light, for the history list)
const AGENCY = 'agency';     // single record -> SectorAsset[] (bibliothèque site agence)
const AGENCY_KEY = 'library';
const LEGACY_STORE = 'project';
const LEGACY_KEY = 'current';

/** Generates a collision-resistant project id. */
export const newProjectId = (): string =>
  `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const metaOf = (
  id: string,
  savedAt: number,
  snap: ProjectSnapshot,
  lastOpenedAt: number = savedAt,
  thumbnail?: string,
): ProjectMeta => ({
  id,
  savedAt,
  lastOpenedAt,
  thumbnail,
  domain: snap.scrapeResult?.domain ?? '',
  title: snap.scrapeResult?.title?.trim() || snap.scrapeResult?.domain || 'Projet sans titre',
});

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
      const tx = req.transaction;
      if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS);
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      if (!db.objectStoreNames.contains(AGENCY)) db.createObjectStore(AGENCY);

      // Migrate the legacy single project (v1) into the multi-project model.
      if (tx && db.objectStoreNames.contains(LEGACY_STORE)) {
        try {
          const legacy = tx.objectStore(LEGACY_STORE);
          const getReq = legacy.get(LEGACY_KEY);
          getReq.onsuccess = () => {
            const old = getReq.result as ProjectSnapshot | undefined;
            if (old && old.scrapeResult) {
              const id = newProjectId();
              const savedAt = Date.now();
              tx.objectStore(PROJECTS).put({ ...old, id, savedAt }, id);
              tx.objectStore(META).put(metaOf(id, savedAt, old), id);
            }
            legacy.delete(LEGACY_KEY); // free the duplicated payload
          };
        } catch { /* migration is best-effort */ }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  // Don't cache a rejected promise forever — allow a retry after a transient failure.
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

/** Persists a project (heavy data + light meta). Returns false on failure (e.g. quota). */
export async function saveProject(id: string, snapshot: ProjectSnapshot): Promise<boolean> {
  try {
    const db = await getDb();
    const savedAt = Date.now();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([PROJECTS, META], 'readwrite');
      const metaStore = tx.objectStore(META);
      // Preserve fields that don't belong to the snapshot: an edit must not wipe
      // the lazily-generated thumbnail nor reset the last-opened timestamp.
      const prevReq = metaStore.get(id);
      prevReq.onsuccess = () => {
        const prev = prevReq.result as ProjectMeta | undefined;
        const lastOpenedAt = prev?.lastOpenedAt ?? savedAt;
        tx.objectStore(PROJECTS).put({ ...snapshot, id, savedAt }, id);
        metaStore.put(metaOf(id, savedAt, snapshot, lastOpenedAt, prev?.thumbnail), id);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    console.warn('[projectStorage] save failed:', e);
    return false;
  }
}

/** Caches a downscaled hero thumbnail on the project's META record. */
export async function saveThumbnail(id: string, thumbnail: string): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META, 'readwrite');
      const store = tx.objectStore(META);
      const req = store.get(id);
      req.onsuccess = () => {
        const prev = req.result as ProjectMeta | undefined;
        if (prev) store.put({ ...prev, thumbnail }, id);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[projectStorage] saveThumbnail failed:', e);
  }
}

/** Marks a project as opened now — drives the "recent" ordering & displayed date. */
export async function touchProject(id: string): Promise<void> {
  try {
    const db = await getDb();
    const lastOpenedAt = Date.now();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META, 'readwrite');
      const store = tx.objectStore(META);
      const req = store.get(id);
      req.onsuccess = () => {
        const prev = req.result as ProjectMeta | undefined;
        if (prev) store.put({ ...prev, lastOpenedAt }, id);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[projectStorage] touchProject failed:', e);
  }
}

/** Loads a single project by id. */
export async function loadProject(id: string): Promise<StoredProject | null> {
  try {
    const db = await getDb();
    return await new Promise<StoredProject | null>((resolve, reject) => {
      const tx = db.transaction(PROJECTS, 'readonly');
      const req = tx.objectStore(PROJECTS).get(id);
      req.onsuccess = () => resolve((req.result as StoredProject) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[projectStorage] load failed:', e);
    return null;
  }
}

/**
 * Duplique un projet sous un nouvel id (données complètes + meta). Le titre
 * affiché dans la liste prend un suffixe « (copie) », la vignette est reprise
 * de la meta d'origine (pour que la carte ne soit pas vide) et les dates
 * repartent de maintenant. Renvoie la nouvelle meta, ou null si le projet
 * source n'existe pas (ou en cas d'échec d'écriture).
 */
export async function duplicateProject(id: string): Promise<ProjectMeta | null> {
  try {
    const source = await loadProject(id);
    if (!source) return null;
    const db = await getDb();
    const newId = newProjectId();
    const savedAt = Date.now();
    return await new Promise<ProjectMeta | null>((resolve, reject) => {
      const tx = db.transaction([PROJECTS, META], 'readwrite');
      const metaStore = tx.objectStore(META);
      let created: ProjectMeta | null = null;
      // On lit la meta d'origine pour récupérer la vignette déjà générée et le
      // titre tel qu'affiché dans la liste (metaOf le re-dériverait à l'identique).
      const prevReq = metaStore.get(id);
      prevReq.onsuccess = () => {
        const prev = prevReq.result as ProjectMeta | undefined;
        const base = metaOf(newId, savedAt, source, savedAt, prev?.thumbnail);
        created = { ...base, title: `${prev?.title || base.title} (copie)` };
        tx.objectStore(PROJECTS).put({ ...source, id: newId, savedAt }, newId);
        metaStore.put(created, newId);
      };
      tx.oncomplete = () => resolve(created);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[projectStorage] duplicate failed:', e);
    return null;
  }
}

/** Lists every saved project (light meta only), most recent first. */
export async function listProjects(): Promise<ProjectMeta[]> {
  try {
    const db = await getDb();
    const metas = await new Promise<ProjectMeta[]>((resolve, reject) => {
      const tx = db.transaction(META, 'readonly');
      const req = tx.objectStore(META).getAll();
      req.onsuccess = () => resolve((req.result as ProjectMeta[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    return metas.sort((a, b) => (b.lastOpenedAt ?? b.savedAt) - (a.lastOpenedAt ?? a.savedAt));
  } catch (e) {
    console.warn('[projectStorage] list failed:', e);
    return [];
  }
}

/** Deletes a single project. */
export async function deleteProject(id: string): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([PROJECTS, META], 'readwrite');
      tx.objectStore(PROJECTS).delete(id);
      tx.objectStore(META).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[projectStorage] delete failed:', e);
  }
}

/** Wipes the whole project history. */
export async function clearAllProjects(): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([PROJECTS, META], 'readwrite');
      tx.objectStore(PROJECTS).clear();
      tx.objectStore(META).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[projectStorage] clear all failed:', e);
  }
}

/* ---------- Bibliothèque « site agence » (record unique, hors projets) ---------- */

/** Charge la bibliothèque d'illustrations du site agence. */
export async function loadAgencyAssets(): Promise<SectorAsset[]> {
  try {
    const db = await getDb();
    return await new Promise<SectorAsset[]>((resolve, reject) => {
      const tx = db.transaction(AGENCY, 'readonly');
      const req = tx.objectStore(AGENCY).get(AGENCY_KEY);
      req.onsuccess = () => {
        const raw = (req.result as unknown[]) ?? [];
        resolve(raw.map(migrateAssetShape));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[projectStorage] load agency assets failed:', e);
    return [];
  }
}

/** Sauvegarde la bibliothèque d'illustrations du site agence. Renvoie false sur échec (quota). */
export async function saveAgencyAssets(assets: SectorAsset[]): Promise<boolean> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AGENCY, 'readwrite');
      tx.objectStore(AGENCY).put(assets, AGENCY_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    console.warn('[projectStorage] save agency assets failed:', e);
    return false;
  }
}
