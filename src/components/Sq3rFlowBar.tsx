import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  EyeOff,
  HelpCircle,
  LayoutGrid,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  DocumentRecord,
  Sq3rDocumentState,
  Sq3rStage,
  StickyNoteRecord,
} from '../types/studyflow';
import type { DocxPage } from '../lib/docxParser';
import type { ParsedPptxPresentation } from '../lib/pptxParser';
import { extractPptxSlidePlainText } from '../lib/documentUtils';

interface Sq3rFlowBarProps {
  doc: DocumentRecord;
  state: Sq3rDocumentState;
  pdfDocument?: PDFDocumentProxy | null;
  docxPages?: DocxPage[];
  pptxData?: ParsedPptxPresentation | null;
  onUpdateState: (next: Sq3rDocumentState) => void;
  onCreateNote: (note: Omit<StickyNoteRecord, 'id' | 'createdAt'>) => Promise<void>;
  onJumpToPage: (page: number) => void;
  onOpenBoardForDoc: (docId: string) => void;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const STAGE_LIST: Array<{ id: Sq3rStage; code: string; label: string }> = [
  { id: 'survey', code: 'S', label: 'Survey' },
  { id: 'question', code: 'Q', label: 'Question' },
  { id: 'read', code: 'R1', label: 'Read' },
  { id: 'recite', code: 'R2', label: 'Recite' },
  { id: 'review', code: 'R3', label: 'Review' },
];

const PdfPageThumbnail: React.FC<{
  pdfDocument: PDFDocumentProxy;
  pageNumber: number;
  onSelect: () => void;
}> = ({ pdfDocument, pageNumber, onSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;
        const viewport = page.getViewport({ scale: 0.28 });
        const canvas = canvasRef.current;
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setRendered(true);
      } catch {
        // Silenciar errores si cambia de archivo mientras renderiza miniatura
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDocument, pageNumber]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group rounded-xl border border-slate-800 hover:border-indigo-400 bg-slate-950 p-1.5 flex flex-col items-center gap-1 transition-all"
    >
      <div className="w-full aspect-[3/4] bg-white rounded-lg overflow-hidden flex items-center justify-center relative">
        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-full object-contain transition-opacity ${
            rendered ? 'opacity-100' : 'opacity-20'
          }`}
        />
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-white">
          {pageNumber}
        </span>
      </div>
    </button>
  );
};

export const Sq3rFlowBar: React.FC<Sq3rFlowBarProps> = ({
  doc,
  state,
  pdfDocument = null,
  docxPages = [],
  pptxData = null,
  onUpdateState,
  onCreateNote,
  onJumpToPage,
  onOpenBoardForDoc,
  onNotify,
}) => {
  const [surveySecondsLeft, setSurveySecondsLeft] = useState<number>(
    (state.surveyMinutesTarget || 4) * 60
  );
  const [surveyTimerRunning, setSurveyTimerRunning] = useState<boolean>(false);
  const [questionInputs, setQuestionInputs] = useState<string[]>(
    state.questions.length >= 2 ? state.questions : ['', '']
  );
  const [reciteDraft, setReciteDraft] = useState<string>(state.reciteText || '');
  const [surveyGridOpen, setSurveyGridOpen] = useState<boolean>(false);

  useEffect(() => {
    setQuestionInputs(state.questions.length >= 2 ? state.questions : ['', '']);
    setReciteDraft(state.reciteText || '');
  }, [doc.id, state.questions, state.reciteText]);

  useEffect(() => {
    if (!surveyTimerRunning || state.stage !== 'survey') return;
    const id = window.setInterval(() => {
      setSurveySecondsLeft((prev) => {
        if (prev <= 1) {
          setSurveyTimerRunning(false);
          onNotify('Tiempo de Survey finalizado. Pasa a formular preguntas objetivo.', 'info');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [surveyTimerRunning, state.stage, onNotify]);

  const stageIndex = STAGE_LIST.findIndex((s) => s.id === state.stage);
  const validQuestions = questionInputs.map((q) => q.trim()).filter(Boolean);

  const handleConfirmQuestions = async () => {
    if (validQuestions.length < 2) {
      onNotify(
        'SQ3R requiere redactar al menos 2 preguntas objetivo antes de leer',
        'warning'
      );
      return;
    }

    for (let i = 0; i < validQuestions.length; i++) {
      await onCreateNote({
        docId: doc.id,
        page: doc.currentPage || 1,
        xRatio: null,
        yRatio: null,
        content: `[Objetivo SQ3R #${i + 1}] ${validQuestions[i]}`,
        color: 'cyan',
        zone: 'preguntas',
      });
    }

    onUpdateState({
      ...state,
      stage: 'read',
      questions: validQuestions,
      updatedAt: new Date().toISOString(),
    });
    onNotify(
      `${validQuestions.length} preguntas guardadas en la Pizarra. ¡Comienza la lectura activa!`,
      'success'
    );
  };

  const handleConfirmRecite = async () => {
    const clean = reciteDraft.trim();
    if (!clean) {
      onNotify('Escribe lo que recuerdas antes de avanzar a Review', 'warning');
      return;
    }

    await onCreateNote({
      docId: doc.id,
      page: doc.currentPage || 1,
      xRatio: null,
      yRatio: null,
      content: clean,
      color: 'green',
      zone: 'resumen',
      format: 'cornell',
      cornellCues: validQuestions.join('\n') || 'Recite SQ3R',
      cornellSummary: clean.slice(0, 180),
    });

    onUpdateState({
      ...state,
      stage: 'review',
      reciteText: clean,
      updatedAt: new Date().toISOString(),
    });
    onNotify('Evocación guardada en Resumen. Pasa a la Pizarra para Review.', 'success');
  };

  const totalPreviewPages = Math.min(24, Math.max(1, doc.pageCount || 1));

  return (
    <>
      {/* Cinta compacta SQ3R sobre el visor */}
      <div className="mx-auto mt-14 sm:mt-16 mb-1 px-3 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-indigo-500/35 shadow-lg flex flex-wrap items-center justify-between gap-2 max-w-4xl w-[calc(100%-1rem)] z-20 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            SQ3R
          </span>
          {STAGE_LIST.map((st, idx) => {
            const active = st.id === state.stage;
            const done = idx < stageIndex;
            const lockedForward = st.id === 'read' && validQuestions.length < 2 && stageIndex < 2;
            return (
              <button
                key={st.id}
                type="button"
                disabled={lockedForward}
                onClick={() =>
                  onUpdateState({
                    ...state,
                    stage: st.id,
                    updatedAt: new Date().toISOString(),
                  })
                }
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : done
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="font-mono text-[10px] opacity-80">{st.code}</span>
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          {state.stage === 'survey' && (
            <button
              type="button"
              onClick={() => setSurveyGridOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Abrir vista Survey ({doc.pageCount}p)</span>
            </button>
          )}
          {state.stage === 'read' && (
            <button
              type="button"
              onClick={() =>
                onUpdateState({
                  ...state,
                  stage: 'recite',
                  updatedAt: new Date().toISOString(),
                })
              }
              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] flex items-center gap-1"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Pasar a Recite</span>
            </button>
          )}
          {state.stage === 'review' && (
            <button
              type="button"
              onClick={() => onOpenBoardForDoc(doc.id)}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Ir a Pizarra (Review)</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal Survey: Miniaturas rápidas + reloj breve 3-5 min */}
      {(surveyGridOpen || state.stage === 'survey') && surveyGridOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md fade-in">
          <div className="bg-slate-900 border border-indigo-500/35 rounded-2xl max-w-4xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-400" />
                  SQ3R Paso 1 · Survey (Exploración rápida)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Revisa títulos, diagramas y estructura general en 3–5 min antes de leer en detalle.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-indigo-500/35 font-mono text-xs text-indigo-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {String(Math.floor(surveySecondsLeft / 60)).padStart(2, '0')}:
                  {String(surveySecondsLeft % 60).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => setSurveyTimerRunning((v) => !v)}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  <span>{surveyTimerRunning ? 'Pausar' : 'Iniciar 4m'}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 p-1">
              {Array.from({ length: totalPreviewPages }, (_, i) => i + 1).map((pageNum) => {
                if (doc.fileType === 'pdf' && pdfDocument) {
                  return (
                    <PdfPageThumbnail
                      key={pageNum}
                      pdfDocument={pdfDocument}
                      pageNumber={pageNum}
                      onSelect={() => {
                        onJumpToPage(pageNum);
                        setSurveyGridOpen(false);
                      }}
                    />
                  );
                }
                const docxPreview = docxPages[pageNum - 1]?.html
                  ?.replace(/<[^>]+>/g, ' ')
                  .trim()
                  .slice(0, 110);
                const slidePreview = extractPptxSlidePlainText(
                  pptxData?.slides[pageNum - 1]
                ).slice(0, 110);
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => {
                      onJumpToPage(pageNum);
                      setSurveyGridOpen(false);
                    }}
                    className="p-2.5 rounded-xl border border-slate-800 hover:border-indigo-400 bg-slate-950 text-left space-y-1.5 flex flex-col justify-between min-h-[110px]"
                  >
                    <span className="text-[10px] font-mono text-indigo-300 font-bold">
                      {doc.fileType === 'pptx' ? `Slide ${pageNum}` : `Pág. ${pageNum}`}
                    </span>
                    <p className="text-[10px] text-slate-300 line-clamp-4">
                      {slidePreview || docxPreview || 'Vista previa disponible en visor'}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSurveyGridOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
              >
                Cerrar vista
              </button>
              <button
                type="button"
                onClick={() => {
                  setSurveyTimerRunning(false);
                  setSurveyGridOpen(false);
                  onUpdateState({
                    ...state,
                    stage: 'question',
                    surveyCompletedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <span>Pasar a Question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paso 2: Question obligatorio (al menos 2 preguntas objetivo) */}
      {state.stage === 'question' && (
        <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/35 flex items-center justify-center text-sky-300">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  SQ3R Paso 2 · Question (Objetivos de Lectura)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Formula al menos 2 preguntas guía antes de leer; se guardarán en tu Pizarra.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {questionInputs.map((qVal, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={qVal}
                    onChange={(e) => {
                      const next = [...questionInputs];
                      next[idx] = e.target.value;
                      setQuestionInputs(next);
                    }}
                    placeholder={`Pregunta objetivo #${idx + 1}...`}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  {questionInputs.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setQuestionInputs((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setQuestionInputs((prev) => [...prev, ''])}
                className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir otra pregunta</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  onUpdateState({
                    ...state,
                    stage: 'survey',
                    updatedAt: new Date().toISOString(),
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Volver a Survey
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmQuestions()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Guardar preguntas e ir a Read</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paso 4: Recite (documento oculto temporalmente para evocación libre) */}
      {state.stage === 'recite' && (
        <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/35 flex items-center justify-center text-purple-300">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  SQ3R Paso 4 · Recite (Evocación sin mirar fuente)
                </h4>
                <p className="text-[11px] text-slate-400">
                  El documento está oculto temporalmente. Escribe de memoria las respuestas a tus preguntas.
                </p>
              </div>
            </div>

            {validQuestions.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
                <span className="font-bold text-sky-300 uppercase text-[10px]">
                  Tus preguntas objetivo:
                </span>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                  {validQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            <textarea
              value={reciteDraft}
              onChange={(e) => setReciteDraft(e.target.value)}
              rows={7}
              autoFocus
              placeholder="Lo central que retuve de este capítulo/documento es..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  onUpdateState({
                    ...state,
                    stage: 'read',
                    updatedAt: new Date().toISOString(),
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Volver a Read
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmRecite()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Guardar Síntesis e ir a Review</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
