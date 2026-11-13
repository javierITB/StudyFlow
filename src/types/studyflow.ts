export type DocumentType = 'pdf' | 'docx' | 'pptx';

export type FolderColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple';

export interface FolderRecord {
  id: string;
  name: string;
  color: FolderColor;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  folderId: string | null;
  name: string;
  fileType: DocumentType;
  size: number;
  pageCount: number;
  currentPage: number;
  uploadDate: string;
  storagePath?: string | null;
  data?: ArrayBuffer;
  deadline?: string | null;
  ownerId?: string;
  ownerUsername?: string | null;
  sharedRole?: 'owner' | 'collaborator' | 'viewer';
  shareId?: string;
}

export type NoteColor = 'yellow' | 'cyan' | 'green' | 'lavender';

export type KanbanZone = 'ideas' | 'preguntas' | 'resumen' | 'tareas';

export type NoteFormat = 'standard' | 'cornell';

export type FsrsRating = 'again' | 'hard' | 'good' | 'easy';

export type FsrsCardLifecycle = 'new' | 'learning' | 'review' | 'relearning';

export interface FsrsCardState {
  state: FsrsCardLifecycle;
  dueAt: string;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastReviewAt?: string;
}

export interface StickyNoteRecord {
  id: string;
  docId: string | null;
  page: number | null;
  xRatio: number | null;
  yRatio: number | null;
  content: string;
  color: NoteColor;
  zone: KanbanZone;
  createdAt: string;
  userId?: string;
  authorUsername?: string | null;
  isShared?: boolean;
  format?: NoteFormat;
  cornellCues?: string;
  cornellSummary?: string;
  isComplex?: boolean;
  feynmanSimpleExplanation?: string;
  feynmanGaps?: string;
  feynmanCompletedAt?: string;
  fsrs?: FsrsCardState;
}

export interface DocumentOcclusionRecord {
  id: string;
  docId: string;
  page: number;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  label?: string;
  fsrs?: FsrsCardState;
  createdAt: string;
  userId?: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  docId: string | null;
  folderId: string | null;
  completed: boolean;
  createdAt: string;
}

export type CycleIntervalMode = 'time' | 'pages';

export type BlockAllocationMode = 'pack' | 'exact_doc' | 'full_block';

export type StudyStrategyId =
  | 'pomodoro'
  | 'flowtime'
  | 'ultradian_90_20'
  | 'ultradian_52_17'
  | 'strict_timeboxing'
  | 'interleaving'
  | 'sq3r';

export type SynthesisMethodId =
  | 'standard_notes'
  | 'cornell'
  | 'fsrs_occlusion'
  | 'feynman'
  | 'sq3r';

export type StudyPresetId =
  | 'classic'
  | 'deep'
  | 'compact'
  | 'marathon'
  | 'pages'
  | 'flowtime'
  | 'ultradian_90_20'
  | 'ultradian_52_17'
  | 'strict_timeboxing'
  | 'interleaving'
  | 'sq3r'
  | 'custom';

export type ThemePresetId =
  | 'midnight'
  | 'obsidian'
  | 'nordic'
  | 'forest'
  | 'espresso'
  | 'rose_night'
  | 'crimson_night'
  | 'paper_light'
  | 'rose_light';

export type AccentColorId =
  | 'indigo'
  | 'violet'
  | 'emerald'
  | 'sky'
  | 'amber'
  | 'rose'
  | 'pink'
  | 'crimson'
  | 'custom';

export type WallpaperId =
  | 'solid'
  | 'mesh_accent'
  | 'botanical'
  | 'rose_bloom'
  | 'crimson_dusk'
  | 'ocean_grid'
  | 'dots_studio'
  | 'custom_image';

export type PaperToneId = 'pure' | 'warm' | 'soft_gray';

export type FontChoiceId = 'inter' | 'serif' | 'mono';

export type UiRadiusId = 'modern' | 'sharp' | 'soft';

export type UiScaleId = 'compact' | 'normal' | 'comfortable';

export type LayoutStyleId = 'islands' | 'classic';

export interface AppearanceSettings {
  themeId: ThemePresetId;
  accentId: AccentColorId;
  customAccentHex?: string;
  wallpaperId?: WallpaperId;
  customWallpaperDataUrl?: string;
  wallpaperDim?: number;
  paperTone: PaperToneId;
  fontFamily: FontChoiceId;
  uiRadius: UiRadiusId;
  uiScale: UiScaleId;
  layoutStyle?: LayoutStyleId;
}

export interface StudySettings {
  presetId: StudyPresetId;
  activeStrategy?: StudyStrategyId;
  preferredSynthesis?: SynthesisMethodId;
  defaultNoteFormat?: NoteFormat;
  intervalMode: CycleIntervalMode;
  blockAllocationMode: BlockAllocationMode;
  studyMinutes: number;
  pagesPerBlock: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEveryNBlocks: number;
  longBreakBetweenDocs: boolean;
  speedMinPerPage: number;
  resumeFromCurrentPage: boolean;
  audioEnabled: boolean;
  appearance?: AppearanceSettings;
}

export interface StudyMethodPreset {
  id: Exclude<StudyPresetId, 'custom'>;
  strategyId?: StudyStrategyId;
  name: string;
  subtitle: string;
  badge: string;
  config: Partial<StudySettings>;
}

export interface StrategyDescriptor {
  id: StudyStrategyId;
  presetId: Exclude<StudyPresetId, 'custom'>;
  name: string;
  shortName: string;
  category: 'timing' | 'retention' | 'guided';
  tagline: string;
  badge: string;
  idealFor: string[];
  recommendedSynthesis: SynthesisMethodId;
  defaultNoteFormat: NoteFormat;
  usesCountdown: boolean;
  enablesSq3r: boolean;
  isStrictTimebox: boolean;
  isInterleaving: boolean;
  defaultConfig: Partial<StudySettings>;
}

export type RouteStepType = 'study' | 'short_break' | 'long_break';

export type RouteStepStatus = 'pending' | 'completed' | 'overdue';

export interface RouteSegment {
  docId: string;
  docName: string;
  folderName?: string;
  startPage: number;
  endPage: number;
  pageCount: number;
  estimatedMinutes: number;
}

export interface RouteStep {
  id: string;
  order: number;
  dayNumber: number;
  dayLabel: string;
  type: RouteStepType;
  docId: string | null;
  docName: string;
  nextDocName?: string;
  folderName?: string;
  startPage?: number;
  endPage?: number;
  pageCount?: number;
  segments?: RouteSegment[];
  durationMinutes: number;
  completed: boolean;
  status?: RouteStepStatus;
  overduePagesRemaining?: number;
}

export type FeasibilityStatus =
  | 'no_material'
  | 'expired'
  | 'critical'
  | 'tight'
  | 'optimal';

export interface StudyPlanResult {
  steps: RouteStep[];
  totalPages: number;
  totalStudyBlocks: number;
  totalStudyMinutes: number;
  totalBreakMinutes: number;
  totalMinutes: number;
  hoursUntilDeadline: number;
  daysAvailable: number;
  blocksPerDay: number;
  minutesPerDay: number;
  feasibility: FeasibilityStatus;
  recommendation: string;
}

export type DiagnosticCriterion = 'balanced' | 'average' | 'max';

export type DifficultyLevel = 'agile' | 'standard' | 'dense' | 'extreme';

export type FocusPatternId = 'short_bursts' | 'flow_uninterrupted' | 'deep_immersion';

export type PrimaryStudyGoalId =
  | 'comprehension'
  | 'retention'
  | 'volume_deadline'
  | 'multi_subject';

export type TimePressureToleranceId = 'strict_goals' | 'flexible_pace';

export type ReviewPreferenceId = 'structured_cornell' | 'active_recall' | 'guided_sq3r';

export interface LearnerProfile {
  focusPattern: FocusPatternId;
  primaryGoal: PrimaryStudyGoalId;
  timePressureTolerance: TimePressureToleranceId;
  reviewPreference: ReviewPreferenceId;
}

export interface PageReadingSample {
  docId: string;
  docName: string;
  fileType: DocumentType;
  page: number;
  activeSeconds: number;
  updatedAt: string;
}

export interface DiagnosticData {
  isActive: boolean;
  criterion: DiagnosticCriterion;
  samples: PageReadingSample[];
  learnerProfile?: LearnerProfile;
  lastAppliedAt?: string;
}

export interface DiagnosticStats {
  sampleCount: number;
  totalSeconds: number;
  minSeconds: number;
  maxSeconds: number;
  meanSeconds: number;
  medianSeconds: number;
  p75Seconds: number;
}

export interface StrategyMatchSuggestion {
  strategyId: StudyStrategyId;
  title: string;
  compatibilityScore: number;
  recommendedSynthesis: SynthesisMethodId;
  synthesisLabel: string;
  whyItFits: string;
  suggestedSettings: Partial<StudySettings>;
}

export interface DiagnosticRecommendation {
  stats: DiagnosticStats;
  criterion: DiagnosticCriterion;
  confidence: 'insufficient' | 'preliminary' | 'calibrated' | 'high';
  difficulty: DifficultyLevel;
  difficultyLabel: string;
  rationale: string;
  effectiveSecondsPerPage: number;
  recommendedSettings: Pick<
    StudySettings,
    | 'studyMinutes'
    | 'shortBreakMinutes'
    | 'longBreakMinutes'
    | 'longBreakEveryNBlocks'
    | 'speedMinPerPage'
    | 'pagesPerBlock'
  >;
  strategyMatches?: StrategyMatchSuggestion[];
}

export type Sq3rStage = 'survey' | 'question' | 'read' | 'recite' | 'review';

export interface Sq3rDocumentState {
  docId: string;
  stage: Sq3rStage;
  surveyMinutesTarget: number;
  surveyCompletedAt?: string;
  questions: string[];
  reciteText: string;
  updatedAt: string;
}

export interface CalibrationSessionMetric {
  id: string;
  strategyId: StudyStrategyId;
  strategyName: string;
  realStudySeconds: number;
  breakSeconds: number;
  pagesAdvanced: number;
  notesAndOcclusionsCreated: number;
  effectivePagesPerMin: number;
  synthesisPerHour: number;
  fatigueRating: 1 | 2 | 3 | 4 | 5;
  completedAt: string;
}

export interface CalibrationTourState {
  isActive: boolean;
  sequence: StudyStrategyId[];
  currentIndex: number;
  sessions: CalibrationSessionMetric[];
  startedAt: string;
  completedAt?: string;
  recommendedWinner?: StudyStrategyId;
}

export interface PersistedPlanState {
  deadline: string;
  selectedDocIds: string[];
  orderedDocIds: string[];
  completedStepIds: string[];
  overdueStepIds?: string[];
  diagnostic?: DiagnosticData;
  sq3rStates?: Record<string, Sq3rDocumentState>;
  calibrationTour?: CalibrationTourState | null;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  username: string | null;
}

export interface PublicProfile {
  id: string;
  username: string | null;
  fullName: string;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface FriendshipRecord {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
  peer?: PublicProfile;
}

export type ShareMode = 'copy' | 'collaborative';
export type ShareRole = 'viewer' | 'collaborator';
export type ShareStatus = 'pending' | 'accepted' | 'revoked';

export interface DocumentShareRecord {
  id: string;
  docId: string;
  ownerId: string;
  recipientId: string;
  shareMode: ShareMode;
  includeNotes: boolean;
  role: ShareRole;
  status: ShareStatus;
  createdAt: string;
  updatedAt: string;
  docName?: string;
  fileType?: DocumentType;
  pageCount?: number;
  storagePath?: string | null;
  size?: number;
  ownerProfile?: PublicProfile;
  recipientProfile?: PublicProfile;
}

export interface ShareLinkRecord {
  id: string;
  token: string;
  docId: string;
  ownerId: string;
  shareMode: ShareMode;
  includeNotes: boolean;
  role: ShareRole;
  revoked: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface RedeemedShareLinkResult {
  shareId: string;
  docId: string;
  docName: string;
  fileType: DocumentType;
  size: number;
  pageCount: number;
  storagePath: string | null;
  ownerId: string;
  ownerUsername: string | null;
  shareMode: ShareMode;
  includeNotes: boolean;
  role: ShareRole;
  status: ShareStatus;
}

export interface CollaboratorPresence {
  userId: string;
  username: string;
  fullName: string;
  page: number;
  onlineAt: string;
}


