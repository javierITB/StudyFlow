import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppearanceSettings,
  CollaboratorPresence,
  DiagnosticCriterion,
  DiagnosticData,
  DiagnosticRecommendation,
  DocumentRecord,
  DocumentShareRecord,
  DocumentType,
  FolderColor,
  FolderRecord,
  FriendshipRecord,
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
import { formatErrorMessageEs } from './lib/errorMessages';
import { generateStudyRoute, getDefaultDeadlineLocalString } from './lib/routePlanner';
import {
  clearAllLocalData,
  dbDelete,
  dbGet,
  dbPut,
  getSetting,
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
import { TutorialOverlay } from './components/TutorialOverlay';
import { AuthWelcomeModal } from './components/AuthWelcomeModal';
import { UsernameOnboardingModal } from './components/UsernameOnboardingModal';
import { NotificationsBell } from './components/NotificationsBell';
import { FriendsAndSharesModal } from './components/FriendsAndSharesModal';
import { ShareDocumentModal } from './components/ShareDocumentModal';
import {
  acceptDocumentCopy,
  extractShareTokenFromSearch,
  fetchFriendships,
  fetchIncomingShares,
  fetchNotesForDocument,
  fetchSharedDocumentsWithMe,
  redeemShareLink,
  removeFriendship,
  resolveEmailForLogin,
  respondFriendRequest,
  sendFriendRequest,
  subscribeToDocumentCollaboration,
  subscribeToSocialNotifications,
  updateMyUsername,
  updateShareStatusOrRole,
} from './lib/collaboration';

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
  sharedDocuments: DocumentRecord[];
  collaboratorsPresence: CollaboratorPresence[];
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
  onOpenFriendsModal: () => void;
  onShareDocument: (doc: DocumentRecord) => void;
  notificationsSlot?: React.ReactNode;
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
  sidebarOpen: boolean;
  onSetSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenTutorial: () => void;
  forcePomodoroSessionKey: number;
}

const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  currentModule,
  setCurrentModule,
  folders,
  documents,
  sharedDocuments,
  collaboratorsPresence,
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
  onOpenFriendsModal,
  onShareDocument,
  notificationsSlot,
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
  sidebarOpen,
  onSetSidebarOpen,
  onOpenTutorial,
  forcePomodoroSessionKey,
}) => {
  const { startRouteStep, activeRouteStep } = useTimer();

  const activeDoc = useMemo(
    () =>
      documents.find((d) => d.id === activeDocId) ||
      sharedDocuments.find((d) => d.id === activeDocId) ||
      null,
    [documents, sharedDocuments, activeDocId]
  );

  const handleStartRouteStepInViewer = useCallback(
    async (step: RouteStep, nextStep: RouteStep | null) => {
      const targetDocId = step.segments?.[0]?.docId || step.docId;
      const targetStartPage = step.segments?.[0]?.startPage || step.startPage || 1;
      if (targetDocId) {
        await onOpenDocument(targetDocId, targetStartPage);
        setCurrentModule('docs');
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          onSetSidebarOpen(false);
        }
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
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      <Navbar
        currentModule={currentModule}
        onSwitchModule={setCurrentModule}
        settings={studySettings}
        onToggleAudio={() => void onToggleAudio()}
        user={user}
        syncStatus={syncStatus}
        onOpenAccountModal={onOpenAccountModal}
        onOpenFriendsModal={onOpenFriendsModal}
        onOpenAppearanceModal={onOpenAppearanceModal}
        onOpenTutorial={onOpenTutorial}
        notificationsSlot={notificationsSlot}
      />

      <main className="flex-1 overflow-hidden relative">
        {currentModule === 'docs' && (
          <div className="h-full flex overflow-hidden relative">
            {sidebarOpen && (
              <div
                className="fixed inset-0 top-12 xl:top-14 bg-slate-950/60 backdrop-blur-[1px] z-20 lg:hidden"
                onClick={() => onSetSidebarOpen(false)}
              />
            )}
            <div
              className={
                sidebarOpen
                  ? 'absolute inset-y-0 left-0 z-30 w-80 sm:w-[21rem] max-w-[88vw] shadow-2xl lg:static lg:z-auto lg:w-72 xl:w-80 2xl:w-96 lg:shadow-none flex-shrink-0 h-full transition-all duration-200'
                  : 'hidden lg:block lg:w-0 lg:overflow-hidden flex-shrink-0 h-full transition-all duration-200'
              }
            >
              <DocumentSidebar
                folders={folders}
                documents={documents}
                sharedDocuments={sharedDocuments}
                activeDocId={activeDocId}
                speedMinPerPage={studySettings.speedMinPerPage}
                isUploading={isUploading}
                syncStatusLabel={syncStatusLabel}
                planResult={planResult}
                activeRouteStepId={activeRouteStep?.id || null}
                onCreateFolder={onCreateFolder}
                onDeleteFolder={onDeleteFolder}
                onUploadFiles={onUploadFiles}
                onOpenDocument={(id) => {
                  void onOpenDocument(id);
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    onSetSidebarOpen(false);
                  }
                }}
                onMoveDocumentToFolder={onMoveDocumentToFolder}
                onDeleteDocument={onDeleteDocument}
                onShareDocument={user ? onShareDocument : undefined}
                onStartRouteStep={(step, next) =>
                  void handleStartRouteStepInViewer(step, next)
                }
                onToggleStepCompleted={onToggleStepCompleted}
                onOpenPlannerTab={() => setCurrentModule('pomodoro')}
                onCloseDrawer={() => onSetSidebarOpen(false)}
              />
            </div>

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
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => onSetSidebarOpen((v) => !v)}
              currentUserId={user?.id || null}
              currentUsername={user?.username || null}
              collaboratorsPresence={collaboratorsPresence}
              onShareDocument={user ? onShareDocument : undefined}
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
            forceSessionKey={forcePomodoroSessionKey}
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
  const [profileLoadedFromCloud, setProfileLoadedFromCloud] = useState<boolean>(false);
  const [usernamePromptDismissed, setUsernamePromptDismissed] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'local' | 'synced' | 'syncing' | 'error'>(
    'local'
  );
  const [sharedDocuments, setSharedDocuments] = useState<DocumentRecord[]>([]);
  const [friendships, setFriendships] = useState<FriendshipRecord[]>([]);
  const [incomingShares, setIncomingShares] = useState<DocumentShareRecord[]>([]);
  const [collaboratorsPresence, setCollaboratorsPresence] = useState<
    CollaboratorPresence[]
  >([]);
  const [friendsModalOpen, setFriendsModalOpen] = useState<boolean>(false);
  const [shareDocTarget, setShareDocTarget] = useState<DocumentRecord | null>(null);
  const collabHandleRef = useRef<{
    updatePage: (page: number) => void;
    unsubscribe: () => void;
  } | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState<boolean>(false);
  const [diagnosticModalOpen, setDiagnosticModalOpen] = useState<boolean>(false);
  const [appearanceModalOpen, setAppearanceModalOpen] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [authWelcomeOpen, setAuthWelcomeOpen] = useState<boolean>(false);
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(false);
  const [forcePomodoroSessionKey, setForcePomodoroSessionKey] = useState<number>(0);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const handleDismissAuthWelcome = useCallback(async () => {
    setAuthWelcomeOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sf_auth_welcome_dismissed', '1');
    }
    void setSetting('authWelcomeDismissed', true);

    // If tutorial hasn't been shown yet, seamlessly start the express tutorial
    const tutorialDismissedLocal =
      typeof window !== 'undefined' &&
      window.localStorage.getItem('sf_tutorial_dismissed') === '1';
    const tutorialDismissedDb = await getSetting<boolean>('tutorialDismissed');
    if (!tutorialDismissedLocal && !tutorialDismissedDb) {
      setTutorialOpen(true);
    }
  }, []);

  const handleOpenSignInFromWelcome = useCallback(() => {
    setAuthWelcomeOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sf_auth_welcome_dismissed', '1');
    }
    void setSetting('authWelcomeDismissed', true);
    setAccountModalOpen(true);
  }, []);

  const handleCloseTutorial = useCallback((markCompleted: boolean) => {
    setTutorialOpen(false);
    if (markCompleted) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sf_tutorial_dismissed', '1');
      }
      void setSetting('tutorialDismissed', true);
    }
  }, []);

  const handleEnsureSidebarOpen = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const handleEnsurePomodoroSession = useCallback(() => {
    setForcePomodoroSessionKey((k) => k + 1);
  }, []);

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

    const authDismissedLocal =
      typeof window !== 'undefined' &&
      window.localStorage.getItem('sf_auth_welcome_dismissed') === '1';
    const authDismissedDb = await getSetting<boolean>('authWelcomeDismissed');

    const tutorialDismissedLocal =
      typeof window !== 'undefined' &&
      window.localStorage.getItem('sf_tutorial_dismissed') === '1';
    const tutorialDismissedDb = await getSetting<boolean>('tutorialDismissed');

    if (!authDismissedLocal && !authDismissedDb) {
      setAuthWelcomeOpen(true);
    } else if (!tutorialDismissedLocal && !tutorialDismissedDb) {
      setTutorialOpen(true);
    }
  }, []);

  const refreshSocialData = useCallback(async (userId: string) => {
    try {
      const [fr, sh, sDocs] = await Promise.all([
        fetchFriendships(userId),
        fetchIncomingShares(userId),
        fetchSharedDocumentsWithMe(userId),
      ]);
      setFriendships(fr);
      setIncomingShares(sh);
      setSharedDocuments(sDocs);
    } catch {
      // Silenciar si aún no se aplica la migración v2 en Supabase
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
        setUser((prev) =>
          prev && prev.id === profile.id
            ? {
                ...prev,
                username: cloud.username,
                fullName: cloud.fullName || prev.fullName,
              }
            : prev
        );
        setProfileLoadedFromCloud(true);

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

        void refreshSocialData(profile.id);
        setSyncStatus('synced');
      } catch (err) {
        console.error('Error sincronizando con Supabase:', err);
        setSyncStatus('error');
        notify(
          formatErrorMessageEs(
            err,
            'No se pudo sincronizar con la nube; usando caché local'
          ),
          'warning'
        );
      }
    },
    [notify, refreshSocialData]
  );

  // Carga inicial + listener de sesion Supabase + detección de enlace ?share=
  useEffect(() => {
    void hydrateFromLocal();

    if (typeof window !== 'undefined') {
      const shareToken = extractShareTokenFromSearch(window.location.search);
      if (shareToken) {
        window.sessionStorage.setItem('sf_pending_share_token', shareToken);
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('share');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
    }

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
          username:
            (sUser.user_metadata?.username as string | undefined) || null,
        };
        setUser(profile);
        setAuthWelcomeOpen(false);
        void hydrateFromCloud(profile);
      } else if (
        typeof window !== 'undefined' &&
        window.sessionStorage.getItem('sf_pending_share_token')
      ) {
        setAuthWelcomeOpen(false);
        setAccountModalOpen(true);
        notify('Inicia sesión o regístrate para abrir el enlace compartido', 'info');
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
          username:
            (sUser.user_metadata?.username as string | undefined) || null,
        };
        setUser(profile);
        setAuthWelcomeOpen(false);
        void hydrateFromCloud(profile);
      } else {
        setUser(null);
        setProfileLoadedFromCloud(false);
        setSharedDocuments([]);
        setFriendships([]);
        setIncomingShares([]);
        setCollaboratorsPresence([]);
        setSyncStatus('local');
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [hydrateFromLocal, hydrateFromCloud, notify]);

  // Suscripción silenciosa Realtime a solicitudes de amistad y documentos compartidos
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return;
    return subscribeToSocialNotifications({
      userId: user.id,
      onRefreshNeeded: () => {
        void refreshSocialData(user.id);
      },
    });
  }, [user?.id, refreshSocialData]);

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
        const sharedMeta = sharedDocuments.find((d) => d.id === docId);
        const ownMeta = documents.find((d) => d.id === docId);
        const meta = ownMeta || sharedMeta || stored;
        const isSharedDoc = Boolean(sharedMeta && !ownMeta);

        if (pageOverride && meta) {
          const clampedPage = Math.min(
            Math.max(1, pageOverride),
            Math.max(1, meta.pageCount)
          );
          if (meta.currentPage !== clampedPage) {
            if (isSharedDoc) {
              setSharedDocuments((prev) =>
                prev.map((d) => (d.id === docId ? { ...d, currentPage: clampedPage } : d))
              );
            } else {
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
        }

        if (isSharedDoc && userRef.current) {
          const docNotes = await fetchNotesForDocument(docId);
          setNotes((prev) => {
            const others = prev.filter((n) => n.docId !== docId);
            return [...others, ...docNotes];
          });
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
    [activeDocId, activeBuffer, documents, sharedDocuments, notify, runCloudMutation]
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
      const isSharedDoc =
        sharedDocuments.some((d) => d.id === docId) &&
        !documents.some((d) => d.id === docId);

      if (isSharedDoc) {
        let clampedShared = page;
        setSharedDocuments((prev) =>
          prev.map((d) => {
            if (d.id !== docId) return d;
            clampedShared = Math.min(Math.max(1, page), Math.max(1, d.pageCount));
            return { ...d, currentPage: clampedShared };
          })
        );
        if (docId === activeDocId) {
          collabHandleRef.current?.updatePage(clampedShared);
        }
        return;
      }

      let updatedDoc: DocumentRecord | null = null;
      let clampedOwn = page;
      setDocuments((prev) =>
        prev.map((d) => {
          if (d.id !== docId) return d;
          clampedOwn = Math.min(Math.max(1, page), Math.max(1, d.pageCount));
          updatedDoc = { ...d, currentPage: clampedOwn };
          return updatedDoc;
        })
      );

      if (docId === activeDocId) {
        collabHandleRef.current?.updatePage(clampedOwn);
      }

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
    [activeDocId, documents, sharedDocuments, runCloudMutation]
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
          const msg = formatErrorMessageEs(err, `Error al leer ${file.name}`);
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
  const handleSignIn = async (identifier: string, password: string) => {
    if (!supabase) return;
    const resolvedEmail = await resolveEmailForLogin(identifier);
    if (!resolvedEmail) {
      throw new Error(
        'No encontramos ninguna cuenta con ese correo o @usuario.'
      );
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });
    if (error) {
      throw new Error(formatErrorMessageEs(error, 'Error al iniciar sesión'));
    }
    notify('Sesión iniciada correctamente', 'success');
  };

  const handleSignUp = async (
    email: string,
    password: string,
    fullName: string,
    username: string
  ) => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, username } },
    });
    if (error) {
      throw new Error(formatErrorMessageEs(error, 'Error al registrar la cuenta'));
    }
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('Ya existe una cuenta registrada con ese correo electrónico.');
    }
    notify(
      'Cuenta registrada. Revisa tu correo si Supabase solicita verificación.',
      'success'
    );
  };

  const handleUpdateUsername = async (username: string) => {
    if (!user) return;
    const saved = await updateMyUsername(user.id, username);
    setUser((prev) => (prev ? { ...prev, username: saved } : prev));
    notify(`Tu @usuario es ahora @${saved}`, 'success');
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    await clearAllLocalData();
    setFolders([]);
    setDocuments([]);
    setSharedDocuments([]);
    setFriendships([]);
    setIncomingShares([]);
    setCollaboratorsPresence([]);
    setNotes([]);
    setTasks([]);
    setActiveDocId(null);
    setActiveBuffer(null);
    setUser(null);
    setProfileLoadedFromCloud(false);
    setSyncStatus('local');
    setAccountModalOpen(false);
    notify('Sesión cerrada y caché local limpiada', 'info');
  };

  // Acciones sociales y compartición
  const handleSendFriendRequest = async (addresseeId: string) => {
    if (!user) return;
    await sendFriendRequest(user.id, addresseeId);
    await refreshSocialData(user.id);
    notify('Solicitud de amistad enviada', 'success');
  };

  const handleAcceptFriend = async (friendshipId: string) => {
    if (!user) return;
    await respondFriendRequest(friendshipId, 'accepted');
    await refreshSocialData(user.id);
    notify('Solicitud de amistad aceptada', 'success');
  };

  const handleRejectOrRemoveFriend = async (friendshipId: string) => {
    if (!user) return;
    await removeFriendship(friendshipId);
    await refreshSocialData(user.id);
    notify('Vínculo actualizado', 'info');
  };

  const handleAcceptCopyShare = async (
    share: DocumentShareRecord,
    targetFolderId: string | null
  ) => {
    if (!user) return;
    const { newDoc, copiedNotes } = await acceptDocumentCopy({
      shareId: share.id,
      sourceDocId: share.docId,
      docName: share.docName || 'Documento compartido',
      fileType: share.fileType || 'pdf',
      size: share.size || 0,
      pageCount: share.pageCount || 1,
      storagePath: share.storagePath || null,
      includeNotes: share.includeNotes,
      recipientId: user.id,
      targetFolderId,
    });
    setDocuments((prev) => [...prev, newDoc]);
    if (copiedNotes.length > 0) {
      setNotes((prev) => [...prev, ...copiedNotes]);
    }
    await refreshSocialData(user.id);
    notify(
      `Copia guardada: "${newDoc.name}"${
        copiedNotes.length > 0 ? ` (+${copiedNotes.length} notas)` : ''
      }`,
      'success'
    );
    await handleOpenDocument(newDoc.id, 1);
    setCurrentModule('docs');
  };

  const handleAcceptCollaborativeShare = async (share: DocumentShareRecord) => {
    if (!user) return;
    await updateShareStatusOrRole(share.id, { status: 'accepted' });
    await refreshSocialData(user.id);
    notify(`Te uniste a la sesión colaborativa de "${share.docName}"`, 'success');
    await handleOpenDocument(share.docId, 1);
    setCurrentModule('docs');
  };

  const handleDismissOrLeaveShare = async (shareId: string) => {
    if (!user) return;
    await updateShareStatusOrRole(shareId, { status: 'revoked' });
    await refreshSocialData(user.id);
    notify('Elemento compartido descartado', 'info');
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
    () =>
      documents.find((d) => d.id === activeDocId) ||
      sharedDocuments.find((d) => d.id === activeDocId) ||
      null,
    [documents, sharedDocuments, activeDocId]
  );

  // Canje automático de enlace compartido (?share=TOKEN) tras iniciar sesión
  useEffect(() => {
    if (!user?.id || !profileLoadedFromCloud || !isSupabaseConfigured) return;
    if (typeof window === 'undefined') return;
    const pendingToken = window.sessionStorage.getItem('sf_pending_share_token');
    if (!pendingToken) return;

    window.sessionStorage.removeItem('sf_pending_share_token');
    void (async () => {
      try {
        const result = await redeemShareLink(pendingToken);
        await refreshSocialData(user.id);
        if (result.shareMode === 'collaborative') {
          notify(
            `Te uniste a la sesión colaborativa de "${result.docName}"`,
            'success'
          );
          await handleOpenDocument(result.docId, 1);
          setCurrentModule('docs');
        } else {
          notify(
            `Copia de "${result.docName}" lista para guardar en tu biblioteca.`,
            'info'
          );
          setFriendsModalOpen(true);
        }
      } catch (err) {
        notify(
          formatErrorMessageEs(err, 'No se pudo abrir el enlace compartido'),
          'warning'
        );
      }
    })();
  }, [user?.id, profileLoadedFromCloud, refreshSocialData, handleOpenDocument, notify]);

  // Suscripción Realtime de notas y presencia para el documento activo
  useEffect(() => {
    collabHandleRef.current?.unsubscribe();
    collabHandleRef.current = null;
    setCollaboratorsPresence([]);

    if (!user?.id || !activeDocId || !isSupabaseConfigured) return;

    const currentDoc =
      documents.find((d) => d.id === activeDocId) ||
      sharedDocuments.find((d) => d.id === activeDocId);

    const handle = subscribeToDocumentCollaboration({
      docId: activeDocId,
      userId: user.id,
      username: user.username || user.fullName || 'estudiante',
      fullName: user.fullName || 'Estudiante',
      initialPage: currentDoc?.currentPage || 1,
      onNoteUpsert: (incomingNote) => {
        setNotes((prev) => {
          const exists = prev.some((n) => n.id === incomingNote.id);
          if (exists) {
            return prev.map((n) => (n.id === incomingNote.id ? incomingNote : n));
          }
          return [...prev, incomingNote];
        });
        void dbPut('notes', incomingNote);
      },
      onNoteDelete: (deletedNoteId) => {
        setNotes((prev) => prev.filter((n) => n.id !== deletedNoteId));
        void dbDelete('notes', deletedNoteId);
      },
      onPresenceChange: (peers) => {
        setCollaboratorsPresence(peers);
      },
    });

    collabHandleRef.current = handle;

    return () => {
      handle.unsubscribe();
      if (collabHandleRef.current === handle) {
        collabHandleRef.current = null;
      }
    };
  }, [user?.id, user?.username, user?.fullName, activeDocId]);

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
        sharedDocuments={sharedDocuments}
        collaboratorsPresence={collaboratorsPresence}
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
        onOpenFriendsModal={() => setFriendsModalOpen(true)}
        onShareDocument={(doc) => setShareDocTarget(doc)}
        notificationsSlot={
          <NotificationsBell
            currentUserId={user?.id || null}
            friendships={friendships}
            incomingShares={incomingShares}
            folders={folders}
            onAcceptFriend={handleAcceptFriend}
            onRejectFriend={handleRejectOrRemoveFriend}
            onAcceptCopyShare={handleAcceptCopyShare}
            onAcceptCollaborativeShare={handleAcceptCollaborativeShare}
            onDismissShare={handleDismissOrLeaveShare}
            onOpenFriendsModal={() => setFriendsModalOpen(true)}
          />
        }
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
        sidebarOpen={sidebarOpen}
        onSetSidebarOpen={setSidebarOpen}
        onOpenTutorial={() => setTutorialOpen(true)}
        forcePomodoroSessionKey={forcePomodoroSessionKey}
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
        onUpdateUsername={handleUpdateUsername}
        onSignOut={handleSignOut}
        onSyncNow={() =>
          user ? hydrateFromCloud(user) : Promise.resolve()
        }
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      <UsernameOnboardingModal
        open={Boolean(
          user && profileLoadedFromCloud && !user.username && !usernamePromptDismissed
        )}
        fullName={user?.fullName || ''}
        onSaveUsername={handleUpdateUsername}
        onDismiss={() => setUsernamePromptDismissed(true)}
      />

      <FriendsAndSharesModal
        open={friendsModalOpen}
        user={user}
        friendships={friendships}
        incomingShares={incomingShares}
        folders={folders}
        onClose={() => setFriendsModalOpen(false)}
        onSendFriendRequest={handleSendFriendRequest}
        onAcceptFriend={handleAcceptFriend}
        onRejectOrRemoveFriend={handleRejectOrRemoveFriend}
        onAcceptCopyShare={handleAcceptCopyShare}
        onAcceptCollaborativeShare={handleAcceptCollaborativeShare}
        onOpenSharedDocument={(docId) => void handleOpenDocument(docId)}
        onDismissOrLeaveShare={handleDismissOrLeaveShare}
      />

      <ShareDocumentModal
        open={Boolean(shareDocTarget)}
        doc={shareDocTarget}
        user={user}
        friendships={friendships}
        onClose={() => setShareDocTarget(null)}
        onOpenFriendsModal={() => setFriendsModalOpen(true)}
        onNotify={notify}
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

      <AuthWelcomeModal
        open={authWelcomeOpen}
        onOpenSignIn={handleOpenSignInFromWelcome}
        onDismiss={handleDismissAuthWelcome}
      />

      <TutorialOverlay
        open={tutorialOpen}
        onClose={handleCloseTutorial}
        onNavigateModule={setCurrentModule}
        onEnsureSidebarOpen={handleEnsureSidebarOpen}
        onEnsurePomodoroSession={handleEnsurePomodoroSession}
      />

      <ToastContainer toasts={toasts} />
    </TimerProvider>
  );
};

export default App;

