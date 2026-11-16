import {
  DocumentOcclusionRecord,
  DocumentRecord,
  FolderRecord,
  PersistedPlanState,
  StickyNoteRecord,
  StudySettings,
  StudyWorkDraft,
  TaskRecord,
} from '../types/studyflow';
import { DEFAULT_STUDY_SETTINGS } from './studyMethods';

const DB_NAME = 'StudyFlow_Persistent_DB';
const DB_VERSION = 4;

export type StoreName =
  | 'folders'
  | 'documents'
  | 'notes'
  | 'occlusions'
  | 'tasks'
  | 'works'
  | 'settings';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    let finished = false;
    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        dbPromise = null;
        reject(new Error('Timeout abriendo IndexedDB (posible conflicto o bloqueo de versión entre pestañas)'));
      }
    }, 3000);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onblocked = () => {
      console.warn('[StudyFlow IndexedDB] Upgrade blocked: otra pestaña o conexión mantiene abierta la base de datos.');
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('documents')) {
        const docStore = db.createObjectStore('documents', { keyPath: 'id' });
        docStore.createIndex('uploadDate', 'uploadDate', { unique: false });
        docStore.createIndex('folderId', 'folderId', { unique: false });
      } else {
        const tx = (event.target as IDBOpenDBRequest).transaction;
        const docStore = tx?.objectStore('documents');
        if (docStore && !docStore.indexNames.contains('folderId')) {
          docStore.createIndex('folderId', 'folderId', { unique: false });
        }
      }

      if (!db.objectStoreNames.contains('notes')) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
        noteStore.createIndex('docId', 'docId', { unique: false });
        noteStore.createIndex('zone', 'zone', { unique: false });
      }

      if (!db.objectStoreNames.contains('occlusions')) {
        const occStore = db.createObjectStore('occlusions', { keyPath: 'id' });
        occStore.createIndex('docId', 'docId', { unique: false });
      }

      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('works')) {
        const workStore = db.createObjectStore('works', { keyPath: 'id' });
        workStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        workStore.createIndex('title', 'title', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      const db = (event.target as IDBOpenDBRequest).result;

      db.onversionchange = () => {
        console.warn('[StudyFlow IndexedDB] Version change detectado: cerrando conexión para permitir migración.');
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };

      resolve(db);
    };

    request.onerror = (event) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      dbPromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

export async function dbPut<T>(storeName: StoreName, record: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbGetAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []) as T[]);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbGet<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbDelete(storeName: StoreName, key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbClearStore(storeName: StoreName): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const rec = await dbGet<{ key: string; value: T }>('settings', key);
  return rec ? rec.value : null;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await dbPut('settings', { key, value });
}

export async function loadLocalSnapshot(): Promise<{
  folders: FolderRecord[];
  documents: DocumentRecord[];
  notes: StickyNoteRecord[];
  occlusions: DocumentOcclusionRecord[];
  tasks: TaskRecord[];
  works: StudyWorkDraft[];
  studySettings: StudySettings;
  planState: PersistedPlanState | null;
}> {
  const [folders, rawDocs, notes, occlusions, tasks, works, storedSettings, planState] =
    await Promise.all([
      dbGetAll<FolderRecord>('folders').catch(() => []),
      dbGetAll<DocumentRecord>('documents').catch(() => []),
      dbGetAll<StickyNoteRecord>('notes').catch(() => []),
      dbGetAll<DocumentOcclusionRecord>('occlusions').catch(() => []),
      dbGetAll<TaskRecord>('tasks').catch(() => []),
      dbGetAll<StudyWorkDraft>('works').catch(() => []),
      getSetting<StudySettings>('studySettings').catch(() => null),
      getSetting<PersistedPlanState>('planState').catch(() => null),
    ]);

  // Normalizar registros v1 (sin fileType o folderId)
  const documents: DocumentRecord[] = rawDocs.map((doc) => ({
    ...doc,
    folderId: doc.folderId ?? null,
    fileType: doc.fileType || 'pdf',
    currentPage: doc.currentPage || 1,
    pageCount: doc.pageCount || 1,
  }));

  return {
    folders,
    documents,
    notes,
    occlusions,
    tasks,
    works,
    studySettings: {
      ...DEFAULT_STUDY_SETTINGS,
      ...(storedSettings || {}),
      appearance: {
        ...(DEFAULT_STUDY_SETTINGS.appearance!),
        ...(storedSettings?.appearance || {}),
      },
    },
    planState,
  };
}

export async function clearAllLocalData(): Promise<void> {
  await Promise.all([
    dbClearStore('folders'),
    dbClearStore('documents'),
    dbClearStore('notes'),
    dbClearStore('occlusions'),
    dbClearStore('tasks'),
    dbClearStore('works'),
    dbClearStore('settings'),
  ]);
}

