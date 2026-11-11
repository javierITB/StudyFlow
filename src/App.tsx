import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppearanceSettings,
  DiagnosticCriterion,
  DiagnosticData,
  DiagnosticRecommendation,
  DocumentRecord,
  DocumentType,
  FolderColor,
  FolderRecord,
  PersistedPlanState,
  RouteSegment,
  RouteStep,
  StickyNoteRecord,
  StudyPlanResult,
  StudySettings,
  TaskRecord,
  ToastItem,
  UserProfile,
} from './types/studyflow';
import { DEFAULT_STUDY_SETTINGS } from './lib/studyMethods';
import {
  applyAppearanceToDocument,
  DEFAULT_APPEARANCE,
  resolveAppearance,
} from './lib/themes';
import { mergeReadingSample } from './lib/diagnosticEngine';
import { generateStudyRoute, getDefaultDeadlineLocalString } from './lib/routePlanner';
import {
  clearAllLocalData,
  dbDelete,
  dbGet,
  dbPut,
  loadLocalSnapshot,
  setSetting,
} from './lib/localDb';
import {
  detectDocumentType,
  extractDocumentPageCount,
} from './lib/documentUtils';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';
import {
  cloudDeleteDocument,
  cloudDeleteFolder,
  cloudDeleteNote,
  cloudDeleteTask,
  cloudSavePlanState,
  cloudSaveStudySettings,
  cloudUpsertDocument,
  cloudUpsertFolder,
  cloudUpsertNote,
  cloudUpsertTask,
  downloadDocumentBinaryFromCloud,
  fetchCloudSnapshot,
  uploadDocumentBinaryToCloud,
} from './lib/cloudSync';
import { TimerProvider, useTimer } from './context/TimerContext';
import { AppModule, Navbar } from './components/Navbar';
import { DocumentSidebar } from './components/DocumentSidebar';
import { DocumentViewer } from './components/DocumentViewer';
import { PomodoroAndPlanner } from './components/PomodoroAndPlanner';
import { KanbanBoard } from './components/KanbanBoard';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer } from './components/ToastContainer';
import { AccountModal } from './components/AccountModal';
import { DiagnosticModal } from './components/DiagnosticModal';
import { AppearanceModal } from './components/AppearanceModal';

const DEFAULT_DIAGNOSTIC_DATA: DiagnosticData = {
  isActive: false,
  criterion: 'balanced',
  samples: [],
};

interface PendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
}

interface WorkspaceShellProps {
  currentModule: AppModule;
  setCurrentModule: (m: AppModule) => void;
  folders: FolderRecord[];
  documents: DocumentRecord[];
  notes: StickyNoteRecord[];
  tasks: TaskRecord[];
  studySettings: StudySettings;
  planState: PersistedPlanState;
  planResult: StudyPlanResult;
  activeDocId: string | null;
  activeBuffer: ArrayBuffer | null;
  highlightedNoteId: string | null;
  isLoadingBuffer: boolean;
  isUploading: boolean;
  user: UserProfile | null;
  syncStatus: 'local' | 'synced' | 'syncing' | 'error';
  onOpenAccountModal: () => void;
  onOpenAppearanceModal: () => void;
  onToggleAudio: () => Promise<void>;
  onCreateFolder: (name: string, color: FolderColor) => Promise<void>;
  onDeleteFolder: (folder: FolderRecord) => void;
  onUploadFiles: (files: FileList, targetFolderId?: string | null) => Promise<void>;
  onOpenDocument: (docId: string, pageOverride?: number) => Promise<void>;
  onMoveDocumentToFolder: (docId: string, folderId: string | null) => Promise<void>;
  onDeleteDocument: (doc: DocumentRecord) => void;
  onChangePage: (docId: string, page: number) => Promise<void>;
  onCreateNote: (note: Omit<StickyNoteRecord, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateNote: (noteId: string, patch: Partial<StickyNoteRecord>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onOpenNoteLocation: (docId: string, page: number, noteId: string) => void;
  diagnosticData: DiagnosticData;
  onToggleDiagnostic: (active: boolean) => void;
  onRecordDiagnosticSample: (sample: {
    docId: string;
    docName: string;
    fileType: DocumentType;
    page: number;
    addedSeconds: number;
  }) => void;
  onOpenDiagnosticModal: () => void;
  onStartDiagnosticInViewer: () => void;
  onUpdateSettings: (next: StudySettings) => Promise<void>;
  onUpdatePlanState: (patch: Partial<PersistedPlanState>) => Promise<void>;
  onToggleStepCompleted: (stepId: string) => Promise<void>;
  onAddTask: (title: string, docId: string | null, folderId: string | null) => Promise<void>;
  onToggleTask: (taskId: string) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onNotify: (msg: string, type?: ToastItem['type']) => void;
}

const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  currentModule,
  setCurrentModule,
  folders,
  documents,
  notes,
  tasks,
  studySettings,
  planState,
  planResult,
  activeDocId,
  activeBuffer,
  highlightedNoteId,
  isLoadingBuffer,
  isUploading,
  user,
  syncStatus,
  onOpenAccountModal,
  onOpenAppearanceModal,
  onToggleAudio,
  onCreateFolder,
  onDeleteFolder,
  onUploadFiles,
  onOpenDocument,
  onMoveDocumentToFolder,
  onDeleteDocument,
  onChangePage,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onOpenNoteLocation,
  diagnosticData,
  onToggleDiagnostic,
  onRecordDiagnosticSample,
  onOpenDiagnosticModal,
  onStartDiagnosticInViewer,
  onUpdateSettings,
  onUpdatePlanState,
  onToggleStepCompleted,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onNotify,
}) => {
  const { startRouteStep, activeRouteStep } = useTimer();

  const activeDoc = useMemo(
    () => documents.find((d) => d.id === activeDocId) || null,
    [documents, activeDocId]
  );

  const handleStartRouteStepInViewer = useCallback(
    async (step: RouteStep, nextStep: RouteStep | null) => {
      const targetDocId = step.segments?.[0]?.docId || step.docId;
      const targetStartPage = step.segments?.[0]?.startPage || step.startPage || 1;
      if (targetDocId) {
        await onOpenDocument(targetDocId, targetStartPage);
        setCurrentModule('docs');
      }
      startRouteStep(step, nextStep);
      onNotify(
        `Iniciando bloque: ${step.docName} (Págs. ${targetStartPage}–${step.endPage || targetStartPage})`,
        'info'
      );
    },
    [onOpenDocument, setCurrentModule, startRouteStep, onNotify]
  );

  const syncStatusLabel = user
    ? syncStatus === 'syncing'
      ? 'Sincronizando...'
      : syncStatus === 'error'
        ? 'Error de nube'
        : 'Nube activa'
    : 'Modo Local';

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      <Navbar
        currentModule={currentModule}
        onSwitchModule={setCurrentModule}
        settings={studySettings}
        onToggleAudio={() => void onToggleAudio()}
        user={user}
        syncStatus={syncStatus}
        onOpenAccountModal={onOpenAccountModal}
        onOpenAppearanceModal={onOpenAppearanceModal}
      />

      <main className="flex-1 overflow-hidden relative">
        {currentModule === 'docs' && (
          <div className="h-full flex flex-col md:flex-row overflow-hidden">
            <DocumentSidebar
              folders={folders}
              documents={documents}
              activeDocId={activeDocId}
              speedMinPerPage={studySettings.speedMinPerPage}
              isUploading={isUploading}
              syncStatusLabel={syncStatusLabel}
              planResult={planResult}
              activeRouteStepId={activeRouteStep?.id || null}
              onCreateFolder={onCreateFolder}
              onDeleteFolder={onDeleteFolder}
              onUploadFiles={onUploadFiles}
              onOpenDocument={(id) => void onOpenDocument(id)}
              onMoveDocumentToFolder={onMoveDocumentToFolder}
              onDeleteDocument={onDeleteDocument}
              onStartRouteStep={(step, next) =>
                void handleStartRouteStepInViewer(step, next)
              }
              onToggleStepCompleted={onToggleStepCompleted}
              onOpenPlannerTab={() => setCurrentModule('pomodoro')}
            />

            <DocumentViewer
              activeDoc={activeDoc}
              documentBuffer={activeBuffer}
              isLoadingBuffer={isLoadingBuffer}
              notes={notes}
              studySettings={studySettings}
              planResult={planResult}
              diagnosticData={diagnosticData}
              highlightedNoteId={highlightedNoteId}
              onChangePage={(docId, p) => void onChangePage(docId, p)}
              onOpenDocumentAtPage={(docId, p) => void onOpenDocument(docId, p)}
              onStartRouteStep={(step, next) =>
                void handleStartRouteStepInViewer(step, next)
              }
              onToggleDiagnostic={onToggleDiagnostic}
              onRecordDiagnosticSample={onRecordDiagnosticSample}
              onOpenDiagnosticModal={onOpenDiagnosticModal}
              onCreateNote={onCreateNote}
              onUpdateNote={onUpdateNote}
              onDeleteNote={onDeleteNote}
              onNotify={onNotify}
            />
          </div>
        )}

        {currentModule === 'pomodoro' && (
          <PomodoroAndPlanner
            folders={folders}
            documents={documents}
            tasks={tasks}
            settings={studySettings}
            planState={planState}
            planResult={planResult}
            diagnosticData={diagnosticData}
            onStartDiagnosticInViewer={onStartDiagnosticInViewer}
            onOpenDiagnosticModal={onOpenDiagnosticModal}
            onUpdateSettings={onUpdateSettings}
            onUpdatePlanState={onUpdatePlanState}
            onStartRouteStepInViewer={(step, next) =>
              void handleStartRouteStepInViewer(step, next)
            }
            onToggleStepCompleted={onToggleStepCompleted}
            onAddTask={onAddTask}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
            onNotify={onNotify}
          />
        )}

        {currentModule === 'board' && (
          <KanbanBoard
            folders={folders}
            documents={documents}
            notes={notes}
            onCreateNote={onCreateNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
            onOpenNoteLocation={onOpenNoteLocation}
            onNotify={onNotify}
          />
        )}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<AppModule>('docs');
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [notes, setNotes] = useState<StickyNoteRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [studySettings, setStudySettings] = useState<StudySettings>(
    DEFAULT_STUDY_SETTINGS
  );
  const [planState, setPlanState] = useState<PersistedPlanState>({
    deadline: getDefaultDeadlineLocalString(2),
    selectedDocIds: [],
    orderedDocIds: [],
    completedStepIds: [],
  });

  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeBuffer, setActiveBuffer] = useState<ArrayBuffer | null>(null);
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);
  const [isLoadingBuffer, setIsLoadingBuffer] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [syncStatus, setSyncStatus] = useState<'local' | 'synced' | 'syncing' | 'error'>(
    'local'
  );
  const [accountModalOpen, setAccountModalOpen] = useState<boolean>(false);
  const [diagnosticModalOpen, setDiagnosticModalOpen] = useState<boolean>(false);
  const [appearanceModalOpen, setAppearanceModalOpen] = useState<boolean>(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const resolvedAppearance = useMemo(
    () => resolveAppearance(studySettings.appearance),
    [studySettings.appearance]
  );

  useEffect(() => {
    applyAppearanceToDocument(resolvedAppearance);
  }, [resolvedAppearance]);

  const userRef = useRef<UserProfile | null>(null);
  userRef.current = user;

  const notify = useCallback(
    (message: string, type: ToastItem['type'] = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const hydrateFromLocal = useCallback(async () => {
    const snap = await loadLocalSnapshot();
    setFolders(snap.folders);
    setDocuments(snap.documents);
    setNotes(snap.notes);
    setTasks(snap.tasks);
    setStudySettings({
      ...snap.studySettings,
      appearance: resolveAppearance(snap.studySettings.appearance),
    });

    if (snap.planState) {
      setPlanState(snap.planState);
    } else {
      const docIds = snap.documents.map((d) => d.id);
      setPlanState({
        deadline: getDefaultDeadlineLocalString(2),
        selectedDocIds: docIds,
        orderedDocIds: docIds,
        completedStepIds: [],
      });
    }

    if (snap.documents.length > 0) {
      const first = snap.documents[0];
      setActiveDocId(first.id);
      if (first.data) {
        setActiveBuffer(first.data);
      }
    }
  }, []);

  const hydrateFromCloud = useCallback(
    async (profile: UserProfile) => {
      setSyncStatus('syncing');
      try {
        const cloud = await fetchCloudSnapshot(profile.id);
        setFolders(cloud.folders);
        setDocuments(cloud.documents);
        setNotes(cloud.notes);
        setTasks(cloud.tasks);
        const resolvedCloudSettings: StudySettings = {
          ...cloud.studySettings,
          appearance: resolveAppearance(cloud.studySettings.appearance),
        };
        setStudySettings(resolvedCloudSettings);

        const docIds = cloud.documents.map((d) => d.id);
        const resolvedPlan = cloud.planState || {
          deadline: getDefaultDeadlineLocalString(2),
          selectedDocIds: docIds,
          orderedDocIds: docIds,
          completedStepIds: [],
        };
        setPlanState(resolvedPlan);

        // Guardar cache local de metadatos
        await Promise.all([
          ...cloud.folders.map((f) => dbPut('folders', f)),
          ...cloud.documents.map((d) => dbPut('documents', d)),
          ...cloud.notes.map((n) => dbPut('notes', n)),
          ...cloud.tasks.map((t) => dbPut('tasks', t)),
          setSetting('studySettings', resolvedCloudSettings),
          setSetting('planState', resolvedPlan),
        ]);

        setSyncStatus('synced');
      } catch (err) {
        console.error('Error sincronizando con Supabase:', err);
        setSyncStatus('error');
        notify('No se pudo sincronizar con la nube; usando caché local', 'warning');
      }
    },
    [notify]
  );

  // Carga inicial + listener de sesion Supabase
  useEffect(() => {
    void hydrateFromLocal();

    if (!isSupabaseConfigured || !supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      const sUser = data.session?.user;
      if (sUser) {
        const profile: UserProfile = {
          id: sUser.id,
          email: sUser.email || '',
          fullName:
            (sUser.user_metadata?.full_name as string | undefined) ||
            sUser.email?.split('@')[0] ||
            'Estudiante',
        };
        setUser(profile);
        void hydrateFromCloud(profile);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sUser = session?.user;
      if (sUser) {
        const profile: UserProfile = {
          id: sUser.id,
          email: sUser.email || '',
          fullName:
            (sUser.user_metadata?.full_name as string | undefined) ||
            sUser.email?.split('@')[0] ||
            'Estudiante',
        };
        setUser(profile);
        void hydrateFromCloud(profile);
      } else {
        setUser(null);
        setSyncStatus('local');
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [hydrateFromLocal, hydrateFromCloud]);

  const runCloudMutation = useCallback(
    async (task: (userId: string) => Promise<void>) => {
      const currentUser = userRef.current;
      if (!currentUser || !isSupabaseConfigured) return;
      setSyncStatus('syncing');
      try {
        await task(currentUser.id);
        setSyncStatus('synced');
      } catch (err) {
        console.error('Error en mutación cloud:', err);
        setSyncStatus('error');
      }
    },
    []
  );

  const handleOpenDocument = useCallback(
    async (docId: string, pageOverride?: number) => {
      const sameDocAlreadyLoaded = docId === activeDocId && Boolean(activeBuffer);
      setActiveDocId(docId);
      if (!sameDocAlreadyLoaded) {
        setIsLoadingBuffer(true);
      }

      try {
        const stored = await dbGet<DocumentRecord>('documents', docId);
        const meta = documents.find((d) => d.id === docId) || stored;

        if (pageOverride && meta) {
          const clampedPage = Math.min(
            Math.max(1, pageOverride),
            Math.max(1, meta.pageCount)
          );
          if (meta.currentPage !== clampedPage) {
            const updated: DocumentRecord = {
              ...(stored || meta),
              currentPage: clampedPage,
            };
            setDocuments((prev) =>
              prev.map((d) => (d.id === docId ? { ...d, currentPage: clampedPage } : d))
            );
            await dbPut('documents', updated);
            void runCloudMutation((uid) => cloudUpsertDocument(uid, updated));
          }
        }

        if (!sameDocAlreadyLoaded) {
          if (stored?.data) {
            setActiveBuffer(stored.data);
          } else if (meta?.storagePath && userRef.current) {
            const downloaded = await downloadDocumentBinaryFromCloud(meta);
            setActiveBuffer(downloaded);
          } else {
            setActiveBuffer(null);
            notify(
              'El archivo binario no está en caché local en este dispositivo',
              'warning'
            );
          }
        }
      } catch (err) {
        console.error(err);
        notify('Error al abrir el documento', 'error');
      } finally {
        setIsLoadingBuffer(false);
      }
    },
    [activeDocId, activeBuffer, documents, notify, runCloudMutation]
  );

  const highlightTimerRef = useRef<number | null>(null);
  const handleOpenNoteLocation = useCallback(
    async (docId: string, page: number, noteId: string) => {
      await handleOpenDocument(docId, page);
      setCurrentModule('docs');
      setHighlightedNoteId(noteId);
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedNoteId(null);
      }, 2600);
    },
    [handleOpenDocument]
  );

  const handleChangePage = useCallback(
    async (docId: string, page: number) => {
      let updatedDoc: DocumentRecord | null = null;
      setDocuments((prev) =>
        prev.map((d) => {
          if (d.id !== docId) return d;
          const clamped = Math.min(Math.max(1, page), Math.max(1, d.pageCount));
          updatedDoc = { ...d, currentPage: clamped };
          return updatedDoc;
        })
      );

      const stored = await dbGet<DocumentRecord>('documents', docId);
      if (stored) {
        const clamped = Math.min(Math.max(1, page), Math.max(1, stored.pageCount));
        const nextRec: DocumentRecord = { ...stored, currentPage: clamped };
        await dbPut('documents', nextRec);
        void runCloudMutation((uid) => cloudUpsertDocument(uid, nextRec));
      } else if (updatedDoc) {
        void runCloudMutation((uid) => cloudUpsertDocument(uid, updatedDoc!));
      }
    },
    [runCloudMutation]
  );

  const handleUploadFiles = useCallback(
    async (files: FileList, explicitFolderId: string | null = null) => {
      setIsUploading(true);
      const targetFolderId = explicitFolderId ?? null;

      let lastCreatedId: string | null = null;
      let lastBuffer: ArrayBuffer | null = null;
      const newDocIds: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const fileType = detectDocumentType(file.name, file.type);
          const buffer = await file.arrayBuffer();
          const pageCount = await extractDocumentPageCount(fileType, buffer);

          const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          let storagePath: string | null = null;

          const baseDoc: DocumentRecord = {
            id: docId,
            folderId: targetFolderId,
            name: file.name,
            fileType,
            size: file.size,
            pageCount: Math.max(1, pageCount),
            currentPage: 1,
            uploadDate: new Date().toISOString(),
            storagePath: null,
            data: buffer,
          };

          if (userRef.current && isSupabaseConfigured) {
            try {
              storagePath = await uploadDocumentBinaryToCloud(
                userRef.current.id,
                baseDoc,
                buffer
              );
              baseDoc.storagePath = storagePath;
            } catch (err) {
              console.warn('No se pudo subir binario a Storage, guardado local:', err);
            }
          }

          await dbPut('documents', baseDoc);
          setDocuments((prev) => [...prev, baseDoc]);
          void runCloudMutation((uid) => cloudUpsertDocument(uid, baseDoc));

          newDocIds.push(docId);
          lastCreatedId = docId;
          lastBuffer = buffer;

          notify(
            `${file.name} (${pageCount} ${fileType === 'pptx' ? 'diapos' : 'págs'}) guardado`,
            'success'
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : `Error al leer ${file.name}`;
          notify(msg, 'warning');
        }
      }

      if (newDocIds.length > 0) {
        setPlanState((prev) => {
          const updated: PersistedPlanState = {
            ...prev,
            selectedDocIds: Array.from(new Set([...prev.selectedDocIds, ...newDocIds])),
            orderedDocIds: Array.from(new Set([...prev.orderedDocIds, ...newDocIds])),
          };
          void setSetting('planState', updated);
          void runCloudMutation((uid) => cloudSavePlanState(uid, updated));
          return updated;
        });
      }

      if (lastCreatedId && lastBuffer) {
        setActiveDocId(lastCreatedId);
        setActiveBuffer(lastBuffer);
      }

      setIsUploading(false);
    },
    [notify, runCloudMutation]
  );

  const handleCreateFolder = useCallback(
    async (name: string, color: FolderColor) => {
      const folder: FolderRecord = {
        id: `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        color,
        createdAt: new Date().toISOString(),
      };
      await dbPut('folders', folder);
      setFolders((prev) => [...prev, folder]);
      void runCloudMutation((uid) => cloudUpsertFolder(uid, folder));
      notify(`Carpeta "${name}" creada`, 'success');
    },
    [notify, runCloudMutation]
  );

  const handleDeleteFolder = useCallback(
    (folder: FolderRecord) => {
      setPendingConfirm({
        title: 'Eliminar Carpeta',
        message: `¿Deseas eliminar la carpeta "${folder.name}"? Los documentos adentro pasarán a "Sin carpeta" sin borrarse.`,
        confirmLabel: 'Eliminar',
        danger: true,
        onConfirm: async () => {
          await dbDelete('folders', folder.id);
          setFolders((prev) => prev.filter((f) => f.id !== folder.id));

          const affected = documents.filter((d) => d.folderId === folder.id);
          for (const doc of affected) {
            const stored = await dbGet<DocumentRecord>('documents', doc.id);
            const updated: DocumentRecord = { ...(stored || doc), folderId: null };
            await dbPut('documents', updated);
            void runCloudMutation((uid) => cloudUpsertDocument(uid, updated));
          }
          setDocuments((prev) =>
            prev.map((d) => (d.folderId === folder.id ? { ...d, folderId: null } : d))
          );

          void runCloudMutation((uid) => cloudDeleteFolder(uid, folder.id));
          notify('Carpeta eliminada', 'info');
        },
      });
    },
    [documents, notify, runCloudMutation]
  );

  const handleMoveDocumentToFolder = useCallback(
    async (docId: string, folderId: string | null) => {
      const stored = await dbGet<DocumentRecord>('documents', docId);
      const docMeta = documents.find((d) => d.id === docId);
      const base = stored || docMeta;
      if (!base) return;

      const updated: DocumentRecord = { ...base, folderId };
      await dbPut('documents', updated);
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, folderId } : d))
      );
      void runCloudMutation((uid) => cloudUpsertDocument(uid, updated));
      notify('Documento reubicado', 'success');
    },
    [documents, notify, runCloudMutation]
  );

  const handleDeleteDocument = useCallback(
    (doc: DocumentRecord) => {
      setPendingConfirm({
        title: 'Eliminar Documento',
        message: `¿Deseas eliminar permanentemente "${doc.name}" y todas sus notas asociadas? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        danger: true,
        onConfirm: async () => {
          await dbDelete('documents', doc.id);
          const docNotes = notes.filter((n) => n.docId === doc.id);
          for (const n of docNotes) {
            await dbDelete('notes', n.id);
          }

          setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
          setNotes((prev) => prev.filter((n) => n.docId !== doc.id));
          setPlanState((prev) => {
            const updated: PersistedPlanState = {
              ...prev,
              selectedDocIds: prev.selectedDocIds.filter((id) => id !== doc.id),
              orderedDocIds: prev.orderedDocIds.filter((id) => id !== doc.id),
              diagnostic: prev.diagnostic
                ? {
                  ...prev.diagnostic,
                  samples: prev.diagnostic.samples.filter(
                    (s) => s.docId !== doc.id
                  ),
                }
                : undefined,
            };
            void setSetting('planState', updated);
            void runCloudMutation((uid) => cloudSavePlanState(uid, updated));
            return updated;
          });

          if (activeDocId === doc.id) {
            setActiveDocId(null);
            setActiveBuffer(null);
          }

          void runCloudMutation((uid) => cloudDeleteDocument(uid, doc));
          notify('Documento eliminado', 'info');
        },
      });
    },
    [notes, activeDocId, notify, runCloudMutation]
  );

  const handleCreateNote = useCallback(
    async (input: Omit<StickyNoteRecord, 'id' | 'createdAt'>) => {
      const note: StickyNoteRecord = {
        ...input,
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      await dbPut('notes', note);
      setNotes((prev) => [...prev, note]);
      void runCloudMutation((uid) => cloudUpsertNote(uid, note));
    },
    [runCloudMutation]
  );

  const handleUpdateNote = useCallback(
    async (noteId: string, patch: Partial<StickyNoteRecord>) => {
      let nextNote: StickyNoteRecord | null = null;
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== noteId) return n;
          nextNote = { ...n, ...patch };
          return nextNote;
        })
      );
      const existing = await dbGet<StickyNoteRecord>('notes', noteId);
      const merged = nextNote || (existing ? { ...existing, ...patch } : null);
      if (merged) {
        await dbPut('notes', merged);
        void runCloudMutation((uid) => cloudUpsertNote(uid, merged));
      }
    },
    [runCloudMutation]
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      await dbDelete('notes', noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      void runCloudMutation((uid) => cloudDeleteNote(uid, noteId));
      notify('Nota eliminada', 'info');
    },
    [notify, runCloudMutation]
  );

  const handleUpdateSettings = useCallback(
    async (next: StudySettings) => {
      setStudySettings(next);
      await setSetting('studySettings', next);
      void runCloudMutation((uid) => cloudSaveStudySettings(uid, next));
    },
    [runCloudMutation]
  );

  const handleToggleAudio = useCallback(async () => {
    const next: StudySettings = {
      ...studySettings,
      audioEnabled: !studySettings.audioEnabled,
    };
    await handleUpdateSettings(next);
    notify(
      next.audioEnabled ? 'Alertas sonoras activadas' : 'Alertas sonoras silenciadas',
      'info'
    );
  }, [studySettings, handleUpdateSettings, notify]);

  const handleChangeAppearance = useCallback(
    (nextAppearance: AppearanceSettings) => {
      void handleUpdateSettings({
        ...studySettings,
        appearance: resolveAppearance(nextAppearance),
      });
    },
    [studySettings, handleUpdateSettings]
  );

  const handleResetAppearance = useCallback(() => {
    void handleUpdateSettings({
      ...studySettings,
      appearance: DEFAULT_APPEARANCE,
    });
    notify('Apariencia restablecida a valores predeterminados', 'info');
  }, [studySettings, handleUpdateSettings, notify]);

  const handleUpdatePlanState = useCallback(
    async (patch: Partial<PersistedPlanState>) => {
      setPlanState((prev) => {
        const updated = { ...prev, ...patch };
        void setSetting('planState', updated);
        void runCloudMutation((uid) => cloudSavePlanState(uid, updated));
        return updated;
      });
    },
    [runCloudMutation]
  );

  const handleToggleStepCompleted = useCallback(
    async (stepId: string) => {
      setPlanState((prev) => {
        const exists = prev.completedStepIds.includes(stepId);
        const completedStepIds = exists
          ? prev.completedStepIds.filter((id) => id !== stepId)
          : [...prev.completedStepIds, stepId];
        const updated = { ...prev, completedStepIds };
        void setSetting('planState', updated);
        void runCloudMutation((uid) => cloudSavePlanState(uid, updated));
        return updated;
      });
    },
    [runCloudMutation]
  );

  const handleTimerRouteStepCompleted = useCallback(
    (stepId: string, docId: string | null, endPage?: number) => {
      setPlanState((prev) => {
        if (prev.completedStepIds.includes(stepId)) return prev;
        const updated: PersistedPlanState = {
          ...prev,
          completedStepIds: [...prev.completedStepIds, stepId],
        };
        void setSetting('planState', updated);
        void runCloudMutation((uid) => cloudSavePlanState(uid, updated));
        return updated;
      });
      if (docId && endPage) {
        void handleChangePage(docId, endPage);
      }
    },
    [handleChangePage, runCloudMutation]
  );

  const handleAddTask = useCallback(
    async (title: string, docId: string | null, folderId: string | null) => {
      const task: TaskRecord = {
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        docId,
        folderId,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      await dbPut('tasks', task);
      setTasks((prev) => [...prev, task]);
      void runCloudMutation((uid) => cloudUpsertTask(uid, task));
      notify('Tarea agregada', 'success');
    },
    [notify, runCloudMutation]
  );

  const handleToggleTask = useCallback(
    async (taskId: string) => {
      let updatedTask: TaskRecord | null = null;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          updatedTask = { ...t, completed: !t.completed };
          return updatedTask;
        })
      );
      if (updatedTask) {
        await dbPut('tasks', updatedTask);
        void runCloudMutation((uid) => cloudUpsertTask(uid, updatedTask!));
      }
    },
    [runCloudMutation]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      await dbDelete('tasks', taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      void runCloudMutation((uid) => cloudDeleteTask(uid, taskId));
      notify('Tarea eliminada', 'info');
    },
    [notify, runCloudMutation]
  );

  // Autenticacion y respaldo JSON
  const handleSignIn = async (email: string, password: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    notify('Sesión iniciada correctamente', 'success');
  };

  const handleSignUp = async (email: string, password: string, fullName: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    notify(
      'Cuenta registrada. Revisa tu correo si Supabase solicita verificación.',
      'success'
    );
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    await clearAllLocalData();
    setFolders([]);
    setDocuments([]);
    setNotes([]);
    setTasks([]);
    setActiveDocId(null);
    setActiveBuffer(null);
    setUser(null);
    setSyncStatus('local');
    setAccountModalOpen(false);
    notify('Sesión cerrada y caché local limpiada', 'info');
  };

  const handleExportBackup = () => {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      folders,
      notes,
      tasks,
      studySettings,
      planState,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudyFlow_Respaldo_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Respaldo JSON descargado', 'success');
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        folders?: FolderRecord[];
        notes?: StickyNoteRecord[];
        tasks?: TaskRecord[];
        studySettings?: StudySettings;
        planState?: PersistedPlanState;
      };

      if (Array.isArray(parsed.folders)) {
        for (const f of parsed.folders) await dbPut('folders', f);
        setFolders(parsed.folders);
      }
      if (Array.isArray(parsed.notes)) {
        for (const n of parsed.notes) await dbPut('notes', n);
        setNotes(parsed.notes);
      }
      if (Array.isArray(parsed.tasks)) {
        for (const t of parsed.tasks) await dbPut('tasks', t);
        setTasks(parsed.tasks);
      }
      if (parsed.studySettings) {
        const merged: StudySettings = {
          ...DEFAULT_STUDY_SETTINGS,
          ...parsed.studySettings,
          appearance: resolveAppearance(parsed.studySettings.appearance),
        };
        await setSetting('studySettings', merged);
        setStudySettings(merged);
      }
      if (parsed.planState) {
        await setSetting('planState', parsed.planState);
        setPlanState(parsed.planState);
      }
      notify('Respaldo restaurado correctamente', 'success');
    } catch {
      notify('El archivo JSON de respaldo no es válido', 'error');
    }
  };

  const orderedSelectedDocs = useMemo(() => {
    const selectedSet = new Set(planState.selectedDocIds);
    const orderMap = new Map(planState.orderedDocIds.map((id, i) => [id, i]));
    return documents
      .filter((d) => selectedSet.has(d.id))
      .sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : Number.MAX_SAFE_INTEGER;
        return idxA - idxB;
      });
  }, [documents, planState.selectedDocIds, planState.orderedDocIds]);

  const planResult = useMemo(
    () =>
      generateStudyRoute({
        documents: orderedSelectedDocs,
        folders,
        settings: studySettings,
        deadline: planState.deadline,
        completedStepIds: planState.completedStepIds,
      }),
    [
      orderedSelectedDocs,
      folders,
      studySettings,
      planState.deadline,
      planState.completedStepIds,
    ]
  );

  const handleStepReopenedAndAdapted = useCallback(
    (step: RouteStep | null, extraMinutes: number) => {
      if (step) {
        setPlanState((prev) => {
          if (!prev.completedStepIds.includes(step.id)) return prev;
          const updated: PersistedPlanState = {
            ...prev,
            completedStepIds: prev.completedStepIds.filter((id) => id !== step.id),
          };
          void setSetting('planState', updated);
          void runCloudMutation((uid) => cloudSavePlanState(uid, updated));
          return updated;
        });
      }

      // Adaptar velocidad estimada de lectura segun tiempo extra consumido
      const currentSpeed = studySettings.speedMinPerPage || 3;
      let nextSpeed = Number((currentSpeed + 0.5).toFixed(1));
      if (step && step.pageCount && step.pageCount > 0) {
        const observedSpeed = (step.durationMinutes + extraMinutes) / step.pageCount;
        nextSpeed = Number(Math.max(currentSpeed + 0.3, observedSpeed).toFixed(1));
      }
      nextSpeed = Math.min(60, Math.max(0.5, nextSpeed));

      const nextSettings: StudySettings = {
        ...studySettings,
        speedMinPerPage: nextSpeed,
      };
      void handleUpdateSettings(nextSettings);
      notify(
        `Descanso aplazado +${extraMinutes} min · Plan adaptado a ${nextSpeed} min/pág`,
        'info'
      );
    },
    [studySettings, handleUpdateSettings, notify, runCloudMutation]
  );

  const handleRequestOpenSegment = useCallback(
    (segment: RouteSegment) => {
      void handleOpenDocument(segment.docId, segment.startPage);
    },
    [handleOpenDocument]
  );

  const diagnosticData: DiagnosticData = planState.diagnostic || DEFAULT_DIAGNOSTIC_DATA;

  const updateDiagnosticData = useCallback(
    (updater: (prev: DiagnosticData) => DiagnosticData) => {
      setPlanState((prev) => {
        const currentDiag = prev.diagnostic || DEFAULT_DIAGNOSTIC_DATA;
        const updated: PersistedPlanState = {
          ...prev,
          diagnostic: updater(currentDiag),
        };
        void setSetting('planState', updated);
        void runCloudMutation((uid) => cloudSavePlanState(uid, updated));
        return updated;
      });
    },
    [runCloudMutation]
  );

  const handleToggleDiagnostic = useCallback(
    (active: boolean) => {
      updateDiagnosticData((prev) => ({ ...prev, isActive: active }));
      notify(
        active
          ? 'Modo Diagnóstico activo: lee algunas páginas para medir tu ritmo real'
          : 'Medición de diagnóstico pausada',
        active ? 'success' : 'info'
      );
    },
    [updateDiagnosticData, notify]
  );

  const handleRecordDiagnosticSample = useCallback(
    (sample: {
      docId: string;
      docName: string;
      fileType: DocumentType;
      page: number;
      addedSeconds: number;
    }) => {
      updateDiagnosticData((prev) => ({
        ...prev,
        samples: mergeReadingSample(prev.samples, sample),
      }));
    },
    [updateDiagnosticData]
  );

  const handleChangeDiagnosticCriterion = useCallback(
    (criterion: DiagnosticCriterion) => {
      updateDiagnosticData((prev) => ({ ...prev, criterion }));
    },
    [updateDiagnosticData]
  );

  const handleRemoveDiagnosticSample = useCallback(
    (docId: string, page: number) => {
      updateDiagnosticData((prev) => ({
        ...prev,
        samples: prev.samples.filter(
          (s) => !(s.docId === docId && s.page === page)
        ),
      }));
    },
    [updateDiagnosticData]
  );

  const handleResetDiagnosticSamples = useCallback(() => {
    updateDiagnosticData((prev) => ({ ...prev, samples: [] }));
    notify('Muestras de diagnóstico reiniciadas', 'info');
  }, [updateDiagnosticData, notify]);

  const handleStartDiagnosticInViewer = useCallback(() => {
    updateDiagnosticData((prev) => ({ ...prev, isActive: true }));
    setCurrentModule('docs');
    if (!activeDocId && documents.length > 0) {
      void handleOpenDocument(documents[0].id);
    }
    notify(
      'Modo Diagnóstico activado: lee 3–5 páginas en el visor y revisa tu perfil recomendado',
      'success'
    );
  }, [updateDiagnosticData, activeDocId, documents, handleOpenDocument, notify]);

  const handleApplyDiagnosticProfile = useCallback(
    (rec: DiagnosticRecommendation) => {
      const nextSettings: StudySettings = {
        ...studySettings,
        presetId: 'custom',
        studyMinutes: rec.recommendedSettings.studyMinutes,
        shortBreakMinutes: rec.recommendedSettings.shortBreakMinutes,
        longBreakMinutes: rec.recommendedSettings.longBreakMinutes,
        longBreakEveryNBlocks: rec.recommendedSettings.longBreakEveryNBlocks,
        speedMinPerPage: rec.recommendedSettings.speedMinPerPage,
        pagesPerBlock: rec.recommendedSettings.pagesPerBlock,
      };
      void handleUpdateSettings(nextSettings);
      updateDiagnosticData((prev) => ({
        ...prev,
        isActive: false,
        lastAppliedAt: new Date().toISOString(),
      }));
      setDiagnosticModalOpen(false);
      notify(
        `Perfil calibrado aplicado: ${rec.recommendedSettings.studyMinutes}/${rec.recommendedSettings.shortBreakMinutes}/${rec.recommendedSettings.longBreakMinutes} min @ ${rec.recommendedSettings.speedMinPerPage} min/pág`,
        'success'
      );
    },
    [studySettings, handleUpdateSettings, updateDiagnosticData, notify]
  );

  const activeDoc = useMemo(
    () => documents.find((d) => d.id === activeDocId) || null,
    [documents, activeDocId]
  );

  return (
    <TimerProvider
      settings={studySettings}
      plannedSteps={planResult.steps}
      onNotify={notify}
      onStepCompleted={handleTimerRouteStepCompleted}
      onStepReopenedAndAdapted={handleStepReopenedAndAdapted}
      onRequestOpenSegment={handleRequestOpenSegment}
    >
      <WorkspaceShell
        currentModule={currentModule}
        setCurrentModule={setCurrentModule}
        folders={folders}
        documents={documents}
        notes={notes}
        tasks={tasks}
        studySettings={studySettings}
        planState={planState}
        planResult={planResult}
        activeDocId={activeDocId}
        activeBuffer={activeBuffer}
        highlightedNoteId={highlightedNoteId}
        isLoadingBuffer={isLoadingBuffer}
        isUploading={isUploading}
        user={user}
        syncStatus={syncStatus}
        onOpenAccountModal={() => setAccountModalOpen(true)}
        onOpenAppearanceModal={() => setAppearanceModalOpen(true)}
        onToggleAudio={handleToggleAudio}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        onUploadFiles={handleUploadFiles}
        onOpenDocument={handleOpenDocument}
        onMoveDocumentToFolder={handleMoveDocumentToFolder}
        onDeleteDocument={handleDeleteDocument}
        onChangePage={handleChangePage}
        onCreateNote={handleCreateNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        onOpenNoteLocation={(docId, page, noteId) =>
          void handleOpenNoteLocation(docId, page, noteId)
        }
        diagnosticData={diagnosticData}
        onToggleDiagnostic={handleToggleDiagnostic}
        onRecordDiagnosticSample={handleRecordDiagnosticSample}
        onOpenDiagnosticModal={() => setDiagnosticModalOpen(true)}
        onStartDiagnosticInViewer={handleStartDiagnosticInViewer}
        onUpdateSettings={handleUpdateSettings}
        onUpdatePlanState={handleUpdatePlanState}
        onToggleStepCompleted={handleToggleStepCompleted}
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onNotify={notify}
      />

      <ConfirmModal
        open={Boolean(pendingConfirm)}
        title={pendingConfirm?.title || ''}
        message={pendingConfirm?.message || ''}
        confirmLabel={pendingConfirm?.confirmLabel || 'Aceptar'}
        danger={pendingConfirm?.danger}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          const action = pendingConfirm?.onConfirm;
          setPendingConfirm(null);
          if (action) void action();
        }}
      />

      <AccountModal
        open={accountModalOpen}
        user={user}
        syncStatus={syncStatus}
        onClose={() => setAccountModalOpen(false)}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onSignOut={handleSignOut}
        onSyncNow={() =>
          user ? hydrateFromCloud(user) : Promise.resolve()
        }
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      <DiagnosticModal
        open={diagnosticModalOpen}
        isActive={diagnosticData.isActive}
        activeDoc={activeDoc}
        samples={diagnosticData.samples}
        criterion={diagnosticData.criterion}
        onClose={() => setDiagnosticModalOpen(false)}
        onToggleDiagnostic={handleToggleDiagnostic}
        onChangeCriterion={handleChangeDiagnosticCriterion}
        onRemoveSample={handleRemoveDiagnosticSample}
        onResetSamples={handleResetDiagnosticSamples}
        onApplyRecommendation={handleApplyDiagnosticProfile}
      />

      <AppearanceModal
        open={appearanceModalOpen}
        appearance={resolvedAppearance}
        onChange={handleChangeAppearance}
        onReset={handleResetAppearance}
        onClose={() => setAppearanceModalOpen(false)}
      />

      <ToastContainer toasts={toasts} />
    </TimerProvider>
  );
};

export default App;

