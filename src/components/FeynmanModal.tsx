import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Eye,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { DocumentRecord, StickyNoteRecord } from '../types/studyflow';

interface FeynmanModalProps {
  open: boolean;
  note: StickyNoteRecord | null;
  sourceDoc: DocumentRecord | null;
  sourcePageImage?: string | null;
  sourcePageText?: string | null;
  onClose: () => void;
  onSaveFeynman: (noteId: string, patch: Partial<StickyNoteRecord>) => Promise<void>;
  onAddReviewTask: (
    title: string,
    docId: string | null,
    folderId: string | null
  ) => Promise<void>;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const FeynmanModal: React.FC<FeynmanModalProps> = ({
  open,
  note,
  sourceDoc,
  sourcePageImage = null,
  sourcePageText = null,
  onClose,
  onSaveFeynman,
  onAddReviewTask,
  onNotify,
}) => {
  const [phase, setPhase] = useState<'blind' | 'compare'>('blind');
  const [explanation, setExplanation] = useState('');
  const [gaps, setGaps] = useState('');
  const [taskTitle, setTaskTitle] = useState('');

  useEffect(() => {
    if (!open || !note) return;
    setExplanation(note.feynmanSimpleExplanation || '');
    setGaps(note.feynmanGaps || '');
    setPhase(note.feynmanSimpleExplanation ? 'compare' : 'blind');
    const topicHint =
      note.cornellCues?.trim() ||
      note.content.trim().slice(0, 48) ||
      'concepto complejo';
    setTaskTitle(`Repasar vacío Feynman: ${topicHint}`);
  }, [open, note]);

  if (!open || !note) return null;

  const handleConfirmBlind = async () => {
    const clean = explanation.trim();
    if (!clean) {
      onNotify(
        'Redacta tu explicación con palabras sencillas antes de contrastar',
        'warning'
      );
      return;
    }
    await onSaveFeynman(note.id, {
      isComplex: true,
      feynmanSimpleExplanation: clean,
    });
    setPhase('compare');
  };

  const handleFinishAndCreateTask = async (createTask: boolean) => {
    await onSaveFeynman(note.id, {
      isComplex: true,
      feynmanSimpleExplanation: explanation.trim(),
      feynmanGaps: gaps.trim(),
      feynmanCompletedAt: new Date().toISOString(),
    });
    if (createTask && taskTitle.trim()) {
      await onAddReviewTask(
        taskTitle.trim(),
        note.docId || null,
        sourceDoc?.folderId || null
      );
      onNotify('Ciclo Feynman guardado y subtarea de repaso creada', 'success');
    } else {
      onNotify('Simplificación Feynman guardada en la nota', 'success');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md fade-in">
      <div
        className={`bg-slate-900 border border-indigo-500/35 rounded-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${
          phase === 'compare' ? 'max-w-5xl' : 'max-w-2xl'
        }`}
      >
        {/* Cabecera */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/35 flex items-center justify-center text-purple-300 flex-shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">
                  Técnica Feynman · Simplificación Activa
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/35">
                  {phase === 'blind' ? 'Paso 1: Sin mirar fuente' : 'Paso 2: Contraste lado a lado'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {sourceDoc ? `${sourceDoc.name}${note.page ? ` · Pág. ${note.page}` : ''}` : 'Nota de Pizarra'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {phase === 'blind' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Concepto marcado como complejo (Documento oculto temporalmente)
                </span>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {note.cornellCues?.trim()
                    ? note.cornellCues
                    : note.content || 'Concepto de estudio'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white block">
                  Explícalo con tus propias palabras y lenguaje sencillo:
                </label>
                <p className="text-[11px] text-slate-400">
                  Evita jerga técnica sin definirla. Si te atascas, ahí está el vacío real de comprensión.
                </p>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={7}
                  autoFocus
                  placeholder="En términos simples, esto funciona así porque..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna Izquierda: Tu explicación + Vacíos */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-500/35 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                        Tu explicación sencilla
                      </span>
                      <button
                        type="button"
                        onClick={() => setPhase('blind')}
                        className="text-[10px] text-slate-400 hover:text-white underline"
                      >
                        Modo ciego
                      </button>
                    </div>
                    <textarea
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      rows={6}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500 leading-relaxed"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block">
                      Vacíos detectados al contrastar
                    </label>
                    <textarea
                      value={gaps}
                      onChange={(e) => setGaps(e.target.value)}
                      rows={3}
                      placeholder="¿Qué parte no lograste explicar o quedó imprecisa frente al texto?"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Columna Derecha: Página original del documento / Apunte */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Fuente Original ({note.page ? `Pág. ${note.page}` : 'Apunte'})
                  </span>

                  {sourcePageImage ? (
                    <div className="rounded-lg overflow-hidden border border-slate-700 bg-white max-h-72 overflow-y-auto">
                      <img
                        src={sourcePageImage}
                        alt="Página original"
                        className="w-full h-auto block"
                      />
                    </div>
                  ) : sourcePageText ? (
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {sourcePageText}
                    </div>
                  ) : null}

                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">
                      Contenido original del post-it
                    </span>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {note.content || '(Sin texto)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Generador de subtarea puntual */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center gap-2.5">
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Título de la subtarea puntual..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => void handleFinishAndCreateTask(true)}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Guardar y Crear Subtarea</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
          >
            Cancelar
          </button>
          {phase === 'blind' ? (
            <button
              type="button"
              onClick={() => void handleConfirmBlind()}
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Confirmar y Contrastar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleFinishAndCreateTask(false)}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Guardar Simplificación</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

