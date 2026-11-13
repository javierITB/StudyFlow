import React, { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  Columns2,
  Download,
  ExternalLink,
  Eye,
  LayoutGrid,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  DocumentOcclusionRecord,
  DocumentRecord,
  FolderRecord,
  FsrsRating,
  KanbanZone,
  NoteColor,
  NoteFormat,
  StickyNoteRecord,
} from '../types/studyflow';
import { getZoneTitle } from '../lib/documentUtils';
import {
  computeRetrievability,
  getNextIntervalsPreview,
  isCardDue,
  scheduleFsrsReview,
} from '../lib/fsrs';

interface KanbanBoardProps {
  folders: FolderRecord[];
  documents: DocumentRecord[];
  notes: StickyNoteRecord[];
  occlusions?: DocumentOcclusionRecord[];
  defaultNoteFormat?: NoteFormat;
  initialDocFilter?: string | null;
  onCreateNote: (note: Omit<StickyNoteRecord, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateNote: (noteId: string, patch: Partial<StickyNoteRecord>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onUpdateOcclusion?: (
    occlusionId: string,
    patch: Partial<DocumentOcclusionRecord>
  ) => Promise<void>;
  onOpenNoteLocation: (docId: string, page: number, noteId: string) => void;
  onOpenFeynman?: (note: StickyNoteRecord) => void;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const ZONES: Array<{ id: KanbanZone; title: string; dotClass: string }> = [
  { id: 'ideas', title: 'Ideas Clave', dotClass: 'bg-amber-400' },
  { id: 'preguntas', title: 'Preguntas y Repaso', dotClass: 'bg-sky-400' },
  { id: 'resumen', title: 'Resumen y Síntesis', dotClass: 'bg-emerald-400' },
  { id: 'tareas', title: 'Tareas y Acciones', dotClass: 'bg-purple-400' },
];

type FsrsQueueItem =
  | { kind: 'note'; id: string; note: StickyNoteRecord; doc: DocumentRecord | null }
  | {
      kind: 'occlusion';
      id: string;
      occlusion: DocumentOcclusionRecord;
      doc: DocumentRecord | null;
    };

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  folders,
  documents,
  notes,
  occlusions = [],
  defaultNoteFormat = 'standard',
  initialDocFilter = null,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onUpdateOcclusion,
  onOpenNoteLocation,
  onOpenFeynman,
  onNotify,
}) => {
  const [boardTab, setBoardTab] = useState<'kanban' | 'fsrs'>('kanban');
  const [filterFolderId, setFilterFolderId] = useState<string>('all');
  const [filterDocId, setFilterDocId] = useState<string>(initialDocFilter || 'all');
  const [dragOverZone, setDragOverZone] = useState<KanbanZone | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [directZone, setDirectZone] = useState<KanbanZone>('ideas');
  const [directDocId, setDirectDocId] = useState<string>('');
  const [directColor, setDirectColor] = useState<NoteColor>('yellow');
  const [directFormat, setDirectFormat] = useState<NoteFormat>(defaultNoteFormat);
  const [directCues, setDirectCues] = useState<string>('');
  const [directText, setDirectText] = useState<string>('');
  const [directSummary, setDirectSummary] = useState<string>('');

  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [includeUpcoming, setIncludeUpcoming] = useState<boolean>(false);

  useEffect(() => {
    if (initialDocFilter) {
      setFilterDocId(initialDocFilter);
      setFilterFolderId('all');
    }
  }, [initialDocFilter]);

  useEffect(() => {
    setDirectFormat(defaultNoteFormat);
  }, [defaultNoteFormat]);

  const docMap = useMemo(() => new Map(documents.map((d) => [d.id, d])), [documents]);
  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const matchesDocAndFolder = (docId: string | null) => {
    if (filterDocId !== 'all' && docId !== filterDocId) return false;
    if (filterFolderId !== 'all') {
      if (!docId) return false;
      const doc = docMap.get(docId);
      if (!doc) return false;
      if (filterFolderId === 'unassigned') return !doc.folderId;
      return doc.folderId === filterFolderId;
    }
    return true;
  };

  const visibleNotes = useMemo(
    () => notes.filter((n) => matchesDocAndFolder(n.docId)),
    [notes, filterDocId, filterFolderId, docMap]
  );

  const visibleOcclusions = useMemo(
    () => occlusions.filter((o) => matchesDocAndFolder(o.docId)),
    [occlusions, filterDocId, filterFolderId, docMap]
  );

  const dueQueue = useMemo<FsrsQueueItem[]>(() => {
    const now = new Date();
    const noteItems: FsrsQueueItem[] = visibleNotes
      .filter((n) => includeUpcoming || isCardDue(n.fsrs, now))
      .map((note) => ({
        kind: 'note',
        id: note.id,
        note,
        doc: note.docId ? docMap.get(note.docId) || null : null,
      }));
    const occItems: FsrsQueueItem[] = visibleOcclusions
      .filter((o) => includeUpcoming || isCardDue(o.fsrs, now))
      .map((occlusion) => ({
        kind: 'occlusion',
        id: occlusion.id,
        occlusion,
        doc: docMap.get(occlusion.docId) || null,
      }));
    return [...noteItems, ...occItems];
  }, [visibleNotes, visibleOcclusions, includeUpcoming, docMap]);

  const handleDrop = async (e: React.DragEvent, targetZone: KanbanZone) => {
    e.preventDefault();
    setDragOverZone(null);
    const noteId = e.dataTransfer.getData('text/plain');
    if (!noteId) return;
    const note = notes.find((n) => n.id === noteId);
    if (note && note.zone !== targetZone) {
      await onUpdateNote(noteId, { zone: targetZone });
      onNotify(`Nota movida a ${getZoneTitle(targetZone)}`, 'info');
    }
  };

  const handleExportPdf = async (cornellLayout = false) => {
    if (visibleNotes.length === 0) {
      onNotify('No existen notas visibles para exportar', 'warning');
      return;
    }
    try {
      const { exportNotesToPdf, exportCornellNotesToPdf } = await import(
        '../lib/pdfExport'
      );
      if (cornellLayout) {
        exportCornellNotesToPdf(visibleNotes, documents, folders);
        onNotify('PDF en formato Cornell exportado con éxito', 'success');
      } else {
        exportNotesToPdf(visibleNotes, documents, folders);
        onNotify('Reporte PDF exportado con éxito', 'success');
      }
    } catch (err) {
      console.error(err);
      onNotify('Error al exportar los apuntes a PDF', 'error');
    }
  };

  const handleSubmitDirectNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = directText.trim();
    const cues = directCues.trim();
    const summary = directSummary.trim();

    if (directFormat === 'cornell') {
      if (!cues || !content || !summary) {
        onNotify(
          'El formato Cornell exige completar Claves/Preguntas, Desarrollo y Resumen',
          'warning'
        );
        return;
      }
    } else if (!content) {
      onNotify('Ingresa el contenido de la nota', 'warning');
      return;
    }

    await onCreateNote({
      docId: directDocId || null,
      page: null,
      xRatio: null,
      yRatio: null,
      content,
      color: directColor,
      zone: directZone,
      format: directFormat,
      cornellCues: directFormat === 'cornell' ? cues : undefined,
      cornellSummary: directFormat === 'cornell' ? summary : undefined,
    });
    setDirectCues('');
    setDirectText('');
    setDirectSummary('');
    setShowCreateModal(false);
    onNotify('Nota añadida a la pizarra', 'success');
  };

  const handleRateFsrsItem = async (item: FsrsQueueItem, rating: FsrsRating) => {
    const now = new Date();
    if (item.kind === 'note') {
      const nextFsrs = scheduleFsrsReview(item.note.fsrs, rating, now);
      await onUpdateNote(item.note.id, { fsrs: nextFsrs });
    } else if (onUpdateOcclusion) {
      const nextFsrs = scheduleFsrsReview(item.occlusion.fsrs, rating, now);
      await onUpdateOcclusion(item.occlusion.id, { fsrs: nextFsrs });
    }
    setRevealedIds((prev) => {
      const copy = { ...prev };
      delete copy[item.id];
      return copy;
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Toolbar */}
      <div
        data-tour-id="tour-kanban-toolbar"
        className="min-h-12 py-1.5 sm:py-2 border-b border-slate-800 bg-slate-900/90 px-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-2 sm:gap-3 flex-shrink-0 z-20"
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setBoardTab('kanban')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                boardTab === 'kanban'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Pizarra</span>
            </button>
            <button
              type="button"
              onClick={() => setBoardTab('fsrs')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                boardTab === 'fsrs'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Repaso FSRS ({dueQueue.length})</span>
            </button>
          </div>

          <select
            value={filterFolderId}
            onChange={(e) => {
              setFilterFolderId(e.target.value);
              setFilterDocId('all');
            }}
            className="flex-1 sm:flex-none bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] sm:text-xs text-slate-200 focus:outline-none focus:border-indigo-500 min-w-[120px]"
          >
            <option value="all">Todas las carpetas</option>
            <option value="unassigned">Sin carpeta</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                Ramo: {f.name}
              </option>
            ))}
          </select>

          <select
            value={filterDocId}
            onChange={(e) => setFilterDocId(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] sm:text-xs text-slate-200 focus:outline-none focus:border-indigo-500 sm:max-w-[190px] min-w-[120px]"
          >
            <option value="all">Todos los documentos</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-[11px] sm:text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
            <span>Nueva Nota</span>
          </button>

          <button
            type="button"
            onClick={() => void handleExportPdf(true)}
            title="Exportar maquetación clásica Método Cornell en 2 columnas"
            className="px-2.5 py-1 sm:py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25 text-[11px] sm:text-xs font-semibold text-indigo-200 flex items-center gap-1.5 transition-colors"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">PDF Cornell</span>
          </button>

          <button
            type="button"
            onClick={() => void handleExportPdf(false)}
            className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[11px] sm:text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">PDF</span>
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
        </div>
      </div>

      {boardTab === 'fsrs' ? (
        /* ================= VISTA DE REPASO ESPACIADO FSRS + OCLUSIÓN ================= */
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 sf-env-canvas">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  Sesión de Repaso Espaciado (FSRS-4.5)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Evoca la respuesta mentalmente antes de revelar. Califica según cuánto te costó recordarla para recalcular Stability y próxima revisión.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={includeUpcoming}
                  onChange={(e) => setIncludeUpcoming(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>Mostrar también tarjetas futuras</span>
              </label>
            </div>

            {dueQueue.length === 0 ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-white">
                  ¡Al día con tus repasos FSRS!
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No tienes post-its ni cajas de oclusión vencidas en este filtro. Crea notas o regiones de oclusión en el Visor o marca la casilla superior para repasar antes de tiempo.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dueQueue.map((item) => {
                  const isRevealed = Boolean(revealedIds[item.id]);
                  const fsrsState =
                    item.kind === 'note' ? item.note.fsrs : item.occlusion.fsrs;
                  const intervals = getNextIntervalsPreview(fsrsState);
                  const retrievability = Math.round(
                    computeRetrievability(fsrsState) * 100
                  );

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900/95 border border-indigo-500/25 rounded-2xl p-4 shadow-md space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              item.kind === 'occlusion'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35'
                                : item.note.format === 'cornell'
                                  ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/35'
                                  : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.kind === 'occlusion'
                              ? 'Oclusión Visual'
                              : item.note.format === 'cornell'
                                ? 'Tarjeta Cornell'
                                : getZoneTitle(item.note.zone)}
                          </span>
                          <span className="font-semibold text-white">
                            {item.doc ? item.doc.name : 'Nota general'}
                            {item.kind === 'note' && item.note.page
                              ? ` · Pág. ${item.note.page}`
                              : item.kind === 'occlusion'
                                ? ` · Pág. ${item.occlusion.page}`
                                : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                          {fsrsState && fsrsState.reps > 0 ? (
                            <>
                              <span>R: {retrievability}%</span>
                              <span>·</span>
                              <span>S: {fsrsState.stability.toFixed(1)}d</span>
                              <span>·</span>
                              <span>Reps: {fsrsState.reps}</span>
                            </>
                          ) : (
                            <span className="text-emerald-300">Nueva tarjeta</span>
                          )}
                          {item.doc && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenNoteLocation(
                                  item.doc!.id,
                                  item.kind === 'note'
                                    ? item.note.page || 1
                                    : item.occlusion.page,
                                  item.id
                                )
                              }
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Ver fuente</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Pista / Pregunta visible antes de revelar */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-indigo-200 font-medium">
                        {item.kind === 'note'
                          ? item.note.cornellCues?.trim()
                            ? `Claves / Preguntas: ${item.note.cornellCues}`
                            : `Evoca tu apunte de "${getZoneTitle(item.note.zone)}"${item.note.page ? ` en página ${item.note.page}` : ''}`
                          : `Fórmula / Esquema oculto${item.occlusion.label ? `: ${item.occlusion.label}` : ` en página ${item.occlusion.page}`}`}
                      </div>

                      {!isRevealed ? (
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedIds((prev) => ({ ...prev, [item.id]: true }))
                          }
                          className="w-full py-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-dashed border-indigo-400/60 text-indigo-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Mostrar respuesta oculta</span>
                        </button>
                      ) : (
                        <div className="space-y-3 fade-in">
                          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                            {item.kind === 'note' ? (
                              <>
                                <div>{item.note.content || '(Sin contenido)'}</div>
                                {item.note.cornellSummary && (
                                  <div className="mt-2 pt-2 border-t border-slate-800 text-emerald-300">
                                    <strong>Resumen:</strong> {item.note.cornellSummary}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <span>
                                  Área ocluida en página {item.occlusion.page}
                                  {item.occlusion.label ? ` — ${item.occlusion.label}` : ''}
                                </span>
                                {item.doc && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onOpenNoteLocation(
                                        item.doc!.id,
                                        item.occlusion.page,
                                        item.id
                                      )
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold"
                                  >
                                    Abrir página para ver área
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            {(
                              [
                                {
                                  id: 'again',
                                  label: 'Otra vez',
                                  cls: 'bg-rose-600/20 hover:bg-rose-600/35 border-rose-500/50 text-rose-200',
                                },
                                {
                                  id: 'hard',
                                  label: 'Difícil',
                                  cls: 'bg-amber-600/20 hover:bg-amber-600/35 border-amber-500/50 text-amber-200',
                                },
                                {
                                  id: 'good',
                                  label: 'Bien',
                                  cls: 'bg-emerald-600/20 hover:bg-emerald-600/35 border-emerald-500/50 text-emerald-200',
                                },
                                {
                                  id: 'easy',
                                  label: 'Fácil',
                                  cls: 'bg-sky-600/20 hover:bg-sky-600/35 border-sky-500/50 text-sky-200',
                                },
                              ] as const
                            ).map((btn) => (
                              <button
                                key={btn.id}
                                type="button"
                                onClick={() => void handleRateFsrsItem(item, btn.id)}
                                className={`py-2 px-2 rounded-xl border text-center transition-colors ${btn.cls}`}
                              >
                                <div className="text-xs font-bold">{btn.label}</div>
                                <div className="text-[10px] font-mono opacity-80 mt-0.5">
                                  {intervals[btn.id]}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= COLUMNAS KANBAN ================= */
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 xl:p-5 sf-env-canvas">
          <div className="h-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {ZONES.map((zone) => {
              const zoneNotes = visibleNotes.filter((n) => (n.zone || 'ideas') === zone.id);
              const isOver = dragOverZone === zone.id;

              return (
                <div
                  key={zone.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverZone(zone.id);
                  }}
                  onDragLeave={() => setDragOverZone(null)}
                  onDrop={(e) => void handleDrop(e, zone.id)}
                  className={`border rounded-2xl flex flex-col overflow-hidden transition-colors min-h-[280px] xl:min-h-0 ${
                    isOver
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-800 bg-slate-900/75'
                  }`}
                >
                  <div className="p-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${zone.dotClass}`} />
                      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        {zone.title}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                      {zoneNotes.length}
                    </span>
                  </div>

                  <div className="flex-1 p-3 overflow-y-auto space-y-3">
                    {zoneNotes.map((note) => {
                      const doc = note.docId ? docMap.get(note.docId) : null;
                      const folder =
                        doc?.folderId && folderMap.has(doc.folderId)
                          ? folderMap.get(doc.folderId)
                          : null;

                      return (
                        <div
                          key={note.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', note.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          className={`p-3 rounded-xl border shadow-md flex flex-col note-${
                            note.color || 'yellow'
                          } transition-transform active:scale-95 cursor-grab`}
                        >
                          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-black/10 text-[10px] font-semibold select-none">
                            <div className="min-w-0 truncate max-w-[140px]">
                              {doc ? (
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenNoteLocation(
                                      doc.id,
                                      note.page || doc.currentPage || 1,
                                      note.id
                                    );
                                  }}
                                  className="text-left hover:underline truncate max-w-full block"
                                  title={`Abrir ${doc.name} en página ${note.page || doc.currentPage || 1}`}
                                >
                                  {doc.name}
                                </button>
                              ) : (
                                <span>Nota General</span>
                              )}
                              {folder && (
                                <span className="block text-[9px] opacity-75 truncate">
                                  {folder.name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              {onOpenFeynman && (
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenFeynman(note);
                                  }}
                                  title={
                                    note.isComplex
                                      ? 'Simplificar con Técnica Feynman'
                                      : 'Marcar como complejo y aplicar Técnica Feynman'
                                  }
                                  className={`px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 text-[9px] font-bold transition-colors ${
                                    note.isComplex
                                      ? 'bg-purple-700 text-white'
                                      : 'bg-black/10 hover:bg-black/20'
                                  }`}
                                >
                                  <Brain className="w-2.5 h-2.5" />
                                  <span>{note.isComplex ? 'Feynman' : 'Complejo'}</span>
                                </button>
                              )}
                              {doc && (
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenNoteLocation(
                                      doc.id,
                                      note.page || doc.currentPage || 1,
                                      note.id
                                    );
                                  }}
                                  title={`Ir al documento (Pág. ${note.page || doc.currentPage || 1})`}
                                  className="bg-black/15 hover:bg-black/25 px-1.5 py-0.5 rounded font-mono inline-flex items-center gap-0.5 transition-colors"
                                >
                                  <span>
                                    {note.page
                                      ? `${doc.fileType === 'pptx' ? 'S' : 'P'}.${note.page}`
                                      : 'Ir'}
                                  </span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void onDeleteNote(note.id);
                                }}
                                title="Eliminar nota"
                                className="p-0.5 rounded hover:bg-black/15"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {note.format === 'cornell' ? (
                            <div className="space-y-1.5 text-xs">
                              {note.cornellCues && (
                                <div className="px-2 py-1 rounded bg-black/10 text-[11px] font-semibold">
                                  <span className="uppercase text-[9px] opacity-75 block">
                                    Claves / Preguntas:
                                  </span>
                                  {note.cornellCues}
                                </div>
                              )}
                              <p className="leading-relaxed whitespace-pre-wrap">
                                {note.content || '(Sin desarrollo)'}
                              </p>
                              {note.cornellSummary && (
                                <div className="px-2 py-1 rounded bg-black/10 text-[11px] italic">
                                  <strong>Resumen:</strong> {note.cornellSummary}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">
                              {note.content || '(Sin texto)'}
                            </p>
                          )}

                          {note.feynmanSimpleExplanation && (
                            <div className="mt-1.5 px-2 py-1 rounded bg-purple-900/20 border border-purple-700/30 text-[10px]">
                              <strong>Feynman:</strong> {note.feynmanSimpleExplanation}
                            </div>
                          )}

                          {doc && (
                            <div className="mt-2 pt-1.5 border-t border-black/10 flex justify-between items-center">
                              <span className="text-[9px] font-mono opacity-75">
                                {note.format === 'cornell' ? 'Cornell' : ''}
                              </span>
                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenNoteLocation(
                                    doc.id,
                                    note.page || doc.currentPage || 1,
                                    note.id
                                  );
                                }}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/10 hover:bg-black/20 inline-flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>
                                  {note.page
                                    ? `Ir a ${doc.fileType === 'pptx' ? 'slide' : 'página'} ${note.page}`
                                    : 'Abrir documento'}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Nota Directa (Soporta Estándar y Cornell) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm fade-in">
          <form
            onSubmit={handleSubmitDirectNote}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Nueva Nota de Pizarra</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDirectFormat('standard')}
                  className={`py-1.5 rounded-lg font-semibold ${
                    directFormat === 'standard'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Post-it Estándar
                </button>
                <button
                  type="button"
                  onClick={() => setDirectFormat('cornell')}
                  className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 ${
                    directFormat === 'cornell'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span>Método Cornell (3 campos)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Zona de Destino
                  </label>
                  <select
                    value={directZone}
                    onChange={(e) => setDirectZone(e.target.value as KanbanZone)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  >
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Documento Asociado
                  </label>
                  <select
                    value={directDocId}
                    onChange={(e) => setDirectDocId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  >
                    <option value="">(Nota General)</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Color</label>
                <div className="flex items-center space-x-3">
                  {(
                    [
                      { id: 'yellow', label: 'Amarillo' },
                      { id: 'cyan', label: 'Celeste' },
                      { id: 'green', label: 'Verde' },
                      { id: 'lavender', label: 'Lavanda' },
                    ] as const
                  ).map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center space-x-1.5 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="direct-color"
                        checked={directColor === c.id}
                        onChange={() => setDirectColor(c.id)}
                      />
                      <span className="text-slate-300">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {directFormat === 'cornell' && (
                <div>
                  <label className="block font-medium text-indigo-300 mb-1">
                    1. Palabras clave / Preguntas (Obligatorio)
                  </label>
                  <input
                    type="text"
                    value={directCues}
                    onChange={(e) => setDirectCues(e.target.value)}
                    placeholder="Ej. ¿Qué condición necesita el teorema?..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  {directFormat === 'cornell'
                    ? '2. Notas de desarrollo (Obligatorio)'
                    : 'Contenido'}
                </label>
                <textarea
                  rows={4}
                  value={directText}
                  onChange={(e) => setDirectText(e.target.value)}
                  placeholder="Escribe tus apuntes, desarrollo o conclusiones..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {directFormat === 'cornell' && (
                <div>
                  <label className="block font-medium text-emerald-300 mb-1">
                    3. Resumen en 2 líneas (Obligatorio)
                  </label>
                  <textarea
                    rows={2}
                    value={directSummary}
                    onChange={(e) => setDirectSummary(e.target.value)}
                    placeholder="Síntesis breve de esta idea en 1-2 frases..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                Guardar en Pizarra
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
