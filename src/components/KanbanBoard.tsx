import React, { useMemo, useState } from 'react';
import { Download, ExternalLink, LayoutGrid, Plus, Trash2, X } from 'lucide-react';
import {
  DocumentRecord,
  FolderRecord,
  KanbanZone,
  NoteColor,
  StickyNoteRecord,
} from '../types/studyflow';
import { getZoneTitle } from '../lib/documentUtils';

interface KanbanBoardProps {
  folders: FolderRecord[];
  documents: DocumentRecord[];
  notes: StickyNoteRecord[];
  onCreateNote: (note: Omit<StickyNoteRecord, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateNote: (noteId: string, patch: Partial<StickyNoteRecord>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onOpenNoteLocation: (docId: string, page: number, noteId: string) => void;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const ZONES: Array<{ id: KanbanZone; title: string; dotClass: string }> = [
  { id: 'ideas', title: 'Ideas Clave', dotClass: 'bg-amber-400' },
  { id: 'preguntas', title: 'Preguntas y Repaso', dotClass: 'bg-sky-400' },
  { id: 'resumen', title: 'Resumen y Síntesis', dotClass: 'bg-emerald-400' },
  { id: 'tareas', title: 'Tareas y Acciones', dotClass: 'bg-purple-400' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  folders,
  documents,
  notes,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onOpenNoteLocation,
  onNotify,
}) => {
  const [filterFolderId, setFilterFolderId] = useState<string>('all');
  const [filterDocId, setFilterDocId] = useState<string>('all');
  const [dragOverZone, setDragOverZone] = useState<KanbanZone | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [directZone, setDirectZone] = useState<KanbanZone>('ideas');
  const [directDocId, setDirectDocId] = useState<string>('');
  const [directColor, setDirectColor] = useState<NoteColor>('yellow');
  const [directText, setDirectText] = useState<string>('');

  const docMap = useMemo(() => new Map(documents.map((d) => [d.id, d])), [documents]);
  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const visibleNotes = useMemo(() => {
    return notes.filter((n) => {
      if (filterDocId !== 'all' && n.docId !== filterDocId) return false;
      if (filterFolderId !== 'all') {
        if (!n.docId) return false;
        const doc = docMap.get(n.docId);
        if (!doc) return false;
        if (filterFolderId === 'unassigned') return !doc.folderId;
        return doc.folderId === filterFolderId;
      }
      return true;
    });
  }, [notes, filterDocId, filterFolderId, docMap]);

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

  const handleExportPdf = async () => {
    if (visibleNotes.length === 0) {
      onNotify('No existen notas visibles para exportar', 'warning');
      return;
    }
    try {
      const { exportNotesToPdf } = await import('../lib/pdfExport');
      exportNotesToPdf(visibleNotes, documents, folders);
      onNotify('Reporte PDF exportado con éxito', 'success');
    } catch (err) {
      console.error(err);
      onNotify('Error al exportar los apuntes a PDF', 'error');
    }
  };

  const handleSubmitDirectNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = directText.trim();
    if (!content) {
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
    });
    setDirectText('');
    setShowCreateModal(false);
    onNotify('Nota añadida a la pizarra', 'success');
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Toolbar */}
      <div className="min-h-14 py-2 border-b border-slate-800 bg-slate-900/90 px-4 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 z-20">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Pizarra de Notas y Apuntes
            </h2>
          </div>

          <select
            value={filterFolderId}
            onChange={(e) => {
              setFilterFolderId(e.target.value);
              setFilterDocId('all');
            }}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
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
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 max-w-[220px]"
          >
            <option value="all">Todos los documentos</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Nueva Nota</span>
          </button>

          <button
            type="button"
            onClick={() => void handleExportPdf()}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Apuntes a PDF</span>
          </button>
        </div>
      </div>

      {/* Columnas Kanban */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6 bg-slate-950">
        <div className="min-w-[920px] h-full grid grid-cols-4 gap-4">
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
                className={`border rounded-2xl flex flex-col overflow-hidden transition-colors ${
                  isOver
                    ? 'border-indigo-500 bg-slate-800/80'
                    : 'border-slate-800 bg-slate-900/70'
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
                          <div className="min-w-0 truncate max-w-[145px]">
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
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">
                          {note.content || '(Sin texto)'}
                        </p>
                        {doc && (
                          <div className="mt-2 pt-1.5 border-t border-black/10 flex justify-end">
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

      {/* Modal Nota Directa */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm fade-in">
          <form
            onSubmit={handleSubmitDirectNote}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
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
                  Documento Asociado (Opcional)
                </label>
                <select
                  value={directDocId}
                  onChange={(e) => setDirectDocId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                >
                  <option value="">(Nota General - Sin Documento)</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
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

              <div>
                <label className="block font-medium text-slate-300 mb-1">Contenido</label>
                <textarea
                  rows={4}
                  value={directText}
                  onChange={(e) => setDirectText(e.target.value)}
                  placeholder="Escribe tus conclusiones, dudas o recordatorios..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
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
