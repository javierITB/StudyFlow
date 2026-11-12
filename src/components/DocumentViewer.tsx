import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import {
  Activity,
  ArrowRight,
  ArrowRightFromLine,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Coffee,
  Columns2,
  FastForward,
  Gauge,
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  Minus,
  PanelLeft,
  PanelLeftOpen,
  PanelRight,
  Pause,
  Play,
  Plus,
  Route,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import {
  DiagnosticData,
  DocumentRecord,
  DocumentType,
  KanbanZone,
  NoteColor,
  RouteSegment,
  RouteStep,
  StickyNoteRecord,
  StudyPlanResult,
  StudySettings,
} from '../types/studyflow';
import { formatDurationCompact } from '../lib/diagnosticEngine';
import { computeStageHorizontalMargins } from '../lib/documentUtils';
import { formatErrorMessageEs } from '../lib/errorMessages';
import type { DocxPage } from '../lib/docxParser';
import type { ParsedPptxPresentation } from '../lib/pptxParser';
import { useTimer } from '../context/TimerContext';

interface DocumentViewerProps {
  activeDoc: DocumentRecord | null;
  documentBuffer: ArrayBuffer | null;
  isLoadingBuffer: boolean;
  notes: StickyNoteRecord[];
  studySettings: StudySettings;
  planResult: StudyPlanResult;
  diagnosticData: DiagnosticData;
  highlightedNoteId?: string | null;
  onChangePage: (docId: string, page: number) => void;
  onOpenDocumentAtPage: (docId: string, page: number) => void;
  onStartRouteStep: (step: RouteStep, nextStep: RouteStep | null) => void;
  onToggleDiagnostic: (active: boolean) => void;
  onRecordDiagnosticSample: (sample: {
    docId: string;
    docName: string;
    fileType: DocumentType;
    page: number;
    addedSeconds: number;
  }) => void;
  onOpenDiagnosticModal: () => void;
  onCreateNote: (note: Omit<StickyNoteRecord, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateNote: (noteId: string, patch: Partial<StickyNoteRecord>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const NOTE_COLORS: Array<{ id: NoteColor; label: string; dotClass: string }> = [
  { id: 'yellow', label: 'Nota Amarilla', dotClass: 'bg-amber-300' },
  { id: 'cyan', label: 'Nota Celeste', dotClass: 'bg-sky-300' },
  { id: 'green', label: 'Nota Verde', dotClass: 'bg-emerald-300' },
  { id: 'lavender', label: 'Nota Lavanda', dotClass: 'bg-purple-300' },
];

const NOTE_WIDTH = 212;
const STAGE_VERT_COMPACT = 10;
const STAGE_VERT_EXPANDED = 26;

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  activeDoc,
  documentBuffer,
  isLoadingBuffer,
  notes,
  studySettings,
  planResult,
  diagnosticData,
  highlightedNoteId = null,
  onChangePage,
  onOpenDocumentAtPage,
  onStartRouteStep,
  onToggleDiagnostic,
  onRecordDiagnosticSample,
  onOpenDiagnosticModal,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onNotify,
  sidebarOpen = true,
  onToggleSidebar,
}) => {
  const {
    mode,
    remainingSeconds,
    elapsedSeconds,
    totalDurationSeconds,
    isRunning,
    activeRouteStep,
    activeNextStep,
    activeSegmentIndex,
    canExtendStudyFromBreak,
    transitionPrompt,
    toggleTimer,
    setActiveSegmentIndex,
    completeCurrentBlock,
    completeCurrentSegment,
    chooseContinueNextSegment,
    chooseStartBreak,
    chooseSkipBreakToNextBlock,
    dismissTransitionPrompt,
    adjustTimerSeconds,
    extendStudyAndAdaptPlan,
    skipBreakAndContinue,
  } = useTimer();

  const viewerSectionRef = useRef<HTMLElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const secondarySheetRef = useRef<HTMLDivElement | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfCanvasSecondaryRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const activeRenderTaskRef = useRef<RenderTask | null>(null);
  const activeSecondaryRenderTaskRef = useRef<RenderTask | null>(null);
  const wasNativeFullscreenRef = useRef<boolean>(false);
  const zoomModeRef = useRef<'auto' | 'fit' | 'manual'>('auto');
  const pendingAnchorSheetLeftRef = useRef<number | null>(null);
  const [containerSize, setContainerSize] = useState<{
    innerWidth: number;
    innerHeight: number;
  }>({ innerWidth: 0, innerHeight: 0 });

  const [zoom, setZoom] = useState<number>(1.0);
  const [viewMode, setViewMode] = useState<'single' | 'double'>('single');
  const [stickyMode, setStickyMode] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<NoteColor>('yellow');
  const [showSpeakerNotes, setShowSpeakerNotes] = useState<boolean>(true);
  const [showNotesRail, setShowNotesRail] = useState<boolean>(false);
  const [railFilter, setRailFilter] = useState<'page' | 'doc'>('page');
  const [livePendingSeconds, setLivePendingSeconds] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());
  const pendingDiagnosticSecRef = useRef<number>(0);
  const onRecordDiagnosticRef = useRef(onRecordDiagnosticSample);
  onRecordDiagnosticRef.current = onRecordDiagnosticSample;

  const [pdfProxy, setPdfProxy] = useState<PDFDocumentProxy | null>(null);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number }>({
    width: 794,
    height: 1123,
  });
  const [secondaryPdfDimensions, setSecondaryPdfDimensions] = useState<{
    width: number;
    height: number;
  }>({
    width: 794,
    height: 1123,
  });
  const [docxPages, setDocxPages] = useState<DocxPage[]>([]);
  const [pptxData, setPptxData] = useState<ParsedPptxPresentation | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsingDoc, setIsParsingDoc] = useState<boolean>(false);

  // Estado local de notas para evitar perder foco al tipear
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const noteRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const saveTimersRef = useRef<Map<string, number>>(new Map());
  const dragStateRef = useRef<{
    noteId: string;
    targetSheetEl: HTMLDivElement | null;
    startX: number;
    startY: number;
    startLeftFromSheetPx: number;
    startTopFromSheetPx: number;
    minLeftFromSheetPx: number;
    maxLeftFromSheetPx: number;
    minTopFromSheetPx: number;
    maxTopFromSheetPx: number;
    noteWidthPx: number;
    noteHeightPx: number;
    sheetWidthPx: number;
    sheetHeightPx: number;
    currentDx: number;
    currentDy: number;
    rafId: number | null;
  } | null>(null);

  const currentPage = activeDoc?.currentPage || 1;

  // Rastreo de actividad del usuario para evitar contar tiempo AFK en Modo Diagnostico
  useEffect(() => {
    if (!diagnosticData.isActive) return;
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('pointermove', markActive, { passive: true });
    window.addEventListener('keydown', markActive, { passive: true });
    window.addEventListener('wheel', markActive, { passive: true });
    window.addEventListener('touchstart', markActive, { passive: true });
    return () => {
      window.removeEventListener('pointermove', markActive);
      window.removeEventListener('keydown', markActive);
      window.removeEventListener('wheel', markActive);
      window.removeEventListener('touchstart', markActive);
    };
  }, [diagnosticData.isActive]);

  // Cronometro silencioso por pagina activa en Modo Diagnostico
  useEffect(() => {
    pendingDiagnosticSecRef.current = 0;
    setLivePendingSeconds(0);

    if (
      !diagnosticData.isActive ||
      !activeDoc ||
      mode !== 'study' ||
      isLoadingBuffer ||
      isParsingDoc ||
      Boolean(parseError)
    ) {
      return;
    }

    const trackedDocId = activeDoc.id;
    const trackedDocName = activeDoc.name;
    const trackedFileType = activeDoc.fileType;
    const trackedPage = currentPage;
    lastActivityRef.current = Date.now();

    const flush = () => {
      const sec = pendingDiagnosticSecRef.current;
      if (sec > 0) {
        pendingDiagnosticSecRef.current = 0;
        setLivePendingSeconds(0);
        onRecordDiagnosticRef.current({
          docId: trackedDocId,
          docName: trackedDocName,
          fileType: trackedFileType,
          page: trackedPage,
          addedSeconds: sec,
        });
      }
    };

    const interval = window.setInterval(() => {
      const isVisible =
        typeof document === 'undefined' || document.visibilityState === 'visible';
      const isRecentlyActive = Date.now() - lastActivityRef.current <= 90_000;
      if (!isVisible || !isRecentlyActive) return;

      pendingDiagnosticSecRef.current += 1;
      setLivePendingSeconds(pendingDiagnosticSecRef.current);

      if (pendingDiagnosticSecRef.current >= 10) {
        flush();
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
      flush();
    };
  }, [
    diagnosticData.isActive,
    activeDoc?.id,
    activeDoc?.name,
    activeDoc?.fileType,
    currentPage,
    mode,
    isLoadingBuffer,
    isParsingDoc,
    parseError,
  ]);
  const totalPages =
    activeDoc?.fileType === 'pdf'
      ? pdfProxy?.numPages || activeDoc.pageCount
      : activeDoc?.fileType === 'docx'
        ? docxPages.length || activeDoc.pageCount
        : pptxData?.pageCount || activeDoc?.pageCount || 1;

  // Cargar motor adecuado segun el tipo de documento
  useEffect(() => {
    let cancelled = false;
    let loadedPdf: PDFDocumentProxy | null = null;

    setPdfProxy(null);
    setDocxPages([]);
    setPptxData(null);
    setParseError(null);

    if (!activeDoc || !documentBuffer) return;

    const loadContent = async () => {
      setIsParsingDoc(true);
      try {
        if (activeDoc.fileType === 'pdf') {
          const { loadPdfDocument } = await import('../lib/pdfParser');
          loadedPdf = await loadPdfDocument(documentBuffer);
          if (!cancelled) setPdfProxy(loadedPdf);
        } else if (activeDoc.fileType === 'docx') {
          const { parseDocxDocument } = await import('../lib/docxParser');
          const parsed = await parseDocxDocument(documentBuffer);
          if (!cancelled) setDocxPages(parsed.pages);
        } else if (activeDoc.fileType === 'pptx') {
          const { parsePptxDocument } = await import('../lib/pptxParser');
          const parsedPptx = await parsePptxDocument(documentBuffer);
          if (!cancelled) setPptxData(parsedPptx);
        }
      } catch (err) {
        if (!cancelled) {
          const message = formatErrorMessageEs(err, 'Error al procesar el documento');
          setParseError(message);
        }
      } finally {
        if (!cancelled) setIsParsingDoc(false);
      }
    };

    void loadContent();

    return () => {
      cancelled = true;
      if (loadedPdf) {
        void loadedPdf.destroy();
      }
    };
  }, [activeDoc?.id, activeDoc?.fileType, documentBuffer]);

  // Renderizar pagina PDF en Canvas (1 hoja o 2 hojas tipo libro)
  useEffect(() => {
    if (!activeDoc || activeDoc.fileType !== 'pdf' || !pdfProxy) return;
    const canvas = pdfCanvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        if (activeRenderTaskRef.current) {
          activeRenderTaskRef.current.cancel();
        }
        if (activeSecondaryRenderTaskRef.current) {
          activeSecondaryRenderTaskRef.current.cancel();
        }

        const safePage = Math.min(Math.max(1, currentPage), pdfProxy.numPages);
        const page = await pdfProxy.getPage(safePage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: zoom });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setPdfDimensions({ width: viewport.width, height: viewport.height });

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const task = page.render({ canvasContext: ctx, viewport });
          activeRenderTaskRef.current = task;
          await task.promise;
        }

        if (cancelled) return;

        const secondaryCanvas = pdfCanvasSecondaryRef.current;
        if (
          viewMode === 'double' &&
          safePage + 1 <= pdfProxy.numPages &&
          secondaryCanvas
        ) {
          const page2 = await pdfProxy.getPage(safePage + 1);
          if (cancelled) return;

          const viewport2 = page2.getViewport({ scale: zoom });
          secondaryCanvas.width = viewport2.width;
          secondaryCanvas.height = viewport2.height;
          setSecondaryPdfDimensions({
            width: viewport2.width,
            height: viewport2.height,
          });

          const ctx2 = secondaryCanvas.getContext('2d');
          if (ctx2) {
            const task2 = page2.render({ canvasContext: ctx2, viewport: viewport2 });
            activeSecondaryRenderTaskRef.current = task2;
            await task2.promise;
          }
        }
      } catch (err) {
        if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
          console.error('Error renderizando página PDF:', err);
        }
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      if (activeRenderTaskRef.current) {
        activeRenderTaskRef.current.cancel();
      }
      if (activeSecondaryRenderTaskRef.current) {
        activeSecondaryRenderTaskRef.current.cancel();
      }
    };
  }, [activeDoc, pdfProxy, currentPage, zoom, viewMode]);

  // Sincronizar textos iniciales de notas sin pisar notas siendo editadas
  useEffect(() => {
    setDraftTexts((prev) => {
      const next = { ...prev };
      const validIds = new Set(notes.map((n) => n.id));
      for (const id of Object.keys(next)) {
        if (!validIds.has(id)) delete next[id];
      }
      notes.forEach((n) => {
        if (!saveTimersRef.current.has(n.id)) {
          next[n.id] = n.content;
        }
      });
      return next;
    });
  }, [notes]);

  // Hacer scroll hacia el post-it resaltado cuando el usuario viene desde la Pizarra
  useEffect(() => {
    if (!highlightedNoteId) return;
    const timer = window.setTimeout(() => {
      const el = noteRefs.current.get(highlightedNoteId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [highlightedNoteId, currentPage, activeDoc?.id]);

  // Arrastre GPU-composited a 60/120fps por toda la mesa de trabajo (hoja + márgenes externos)
  useEffect(() => {
    if (!draggingNoteId) return;

    const handlePointerMove = (ev: PointerEvent) => {
      const st = dragStateRef.current;
      if (!st) return;
      const noteEl = noteRefs.current.get(st.noteId);
      if (!noteEl) return;

      const rawDx = ev.clientX - st.startX;
      const rawDy = ev.clientY - st.startY;
      const liveStageRect = stageRef.current?.getBoundingClientRect();
      const liveSheetRect = st.targetSheetEl?.getBoundingClientRect();
      const minLeftBound =
        liveStageRect && liveSheetRect
          ? liveStageRect.left + 8 - liveSheetRect.left
          : st.minLeftFromSheetPx;
      const maxLeftBound =
        liveStageRect && liveSheetRect
          ? liveStageRect.right - st.noteWidthPx - 8 - liveSheetRect.left
          : st.maxLeftFromSheetPx;
      const minTopBound =
        liveStageRect && liveSheetRect
          ? liveStageRect.top + 8 - liveSheetRect.top
          : st.minTopFromSheetPx;
      const maxTopBound =
        liveStageRect && liveSheetRect
          ? liveStageRect.bottom - st.noteHeightPx - 8 - liveSheetRect.top
          : st.maxTopFromSheetPx;

      const minDx = minLeftBound - st.startLeftFromSheetPx;
      const maxDx = maxLeftBound - st.startLeftFromSheetPx;
      const minDy = minTopBound - st.startTopFromSheetPx;
      const maxDy = maxTopBound - st.startTopFromSheetPx;

      st.currentDx = Math.max(minDx, Math.min(maxDx, rawDx));
      st.currentDy = Math.max(minDy, Math.min(maxDy, rawDy));

      if (st.rafId === null) {
        st.rafId = window.requestAnimationFrame(() => {
          const current = dragStateRef.current;
          if (!current) return;
          current.rafId = null;
          const el = noteRefs.current.get(current.noteId);
          if (el) {
            el.style.transform = `translate3d(${current.currentDx}px, ${current.currentDy}px, 0)`;
          }
        });
      }
    };

    const finishDrag = () => {
      const st = dragStateRef.current;
      if (!st) {
        setDraggingNoteId(null);
        return;
      }

      if (st.rafId !== null) {
        window.cancelAnimationFrame(st.rafId);
      }

      const finalLeftFromSheetPx = st.startLeftFromSheetPx + st.currentDx;
      const finalTopFromSheetPx = st.startTopFromSheetPx + st.currentDy;
      const nextXRatio = finalLeftFromSheetPx / Math.max(1, st.sheetWidthPx);
      const nextYRatio = finalTopFromSheetPx / Math.max(1, st.sheetHeightPx);

      const noteEl = noteRefs.current.get(st.noteId);
      if (noteEl) {
        noteEl.style.transform = '';
        noteEl.style.willChange = '';
        noteEl.style.left = `${nextXRatio * 100}%`;
        noteEl.style.top = `${nextYRatio * 100}%`;
      }

      const movedEnough = Math.abs(st.currentDx) > 1 || Math.abs(st.currentDy) > 1;
      const targetId = st.noteId;
      dragStateRef.current = null;
      setDraggingNoteId(null);

      if (movedEnough) {
        void onUpdateNote(targetId, { xRatio: nextXRatio, yRatio: nextYRatio });
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, [draggingNoteId, onUpdateNote]);

  const startDraggingNote = (
    e: React.PointerEvent<HTMLDivElement>,
    noteId: string,
    targetSheetEl?: HTMLDivElement | null
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const stage = stageRef.current;
    const sheet = targetSheetEl || sheetRef.current;
    const noteEl = noteRefs.current.get(noteId);
    if (!stage || !sheet || !noteEl) return;

    const stageRect = stage.getBoundingClientRect();
    const sheetRect = sheet.getBoundingClientRect();
    const noteRect = noteEl.getBoundingClientRect();

    noteEl.style.willChange = 'transform';
    pendingAnchorSheetLeftRef.current = sheetRect.left;

    dragStateRef.current = {
      noteId,
      targetSheetEl: sheet,
      startX: e.clientX,
      startY: e.clientY,
      startLeftFromSheetPx: noteRect.left - sheetRect.left,
      startTopFromSheetPx: noteRect.top - sheetRect.top,
      minLeftFromSheetPx: stageRect.left + 8 - sheetRect.left,
      maxLeftFromSheetPx: stageRect.right - noteRect.width - 8 - sheetRect.left,
      minTopFromSheetPx: stageRect.top + 8 - sheetRect.top,
      maxTopFromSheetPx: stageRect.bottom - noteRect.height - 8 - sheetRect.top,
      noteWidthPx: noteRect.width,
      noteHeightPx: noteRect.height,
      sheetWidthPx: sheetRect.width,
      sheetHeightPx: sheetRect.height,
      currentDx: 0,
      currentDy: 0,
      rafId: null,
    };
    setDraggingNoteId(noteId);
  };

  const nextPendingStudyInfo = React.useMemo(() => {
    const idx = planResult.steps.findIndex((s) => s.type === 'study' && !s.completed);
    if (idx < 0) return null;
    return {
      step: planResult.steps[idx],
      nextStep: idx + 1 < planResult.steps.length ? planResult.steps[idx + 1] : null,
    };
  }, [planResult.steps]);

  const upcomingAfterBreakLabel = React.useMemo(() => {
    if (activeNextStep?.type === 'study') {
      return `${activeNextStep.docName} · Págs. ${activeNextStep.startPage}–${activeNextStep.endPage}`;
    }
    if (activeRouteStep) {
      const currIdx = planResult.steps.findIndex((s) => s.id === activeRouteStep.id);
      if (currIdx >= 0) {
        const nextStudy = planResult.steps
          .slice(currIdx + 1)
          .find((s) => s.type === 'study' && !s.completed);
        if (nextStudy) {
          return `${nextStudy.docName} · Págs. ${nextStudy.startPage}–${nextStudy.endPage}`;
        }
      }
    }
    if (nextPendingStudyInfo) {
      return `${nextPendingStudyInfo.step.docName} · Págs. ${nextPendingStudyInfo.step.startPage}–${nextPendingStudyInfo.step.endPage}`;
    }
    return null;
  }, [activeNextStep, activeRouteStep, planResult.steps, nextPendingStudyInfo]);

  const activeSegments: RouteSegment[] = activeRouteStep?.segments || [];
  const hasPackedSegments = activeSegments.length > 1;
  const activeSegment =
    hasPackedSegments && activeSegments[activeSegmentIndex]
      ? activeSegments[activeSegmentIndex]
      : null;

  const docNotes = activeDoc
    ? notes.filter((n) => n.docId === activeDoc.id)
    : [];

  const pageNotes = activeDoc
    ? docNotes.filter((n) => n.page === currentPage)
    : [];

  const hasSecondaryPage =
    viewMode === 'double' && Boolean(activeDoc) && currentPage < totalPages;
  const secondaryPageNotes =
    hasSecondaryPage && activeDoc
      ? docNotes.filter((n) => n.page === currentPage + 1)
      : [];

  const sheetWidth =
    activeDoc?.fileType === 'pdf'
      ? pdfDimensions.width
      : activeDoc?.fileType === 'pptx'
        ? Math.round(860 * zoom)
        : Math.round(794 * zoom);

  const sheetMinHeight =
    activeDoc?.fileType === 'pdf'
      ? pdfDimensions.height
      : activeDoc?.fileType === 'pptx'
        ? Math.round((860 * zoom) / (pptxData?.aspectRatio || 16 / 9))
        : Math.round(1050 * zoom);

  const secondarySheetWidth =
    activeDoc?.fileType === 'pdf' ? secondaryPdfDimensions.width : sheetWidth;
  const secondarySheetMinHeight =
    activeDoc?.fileType === 'pdf' ? secondaryPdfDimensions.height : sheetMinHeight;
  const spreadGapPx = hasSecondaryPage ? 16 : 0;
  const totalSheetsWidth =
    sheetWidth + (hasSecondaryPage ? spreadGapPx + secondarySheetWidth : 0);
  const isInteractiveMarginOpen = stickyMode || Boolean(draggingNoteId);
  const {
    leftMargin: stageLeftMargin,
    rightMargin: stageRightMargin,
    hasMarginOverhang,
  } = computeStageHorizontalMargins({
    sheetWidth,
    secondarySheetWidth,
    spreadGapPx,
    hasSecondaryPage,
    pageNotes,
    secondaryPageNotes,
    noteWidth: NOTE_WIDTH,
    isInteractiveMarginOpen,
  });

  const stageTopMargin = hasSecondaryPage
    ? STAGE_VERT_EXPANDED
    : isInteractiveMarginOpen
      ? STAGE_VERT_EXPANDED
      : STAGE_VERT_COMPACT;
  const stageBottomMargin = isInteractiveMarginOpen
    ? STAGE_VERT_EXPANDED
    : STAGE_VERT_COMPACT;
  const stageWidth = totalSheetsWidth + stageLeftMargin + stageRightMargin;
  const stageMinHeight =
    Math.max(sheetMinHeight, hasSecondaryPage ? secondarySheetMinHeight : 0) +
    stageTopMargin +
    stageBottomMargin;

  const fitsHorizontally =
    containerSize.innerWidth <= 0 || stageWidth <= containerSize.innerWidth + 2;
  const lockHorizontalScroll =
    !hasMarginOverhang && !isInteractiveMarginOpen && fitsHorizontally;

  // Medir el viewport útil real del visor (tablet, sidebar colapsada, pantalla completa)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const measure = () => {
      const cs = window.getComputedStyle(container);
      const padX =
        (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const padY =
        (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const nextInnerWidth = Math.max(240, Math.floor(container.clientWidth - padX - 8));
      const nextInnerHeight = Math.max(220, Math.floor(container.clientHeight - padY));
      setContainerSize((prev) =>
        prev.innerWidth === nextInnerWidth && prev.innerHeight === nextInnerHeight
          ? prev
          : { innerWidth: nextInnerWidth, innerHeight: nextInnerHeight }
      );
    };

    measure();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(container);
    }
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [activeDoc?.id, isFullscreen]);

  // Evitar salto horizontal cuando se abren los márgenes al arrastrar o activar "Pegar nota"
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const sheetEl = sheetRef.current;
    if (pendingAnchorSheetLeftRef.current === null || !container || !sheetEl) {
      pendingAnchorSheetLeftRef.current = null;
      return;
    }
    const newLeft = sheetEl.getBoundingClientRect().left;
    const delta = newLeft - pendingAnchorSheetLeftRef.current;
    pendingAnchorSheetLeftRef.current = null;
    if (Math.abs(delta) > 0.5 && container.scrollWidth > container.clientWidth) {
      container.scrollLeft = Math.max(0, container.scrollLeft + delta);
    }
  }, [isInteractiveMarginOpen]);

  // Centrar o fijar horizontalmente la hoja en el viewport según haya márgenes/zoom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !activeDoc || isLoadingBuffer || isParsingDoc || draggingNoteId) {
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      if (lockHorizontalScroll) {
        if (container.scrollLeft !== 0) {
          container.scrollLeft = 0;
        }
      } else if (container.scrollWidth > container.clientWidth) {
        container.scrollLeft = Math.max(
          0,
          (container.scrollWidth - container.clientWidth) / 2
        );
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [
    activeDoc?.id,
    zoom,
    stageWidth,
    viewMode,
    isLoadingBuffer,
    isParsingDoc,
    lockHorizontalScroll,
    draggingNoteId,
  ]);

  const computeNextMarginCoords = (
    existingNotes: StickyNoteRecord[],
    excludeNoteId?: string
  ): { xRatio: number; yRatio: number } => {
    const others = existingNotes.filter((n) => n.id !== excludeNoteId);
    const slotStep = Math.max(0.14, 155 / Math.max(400, sheetMinHeight));
    const rightMarginX = 1.025;
    const leftMarginX = -((NOTE_WIDTH + 18) / Math.max(300, sheetWidth));

    const findFreeY = (isLeft: boolean) => {
      const marginNotes = others.filter((n) => {
        const x = n.xRatio ?? 0.5;
        return isLeft ? x < -0.05 : x >= 0.98;
      });
      for (let y = 0.03; y <= 0.86; y += slotStep) {
        const occupied = marginNotes.some(
          (n) => Math.abs((n.yRatio ?? 0) - y) < slotStep * 0.72
        );
        if (!occupied) return Number(y.toFixed(3));
      }
      return null;
    };

    const freeRightY = findFreeY(false);
    if (freeRightY !== null) {
      return { xRatio: rightMarginX, yRatio: freeRightY };
    }

    const freeLeftY = findFreeY(true);
    if (freeLeftY !== null) {
      return { xRatio: leftMarginX, yRatio: freeLeftY };
    }

    // Si ambos margenes estan llenos, apilar desplazado en el margen derecho
    const rightCount = others.filter((n) => (n.xRatio ?? 0) >= 0.98).length;
    return {
      xRatio: rightMarginX,
      yRatio: Number(Math.min(0.88, 0.04 + (rightCount % 6) * 0.14).toFixed(3)),
    };
  };

  const handleAddMarginNote = async () => {
    if (!activeDoc) {
      onNotify('Abre un documento primero para agregar notas', 'warning');
      return;
    }
    const coords = computeNextMarginCoords(pageNotes);
    await onCreateNote({
      docId: activeDoc.id,
      page: currentPage,
      xRatio: coords.xRatio,
      yRatio: coords.yRatio,
      content: '',
      color: selectedColor,
      zone: 'ideas',
    });
    onNotify('Nota creada en el margen sin tapar el documento', 'success');
  };

  const handleMoveNoteToMargin = async (note: StickyNoteRecord) => {
    const coords = computeNextMarginCoords(pageNotes, note.id);
    await onUpdateNote(note.id, coords);
    onNotify('Nota movida al margen', 'info');
  };

  const getInnerContainerWidth = (container: HTMLElement): number => {
    const cs = window.getComputedStyle(container);
    const padX =
      (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    return Math.max(240, Math.floor(container.clientWidth - padX - 8));
  };

  const computeFitZoom = async (
    doc: DocumentRecord,
    pdf: PDFDocumentProxy | null,
    innerAvailableWidth: number,
    pageNum: number,
    isDoubleSpread = false
  ): Promise<number> => {
    const availableWidth = Math.max(240, innerAvailableWidth);
    const targetSheetWidth = isDoubleSpread
      ? Math.max(180, Math.floor((availableWidth - 18) / 2))
      : availableWidth;
    const clampFloor3 = (val: number, minZ: number, maxZ: number) =>
      Math.max(minZ, Math.min(maxZ, Math.floor(val * 1000) / 1000));

    if (doc.fileType === 'pdf' && pdf) {
      const page = await pdf.getPage(Math.min(Math.max(1, pageNum), pdf.numPages));
      const vp = page.getViewport({ scale: 1.0 });
      return clampFloor3(targetSheetWidth / vp.width, 0.25, 2.5);
    }
    if (doc.fileType === 'pptx') {
      return clampFloor3(targetSheetWidth / 860, 0.25, 2.2);
    }
    return clampFloor3(targetSheetWidth / 794, 0.25, 2.0);
  };

  const handleFitToWidth = async () => {
    const container = scrollContainerRef.current;
    if (!container || !activeDoc) return;
    zoomModeRef.current = 'fit';
    const nextZoom = await computeFitZoom(
      activeDoc,
      pdfProxy,
      getInnerContainerWidth(container),
      currentPage,
      hasSecondaryPage
    );
    setZoom(nextZoom);
  };

  const handleToggleViewMode = async () => {
    const nextMode: 'single' | 'double' = viewMode === 'single' ? 'double' : 'single';
    zoomModeRef.current = 'auto';
    setViewMode(nextMode);
    const container = scrollContainerRef.current;
    if (!container || !activeDoc) return;

    const innerW = getInnerContainerWidth(container);
    const willShowSecondary = nextMode === 'double' && currentPage < totalPages;
    const fit = await computeFitZoom(
      activeDoc,
      pdfProxy,
      innerW,
      currentPage,
      willShowSecondary
    );
    setZoom(Math.min(1.0, fit));
  };

  const stepPage = (delta: number) => {
    if (!activeDoc) return;
    const next = Math.min(Math.max(1, currentPage + delta), Math.max(1, totalPages));
    if (next !== currentPage) {
      onChangePage(activeDoc.id, next);
    }
  };

  const handleJumpToPage = (rawValue: string) => {
    if (!activeDoc) return;
    const val = parseInt(rawValue, 10);
    if (!Number.isNaN(val)) {
      onChangePage(
        activeDoc.id,
        Math.min(Math.max(1, val), Math.max(1, totalPages))
      );
    }
  };

  const adjustZoom = (delta: number) => {
    zoomModeRef.current = 'manual';
    setZoom((z) => Math.min(2.5, Math.max(0.25, Number((z + delta).toFixed(2)))));
  };

  const handleToggleStickyMode = () => {
    if (!activeDoc) {
      onNotify('Abre un documento primero para fijar notas', 'warning');
      return;
    }
    pendingAnchorSheetLeftRef.current = sheetRef.current?.getBoundingClientRect().left ?? null;
    const next = !stickyMode;
    setStickyMode(next);
    if (next) {
      onNotify(
        'Haz clic en los márgenes laterales o en el documento para fijar la nota',
        'info'
      );
    }
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      setDockCollapsed(false);
      const el = viewerSectionRef.current;
      if (el && typeof el.requestFullscreen === 'function') {
        try {
          await el.requestFullscreen();
          wasNativeFullscreenRef.current = true;
        } catch {
          // Modo inmersivo CSS fixed cubre iPad Safari y entornos sin API Fullscreen
        }
      }
    } else {
      setIsFullscreen(false);
      if (
        typeof document !== 'undefined' &&
        document.fullscreenElement &&
        typeof document.exitFullscreen === 'function'
      ) {
        try {
          await document.exitFullscreen();
        } catch {
          // Ignorar si el navegador ya salio de fullscreen
        }
      }
      wasNativeFullscreenRef.current = false;
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleFullscreenChange = () => {
      const activeEl = document.fullscreenElement;
      if (!activeEl && wasNativeFullscreenRef.current) {
        wasNativeFullscreenRef.current = false;
        setIsFullscreen(false);
      } else if (activeEl && activeEl === viewerSectionRef.current) {
        wasNativeFullscreenRef.current = true;
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingText =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (stickyMode) {
          setStickyMode(false);
          return;
        }
        if (isFullscreen && !transitionPrompt) {
          void toggleFullscreen();
        }
        return;
      }

      if (!isFullscreen || isEditingText || !activeDoc || mode !== 'study') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentPage > 1) onChangePage(activeDoc.id, currentPage - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentPage < totalPages) onChangePage(activeDoc.id, currentPage + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isFullscreen,
    stickyMode,
    transitionPrompt,
    activeDoc,
    currentPage,
    totalPages,
    mode,
    onChangePage,
  ]);

  useEffect(() => {
    zoomModeRef.current = 'auto';
  }, [activeDoc?.id]);

  // Ajustar automáticamente el ancho al abrir, girar tablet o colapsar sidebar (salvo zoom manual)
  useEffect(() => {
    if (!activeDoc || isLoadingBuffer || isParsingDoc) return;
    if (zoomModeRef.current === 'manual') return;
    if (containerSize.innerWidth <= 0) return;

    const isContentReady =
      (activeDoc.fileType === 'pdf' && Boolean(pdfProxy)) ||
      (activeDoc.fileType === 'docx' && docxPages.length > 0) ||
      (activeDoc.fileType === 'pptx' && Boolean(pptxData));
    if (!isContentReady) return;

    let cancelled = false;
    void computeFitZoom(
      activeDoc,
      pdfProxy,
      containerSize.innerWidth,
      currentPage,
      hasSecondaryPage
    ).then((fit) => {
      if (cancelled) return;
      const target = zoomModeRef.current === 'fit' ? fit : Math.min(1.0, fit);
      setZoom((prev) => (Math.abs(target - prev) > 0.015 ? target : prev));
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeDoc,
    pdfProxy,
    docxPages.length,
    pptxData,
    isLoadingBuffer,
    isParsingDoc,
    currentPage,
    hasSecondaryPage,
    containerSize.innerWidth,
  ]);

  const handleStageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stickyMode || !activeDoc) return;
    if ((e.target as HTMLElement).closest('.sticky-note-element')) return;
    const stage = stageRef.current;
    const primarySheet = sheetRef.current;
    if (!stage || !primarySheet) return;

    const stageRect = stage.getBoundingClientRect();
    const secondarySheet = secondarySheetRef.current;
    const secondaryRect = secondarySheet?.getBoundingClientRect();

    const useSecondary =
      hasSecondaryPage &&
      secondaryRect !== undefined &&
      e.clientX >= secondaryRect.left - spreadGapPx / 2;
    const targetRect =
      useSecondary && secondaryRect ? secondaryRect : primarySheet.getBoundingClientRect();
    const targetPageNum = useSecondary ? currentPage + 1 : currentPage;

    const minLeftFromSheet = stageRect.left + 8 - targetRect.left;
    const maxLeftFromSheet = stageRect.right - NOTE_WIDTH - 8 - targetRect.left;
    const minTopFromSheet = stageRect.top + 8 - targetRect.top;
    const maxTopFromSheet = stageRect.bottom - 115 - targetRect.top;

    const rawLeft = e.clientX - targetRect.left;
    const rawTop = e.clientY - targetRect.top;

    const clampedLeft = Math.max(minLeftFromSheet, Math.min(maxLeftFromSheet, rawLeft));
    const clampedTop = Math.max(minTopFromSheet, Math.min(maxTopFromSheet, rawTop));

    const xRatio = clampedLeft / Math.max(1, targetRect.width);
    const yRatio = clampedTop / Math.max(1, targetRect.height);

    await onCreateNote({
      docId: activeDoc.id,
      page: targetPageNum,
      xRatio,
      yRatio,
      content: '',
      color: selectedColor,
      zone: 'ideas',
    });

    setStickyMode(false);
    onNotify('Nota adhesiva fijada. Escribe tu apunte en ella.', 'success');
  };

  const isPageStopwatch = mode === 'study' && studySettings.intervalMode === 'pages';
  const timerSec = isPageStopwatch ? elapsedSeconds : remainingSeconds;
  const formattedClock = `${String(Math.floor(timerSec / 60)).padStart(2, '0')}:${String(
    timerSec % 60
  ).padStart(2, '0')}`;

  const currentDocxPage = docxPages[Math.min(currentPage - 1, Math.max(0, docxPages.length - 1))];
  const secondaryDocxPage = hasSecondaryPage
    ? docxPages[Math.min(currentPage, Math.max(0, docxPages.length - 1))]
    : undefined;
  const currentSlide = pptxData?.slides[Math.min(currentPage - 1, Math.max(0, pptxData.slides.length - 1))];
  const secondarySlide = hasSecondaryPage
    ? pptxData?.slides[Math.min(currentPage, Math.max(0, pptxData.slides.length - 1))]
    : undefined;

  const renderPptxSlideContent = (
    slide: NonNullable<typeof currentSlide>
  ) => {
    if (slide.elements.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
          Diapositiva sin elementos de texto visibles
        </div>
      );
    }

    return slide.elements.map((el) => {
      if (el.kind === 'image') {
        return (
          <img
            key={el.id}
            src={el.dataUrl}
            alt="Imagen de diapositiva"
            className="absolute object-contain"
            style={{
              left: `${el.xPct}%`,
              top: `${el.yPct}%`,
              width: `${el.wPct}%`,
              height: `${el.hPct}%`,
            }}
          />
        );
      }

      if (el.kind === 'table') {
        return (
          <div
            key={el.id}
            className="absolute overflow-auto bg-white/95 rounded border border-slate-300"
            style={{
              left: `${el.xPct}%`,
              top: `${el.yPct}%`,
              width: `${el.wPct}%`,
              height: `${el.hPct}%`,
              fontSize: `${Math.max(10, Math.round(12 * zoom))}px`,
            }}
          >
            <table className="w-full border-collapse" style={{ color: '#0f172a' }}>
              <tbody>
                {el.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={rIdx === 0 ? 'font-semibold' : ''}
                    style={rIdx === 0 ? { backgroundColor: '#f1f5f9' } : undefined}
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="border border-slate-300 px-2 py-1">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      return (
        <div
          key={el.id}
          className="absolute overflow-hidden p-1.5 flex flex-col justify-start"
          style={{
            left: `${el.xPct}%`,
            top: `${el.yPct}%`,
            width: `${el.wPct}%`,
            height: `${el.hPct}%`,
            backgroundColor: el.fillColor || 'transparent',
            border: el.borderColor ? `1px solid ${el.borderColor}` : 'none',
          }}
        >
          {el.paragraphs.map((p, pIdx) => (
            <p
              key={pIdx}
              style={{ textAlign: p.align, color: '#0f172a' }}
              className="leading-snug mb-1"
            >
              {p.isBullet && <span className="mr-1.5">•</span>}
              {p.runs.map((run, rIdx) => {
                const basePt = run.fontSizePt || 16;
                const pxSize = Math.max(10, Math.round(basePt * 0.9 * zoom));
                return (
                  <span
                    key={rIdx}
                    style={{
                      fontWeight: run.bold ? 700 : 400,
                      fontStyle: run.italic ? 'italic' : 'normal',
                      fontSize: `${pxSize}px`,
                      color: run.color || '#0f172a',
                    }}
                  >
                    {run.text}
                  </span>
                );
              })}
            </p>
          ))}
        </div>
      );
    });
  };

  const renderStickyNoteCard = (
    note: StickyNoteRecord,
    targetSheetEl: HTMLDivElement | null,
    spreadSide?: 'left' | 'right'
  ) => {
    let x = note.xRatio ?? 1.025;
    if (hasSecondaryPage && spreadSide === 'left' && x >= 0.98) {
      x = -((NOTE_WIDTH + 18) / Math.max(300, sheetWidth));
    } else if (hasSecondaryPage && spreadSide === 'right' && x < -0.05) {
      x = 1.025;
    }

    const y = note.yRatio ?? 0.04;
    const isDragging = draggingNoteId === note.id;
    const isHighlighted = highlightedNoteId === note.id;
    const isInsideSheet = x > -0.04 && x < 0.96;

    return (
      <div
        key={note.id}
        ref={(el) => {
          if (el) noteRefs.current.set(note.id, el);
          else noteRefs.current.delete(note.id);
        }}
        style={{
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          width: `${NOTE_WIDTH}px`,
          zIndex: isDragging ? 50 : isHighlighted ? 40 : 30,
        }}
        className={`sticky-note-element pointer-events-auto absolute p-2 rounded-xl border flex flex-col note-${note.color} ${
          isDragging
            ? 'shadow-2xl ring-2 ring-indigo-400/80 select-none'
            : isHighlighted
              ? 'shadow-2xl ring-4 ring-indigo-400 animate-pulse'
              : 'shadow-xl transition-shadow'
        }`}
      >
        <div
          onPointerDown={(e) => startDraggingNote(e, note.id, targetSheetEl)}
          className="flex items-center justify-between pb-1 mb-1 border-b border-black/10 text-[10px] font-semibold select-none cursor-grab active:cursor-grabbing touch-none"
          title="Arrastra hacia los márgenes laterales o sobre el documento"
        >
          <span>
            {activeDoc?.fileType === 'pptx' ? 'Slide' : 'Pág.'} {note.page}
          </span>
          <div className="flex items-center gap-0.5">
            {isInsideSheet && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleMoveNoteToMargin(note);
                }}
                title="Mover al margen para no tapar el texto"
                className="opacity-70 hover:opacity-100 px-1 py-0.5 rounded hover:bg-black/10 flex items-center gap-0.5 text-[9px]"
              >
                <ArrowRightFromLine className="w-3 h-3" />
                <span>Margen</span>
              </button>
            )}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                void onDeleteNote(note.id);
              }}
              title="Eliminar nota"
              className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-black/10"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
        <textarea
          value={draftTexts[note.id] ?? note.content}
          onChange={(e) => {
            const val = e.target.value;
            setDraftTexts((prev) => ({ ...prev, [note.id]: val }));
            const existingTimer = saveTimersRef.current.get(note.id);
            if (existingTimer) window.clearTimeout(existingTimer);
            const timerId = window.setTimeout(() => {
              saveTimersRef.current.delete(note.id);
              void onUpdateNote(note.id, { content: val });
            }, 450);
            saveTimersRef.current.set(note.id, timerId);
          }}
          onBlur={(e) => {
            const existingTimer = saveTimersRef.current.get(note.id);
            if (existingTimer) {
              window.clearTimeout(existingTimer);
              saveTimersRef.current.delete(note.id);
            }
            if (e.target.value !== note.content) {
              void onUpdateNote(note.id, { content: e.target.value });
            }
          }}
          rows={3}
          placeholder="Escribe un apunte..."
          className="w-full bg-transparent resize-none border-0 p-0 text-xs focus:outline-none placeholder-black/40 leading-snug"
        />
        <div className="mt-1 pt-1 border-t border-black/10 flex items-center justify-between text-[9px]">
          <select
            value={note.zone}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) =>
              void onUpdateNote(note.id, {
                zone: e.target.value as KanbanZone,
              })
            }
            className="bg-black/10 rounded px-1 py-0.5 font-semibold focus:outline-none cursor-pointer"
            title="Clasificación en Pizarra Kanban"
          >
            <option value="ideas">Ideas Clave</option>
            <option value="preguntas">Preguntas</option>
            <option value="resumen">Resumen</option>
            <option value="tareas">Tareas</option>
          </select>
          <div className="flex items-center gap-1">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => void onUpdateNote(note.id, { color: c.id })}
                className={`w-2.5 h-2.5 rounded-full ${c.dotClass} border ${
                  note.color === c.id ? 'border-slate-900 scale-110' : 'border-black/20 opacity-70'
                }`}
                title={c.label}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      ref={viewerSectionRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 h-[100dvh] w-screen flex flex-col bg-slate-950 overflow-hidden'
          : 'flex-1 h-full flex flex-col bg-slate-950 overflow-hidden relative'
      }
    >
      {/* Barra de herramientas del visor (se oculta en Modo Inmersivo) */}
      {!isFullscreen && (
        <div
          data-tour-id="tour-viewer-tools"
          className="min-h-[2.625rem] xl:min-h-[3rem] py-1 xl:py-1.5 border-b border-indigo-500/35 bg-slate-900/90 backdrop-blur-md px-2 sm:px-3 flex flex-wrap md:flex-nowrap items-center justify-between flex-shrink-0 z-20 gap-1.5 xl:gap-2 overflow-x-auto"
        >
          {/* Panel lateral + Navegacion de paginas */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 whitespace-nowrap">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                title={sidebarOpen ? 'Ocultar panel de archivos y ruta' : 'Abrir panel de archivos y ruta'}
                className={`px-2 py-1 xl:py-1.5 rounded-lg text-[11px] xl:text-xs font-medium flex items-center gap-1.5 border transition-colors ${
                  sidebarOpen
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'
                    : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white shadow-sm'
                }`}
              >
                {sidebarOpen ? (
                  <PanelLeft className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-indigo-300" />
                ) : (
                  <PanelLeftOpen className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-white" />
                )}
                <span className="hidden lg:inline xl:hidden">
                  {sidebarOpen ? 'Ocultar' : 'Panel'}
                </span>
                <span className="hidden xl:inline">
                  {sidebarOpen ? 'Material' : 'Abrir panel'}
                </span>
              </button>
            )}

            <button
              type="button"
              disabled={!activeDoc || currentPage <= 1}
              onClick={() => stepPage(-1)}
              title="Página anterior"
              className="p-1 xl:p-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-500/20 border border-indigo-500/25 hover:border-indigo-400/55 text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
            </button>
            <div className="flex items-center text-[11px] xl:text-xs text-slate-300 font-mono">
              <input
                type="number"
                min={1}
                max={totalPages}
                disabled={!activeDoc}
                value={activeDoc ? currentPage : 0}
                onChange={(e) => handleJumpToPage(e.target.value)}
                className="w-10 xl:w-12 text-center bg-slate-950/90 border border-indigo-500/40 rounded-md py-0.5 text-[11px] xl:text-xs text-white focus:outline-none focus:border-indigo-400"
              />
              {hasSecondaryPage && (
                <span className="ml-1 text-[10px] xl:text-[11px] text-indigo-300 font-semibold">
                  (+{currentPage + 1})
                </span>
              )}
              <span className="mx-1 text-slate-400">/</span>
              <span>{activeDoc ? totalPages : 0}</span>
            </div>
            <button
              type="button"
              disabled={!activeDoc || currentPage >= totalPages}
              onClick={() => stepPage(1)}
              title="Página siguiente"
              className="p-1 xl:p-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-500/20 border border-indigo-500/25 hover:border-indigo-400/55 text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
            </button>
          </div>

          {/* Zoom y Modo Libro 1/2 hojas */}
          <div className="hidden sm:flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={() => adjustZoom(-0.15)}
              title="Alejar"
              className="p-1 xl:p-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-500/20 border border-indigo-500/25 hover:border-indigo-400/55 text-slate-200 transition-colors"
            >
              <Minus className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
            </button>
            <span className="text-[11px] xl:text-xs font-mono text-indigo-200 bg-indigo-500/10 border border-indigo-500/25 rounded-md px-1.5 xl:px-2 py-0.5">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => adjustZoom(0.15)}
              title="Acercar"
              className="p-1 xl:p-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-500/20 border border-indigo-500/25 hover:border-indigo-400/55 text-slate-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
            </button>
            <button
              type="button"
              onClick={() => void handleFitToWidth()}
              title="Ajustar al ancho de pantalla"
              className="py-1 px-2 xl:px-2.5 rounded-lg bg-slate-800/90 hover:bg-indigo-500/20 border border-indigo-500/25 hover:border-indigo-400/55 text-slate-200 text-[11px] xl:text-xs transition-colors"
            >
              Ajustar
            </button>
            <button
              type="button"
              disabled={!activeDoc || totalPages <= 1}
              onClick={() => void handleToggleViewMode()}
              title={
                viewMode === 'double'
                  ? 'Cambiar a vista de 1 hoja'
                  : 'Vista tipo libro de 2 hojas (avanza de 1 en 1)'
              }
              className={`py-1 px-2 xl:px-2.5 rounded-lg text-[11px] xl:text-xs font-medium flex items-center gap-1 border transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                viewMode === 'double'
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                  : 'bg-slate-800/90 hover:bg-indigo-500/20 border-indigo-500/25 hover:border-indigo-400/55 text-slate-200'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">
                {viewMode === 'double' ? '2 Hojas' : '1 Hoja'}
              </span>
            </button>
          </div>

          {/* Herramientas Post-it y Modo Inmersivo */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={() => {
                const idx = NOTE_COLORS.findIndex((c) => c.id === selectedColor);
                setSelectedColor(NOTE_COLORS[(idx + 1) % NOTE_COLORS.length].id);
              }}
              title="Cambiar color de nueva nota"
              className="lg:hidden p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center"
            >
              <span
                className={`w-3 h-3 rounded-full border border-white/80 ${
                  NOTE_COLORS.find((c) => c.id === selectedColor)?.dotClass || 'bg-amber-300'
                }`}
              />
            </button>

            <div className="hidden lg:flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => setSelectedColor(c.id)}
                  className={`w-3.5 h-3.5 xl:w-4 xl:h-4 rounded-full ${c.dotClass} transition-transform ${
                    selectedColor === c.id
                      ? 'border-2 border-white scale-110'
                      : 'border border-transparent opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => void handleAddMarginNote()}
              title="Crear nota directamente en el margen lateral sin tapar el texto"
              className="px-2 xl:px-2.5 py-1 rounded-lg text-[11px] xl:text-xs font-medium border border-indigo-500/45 bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-200 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden lg:inline xl:hidden">Margen</span>
              <span className="hidden xl:inline">Al margen</span>
            </button>

            <button
              type="button"
              onClick={handleToggleStickyMode}
              title="Fijar nota donde hagas clic o toque"
              className={`px-2 xl:px-2.5 py-1 rounded-lg text-[11px] xl:text-xs font-medium flex items-center gap-1 transition-colors ${
                stickyMode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span className="hidden lg:inline xl:hidden">
                {stickyMode ? 'Fijando' : 'Nota'}
              </span>
              <span className="hidden xl:inline">
                {stickyMode ? 'Fijar Activo' : 'Pegar Nota'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleDiagnostic(!diagnosticData.isActive)}
              title="Medir tiempo real por página para calcular el Pomodoro recomendado"
              className={`px-2 xl:px-2.5 py-1 rounded-lg text-[11px] xl:text-xs font-medium flex items-center gap-1 transition-colors ${
                diagnosticData.isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Diagnóstico</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNotesRail((v) => !v)}
              title="Ver lista lateral de todas las notas del documento"
              className={`px-2 xl:px-2.5 py-1 rounded-lg text-[11px] xl:text-xs font-medium flex items-center gap-1 transition-colors ${
                showNotesRail
                  ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-500/55'
                  : 'border border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <PanelRight className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Notas</span>
              <span className="font-mono text-[10px] px-1 rounded bg-slate-950/70">
                {docNotes.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              title="Modo inmersivo de lectura (pantalla completa)"
              className="px-2 xl:px-2.5 py-1 rounded-lg text-[11px] xl:text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm flex items-center gap-1 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline xl:hidden">Inmersivo</span>
              <span className="hidden xl:inline">Pantalla completa</span>
            </button>
          </div>
        </div>
      )}

      {/* Cabecera minimalista superior solo en Modo Pantalla Completa */}
      {isFullscreen && (
        <div className="pointer-events-none absolute top-3 inset-x-0 z-30 flex justify-center px-3">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-indigo-500/35 bg-slate-900/80 backdrop-blur-md px-3 py-1 shadow-lg text-[11px] max-w-[92vw]">
            <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
            <span className="font-medium text-slate-100 truncate max-w-[38vw]">
              {activeDoc ? activeDoc.name : 'Modo Inmersivo'}
            </span>
            <span className="font-mono text-indigo-300 border-l border-slate-700 pl-2 flex-shrink-0">
              {formattedClock}
            </span>
            {diagnosticData.isActive && activeDoc && (
              <span className="hidden sm:inline font-mono text-emerald-300 border-l border-slate-700 pl-2 flex-shrink-0">
                Diag{' '}
                {formatDurationCompact(
                  (diagnosticData.samples.find(
                    (s) => s.docId === activeDoc.id && s.page === currentPage
                  )?.activeSeconds || 0) + livePendingSeconds
                )}
              </span>
            )}
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              title="Salir de pantalla completa (Esc)"
              className="ml-1 px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1 flex-shrink-0 transition-colors"
            >
              <Minimize2 className="w-3 h-3 text-indigo-400" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      )}

      {/* Mini barra de ruta y temporizador integrada en lectura (oculta en fullscreen para evitar ruido) */}
      {!isFullscreen &&
        (activeRouteStep ||
          nextPendingStudyInfo ||
          isRunning ||
          studySettings.intervalMode === 'pages') && (
          <div className="px-2.5 sm:px-3 py-1 border-b border-indigo-500/30 bg-indigo-500/10 flex items-center justify-between gap-2 text-[11px] xl:text-xs z-20 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300 flex-shrink-0">
                {formattedClock}
              </span>

              {activeRouteStep ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-slate-200 truncate font-medium">
                    {activeSegment
                      ? `${activeSegment.docName} · Págs. ${activeSegment.startPage}–${activeSegment.endPage}`
                      : activeRouteStep.type === 'study'
                        ? `${activeRouteStep.docName} · Págs. ${activeRouteStep.startPage}–${activeRouteStep.endPage}`
                        : `${activeRouteStep.type === 'long_break'
                          ? 'Descanso largo'
                          : 'Descanso corto'
                        } (${activeRouteStep.durationMinutes} min)`}
                  </span>

                  {hasPackedSegments && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {activeSegments.map((seg, sIdx) => (
                        <button
                          key={`${seg.docId}_${sIdx}`}
                          type="button"
                          onClick={() => {
                            setActiveSegmentIndex(sIdx);
                            onOpenDocumentAtPage(seg.docId, seg.startPage);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${sIdx === activeSegmentIndex
                              ? 'bg-indigo-600 text-white border-indigo-400'
                              : sIdx < activeSegmentIndex
                                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/50'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                            }`}
                          title={`${seg.docName} (Págs. ${seg.startPage}–${seg.endPage})`}
                        >
                          {sIdx + 1}. {seg.docName.slice(0, 14)}
                          {seg.docName.length > 14 ? '…' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : nextPendingStudyInfo ? (
                <span className="text-slate-300 truncate flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">
                    Siguiente en ruta: {nextPendingStudyInfo.step.docName} · Págs.{' '}
                    {nextPendingStudyInfo.step.startPage}–{nextPendingStudyInfo.step.endPage}{' '}
                    ({nextPendingStudyInfo.step.durationMinutes}m)
                  </span>
                </span>
              ) : (
                <span className="text-slate-300 truncate">
                  {studySettings.intervalMode === 'pages'
                    ? `Modo por páginas: bloques de ${studySettings.pagesPerBlock} págs · Descanso ${studySettings.shortBreakMinutes}/${studySettings.longBreakMinutes} min`
                    : `Ciclo activo: ${mode === 'study'
                      ? `Estudio (${studySettings.studyMinutes}m)`
                      : mode === 'short'
                        ? `Descanso corto (${studySettings.shortBreakMinutes}m)`
                        : `Descanso largo (${studySettings.longBreakMinutes}m)`
                    }`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
              {!activeRouteStep && nextPendingStudyInfo && !isRunning ? (
                <button
                  type="button"
                  onClick={() =>
                    onStartRouteStep(
                      nextPendingStudyInfo.step,
                      nextPendingStudyInfo.nextStep
                    )
                  }
                  className="px-2 sm:px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 text-[11px]"
                >
                  <Play className="w-3 h-3" />
                  <span className="sm:hidden">Iniciar</span>
                  <span className="hidden sm:inline">Iniciar bloque de ruta</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={toggleTimer}
                    className="px-2 sm:px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 text-[11px]"
                  >
                    {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isRunning ? 'Pausar' : 'Iniciar'}</span>
                  </button>
                  {hasPackedSegments &&
                    activeSegmentIndex < activeSegments.length - 1 ? (
                    <button
                      type="button"
                      onClick={completeCurrentSegment}
                      className="px-2 sm:px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1 text-[11px]"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="sm:hidden">Terminar</span>
                      <span className="hidden sm:inline">Terminar archivo</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={completeCurrentBlock}
                      className="px-2 sm:px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1 text-[11px]"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="sm:hidden">Completar</span>
                      <span className="hidden sm:inline">Completar bloque</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

      {/* Barra activa de Modo Diagnostico */}
      {diagnosticData.isActive && (
        <div className="px-3 py-1.5 border-b border-emerald-500/30 bg-emerald-950/30 flex flex-wrap items-center justify-between gap-2 text-xs z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-emerald-200 font-semibold">
              Diagnóstico activo
            </span>
            {activeDoc && (
              <span className="text-slate-300 font-mono truncate">
                {activeDoc.fileType === 'pptx' ? 'Slide' : 'Pág.'} {currentPage}:{' '}
                {formatDurationCompact(
                  (diagnosticData.samples.find(
                    (s) => s.docId === activeDoc.id && s.page === currentPage
                  )?.activeSeconds || 0) + livePendingSeconds
                )}
              </span>
            )}
            <span className="text-slate-400 hidden sm:inline">
              • {diagnosticData.samples.length} págs calibradas
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenDiagnosticModal}
              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 text-[11px]"
            >
              <Gauge className="w-3 h-3" />
              <span>Ver perfil recomendado</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleDiagnostic(false)}
              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
            >
              Pausar
            </button>
          </div>
        </div>
      )}

      {/* Area de Lectura + Controles flotantes inferiores + Panel lateral de Notas */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative flex flex-col overflow-hidden">
          <div
            ref={scrollContainerRef}
            className={`flex-1 flex flex-col sf-env-canvas ${
              lockHorizontalScroll
                ? 'overflow-y-auto overflow-x-hidden touch-pan-y overscroll-x-none items-center'
                : 'overflow-auto items-start'
            } ${isFullscreen ? 'p-3 sm:p-4 pb-24' : 'p-2 sm:p-4 pb-16 sm:pb-5'}`}
          >
          {!activeDoc ? (
            <div className="m-auto text-center py-10 px-4 max-w-md space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/15 border border-indigo-500/35 sf-accent-glow flex items-center justify-center text-indigo-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  Selecciona o carga un documento
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Compatible con PDF, Word (.docx) y presentaciones PowerPoint (.pptx).
                </p>
              </div>
              {!sidebarOpen && onToggleSidebar && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                  <span>Abrir biblioteca y subir material</span>
                </button>
              )}
            </div>
          ) : isLoadingBuffer || isParsingDoc ? (
            <div className="m-auto flex flex-col items-center gap-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <span className="text-xs">Cargando documento...</span>
            </div>
          ) : parseError ? (
            <div className="m-auto max-w-md p-6 rounded-2xl bg-slate-900 border border-rose-500/40 text-center space-y-2">
              <p className="text-sm font-semibold text-rose-300">No se pudo abrir el archivo</p>
              <p className="text-xs text-slate-300">{parseError}</p>
            </div>
          ) : (
            <div
              ref={stageRef}
              onClick={(e) => void handleStageClick(e)}
              style={{
                width: `${stageWidth}px`,
                minHeight: `${stageMinHeight}px`,
                paddingTop: `${stageTopMargin}px`,
                paddingBottom: `${stageBottomMargin}px`,
                paddingLeft: `${stageLeftMargin}px`,
                paddingRight: `${stageRightMargin}px`,
              }}
              className={`mx-auto relative flex flex-col items-center gap-4 ${
                stickyMode ? 'cursor-crosshair-mode' : ''
              }`}
            >
              {/* Guías sutiles de márgenes libres mientras colocas o arrastras un post-it */}
              {(stickyMode || draggingNoteId) && (
                <>
                  {stageLeftMargin >= 40 && (
                    <div
                      style={{
                        left: '10px',
                        top: `${stageTopMargin}px`,
                        width: `${stageLeftMargin - 20}px`,
                        height: `${Math.max(sheetMinHeight, hasSecondaryPage ? secondarySheetMinHeight : 0)}px`,
                      }}
                      className="pointer-events-none absolute rounded-2xl border border-dashed border-indigo-500/35 bg-indigo-500/[0.03] flex items-start justify-center pt-4"
                    >
                      <span className="text-[10px] font-medium text-indigo-300/75 uppercase tracking-wider">
                        Margen izquierdo libre
                      </span>
                    </div>
                  )}
                  {stageRightMargin >= 40 && (
                    <div
                      style={{
                        right: '10px',
                        top: `${stageTopMargin}px`,
                        width: `${stageRightMargin - 20}px`,
                        height: `${Math.max(sheetMinHeight, hasSecondaryPage ? secondarySheetMinHeight : 0)}px`,
                      }}
                      className="pointer-events-none absolute rounded-2xl border border-dashed border-indigo-500/35 bg-indigo-500/[0.03] flex items-start justify-center pt-4"
                    >
                      <span className="text-[10px] font-medium text-indigo-300/75 uppercase tracking-wider">
                        Margen derecho libre
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Contenedor de 1 o 2 hojas lado a lado tipo libro */}
              <div
                className="flex items-start justify-center"
                style={{ gap: `${spreadGapPx}px` }}
              >
                {/* Hoja principal (Página actual) */}
                <div
                  ref={sheetRef}
                  className="relative shadow-2xl rounded-sm overflow-visible transition-colors duration-200"
                  style={{
                    width: `${sheetWidth}px`,
                    minHeight: `${sheetMinHeight}px`,
                    backgroundColor: 'var(--sf-paper-bg, #ffffff)',
                  }}
                >
                  {hasSecondaryPage && (
                    <div className="pointer-events-none absolute -top-5 left-0 text-[10px] font-mono text-indigo-300/90">
                      {activeDoc.fileType === 'pptx' ? 'Slide' : 'Pág.'} {currentPage}
                    </div>
                  )}

                  {activeDoc.fileType === 'pdf' && (
                    <canvas
                      ref={pdfCanvasRef}
                      className={
                        (studySettings.appearance?.paperTone || 'pure') !== 'pure'
                          ? 'block mix-blend-multiply'
                          : 'block'
                      }
                    />
                  )}

                  {activeDoc.fileType === 'docx' && currentDocxPage && (
                    <div
                      className="p-10 sm:p-12 docx-sheet-content select-text transition-colors duration-200"
                      style={{
                        minHeight: `${sheetMinHeight}px`,
                        fontSize: `${Math.round(14 * zoom)}px`,
                        backgroundColor: 'var(--sf-paper-bg, #ffffff)',
                        color: '#0f172a',
                      }}
                      dangerouslySetInnerHTML={{ __html: currentDocxPage.html }}
                    />
                  )}

                  {activeDoc.fileType === 'pptx' && currentSlide && (
                    <div
                      className="relative overflow-hidden select-text"
                      style={{
                        width: `${sheetWidth}px`,
                        height: `${sheetMinHeight}px`,
                        backgroundColor: currentSlide.backgroundColor || '#ffffff',
                      }}
                    >
                      {renderPptxSlideContent(currentSlide)}
                    </div>
                  )}

                  {/* Capa Interactiva de Post-its página actual */}
                  <div
                    ref={overlayRef}
                    className="absolute inset-0 select-none overflow-visible pointer-events-none"
                  >
                    {pageNotes.map((note) =>
                      renderStickyNoteCard(
                        note,
                        sheetRef.current,
                        hasSecondaryPage ? 'left' : undefined
                      )
                    )}
                  </div>
                </div>

                {/* Segunda hoja (Página siguiente en modo libro) */}
                {hasSecondaryPage && (
                  <div
                    ref={secondarySheetRef}
                    className="relative shadow-2xl rounded-sm overflow-visible transition-colors duration-200"
                    style={{
                      width: `${secondarySheetWidth}px`,
                      minHeight: `${secondarySheetMinHeight}px`,
                      backgroundColor: 'var(--sf-paper-bg, #ffffff)',
                    }}
                  >
                    <div className="pointer-events-none absolute -top-5 right-0 text-[10px] font-mono text-indigo-300/90">
                      {activeDoc.fileType === 'pptx' ? 'Slide' : 'Pág.'} {currentPage + 1}
                    </div>

                    {activeDoc.fileType === 'pdf' && (
                      <canvas
                        ref={pdfCanvasSecondaryRef}
                        className={
                          (studySettings.appearance?.paperTone || 'pure') !== 'pure'
                            ? 'block mix-blend-multiply'
                            : 'block'
                        }
                      />
                    )}

                    {activeDoc.fileType === 'docx' && secondaryDocxPage && (
                      <div
                        className="p-10 sm:p-12 docx-sheet-content select-text transition-colors duration-200"
                        style={{
                          minHeight: `${secondarySheetMinHeight}px`,
                          fontSize: `${Math.round(14 * zoom)}px`,
                          backgroundColor: 'var(--sf-paper-bg, #ffffff)',
                          color: '#0f172a',
                        }}
                        dangerouslySetInnerHTML={{ __html: secondaryDocxPage.html }}
                      />
                    )}

                    {activeDoc.fileType === 'pptx' && secondarySlide && (
                      <div
                        className="relative overflow-hidden select-text"
                        style={{
                          width: `${secondarySheetWidth}px`,
                          height: `${secondarySheetMinHeight}px`,
                          backgroundColor: secondarySlide.backgroundColor || '#ffffff',
                        }}
                      >
                        {renderPptxSlideContent(secondarySlide)}
                      </div>
                    )}

                    {/* Capa Interactiva de Post-its página derecha */}
                    <div className="absolute inset-0 select-none overflow-visible pointer-events-none">
                      {secondaryPageNotes.map((note) =>
                        renderStickyNoteCard(note, secondarySheetRef.current, 'right')
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Notas del orador en PPTX */}
              {activeDoc.fileType === 'pptx' &&
                (currentSlide?.speakerNotes || secondarySlide?.speakerNotes) && (
                  <div
                    style={{ width: `${totalSheetsWidth}px` }}
                    className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3 text-xs text-slate-300 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Notas del orador (Slide {currentSlide?.slideNumber || currentPage}
                        {hasSecondaryPage && secondarySlide?.speakerNotes
                          ? ` y ${secondarySlide.slideNumber}`
                          : ''}
                        )
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSpeakerNotes((v) => !v)}
                        className="text-[11px] text-slate-400 hover:text-white"
                      >
                        {showSpeakerNotes ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    {showSpeakerNotes && (
                      <div className="space-y-1.5">
                        {currentSlide?.speakerNotes && (
                          <p className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                            {hasSecondaryPage ? `Slide ${currentSlide.slideNumber}: ` : ''}
                            {currentSlide.speakerNotes}
                          </p>
                        )}
                        {hasSecondaryPage && secondarySlide?.speakerNotes && (
                          <p className="whitespace-pre-wrap text-slate-300 leading-relaxed pt-1 border-t border-slate-800">
                            Slide {secondarySlide.slideNumber}: {secondarySlide.speakerNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}
          </div>

          {/* Barra de controles flotante en la zona inferior (en Modo Inmersivo, o en móvil para zoom/páginas rápidas) */}
          {activeDoc && mode === 'study' && !transitionPrompt && (
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-2.5 sm:bottom-4 z-30 flex justify-center px-2 sm:px-4 ${
                isFullscreen ? '' : 'sm:hidden'
              }`}
            >
              {dockCollapsed ? (
                <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 shadow-xl sf-accent-glow text-xs">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => stepPage(-1)}
                    title="Página anterior"
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] text-slate-200 px-1">
                    {hasSecondaryPage ? `${currentPage}-${currentPage + 1}` : currentPage}/{totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => stepPage(1)}
                    title="Página siguiente"
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-px h-3.5 bg-slate-700 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => setDockCollapsed(false)}
                    className="px-2 py-0.5 rounded-full bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/40 text-indigo-200 flex items-center gap-1 text-[11px] font-medium"
                    title="Mostrar todos los controles flotantes"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Controles</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleFullscreen()}
                    title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    className="p-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 rounded-2xl border border-indigo-500/50 bg-slate-900/90 backdrop-blur-xl px-2 sm:px-2.5 py-1 sm:py-1.5 shadow-2xl sf-accent-glow max-w-[96vw] text-xs">
                  {!isFullscreen && onToggleSidebar && (
                    <>
                      <button
                        type="button"
                        onClick={onToggleSidebar}
                        title={sidebarOpen ? 'Colapsar panel lateral' : 'Expandir panel lateral'}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          sidebarOpen
                            ? 'bg-indigo-500/20 border-indigo-500/45 text-indigo-200'
                            : 'bg-indigo-600 border-indigo-400 text-white'
                        }`}
                      >
                        {sidebarOpen ? (
                          <PanelLeft className="w-3.5 h-3.5" />
                        ) : (
                          <PanelLeftOpen className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="hidden sm:block w-px h-5 bg-indigo-500/25" />
                    </>
                  )}

                  {/* Paginacion */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => stepPage(-1)}
                      title="Página anterior"
                      className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400/60 text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center font-mono text-[11px] text-slate-200">
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => handleJumpToPage(e.target.value)}
                        aria-label="Página actual"
                        className="w-10 text-center bg-slate-950/90 border border-indigo-500/40 rounded-md py-0.5 text-[11px] text-white focus:outline-none focus:border-indigo-400"
                      />
                      {hasSecondaryPage && (
                        <span className="ml-1 text-[10px] text-indigo-300 font-semibold">
                          (+{currentPage + 1})
                        </span>
                      )}
                      <span className="mx-1 text-slate-400">/</span>
                      <span>{totalPages}</span>
                    </div>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => stepPage(1)}
                      title="Página siguiente"
                      className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400/60 text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="hidden sm:block w-px h-5 bg-indigo-500/25" />

                  {/* Zoom y Modo Libro */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustZoom(-0.15)}
                      title="Alejar"
                      className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400/60 text-slate-200 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] text-indigo-200 bg-indigo-500/10 border border-indigo-500/25 rounded-md px-1.5 py-0.5">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustZoom(0.15)}
                      title="Acercar"
                      className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400/60 text-slate-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleFitToWidth()}
                      title="Ajustar documento al ancho disponible"
                      className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400/60 text-[11px] text-slate-200 font-medium transition-colors"
                    >
                      Ajustar
                    </button>
                    <button
                      type="button"
                      disabled={totalPages <= 1}
                      onClick={() => void handleToggleViewMode()}
                      title={
                        viewMode === 'double'
                          ? 'Cambiar a 1 hoja'
                          : 'Modo libro: 2 hojas juntas (avanza de 1 en 1)'
                      }
                      className={`px-2 py-1 rounded-lg border font-medium flex items-center gap-1 text-[11px] transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                        viewMode === 'double'
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-slate-800/90 hover:bg-indigo-500/20 border-indigo-500/30 hover:border-indigo-400/60 text-slate-200'
                      }`}
                    >
                      <Columns2 className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">
                        {viewMode === 'double' ? '2 Hojas' : '1 Hoja'}
                      </span>
                    </button>
                  </div>

                  <span className="hidden sm:block w-px h-5 bg-indigo-500/25" />

                  {/* Notas, colores y agregados */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-slate-950/85 px-1.5 py-1 rounded-lg border border-slate-800">
                      {NOTE_COLORS.map((c) => (
                        <button
                          key={`dock-${c.id}`}
                          type="button"
                          title={c.label}
                          onClick={() => setSelectedColor(c.id)}
                          className={`w-3.5 h-3.5 rounded-full ${c.dotClass} transition-transform ${
                            selectedColor === c.id
                              ? 'border-2 border-white scale-110'
                              : 'border border-transparent opacity-70 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleAddMarginNote()}
                      title="Agregar nota en el margen sin tapar el texto"
                      className="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/45 text-indigo-200 font-medium flex items-center gap-1 text-[11px] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Al margen</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleStickyMode}
                      title="Fijar post-it donde hagas clic o toque"
                      className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 text-[11px] transition-colors ${
                        stickyMode
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
                      }`}
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                      <span>{stickyMode ? 'Fijar Activo' : 'Pegar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowNotesRail((v) => !v)}
                      title="Mostrar u ocultar panel de notas"
                      className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 text-[11px] transition-colors ${
                        showNotesRail
                          ? 'bg-indigo-500/25 border border-indigo-500/55 text-indigo-200'
                          : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
                      }`}
                    >
                      <PanelRight className="w-3.5 h-3.5" />
                      <span className="font-mono">{docNotes.length}</span>
                    </button>
                  </div>

                  <span className="hidden sm:block w-px h-5 bg-slate-700/80" />

                  {/* Diagnostico, temporizador rapido, fullscreen y minimizar */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleDiagnostic(!diagnosticData.isActive)}
                      title="Alternar Modo Diagnóstico"
                      className={`p-1.5 rounded-lg border transition-colors ${
                        diagnosticData.isActive
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={toggleTimer}
                      title={isRunning ? 'Pausar temporizador' : 'Iniciar temporizador'}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1 text-[11px] font-mono"
                    >
                      {isRunning ? (
                        <Pause className="w-3 h-3 text-indigo-400" />
                      ) : (
                        <Play className="w-3 h-3 text-indigo-400" />
                      )}
                      <span>{formattedClock}</span>
                    </button>

                    {(activeRouteStep || isRunning) && (
                      <button
                        type="button"
                        onClick={
                          hasPackedSegments && activeSegmentIndex < activeSegments.length - 1
                            ? completeCurrentSegment
                            : completeCurrentBlock
                        }
                        title={
                          hasPackedSegments && activeSegmentIndex < activeSegments.length - 1
                            ? 'Terminar este archivo y pasar al siguiente del bloque'
                            : 'Completar bloque e iniciar descanso'
                        }
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void toggleFullscreen()}
                      title={
                        isFullscreen
                          ? 'Salir de pantalla completa (Esc)'
                          : 'Modo inmersivo pantalla completa'
                      }
                      className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 text-[11px] transition-colors ${
                        isFullscreen
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          : 'bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/45 text-indigo-200'
                      }`}
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Salir</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Inmersivo</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDockCollapsed(true)}
                      title="Minimizar barra flotante"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel lateral plegable de todas las notas junto al archivo */}
        {showNotesRail && activeDoc && (
          <aside
            className={
              isFullscreen
                ? 'w-72 sm:w-80 border-l border-indigo-500/35 bg-slate-900/95 backdrop-blur-md flex flex-col flex-shrink-0 z-40 absolute inset-y-0 right-0 shadow-2xl'
                : 'w-72 sm:w-80 border-l border-indigo-500/35 bg-slate-900/95 backdrop-blur-md flex flex-col flex-shrink-0 z-30 absolute inset-y-0 right-0 shadow-2xl lg:static lg:shadow-none'
            }
          >
            <div className="p-3 border-b border-indigo-500/25 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
                  Notas junto al archivo
                </h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleAddMarginNote()}
                    className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nueva</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNotesRail(false)}
                    title="Cerrar panel de notas"
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setRailFilter('page')}
                  className={`py-1 rounded font-medium ${railFilter === 'page'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Esta pág. ({pageNotes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRailFilter('doc')}
                  className={`py-1 rounded font-medium ${railFilter === 'doc'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Todo el doc ({docNotes.length})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {(railFilter === 'page' ? pageNotes : docNotes).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8 px-3">
                  Sin notas aquí todavía. Haz clic en <strong>+ Nueva</strong> o en{' '}
                  <strong>Al margen</strong> para anotar sin tapar el documento.
                </p>
              ) : (
                (railFilter === 'page' ? pageNotes : docNotes).map((note) => {
                  const isInsideSheet =
                    (note.xRatio ?? 0.5) > -0.04 && (note.xRatio ?? 0.5) < 0.96;
                  return (
                    <div
                      key={note.id}
                      className={`p-2.5 rounded-xl border note-${note.color} flex flex-col gap-1.5 shadow-sm`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-semibold border-b border-black/10 pb-1">
                        <button
                          type="button"
                          onClick={() =>
                            note.page && onChangePage(activeDoc.id, note.page)
                          }
                          className="hover:underline font-mono"
                        >
                          {note.page
                            ? `${activeDoc.fileType === 'pptx' ? 'Slide' : 'Pág.'} ${note.page}`
                            : 'General'}
                        </button>
                        <div className="flex items-center gap-1">
                          {isInsideSheet && note.page === currentPage && (
                            <button
                              type="button"
                              onClick={() => void handleMoveNoteToMargin(note)}
                              className="px-1.5 py-0.5 rounded bg-black/10 hover:bg-black/20 text-[9px]"
                              title="Sacar al margen fuera de la hoja"
                            >
                              Al margen
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void onDeleteNote(note.id)}
                            className="p-0.5 rounded hover:bg-black/15"
                            title="Eliminar nota"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        value={draftTexts[note.id] ?? note.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftTexts((prev) => ({ ...prev, [note.id]: val }));
                          const existingTimer = saveTimersRef.current.get(note.id);
                          if (existingTimer) window.clearTimeout(existingTimer);
                          const timerId = window.setTimeout(() => {
                            saveTimersRef.current.delete(note.id);
                            void onUpdateNote(note.id, { content: val });
                          }, 450);
                          saveTimersRef.current.set(note.id, timerId);
                        }}
                        onBlur={(e) => {
                          const existingTimer = saveTimersRef.current.get(note.id);
                          if (existingTimer) {
                            window.clearTimeout(existingTimer);
                            saveTimersRef.current.delete(note.id);
                          }
                          if (e.target.value !== note.content) {
                            void onUpdateNote(note.id, { content: e.target.value });
                          }
                        }}
                        rows={3}
                        placeholder="Escribe un apunte..."
                        className="w-full bg-transparent resize-none border-0 p-0 text-xs focus:outline-none placeholder-black/40 leading-snug"
                      />

                      <div className="flex items-center justify-between pt-1 border-t border-black/10 text-[9px]">
                        <select
                          value={note.zone}
                          onChange={(e) =>
                            void onUpdateNote(note.id, {
                              zone: e.target.value as KanbanZone,
                            })
                          }
                          className="bg-black/10 rounded px-1 py-0.5 font-semibold focus:outline-none"
                        >
                          <option value="ideas">Ideas Clave</option>
                          <option value="preguntas">Preguntas</option>
                          <option value="resumen">Resumen</option>
                          <option value="tareas">Tareas</option>
                        </select>
                        <div className="flex items-center gap-1">
                          {NOTE_COLORS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => void onUpdateNote(note.id, { color: c.id })}
                              className={`w-2.5 h-2.5 rounded-full ${c.dotClass} border ${note.color === c.id
                                  ? 'border-slate-900 scale-110'
                                  : 'border-black/20 opacity-70'
                                }`}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Barra inferior */}
      {!isFullscreen && (
        <div className="hidden sm:flex h-7 border-t border-indigo-500/25 bg-slate-900/85 backdrop-blur px-3 items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
          <span className="truncate max-w-xs md:max-w-md text-slate-300">
            {activeDoc ? activeDoc.name : 'Sin archivo abierto'}
          </span>
          <span className="font-mono text-indigo-300">{pageNotes.length} notas en esta página</span>
        </div>
      )}

      {/* Prompt de finalizacion anticipada (terminaste antes de que acabe el bloque) */}
      {transitionPrompt && mode === 'study' && (
        <div className="absolute inset-0 z-[60] backdrop-blur-sm bg-slate-950/65 flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900/95 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Terminaste antes del tiempo estimado
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  Quedan {Math.ceil(transitionPrompt.unusedSeconds / 60)} min en este bloque
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Elige si prefieres aprovechar ese tiempo para seguir avanzando o sumarlo a tu descanso.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissTransitionPrompt}
                className="text-slate-400 hover:text-white p-1"
                title="Volver a la lectura"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {transitionPrompt.kind === 'segment_early' && transitionPrompt.nextSegment && (
                <button
                  type="button"
                  onClick={() => chooseContinueNextSegment()}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-between transition-colors"
                >
                  <span className="truncate text-left">
                    Seguir de inmediato: {transitionPrompt.nextSegment.docName} (Págs.{' '}
                    {transitionPrompt.nextSegment.startPage}–
                    {transitionPrompt.nextSegment.endPage})
                  </span>
                  <ArrowRight className="w-4 h-4 flex-shrink-0 ml-2" />
                </button>
              )}

              {transitionPrompt.kind === 'block_early' && (
                <button
                  type="button"
                  onClick={chooseSkipBreakToNextBlock}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-between transition-colors"
                >
                  <span>Seguir de inmediato al siguiente bloque</span>
                  <ArrowRight className="w-4 h-4 flex-shrink-0 ml-2" />
                </button>
              )}

              <button
                type="button"
                onClick={() => chooseStartBreak(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 font-medium flex items-center justify-between transition-colors"
              >
                <span>
                  Usar tiempo sobrante +{' '}
                  {transitionPrompt.recommendedBreakType === 'long'
                    ? 'descanso largo'
                    : 'descanso corto'}{' '}
                  (
                  {transitionPrompt.recommendedBreakMinutes +
                    Math.floor(transitionPrompt.unusedSeconds / 60)}{' '}
                  min)
                </span>
                <Coffee className="w-4 h-4 flex-shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => chooseStartBreak(false)}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium flex items-center justify-between transition-colors"
              >
                <span>
                  Iniciar{' '}
                  {transitionPrompt.recommendedBreakType === 'long'
                    ? 'descanso largo'
                    : 'descanso corto'}{' '}
                  estándar ({transitionPrompt.recommendedBreakMinutes} min)
                </span>
                <Clock className="w-4 h-4 flex-shrink-0 ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay minimalista con blur durante Descanso Corto / Largo */}
      {mode !== 'study' && (
        <div className="absolute inset-0 z-[60] backdrop-blur-md bg-slate-950/80 flex items-center justify-center p-6 fade-in">
          <div className="max-w-sm w-full flex flex-col items-center text-center space-y-5">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest border ${mode === 'long'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                }`}
            >
              {mode === 'long' ? 'Descanso Largo' : 'Descanso Corto'}
            </span>

            {/* Aro minimalista */}
            <div className="relative w-52 h-52 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-slate-800/80"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeDasharray="276.46"
                  strokeDashoffset={
                    276.46 * (1 - remainingSeconds / Math.max(1, totalDurationSeconds))
                  }
                  strokeLinecap="round"
                  className={`transition-all duration-300 ${mode === 'long' ? 'text-purple-400' : 'text-sky-400'
                    }`}
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-5xl font-extrabold font-mono text-white tracking-tight">
                  {formattedClock}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  {isRunning ? 'Descansa la vista' : 'Descanso en pausa'}
                </span>
              </div>
            </div>

            {upcomingAfterBreakLabel && (
              <p className="text-xs text-slate-300 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg max-w-full truncate">
                Luego: <span className="text-white font-medium">{upcomingAfterBreakLabel}</span>
              </p>
            )}

            {/* Controles minimalistas de tiempo y salto */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => adjustTimerSeconds(-300)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300"
                title="Reducir 5 minutos"
              >
                -5m
              </button>
              <button
                type="button"
                onClick={() => adjustTimerSeconds(-60)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300"
                title="Reducir 1 minuto"
              >
                -1m
              </button>
              <button
                type="button"
                onClick={toggleTimer}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-white flex items-center gap-1.5"
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? 'Pausar' : 'Reanudar'}</span>
              </button>
              <button
                type="button"
                onClick={() => adjustTimerSeconds(60)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300"
                title="Agregar 1 minuto"
              >
                +1m
              </button>
            </div>

            <div className="flex flex-col w-full gap-2 pt-1">
              <button
                type="button"
                onClick={skipBreakAndContinue}
                className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Saltar descanso y continuar</span>
              </button>

              {canExtendStudyFromBreak && (
                <button
                  type="button"
                  onClick={() => extendStudyAndAdaptPlan(5)}
                  className="w-full py-2 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Aún me falta lectura · Seguir leyendo (+5m y adaptar plan)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
