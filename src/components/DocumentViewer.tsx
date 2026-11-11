import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import {
  Activity,
  ArrowRight,
  ArrowRightFromLine,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  FastForward,
  Gauge,
  Loader2,
  MessageSquare,
  Minus,
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
}

const NOTE_COLORS: Array<{ id: NoteColor; label: string; dotClass: string }> = [
  { id: 'yellow', label: 'Nota Amarilla', dotClass: 'bg-amber-300' },
  { id: 'cyan', label: 'Nota Celeste', dotClass: 'bg-sky-300' },
  { id: 'green', label: 'Nota Verde', dotClass: 'bg-emerald-300' },
  { id: 'lavender', label: 'Nota Lavanda', dotClass: 'bg-purple-300' },
];

const NOTE_WIDTH = 212;
const STAGE_VERT_MARGIN = 28;

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

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const activeRenderTaskRef = useRef<RenderTask | null>(null);

  const [zoom, setZoom] = useState<number>(1.0);
  const [stickyMode, setStickyMode] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<NoteColor>('yellow');
  const [showSpeakerNotes, setShowSpeakerNotes] = useState<boolean>(true);
  const [showNotesRail, setShowNotesRail] = useState<boolean>(false);
  const [railFilter, setRailFilter] = useState<'page' | 'doc'>('page');
  const [livePendingSeconds, setLivePendingSeconds] = useState<number>(0);

  const lastActivityRef = useRef<number>(Date.now());
  const pendingDiagnosticSecRef = useRef<number>(0);
  const onRecordDiagnosticRef = useRef(onRecordDiagnosticSample);
  onRecordDiagnosticRef.current = onRecordDiagnosticSample;

  const [pdfProxy, setPdfProxy] = useState<PDFDocumentProxy | null>(null);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number }>({
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
    startX: number;
    startY: number;
    startLeftFromSheetPx: number;
    startTopFromSheetPx: number;
    minLeftFromSheetPx: number;
    maxLeftFromSheetPx: number;
    minTopFromSheetPx: number;
    maxTopFromSheetPx: number;
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
          const message =
            err instanceof Error ? err.message : 'Error al procesar el documento';
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

  // Renderizar pagina PDF en Canvas
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
        const safePage = Math.min(Math.max(1, currentPage), pdfProxy.numPages);
        const page = await pdfProxy.getPage(safePage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: zoom });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setPdfDimensions({ width: viewport.width, height: viewport.height });

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const task = page.render({ canvasContext: ctx, viewport });
        activeRenderTaskRef.current = task;
        await task.promise;
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
    };
  }, [activeDoc, pdfProxy, currentPage, zoom]);

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
      const minDx = st.minLeftFromSheetPx - st.startLeftFromSheetPx;
      const maxDx = st.maxLeftFromSheetPx - st.startLeftFromSheetPx;
      const minDy = st.minTopFromSheetPx - st.startTopFromSheetPx;
      const maxDy = st.maxTopFromSheetPx - st.startTopFromSheetPx;

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

  const startDraggingNote = (e: React.PointerEvent<HTMLDivElement>, noteId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const stage = stageRef.current;
    const sheet = sheetRef.current;
    const noteEl = noteRefs.current.get(noteId);
    if (!stage || !sheet || !noteEl) return;

    const stageRect = stage.getBoundingClientRect();
    const sheetRect = sheet.getBoundingClientRect();
    const noteRect = noteEl.getBoundingClientRect();

    noteEl.style.willChange = 'transform';

    dragStateRef.current = {
      noteId,
      startX: e.clientX,
      startY: e.clientY,
      startLeftFromSheetPx: noteRect.left - sheetRect.left,
      startTopFromSheetPx: noteRect.top - sheetRect.top,
      minLeftFromSheetPx: stageRect.left + 8 - sheetRect.left,
      maxLeftFromSheetPx: stageRect.right - noteRect.width - 8 - sheetRect.left,
      minTopFromSheetPx: stageRect.top + 8 - sheetRect.top,
      maxTopFromSheetPx: stageRect.bottom - noteRect.height - 8 - sheetRect.top,
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

  const stageSideMargin = Math.max(240, Math.round(sheetWidth * 0.31));

  // Centrar horizontalmente la hoja en el viewport cuando se abre un doc o cambia el zoom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !activeDoc || isLoadingBuffer || isParsingDoc) return;
    const raf = window.requestAnimationFrame(() => {
      if (container.scrollWidth > container.clientWidth) {
        container.scrollLeft = Math.max(
          0,
          (container.scrollWidth - container.clientWidth) / 2
        );
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [activeDoc?.id, zoom, sheetWidth, isLoadingBuffer, isParsingDoc]);

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

  const handleFitToWidth = async () => {
    const container = scrollContainerRef.current;
    if (!container || !activeDoc) return;
    const availableWidth = Math.max(300, container.clientWidth - 48);

    if (activeDoc.fileType === 'pdf' && pdfProxy) {
      const page = await pdfProxy.getPage(Math.min(currentPage, pdfProxy.numPages));
      const vp = page.getViewport({ scale: 1.0 });
      setZoom(Math.max(0.5, Math.min(2.5, availableWidth / vp.width)));
    } else if (activeDoc.fileType === 'pptx') {
      setZoom(Math.max(0.5, Math.min(2.2, availableWidth / 860)));
    } else {
      setZoom(Math.max(0.5, Math.min(2.0, availableWidth / 794)));
    }
  };

  const handleStageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stickyMode || !activeDoc) return;
    if ((e.target as HTMLElement).closest('.sticky-note-element')) return;
    const stage = stageRef.current;
    const sheet = sheetRef.current;
    if (!stage || !sheet) return;

    const stageRect = stage.getBoundingClientRect();
    const sheetRect = sheet.getBoundingClientRect();

    const minLeftFromSheet = stageRect.left + 8 - sheetRect.left;
    const maxLeftFromSheet = stageRect.right - NOTE_WIDTH - 8 - sheetRect.left;
    const minTopFromSheet = stageRect.top + 8 - sheetRect.top;
    const maxTopFromSheet = stageRect.bottom - 115 - sheetRect.top;

    const rawLeft = e.clientX - sheetRect.left;
    const rawTop = e.clientY - sheetRect.top;

    const clampedLeft = Math.max(minLeftFromSheet, Math.min(maxLeftFromSheet, rawLeft));
    const clampedTop = Math.max(minTopFromSheet, Math.min(maxTopFromSheet, rawTop));

    const xRatio = clampedLeft / Math.max(1, sheetRect.width);
    const yRatio = clampedTop / Math.max(1, sheetRect.height);

    await onCreateNote({
      docId: activeDoc.id,
      page: currentPage,
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
  const currentSlide = pptxData?.slides[Math.min(currentPage - 1, Math.max(0, pptxData.slides.length - 1))];

  return (
    <section className="flex-1 flex flex-col h-3/5 md:h-full bg-slate-950 overflow-hidden relative">
      {/* Barra de herramientas del visor */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/90 px-3 flex items-center justify-between flex-shrink-0 z-20 gap-2">
        {/* Navegacion de paginas */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            disabled={!activeDoc || currentPage <= 1}
            onClick={() => activeDoc && onChangePage(activeDoc.id, currentPage - 1)}
            title="Página anterior"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center text-xs text-slate-300 font-mono">
            <input
              type="number"
              min={1}
              max={totalPages}
              disabled={!activeDoc}
              value={activeDoc ? currentPage : 0}
              onChange={(e) => {
                if (!activeDoc) return;
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val)) {
                  onChangePage(
                    activeDoc.id,
                    Math.min(Math.max(1, val), Math.max(1, totalPages))
                  );
                }
              }}
              className="w-12 text-center bg-slate-950 border border-slate-700 rounded-md py-0.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <span className="mx-1 text-slate-400">/</span>
            <span>{activeDoc ? totalPages : 0}</span>
          </div>
          <button
            type="button"
            disabled={!activeDoc || currentPage >= totalPages}
            onClick={() => activeDoc && onChangePage(activeDoc.id, currentPage + 1)}
            title="Página siguiente"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom */}
        <div className="hidden sm:flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
            title="Alejar"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-300 px-1.5">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            title="Acercar"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleFitToWidth()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2"
          >
            Ajustar
          </button>
        </div>

        {/* Herramientas Post-it */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                onClick={() => setSelectedColor(c.id)}
                className={`w-4 h-4 rounded-full ${c.dotClass} transition-transform ${selectedColor === c.id
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
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-indigo-500/40 bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-200 flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Al margen</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!activeDoc) {
                onNotify('Abre un documento primero para fijar notas', 'warning');
                return;
              }
              const next = !stickyMode;
              setStickyMode(next);
              if (next) {
                onNotify(
                  'Haz clic en los márgenes laterales o en el documento para fijar la nota',
                  'info'
                );
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${stickyMode
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
              }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>{stickyMode ? 'Fijar Activo' : 'Pegar Nota'}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleDiagnostic(!diagnosticData.isActive)}
            title="Medir tiempo real por página para calcular el Pomodoro recomendado"
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${diagnosticData.isActive
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
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${showNotesRail
                ? 'bg-slate-700 text-white border border-slate-600'
                : 'border border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
              }`}
          >
            <PanelRight className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Notas</span>
            <span className="font-mono text-[10px] px-1 rounded bg-slate-950/70">
              {docNotes.length}
            </span>
          </button>
        </div>
      </div>

      {/* Mini barra de ruta y temporizador integrada en lectura */}
      {(activeRouteStep ||
        nextPendingStudyInfo ||
        isRunning ||
        studySettings.intervalMode === 'pages') && (
          <div className="px-3 py-1.5 border-b border-slate-800 bg-indigo-950/30 flex flex-wrap items-center justify-between gap-2 text-xs z-20">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300">
                {formattedClock}
              </span>

              {activeRouteStep ? (
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
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

            <div className="flex items-center gap-1.5">
              {!activeRouteStep && nextPendingStudyInfo && !isRunning ? (
                <button
                  type="button"
                  onClick={() =>
                    onStartRouteStep(
                      nextPendingStudyInfo.step,
                      nextPendingStudyInfo.nextStep
                    )
                  }
                  className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 text-[11px]"
                >
                  <Play className="w-3 h-3" />
                  <span>Iniciar bloque de ruta</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={toggleTimer}
                    className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 text-[11px]"
                  >
                    {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isRunning ? 'Pausar' : 'Iniciar'}</span>
                  </button>
                  {hasPackedSegments &&
                    activeSegmentIndex < activeSegments.length - 1 ? (
                    <button
                      type="button"
                      onClick={completeCurrentSegment}
                      className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1 text-[11px]"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Terminar archivo</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={completeCurrentBlock}
                      className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1 text-[11px]"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Completar bloque</span>
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

      {/* Area de Lectura + Panel lateral opcional de Notas */}
      <div className="flex-1 flex overflow-hidden relative">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto p-4 flex flex-col items-start bg-slate-950"
        >
          {!activeDoc ? (
            <div className="m-auto text-center py-20 px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">
                Selecciona o carga un documento
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Compatible con PDF, Word (.docx) y presentaciones PowerPoint (.pptx).
              </p>
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
                width: `${sheetWidth + stageSideMargin * 2}px`,
                minHeight: `${sheetMinHeight + STAGE_VERT_MARGIN * 2}px`,
                padding: `${STAGE_VERT_MARGIN}px ${stageSideMargin}px`,
              }}
              className={`mx-auto relative flex flex-col items-center gap-4 ${stickyMode ? 'cursor-crosshair-mode' : ''
                }`}
            >
              {/* Guías sutiles de márgenes libres mientras colocas o arrastras un post-it */}
              {(stickyMode || draggingNoteId) && (
                <>
                  <div
                    style={{
                      left: '12px',
                      top: `${STAGE_VERT_MARGIN}px`,
                      width: `${stageSideMargin - 24}px`,
                      height: `${sheetMinHeight}px`,
                    }}
                    className="pointer-events-none absolute rounded-2xl border border-dashed border-indigo-500/35 bg-indigo-500/[0.03] flex items-start justify-center pt-4"
                  >
                    <span className="text-[10px] font-medium text-indigo-300/75 uppercase tracking-wider">
                      Margen izquierdo libre
                    </span>
                  </div>
                  <div
                    style={{
                      right: '12px',
                      top: `${STAGE_VERT_MARGIN}px`,
                      width: `${stageSideMargin - 24}px`,
                      height: `${sheetMinHeight}px`,
                    }}
                    className="pointer-events-none absolute rounded-2xl border border-dashed border-indigo-500/35 bg-indigo-500/[0.03] flex items-start justify-center pt-4"
                  >
                    <span className="text-[10px] font-medium text-indigo-300/75 uppercase tracking-wider">
                      Margen derecho libre
                    </span>
                  </div>
                </>
              )}

              {/* Hoja / Diapositiva + Capa de Notas (permite coordenadas fuera de la hoja) */}
              <div
                ref={sheetRef}
                className="relative shadow-2xl rounded-sm overflow-visible transition-colors duration-200"
                style={{
                  width: `${sheetWidth}px`,
                  minHeight: `${sheetMinHeight}px`,
                  backgroundColor: 'var(--sf-paper-bg, #ffffff)',
                }}
              >
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
                    {currentSlide.elements.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                        Diapositiva sin elementos de texto visibles
                      </div>
                    ) : (
                      currentSlide.elements.map((el) => {
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
                                <table
                                  className="w-full border-collapse"
                                  style={{ color: '#0f172a' }}
                                >
                                  <tbody>
                                    {el.rows.map((row, rIdx) => (
                                        <tr
                                          key={rIdx}
                                          className={rIdx === 0 ? 'font-semibold' : ''}
                                          style={
                                            rIdx === 0
                                              ? { backgroundColor: '#f1f5f9' }
                                              : undefined
                                          }
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
                      })
                    )}
                  </div>
                )}

                {/* Capa Interactiva de Post-its (desborda hacia los márgenes libres) */}
                <div
                  ref={overlayRef}
                  className="absolute inset-0 select-none overflow-visible pointer-events-none"
                >
                  {pageNotes.map((note) => {
                    const x = note.xRatio ?? 1.025;
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
                        className={`sticky-note-element pointer-events-auto absolute p-2 rounded-xl border flex flex-col note-${note.color
                          } ${isDragging
                            ? 'shadow-2xl ring-2 ring-indigo-400/80 select-none'
                            : isHighlighted
                              ? 'shadow-2xl ring-4 ring-indigo-400 animate-pulse'
                              : 'shadow-xl transition-shadow'
                          }`}
                      >
                        <div
                          onPointerDown={(e) => startDraggingNote(e, note.id)}
                          className="flex items-center justify-between pb-1 mb-1 border-b border-black/10 text-[10px] font-semibold select-none cursor-grab active:cursor-grabbing touch-none"
                          title="Arrastra hacia los márgenes laterales o sobre el documento"
                        >
                          <span>
                            {activeDoc.fileType === 'pptx' ? 'Slide' : 'Pág.'} {note.page}
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
                                className={`w-2.5 h-2.5 rounded-full ${c.dotClass} border ${note.color === c.id ? 'border-slate-900 scale-110' : 'border-black/20 opacity-70'
                                  }`}
                                title={c.label}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notas del orador en PPTX */}
              {activeDoc.fileType === 'pptx' && currentSlide?.speakerNotes && (
                <div
                  style={{ width: `${sheetWidth}px` }}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-300"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Notas del orador (Slide {currentSlide.slideNumber})
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
                    <p className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                      {currentSlide.speakerNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel lateral plegable de todas las notas junto al archivo */}
        {showNotesRail && activeDoc && (
          <aside className="w-72 md:w-80 border-l border-slate-800 bg-slate-900/90 flex flex-col flex-shrink-0 z-20">
            <div className="p-3 border-b border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Notas junto al archivo
                </h3>
                <button
                  type="button"
                  onClick={() => void handleAddMarginNote()}
                  className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nueva</span>
                </button>
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
      <div className="h-8 border-t border-slate-800 bg-slate-900/60 px-4 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
        <span className="truncate max-w-xs md:max-w-md">
          {activeDoc ? activeDoc.name : 'Sin archivo abierto'}
        </span>
        <span className="font-mono">{pageNotes.length} notas en esta página</span>
      </div>

      {/* Prompt de finalizacion anticipada (terminaste antes de que acabe el bloque) */}
      {transitionPrompt && mode === 'study' && (
        <div className="absolute inset-0 z-40 backdrop-blur-sm bg-slate-950/65 flex items-center justify-center p-4 fade-in">
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
        <div className="absolute inset-0 z-40 backdrop-blur-md bg-slate-950/80 flex items-center justify-center p-6 fade-in">
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
