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

export type StudyPresetId =
  | 'classic'
  | 'deep'
  | 'compact'
  | 'marathon'
  | 'pages'
  | 'custom';

export interface StudySettings {
  presetId: StudyPresetId;
  intervalMode: CycleIntervalMode;
  studyMinutes: number;
  pagesPerBlock: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEveryNBlocks: number;
  longBreakBetweenDocs: boolean;
  speedMinPerPage: number;
  resumeFromCurrentPage: boolean;
  audioEnabled: boolean;
}

export interface StudyMethodPreset {
  id: Exclude<StudyPresetId, 'custom'>;
  name: string;
  subtitle: string;
  badge: string;
  config: Partial<StudySettings>;
}

export type RouteStepType = 'study' | 'short_break' | 'long_break';

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

export interface PersistedPlanState {
  deadline: string;
  selectedDocIds: string[];
  orderedDocIds: string[];
  completedStepIds: string[];
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

