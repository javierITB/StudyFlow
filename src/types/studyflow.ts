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
}

export type NoteColor = 'yellow' | 'cyan' | 'green' | 'lavender';

export type KanbanZone = 'ideas' | 'preguntas' | 'resumen' | 'tareas';

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

export type StudyPresetId =
  | 'classic'
  | 'deep'
  | 'compact'
  | 'marathon'
  | 'pages'
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
}

export interface StudySettings {
  presetId: StudyPresetId;
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
  name: string;
  subtitle: string;
  badge: string;
  config: Partial<StudySettings>;
}

export type RouteStepType = 'study' | 'short_break' | 'long_break';

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
}

export interface PersistedPlanState {
  deadline: string;
  selectedDocIds: string[];
  orderedDocIds: string[];
  completedStepIds: string[];
  diagnostic?: DiagnosticData;
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
}

