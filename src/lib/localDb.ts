import {
  DocumentOcclusionRecord,
  DocumentRecord,
  FolderRecord,
  PersistedPlanState,
  StickyNoteRecord,
  StudySettings,
  TaskRecord,
} from '../types/studyflow';
import { DEFAULT_STUDY_SETTINGS } from './studyMethods';

const DB_NAME = 'StudyFlow_Persistent_DB';
const DB_VERSION = 3;

export type StoreName =
  | 'folders'
  | 'documents'
  | 'notes'
  | 'occlusions'
  | 'tasks'
  | 'settings';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

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

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      dbPromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

export async function dbPut<T>(storeName: StoreName, record: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []) as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(storeName: StoreName, key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbClearStore(storeName: StoreName): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
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
  studySettings: StudySettings;
  planState: PersistedPlanState | null;
}> {
  const [folders, rawDocs, notes, occlusions, tasks, storedSettings, planState] =
    await Promise.all([
      dbGetAll<FolderRecord>('folders'),
      dbGetAll<DocumentRecord>('documents'),
      dbGetAll<StickyNoteRecord>('notes'),
      dbGetAll<DocumentOcclusionRecord>('occlusions').catch(() => []),
      dbGetAll<TaskRecord>('tasks'),
      getSetting<StudySettings>('studySettings'),
      getSetting<PersistedPlanState>('planState'),
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
    dbClearStore('settings'),
  ]);
}

