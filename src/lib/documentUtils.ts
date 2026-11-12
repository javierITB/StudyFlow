import { DocumentType, FolderColor, KanbanZone } from '../types/studyflow';

export function detectDocumentType(fileName: string, mimeType = ''): DocumentType {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (
    lower.endsWith('.docx') ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (
    lower.endsWith('.pptx') ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'pptx';
  }
  if (lower.endsWith('.doc') || lower.endsWith('.ppt')) {
    throw new Error(
      `El archivo "${fileName}" usa un formato binario antiguo (.doc/.ppt). Exportalo o guardalo como .docx, .pptx o .pdf para abrirlo en el navegador.`
    );
  }
  throw new Error(
    `Formato no soportado para "${fileName}". Usa archivos .pdf, .docx o .pptx.`
  );
}

export async function extractDocumentPageCount(
  fileType: DocumentType,
  buffer: ArrayBuffer
): Promise<number> {
  if (fileType === 'pdf') {
    const { getPdfPageCount } = await import('./pdfParser');
    return getPdfPageCount(buffer);
  }
  if (fileType === 'docx') {
    const { parseDocxDocument } = await import('./docxParser');
    const parsed = await parseDocxDocument(buffer);
    return parsed.pageCount;
  }
  const { parsePptxDocument } = await import('./pptxParser');
  const parsedPptx = await parsePptxDocument(buffer);
  return parsedPptx.pageCount;
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getZoneTitle(zone: KanbanZone): string {
  switch (zone) {
    case 'ideas':
      return 'Ideas Clave';
    case 'preguntas':
      return 'Preguntas y Repaso';
    case 'resumen':
      return 'Resumen y Síntesis';
    case 'tareas':
      return 'Tareas y Acciones';
  }
}

export const FOLDER_COLOR_CLASSES: Record<
  FolderColor,
  {
    dot: string;
    badge: string;
    border: string;
    tabBg: string;
    headerBg: string;
    iconText: string;
    guideBorder: string;
  }
> = {
  indigo: {
    dot: 'bg-indigo-400',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    border: 'border-indigo-500/45',
    tabBg: 'bg-indigo-500/75',
    headerBg: 'bg-indigo-500/10',
    iconText: 'text-indigo-400',
    guideBorder: 'border-indigo-500/40',
  },
  emerald: {
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    border: 'border-emerald-500/40',
    tabBg: 'bg-emerald-500/70',
    headerBg: 'bg-emerald-950/30',
    iconText: 'text-emerald-400',
    guideBorder: 'border-emerald-500/35',
  },
  amber: {
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    border: 'border-amber-500/40',
    tabBg: 'bg-amber-500/70',
    headerBg: 'bg-amber-950/30',
    iconText: 'text-amber-400',
    guideBorder: 'border-amber-500/35',
  },
  rose: {
    dot: 'bg-rose-400',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    border: 'border-rose-500/40',
    tabBg: 'bg-rose-500/70',
    headerBg: 'bg-rose-950/30',
    iconText: 'text-rose-400',
    guideBorder: 'border-rose-500/35',
  },
  sky: {
    dot: 'bg-sky-400',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    border: 'border-sky-500/40',
    tabBg: 'bg-sky-500/70',
    headerBg: 'bg-sky-950/30',
    iconText: 'text-sky-400',
    guideBorder: 'border-sky-500/35',
  },
  purple: {
    dot: 'bg-purple-400',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    border: 'border-purple-500/40',
    tabBg: 'bg-purple-500/70',
    headerBg: 'bg-purple-950/30',
    iconText: 'text-purple-400',
    guideBorder: 'border-purple-500/35',
  },
};

export interface StageMarginParams {
  sheetWidth: number;
  secondarySheetWidth: number;
  spreadGapPx: number;
  hasSecondaryPage: boolean;
  pageNotes: Array<{ xRatio?: number | null }>;
  secondaryPageNotes: Array<{ xRatio?: number | null }>;
  noteWidth: number;
  isInteractiveMarginOpen: boolean;
}

export interface StageMarginResult {
  leftMargin: number;
  rightMargin: number;
  hasMarginOverhang: boolean;
}

/**
 * Calcula los margenes laterales necesarios del escenario de lectura.
 * Si no hay notas sobresaliendo hacia los margenes (ni se esta pegando/arrastrando una),
 * mantiene leftMargin/rightMargin en 0 para fijar horizontalmente la hoja en tablet/iPad.
 */
export function computeStageHorizontalMargins({
  sheetWidth,
  secondarySheetWidth,
  spreadGapPx,
  hasSecondaryPage,
  pageNotes,
  secondaryPageNotes,
  noteWidth,
  isInteractiveMarginOpen,
}: StageMarginParams): StageMarginResult {
  const safeSheetW = Math.max(1, sheetWidth);
  const safeSecondaryW = Math.max(1, secondarySheetWidth);
  const totalSheetsWidth =
    safeSheetW + (hasSecondaryPage ? spreadGapPx + safeSecondaryW : 0);

  let leftOverhang = 0;
  let rightOverhang = 0;

  for (const note of pageNotes) {
    let x = note.xRatio ?? 1.025;
    if (hasSecondaryPage && x >= 0.98) {
      x = -((noteWidth + 18) / Math.max(300, safeSheetW));
    }
    const left = x * safeSheetW;
    const right = left + noteWidth;
    if (left < 0) {
      leftOverhang = Math.max(leftOverhang, Math.ceil(-left + 12));
    }
    if (right > totalSheetsWidth) {
      rightOverhang = Math.max(rightOverhang, Math.ceil(right - totalSheetsWidth + 12));
    }
  }

  if (hasSecondaryPage) {
    const sheet2Origin = safeSheetW + spreadGapPx;
    for (const note of secondaryPageNotes) {
      let x = note.xRatio ?? 1.025;
      if (x < -0.05) {
        x = 1.025;
      }
      const left = sheet2Origin + x * safeSecondaryW;
      const right = left + noteWidth;
      if (left < 0) {
        leftOverhang = Math.max(leftOverhang, Math.ceil(-left + 12));
      }
      if (right > totalSheetsWidth) {
        rightOverhang = Math.max(
          rightOverhang,
          Math.ceil(right - totalSheetsWidth + 12)
        );
      }
    }
  }

  const interactiveMarginPx = hasSecondaryPage
    ? Math.max(noteWidth + 24, Math.round(safeSheetW * 0.24))
    : Math.max(noteWidth + 28, Math.round(safeSheetW * 0.31));

  const leftMargin = isInteractiveMarginOpen
    ? Math.max(interactiveMarginPx, leftOverhang)
    : leftOverhang;
  const rightMargin = isInteractiveMarginOpen
    ? Math.max(interactiveMarginPx, rightOverhang)
    : rightOverhang;

  return {
    leftMargin,
    rightMargin,
    hasMarginOverhang: leftOverhang > 0 || rightOverhang > 0,
  };
}

export interface TouchNavigationPoint {
  x: number;
  y: number;
  time: number;
}

export type TouchNavigationAction = 'next' | 'prev' | 'none';

export interface TouchNavigationOptions {
  swipeThresholdPx?: number;
  swipeVelocityRatio?: number;
  maxSwipeDurationMs?: number;
  maxTapDurationMs?: number;
  maxTapMovementPx?: number;
  tapEdgeRatio?: number;
}

export function computeTouchNavigationAction(
  start: TouchNavigationPoint,
  end: TouchNavigationPoint,
  containerWidth: number,
  options: TouchNavigationOptions = {}
): TouchNavigationAction {
  const swipeThresholdPx = options.swipeThresholdPx ?? 42;
  const swipeVelocityRatio = options.swipeVelocityRatio ?? 1.35;
  const maxSwipeDurationMs = options.maxSwipeDurationMs ?? 650;
  const maxTapDurationMs = options.maxTapDurationMs ?? 350;
  const maxTapMovementPx = options.maxTapMovementPx ?? 12;
  const tapEdgeRatio = options.tapEdgeRatio ?? 0.22;

  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const elapsed = Math.max(0, end.time - start.time);

  // 1. Gesto de deslizamiento horizontal (Swipe)
  const isHorizontalSwipe =
    Math.abs(deltaX) >= swipeThresholdPx &&
    Math.abs(deltaX) > Math.abs(deltaY) * swipeVelocityRatio &&
    elapsed <= maxSwipeDurationMs;

  if (isHorizontalSwipe) {
    return deltaX < 0 ? 'next' : 'prev';
  }

  // 2. Pulsación táctil limpia en bordes izquierdo o derecho (Tap Navigation)
  const isCleanTap =
    Math.abs(deltaX) <= maxTapMovementPx &&
    Math.abs(deltaY) <= maxTapMovementPx &&
    elapsed <= maxTapDurationMs;

  if (isCleanTap && containerWidth > 0) {
    if (end.x <= containerWidth * tapEdgeRatio) {
      return 'prev';
    }
    if (end.x >= containerWidth * (1 - tapEdgeRatio)) {
      return 'next';
    }
  }

  return 'none';
}

