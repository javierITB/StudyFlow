import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Minus,
  Pause,
  Play,
  Plus,
  StickyNote,
  X,
} from 'lucide-react';
import {
  DocumentRecord,
  NoteColor,
  StickyNoteRecord,
  StudySettings,
} from '../types/studyflow';
import type { DocxPage } from '../lib/docxParser';
import type { ParsedPptxPresentation } from '../lib/pptxParser';
import { useTimer } from '../context/TimerContext';

interface DocumentViewerProps {
  activeDoc: DocumentRecord | null;
  documentBuffer: ArrayBuffer | null;
  isLoadingBuffer: boolean;
  notes: StickyNoteRecord[];
  studySettings: StudySettings;
  onChangePage: (docId: string, page: number) => void;
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

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  activeDoc,
  documentBuffer,
  isLoadingBuffer,
  notes,
  studySettings,
  onChangePage,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onNotify,
}) => {
  const {
    mode,
    remainingSeconds,
    elapsedSeconds,
    isRunning,
    activeRouteStep,
    toggleTimer,
    completeCurrentBlock,
  } = useTimer();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const activeRenderTaskRef = useRef<RenderTask | null>(null);

  const [zoom, setZoom] = useState<number>(1.0);
  const [stickyMode, setStickyMode] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<NoteColor>('yellow');
  const [showSpeakerNotes, setShowSpeakerNotes] = useState<boolean>(true);

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

  const currentPage = activeDoc?.currentPage || 1;
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

  // Sincronizar textos iniciales de notas
  useEffect(() => {
    const map: Record<string, string> = {};
    notes.forEach((n) => {
      map[n.id] = n.content;
    });
    setDraftTexts(map);
  }, [notes]);

  const pageNotes = activeDoc
    ? notes.filter((n) => n.docId === activeDoc.id && n.page === currentPage)
    : [];

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

  const handleOverlayClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stickyMode || !activeDoc) return;
    if ((e.target as HTMLElement).closest('.sticky-note-element')) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const xRatio = Math.max(0.02, Math.min(0.84, (e.clientX - rect.left) / rect.width));
    const yRatio = Math.max(0.02, Math.min(0.84, (e.clientY - rect.top) / rect.height));

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

  const handleDragOverlayDrop = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingNoteId || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const xRatio = Math.max(0.01, Math.min(0.85, (e.clientX - rect.left) / rect.width));
    const yRatio = Math.max(0.01, Math.min(0.85, (e.clientY - rect.top) / rect.height));
    const noteId = draggingNoteId;
    setDraggingNoteId(null);
    await onUpdateNote(noteId, { xRatio, yRatio });
  };

  const isPageStopwatch = mode === 'study' && studySettings.intervalMode === 'pages';
  const timerSec = isPageStopwatch ? elapsedSeconds : remainingSeconds;
  const formattedClock = `${String(Math.floor(timerSec / 60)).padStart(2, '0')}:${String(
    timerSec % 60
  ).padStart(2, '0')}`;

  const currentDocxPage = docxPages[Math.min(currentPage - 1, Math.max(0, docxPages.length - 1))];
  const currentSlide = pptxData?.slides[Math.min(currentPage - 1, Math.max(0, pptxData.slides.length - 1))];

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
                className={`w-4 h-4 rounded-full ${c.dotClass} transition-transform ${
                  selectedColor === c.id
                    ? 'border-2 border-white scale-110'
                    : 'border border-transparent opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>

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
                onNotify('Haz clic en el documento para pegar una nota adhesiva', 'info');
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              stickyMode
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>{stickyMode ? 'Fijar Activo' : 'Pegar Nota'}</span>
          </button>
        </div>
      </div>

      {/* Mini barra de sesion activa / progreso por paginas dentro del visor */}
      {(activeRouteStep || isRunning || studySettings.intervalMode === 'pages') && (
        <div className="px-3 py-1.5 border-b border-slate-800 bg-indigo-950/30 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300">
              {formattedClock}
            </span>
            {activeRouteStep ? (
              <span className="text-slate-200 truncate">
                {activeRouteStep.type === 'study'
                  ? `Meta de ruta: ${activeRouteStep.docName} · Págs. ${activeRouteStep.startPage}–${activeRouteStep.endPage}`
                  : `${activeRouteStep.type === 'long_break' ? 'Descanso largo' : 'Descanso corto'} (${activeRouteStep.durationMinutes} min)`}
              </span>
            ) : (
              <span className="text-slate-300 truncate">
                {studySettings.intervalMode === 'pages'
                  ? `Modo por páginas: bloques de ${studySettings.pagesPerBlock} págs · Descanso ${studySettings.shortBreakMinutes}/${studySettings.longBreakMinutes} min`
                  : `Ciclo activo: ${
                      mode === 'study'
                        ? `Estudio (${studySettings.studyMinutes}m)`
                        : mode === 'short'
                          ? `Descanso corto (${studySettings.shortBreakMinutes}m)`
                          : `Descanso largo (${studySettings.longBreakMinutes}m)`
                    }`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTimer}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 text-[11px]"
            >
              {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isRunning ? 'Pausar' : 'Iniciar'}</span>
            </button>
            <button
              type="button"
              onClick={completeCurrentBlock}
              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1 text-[11px]"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Completar bloque</span>
            </button>
          </div>
        </div>
      )}

      {/* Area de Lectura */}
      <div
        ref={scrollContainerRef}
        onMouseUp={(e) => void handleDragOverlayDrop(e)}
        className="flex-1 overflow-auto p-4 flex flex-col items-center bg-slate-950"
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
          <div className="flex flex-col items-center gap-4">
            {/* Hoja / Diapositiva + Capa de Notas */}
            <div
              className="relative shadow-2xl rounded-sm overflow-visible bg-white"
              style={{
                width: `${sheetWidth}px`,
                minHeight: `${sheetMinHeight}px`,
              }}
            >
              {activeDoc.fileType === 'pdf' && (
                <canvas ref={pdfCanvasRef} className="block" />
              )}

              {activeDoc.fileType === 'docx' && currentDocxPage && (
                <div
                  className="bg-white text-slate-900 p-10 sm:p-12 docx-sheet-content select-text"
                  style={{
                    minHeight: `${sheetMinHeight}px`,
                    fontSize: `${Math.round(14 * zoom)}px`,
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
                            <table className="w-full border-collapse text-slate-900">
                              <tbody>
                                {el.rows.map((row, rIdx) => (
                                  <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-100 font-semibold' : ''}>
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
                              style={{ textAlign: p.align }}
                              className="leading-snug mb-1 text-slate-900"
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

              {/* Capa Interactiva de Post-its */}
              <div
                ref={overlayRef}
                onClick={(e) => void handleOverlayClick(e)}
                className={`absolute inset-0 select-none ${
                  stickyMode ? 'cursor-crosshair-mode' : 'pointer-events-none'
                }`}
              >
                {pageNotes.map((note) => {
                  const x = note.xRatio ?? 0.1;
                  const y = note.yRatio ?? 0.1;
                  return (
                    <div
                      key={note.id}
                      style={{
                        left: `${x * 100}%`,
                        top: `${y * 100}%`,
                        width: '210px',
                        zIndex: 30,
                      }}
                      className={`sticky-note-element pointer-events-auto absolute p-2 rounded-xl border shadow-xl flex flex-col note-${note.color}`}
                    >
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingNoteId(note.id);
                        }}
                        className="flex items-center justify-between pb-1 mb-1 border-b border-black/10 text-[10px] font-semibold select-none cursor-move"
                        title="Arrastra para mover dentro de la página"
                      >
                        <span>
                          {activeDoc.fileType === 'pptx' ? 'Slide' : 'Pág.'} {note.page}
                        </span>
                        <button
                          type="button"
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
                      <textarea
                        value={draftTexts[note.id] ?? note.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftTexts((prev) => ({ ...prev, [note.id]: val }));
                        }}
                        onBlur={(e) => {
                          if (e.target.value !== note.content) {
                            void onUpdateNote(note.id, { content: e.target.value });
                          }
                        }}
                        rows={3}
                        placeholder="Escribe un apunte..."
                        className="w-full bg-transparent resize-none border-0 p-0 text-xs focus:outline-none placeholder-black/40 leading-snug"
                      />
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

      {/* Barra inferior */}
      <div className="h-8 border-t border-slate-800 bg-slate-900/60 px-4 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
        <span className="truncate max-w-xs md:max-w-md">
          {activeDoc ? activeDoc.name : 'Sin archivo abierto'}
        </span>
        <span className="font-mono">{pageNotes.length} notas en esta página</span>
      </div>
    </section>
  );
};
