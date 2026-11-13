import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppearanceSettings,
  CalibrationTourState,
  CollaboratorPresence,
  DiagnosticCriterion,
  DiagnosticData,
  DiagnosticRecommendation,
  DocumentOcclusionRecord,
  DocumentRecord,
  DocumentShareRecord,
  DocumentType,
  FolderColor,
  FolderRecord,
  FriendshipRecord,
  LearnerProfile,
  PersistedPlanState,
  RouteSegment,
  RouteStep,
  Sq3rDocumentState,
  StickyNoteRecord,
  StrategyMatchSuggestion,
  StudyPlanResult,
  StudySettings,
  StudyStrategyId,
  TaskRecord,
  ToastItem,
  UserProfile,
} from './types/studyflow';
import {
  DEFAULT_STUDY_SETTINGS,
  applyStrategyToSettings,
  getStrategyDescriptor,
} from './lib/studyMethods';
import {
  DEFAULT_APPEARANCE,
  applyAppearanceToDocument,
  resolveAppearance,
} from './lib/themes';
import {
  DEFAULT_LEARNER_PROFILE,
  mergeReadingSample,
} from './lib/diagnosticEngine';
import {
  advanceCalibrationTour,
  buildCalibrationSessionMetric,
  createCalibrationTour,
} from './lib/calibration';
import { formatErrorMessageEs } from './lib/errorMessages';
import {
  generateStudyRoute,
  getDefaultDeadlineLocalString,
  redistributeStrictTimeboxSteps,
} from './lib/routePlanner';
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
  cloudDeleteOcclusion,
  cloudDeleteTask,
  cloudSavePlanState,
  cloudSaveStudySettings,
  cloudUpsertDocument,
  cloudUpsertFolder,
  cloudUpsertNote,
  cloudUpsertOcclusion,
  cloudUpsertTask,
  downloadDocumentBinaryFromCloud,
  fetchCloudSnapshot,
  uploadDocumentBinaryToCloud,
} from './lib/cloudSync';
import {
  StudyBlockTelemetry,
  TimerProvider,
  useTimer,
} from './context/TimerContext';
import { AppModule, Navbar } from './components/Navbar';
import { DocumentSidebar } from './components/DocumentSidebar';
import { DocumentViewer } from './components/DocumentViewer';
import { PomodoroAndPlanner } from './components/PomodoroAndPlanner';
import { KanbanBoard } from './components/KanbanBoard';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer } from './components/ToastContainer';
import { AccountModal } from './components/AccountModal';
import { DiagnosticModal } from './components/DiagnosticModal';
import { FeynmanModal } from './components/FeynmanModal';
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
  occlusions: DocumentOcclusionRecord[];
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
  onCreateOcclusion: (
    occ: Omit<DocumentOcclusionRecord, 'id' | 'createdAt'>
  ) => Promise<void>;
  onUpdateOcclusion: (
    id: string,
    patch: Partial<DocumentOcclusionRecord>
  ) => Promise<void>;
  onDeleteOcclusion: (id: string) => Promise<void>;
  onUpdateSq3rState: (next: Sq3rDocumentState) => void;
  boardFilterDocId: string | null;
  onOpenBoardForDoc: (docId: string) => void;
  onOpenFeynman: (
    note: StickyNoteRecord,
    sourceImage?: string | null,
    sourceText?: string | null
  ) => void;
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
  onSelectStrategy: (strategyId: StudyStrategyId) => Promise<void>;
  onUpdatePlanState: (patch: Partial<PersistedPlanState>) => Promise<void>;
  onUpdateDocDeadline: (docId: string, deadline: string | null) => Promise<void>;
  calibrationTour: CalibrationTourState | null;
  onStartCalibrationTour: (sequence?: StudyStrategyId[]) => void;
  onCancelCalibrationTour: () => void;
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
  occlusions,
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
  onCreateOcclusion,
  onUpdateOcclusion,
  onDeleteOcclusion,
  onUpdateSq3rState,
  boardFilterDocId,
  onOpenBoardForDoc,
  onOpenFeynman,
  onOpenNoteLocation,
  diagnosticData,
  onToggleDiagnostic,
  onRecordDiagnosticSample,
  onOpenDiagnosticModal,
  onStartDiagnosticInViewer,
  onUpdateSettings,
  onSelectStrategy,
  onUpdatePlanState,
  onUpdateDocDeadline,
  calibrationTour,
  onStartCalibrationTour,
  onCancelCalibrationTour,
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

  const layoutStyle = studySettings.appearance?.layoutStyle || 'islands';

  return (
    <div className="h-[100dvh] flex overflow-hidden bg-slate-950 text-slate-100 relative">
      {currentModule === 'docs' && (
        <>
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px] z-40 lg:hidden"
              onClick={() => onSetSidebarOpen(false)}
            />
          )}
          <div
            className={
              sidebarOpen
                ? 'fixed inset-y-0 left-0 z-50 w-80 sm:w-[21rem] max-w-[88vw] shadow-2xl lg:static lg:z-auto lg:w-72 xl:w-80 2xl:w-96 lg:shadow-none flex-shrink-0 h-full transition-all duration-200'
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
              user={user}
              onOpenAccountModal={onOpenAccountModal}
            />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative sf-env-canvas">
        <Navbar
          currentModule={currentModule}
          onSwitchModule={setCurrentModule}
          settings={studySettings}
          onSelectStrategy={onSelectStrategy}
          onOpenDiagnosticModal={onOpenDiagnosticModal}
          onToggleAudio={() => void onToggleAudio()}
          user={user}
          syncStatus={syncStatus}
          onOpenAccountModal={onOpenAccountModal}
          onOpenFriendsModal={onOpenFriendsModal}
          onOpenAppearanceModal={onOpenAppearanceModal}
          onOpenTutorial={onOpenTutorial}
          notificationsSlot={notificationsSlot}
          hideBrandOnDesktop={currentModule === 'docs' && sidebarOpen}
          layoutStyle={layoutStyle}
          showOpenSidebarButton={currentModule === 'docs' && !sidebarOpen}
          onOpenSidebar={() => onSetSidebarOpen(true)}
        />

        <main className="flex-1 overflow-hidden relative">
          {currentModule === 'docs' && (
            <div className="h-full flex overflow-hidden relative">
              <DocumentViewer
                activeDoc={activeDoc}
                documentBuffer={activeBuffer}
                isLoadingBuffer={isLoadingBuffer}
                notes={notes}
                occlusions={occlusions}
                studySettings={studySettings}
                planResult={planResult}
                diagnosticData={diagnosticData}
                sq3rState={
                  activeDoc && planState.sq3rStates
                    ? planState.sq3rStates[activeDoc.id] || null
                    : null
                }
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
                onCreateOcclusion={onCreateOcclusion}
                onUpdateOcclusion={onUpdateOcclusion}
                onDeleteOcclusion={onDeleteOcclusion}
                onUpdateSq3rState={onUpdateSq3rState}
                onOpenBoardForDoc={onOpenBoardForDoc}
                onOpenFeynman={onOpenFeynman}
                onNotify={onNotify}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={() => onSetSidebarOpen((v) => !v)}
                currentUserId={user?.id || null}
                currentUsername={user?.username || null}
                collaboratorsPresence={collaboratorsPresence}
                onShareDocument={user ? onShareDocument : undefined}
                layoutStyle={layoutStyle}
              />
            </div>
          )}

        {currentModule === 'pomodoro' && (
          <div
            className={`h-full overflow-hidden ${
              layoutStyle === 'islands' ? 'pt-14 sm:pt-16' : ''
            }`}
          >
            <PomodoroAndPlanner
              folders={folders}
              documents={documents}
              tasks={tasks}
              settings={studySettings}
              planState={planState}
              planResult={planResult}
              diagnosticData={diagnosticData}
              calibrationTour={calibrationTour}
              onStartDiagnosticInViewer={onStartDiagnosticInViewer}
              onOpenDiagnosticModal={onOpenDiagnosticModal}
              onUpdateSettings={onUpdateSettings}
              onSelectStrategy={onSelectStrategy}
              onUpdatePlanState={onUpdatePlanState}
              onUpdateDocDeadline={onUpdateDocDeadline}
              onStartCalibrationTour={onStartCalibrationTour}
              onCancelCalibrationTour={onCancelCalibrationTour}
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
          </div>
        )}

        {currentModule === 'board' && (
          <div
            className={`h-full overflow-hidden ${
              layoutStyle === 'islands' ? 'pt-14 sm:pt-16' : ''
            }`}
          >
            <KanbanBoard
              folders={folders}
              documents={documents}
              notes={notes}
              occlusions={occlusions}
              defaultNoteFormat={studySettings.defaultNoteFormat || 'standard'}
              initialDocFilter={boardFilterDocId}
              onCreateNote={onCreateNote}
              onUpdateNote={onUpdateNote}
              onDeleteNote={onDeleteNote}
              onUpdateOcclusion={onUpdateOcclusion}
              onOpenNoteLocation={onOpenNoteLocation}
              onOpenFeynman={(note) => onOpenFeynman(note)}
              onNotify={onNotify}
            />
          </div>
        )}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<AppModule>('docs');
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [notes, setNotes] = useState<StickyNoteRecord[]>([]);
  const [occlusions, setOcclusions] = useState<DocumentOcclusionRecord[]>([]);
  const [boardFilterDocId, setBoardFilterDocId] = useState<string | null>(null);
  const [feynmanTarget, setFeynmanTarget] = useState<{
    note: StickyNoteRecord;
    sourceImage: string | null;
    sourceText: string | null;
  } | null>(null);
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
  const [overdueStepAdjustments, setOverdueStepAdjustments] = useState<
    Record<string, { reachedPage: number }>
  >({});
  const [calibrationSurveyTelemetry, setCalibrationSurveyTelemetry] =
    useState<StudyBlockTelemetry | null>(null);
  const sessionStartSnapshotRef = useRef<{
    pagesByDoc: Record<string, number>;
    notesCount: number;
    occlusionsCount: number;
  }>({
    pagesByDoc: {},
    notesCount: 0,
    occlusionsCount: 0,
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
    setOcclusions(snap.occlusions || []);
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
        setOcclusions(cloud.occlusions || []);
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
          ...cloud.occlusions.map((o) => dbPut('occlusions', o)),
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

  const handleCreateOcclusion = useCallback(
    async (occ: Omit<DocumentOcclusionRecord, 'id' | 'createdAt'>) => {
      const record: DocumentOcclusionRecord = {
        ...occ,
        id: `occ_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        userId: user?.id,
      };
      setOcclusions((prev) => [...prev, record]);
      await dbPut('occlusions', record);
      void runCloudMutation((uid) => cloudUpsertOcclusion(uid, record));
    },
    [user?.id, runCloudMutation]
  );

  const handleUpdateOcclusion = useCallback(
    async (occlusionId: string, patch: Partial<DocumentOcclusionRecord>) => {
      let nextOcc: DocumentOcclusionRecord | null = null;
      setOcclusions((prev) =>
        prev.map((o) => {
          if (o.id !== occlusionId) return o;
          nextOcc = { ...o, ...patch };
          return nextOcc;
        })
      );
      const existing = await dbGet<DocumentOcclusionRecord>('occlusions', occlusionId);
      const merged = nextOcc || (existing ? { ...existing, ...patch } : null);
      if (merged) {
        await dbPut('occlusions', merged);
        void runCloudMutation((uid) => cloudUpsertOcclusion(uid, merged));
      }
    },
    [runCloudMutation]
  );

  const handleDeleteOcclusion = useCallback(
    async (occlusionId: string) => {
      await dbDelete('occlusions', occlusionId);
      setOcclusions((prev) => prev.filter((o) => o.id !== occlusionId));
      void runCloudMutation((uid) => cloudDeleteOcclusion(uid, occlusionId));
    },
    [runCloudMutation]
  );

  const handleUpdateDocDeadline = useCallback(
    async (docId: string, deadline: string | null) => {
      let updatedDoc: DocumentRecord | null = null;
      setDocuments((prev) =>
        prev.map((d) => {
          if (d.id !== docId) return d;
          updatedDoc = { ...d, deadline };
          return updatedDoc;
        })
      );
      const existing = await dbGet<DocumentRecord>('documents', docId);
      const merged = updatedDoc || (existing ? { ...existing, deadline } : null);
      if (merged) {
        await dbPut('documents', merged);
        void runCloudMutation((uid) => cloudUpsertDocument(uid, merged));
      }
    },
    [runCloudMutation]
  );

  const handleUpdateSq3rState = useCallback(
    (nextSq3r: Sq3rDocumentState) => {
      setPlanState((prev) => {
        const updated: PersistedPlanState = {
          ...prev,
          sq3rStates: {
            ...(prev.sq3rStates || {}),
            [nextSq3r.docId]: nextSq3r,
          },
        };
        void setSetting('planState', updated);
        void runCloudMutation((uid) => cloudSavePlanState(uid, updated));
        return updated;
      });
    },
    [runCloudMutation]
  );

  const handleOpenBoardForDoc = useCallback((docId: string) => {
    setBoardFilterDocId(docId);
    setCurrentModule('board');
  }, []);

  const handleOpenFeynman = useCallback(
    (
      note: StickyNoteRecord,
      sourceImage: string | null = null,
      sourceText: string | null = null
    ) => {
      setFeynmanTarget({ note, sourceImage, sourceText });
    },
    []
  );

  const handleUpdateSettings = useCallback(
    async (next: StudySettings) => {
      setStudySettings(next);
      await setSetting('studySettings', next);
      void runCloudMutation((uid) => cloudSaveStudySettings(uid, next));
    },
    [runCloudMutation]
  );

  const captureSessionStartSnapshot = useCallback(() => {
    const pagesByDoc: Record<string, number> = {};
    documents.forEach((d) => {
      pagesByDoc[d.id] = d.currentPage || 1;
    });
    sessionStartSnapshotRef.current = {
      pagesByDoc,
      notesCount: notes.length,
      occlusionsCount: occlusions.length,
    };
  }, [documents, notes.length, occlusions.length]);

  const handleSelectStrategy = useCallback(
    async (strategyId: StudyStrategyId) => {
      captureSessionStartSnapshot();
      const next = applyStrategyToSettings(studySettings, strategyId);
      await handleUpdateSettings(next);
      const desc = getStrategyDescriptor(strategyId);
      notify(`Estrategia activa: ${desc.name}`, 'success');
    },
    [studySettings, handleUpdateSettings, captureSessionStartSnapshot, notify]
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

  const basePlanResult = useMemo(
    () =>
      generateStudyRoute({
        documents: orderedSelectedDocs,
        folders,
        settings: studySettings,
        deadline: planState.deadline,
        completedStepIds: planState.completedStepIds,
        overdueStepIds: planState.overdueStepIds,
      }),
    [
      orderedSelectedDocs,
      folders,
      studySettings,
      planState.deadline,
      planState.completedStepIds,
      planState.overdueStepIds,
    ]
  );

  const planResult = useMemo<StudyPlanResult>(() => {
    const entries = Object.entries(overdueStepAdjustments);
    if (entries.length === 0) return basePlanResult;
    let adjustedSteps = basePlanResult.steps;
    for (const [stepId, info] of entries) {
      adjustedSteps = redistributeStrictTimeboxSteps(
        adjustedSteps,
        stepId,
        info.reachedPage,
        studySettings.speedMinPerPage
      );
    }
    return {
      ...basePlanResult,
      steps: adjustedSteps,
    };
  }, [basePlanResult, overdueStepAdjustments, studySettings.speedMinPerPage]);

  const handleStrictBlockOverdue = useCallback(
    (step: RouteStep, reachedPage: number) => {
      setOverdueStepAdjustments((prev) => ({
        ...prev,
        [step.id]: { reachedPage },
      }));
      setPlanState((prev) => {
        const nextOverdue = Array.from(
          new Set([...(prev.overdueStepIds || []), step.id])
        );
        const updated: PersistedPlanState = {
          ...prev,
          overdueStepIds: nextOverdue,
        };
        void setSetting('planState', updated);
        void runCloudMutation((uid) => cloudSavePlanState(uid, updated));
        return updated;
      });
    },
    [runCloudMutation]
  );

  const getDocCurrentPage = useCallback(
    (docId: string): number => {
      const found =
        documents.find((d) => d.id === docId) ||
        sharedDocuments.find((d) => d.id === docId);
      return found?.currentPage || 1;
    },
    [documents, sharedDocuments]
  );

  const handleFlowtimeCompleted = useCallback(
    (realStudySeconds: number, docId: string | null) => {
      const snap = sessionStartSnapshotRef.current;
      let pagesAdvanced = 0;
      if (docId) {
        const current = getDocCurrentPage(docId);
        const startedAt = snap.pagesByDoc[docId] ?? current;
        pagesAdvanced = Math.max(0, current - startedAt);
      }
      if (pagesAdvanced >= 1 && realStudySeconds >= 60) {
        const realMinPerPage = Number(
          Math.max(0.5, Math.min(30, realStudySeconds / 60 / pagesAdvanced)).toFixed(1)
        );
        void handleUpdateSettings({
          ...studySettings,
          speedMinPerPage: realMinPerPage,
        });
      }
    },
    [getDocCurrentPage, studySettings, handleUpdateSettings]
  );

  const handleStartCalibrationTour = useCallback(
    (sequence?: StudyStrategyId[]) => {
      const tour = createCalibrationTour(sequence);
      const firstStrategy = tour.sequence[0];
      const nextSettings = applyStrategyToSettings(studySettings, firstStrategy);
      void handleUpdateSettings(nextSettings);
      captureSessionStartSnapshot();
      setPlanState((prev) => {
        const updated: PersistedPlanState = { ...prev, calibrationTour: tour };
        void setSetting('planState', updated);
        void runCloudMutation((uid) => cloudSavePlanState(uid, updated));
        return updated;
      });
      setDiagnosticModalOpen(false);
      setCurrentModule('pomodoro');
      notify(
        `Calibración A/B iniciada (${tour.sequence.length} sesiones). Empezando con ${getStrategyDescriptor(firstStrategy).shortName}.`,
        'success'
      );
    },
    [studySettings, handleUpdateSettings, captureSessionStartSnapshot, runCloudMutation, notify]
  );

  const handleCancelCalibrationTour = useCallback(() => {
    setCalibrationSurveyTelemetry(null);
    setPlanState((prev) => {
      const updated: PersistedPlanState = { ...prev, calibrationTour: null };
      void setSetting('planState', updated);
      void runCloudMutation((uid) => cloudSavePlanState(uid, updated));
      return updated;
    });
    notify('Recorrido de Calibración A/B cancelado', 'info');
  }, [runCloudMutation, notify]);

  const handleBreakCompleted = useCallback(
    (telemetry: StudyBlockTelemetry) => {
      if (planState.calibrationTour?.isActive && telemetry.realStudySeconds >= 30) {
        setCalibrationSurveyTelemetry(telemetry);
      }
    },
    [planState.calibrationTour]
  );

  const handleSubmitCalibrationFatigue = useCallback(
    (fatigueRating: 1 | 2 | 3 | 4 | 5) => {
      const telemetry = calibrationSurveyTelemetry;
      const tour = planState.calibrationTour;
      setCalibrationSurveyTelemetry(null);
      if (!telemetry || !tour || !tour.isActive) return;

      const snap = sessionStartSnapshotRef.current;
      let pagesAdvanced = 0;
      documents.forEach((d) => {
        const before = snap.pagesByDoc[d.id] ?? d.currentPage;
        if (d.currentPage > before) {
          pagesAdvanced += d.currentPage - before;
        }
      });
      if (pagesAdvanced === 0 && telemetry.step?.pageCount) {
        pagesAdvanced = telemetry.step.pageCount;
      }
      const notesDelta =
        Math.max(0, notes.length - snap.notesCount) +
        Math.max(0, occlusions.length - snap.occlusionsCount);

      const currentStrategy = tour.sequence[tour.currentIndex] || telemetry.strategyId;
      const metric = buildCalibrationSessionMetric({
        strategyId: currentStrategy,
        realStudySeconds: telemetry.realStudySeconds,
        breakSeconds: telemetry.breakSeconds,
        pagesAdvanced,
        notesAndOcclusionsCreated: notesDelta,
        fatigueRating,
      });

      const nextTour: CalibrationTourState = advanceCalibrationTour(tour, metric);
      setPlanState((prev) => {
        const updated: PersistedPlanState = { ...prev, calibrationTour: nextTour };
        void setSetting('planState', updated);
        void runCloudMutation((uid) => cloudSavePlanState(uid, updated));
        return updated;
      });

      if (nextTour.isActive) {
        const nextStrategy = nextTour.sequence[nextTour.currentIndex];
        const nextSettings = applyStrategyToSettings(studySettings, nextStrategy);
        void handleUpdateSettings(nextSettings);
        captureSessionStartSnapshot();
        notify(
          `Sesión registrada. Siguiente bloque de calibración: ${getStrategyDescriptor(nextStrategy).shortName}.`,
          'success'
        );
      } else if (nextTour.recommendedWinner) {
        notify(
          `Calibración completada: ${getStrategyDescriptor(nextTour.recommendedWinner).name} obtuvo el mejor equilibrio rendimiento/fatiga.`,
          'success'
        );
      }
    },
    [
      calibrationSurveyTelemetry,
      planState.calibrationTour,
      documents,
      notes.length,
      occlusions.length,
      studySettings,
      handleUpdateSettings,
      captureSessionStartSnapshot,
      runCloudMutation,
      notify,
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

  const handleChangeLearnerProfile = useCallback(
    (learnerProfile: LearnerProfile) => {
      updateDiagnosticData((prev) => ({ ...prev, learnerProfile }));
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

  const handleApplyStrategyMatch = useCallback(
    (match: StrategyMatchSuggestion, rec: DiagnosticRecommendation) => {
      captureSessionStartSnapshot();
      const baseApplied = applyStrategyToSettings(studySettings, match.strategyId);
      const nextSettings: StudySettings = {
        ...baseApplied,
        ...match.suggestedSettings,
        speedMinPerPage: rec.recommendedSettings.speedMinPerPage,
      };
      void handleUpdateSettings(nextSettings);
      updateDiagnosticData((prev) => ({
        ...prev,
        isActive: false,
        lastAppliedAt: new Date().toISOString(),
      }));
      setDiagnosticModalOpen(false);
      notify(
        `Sistema aplicado: ${match.title} + ${match.synthesisLabel}`,
        'success'
      );
    },
    [studySettings, handleUpdateSettings, updateDiagnosticData, captureSessionStartSnapshot, notify]
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
      getDocCurrentPage={getDocCurrentPage}
      onNotify={notify}
      onStepCompleted={handleTimerRouteStepCompleted}
      onStrictBlockOverdue={handleStrictBlockOverdue}
      onBreakCompleted={handleBreakCompleted}
      onFlowtimeCompleted={handleFlowtimeCompleted}
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
        occlusions={occlusions}
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
        onCreateOcclusion={handleCreateOcclusion}
        onUpdateOcclusion={handleUpdateOcclusion}
        onDeleteOcclusion={handleDeleteOcclusion}
        onUpdateSq3rState={handleUpdateSq3rState}
        boardFilterDocId={boardFilterDocId}
        onOpenBoardForDoc={handleOpenBoardForDoc}
        onOpenFeynman={handleOpenFeynman}
        onOpenNoteLocation={(docId, page, noteId) =>
          void handleOpenNoteLocation(docId, page, noteId)
        }
        diagnosticData={diagnosticData}
        onToggleDiagnostic={handleToggleDiagnostic}
        onRecordDiagnosticSample={handleRecordDiagnosticSample}
        onOpenDiagnosticModal={() => setDiagnosticModalOpen(true)}
        onStartDiagnosticInViewer={handleStartDiagnosticInViewer}
        onUpdateSettings={handleUpdateSettings}
        onSelectStrategy={handleSelectStrategy}
        onUpdatePlanState={handleUpdatePlanState}
        onUpdateDocDeadline={handleUpdateDocDeadline}
        calibrationTour={planState.calibrationTour || null}
        onStartCalibrationTour={handleStartCalibrationTour}
        onCancelCalibrationTour={handleCancelCalibrationTour}
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
        documents={orderedSelectedDocs.length > 0 ? orderedSelectedDocs : documents}
        hoursUntilDeadline={planResult.hoursUntilDeadline}
        samples={diagnosticData.samples}
        criterion={diagnosticData.criterion}
        learnerProfile={diagnosticData.learnerProfile || DEFAULT_LEARNER_PROFILE}
        onClose={() => setDiagnosticModalOpen(false)}
        onToggleDiagnostic={handleToggleDiagnostic}
        onChangeCriterion={handleChangeDiagnosticCriterion}
        onChangeLearnerProfile={handleChangeLearnerProfile}
        onRemoveSample={handleRemoveDiagnosticSample}
        onResetSamples={handleResetDiagnosticSamples}
        onApplyRecommendation={handleApplyDiagnosticProfile}
        onApplyStrategyMatch={handleApplyStrategyMatch}
        onStartCalibrationFromMatches={handleStartCalibrationTour}
      />

      <FeynmanModal
        open={Boolean(feynmanTarget)}
        note={feynmanTarget?.note || null}
        sourceDoc={
          feynmanTarget?.note.docId
            ? documents.find((d) => d.id === feynmanTarget.note.docId) ||
              sharedDocuments.find((d) => d.id === feynmanTarget.note.docId) ||
              null
            : null
        }
        sourcePageImage={feynmanTarget?.sourceImage || null}
        sourcePageText={feynmanTarget?.sourceText || null}
        onClose={() => setFeynmanTarget(null)}
        onSaveFeynman={handleUpdateNote}
        onAddReviewTask={handleAddTask}
        onNotify={notify}
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

      {/* Encuesta rápida de 1 clic al finalizar descanso en Calibración A/B */}
      {calibrationSurveyTelemetry && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs w-full bg-slate-900/95 backdrop-blur-xl border border-emerald-500/45 rounded-2xl p-3.5 shadow-2xl space-y-2.5 fade-in">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                Calibración A/B · Encuesta 1 clic
              </span>
              <h4 className="text-xs font-semibold text-white mt-0.5">
                ¿Qué nivel de fatiga sentiste con{' '}
                {getStrategyDescriptor(calibrationSurveyTelemetry.strategyId).shortName}?
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setCalibrationSurveyTelemetry(null)}
              className="text-slate-400 hover:text-white text-xs px-1"
              title="Omitir"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {([1, 2, 3, 4, 5] as const).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleSubmitCalibrationFatigue(rating)}
                className="py-1.5 rounded-xl bg-slate-950 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-400 text-xs font-mono font-bold text-white transition-colors"
                title={
                  rating === 1
                    ? '1 - Muy fresco'
                    : rating === 5
                      ? '5 - Agotado'
                      : `Nivel ${rating}`
                }
              >
                {rating}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
            <span>1 = Muy fresco</span>
            <span>5 = Fatiga alta</span>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </TimerProvider>
  );
};

export default App;

