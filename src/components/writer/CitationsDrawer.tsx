import React, { useMemo, useState } from 'react';
import { ChevronRight, Quote, Search, X } from 'lucide-react';
import { DocumentRecord, StickyNoteRecord } from '../../types/studyflow';

interface CitationsDrawerProps {
  open: boolean;
  onClose: () => void;
  notes: StickyNoteRecord[];
  documents: DocumentRecord[];
  onInsertCitation: (citationHtml: string) => void;
}

export const CitationsDrawer: React.FC<CitationsDrawerProps> = ({
  open,
  onClose,
  notes,
  documents,
  onInsertCitation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | 'all'>('all');
  const [filterType, setFilterType] = useState<'all' | 'cornell' | 'feynman'>('all');

  const docMap = useMemo(() => {
    const map = new Map<string, string>();
    documents.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [documents]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (selectedDocId !== 'all' && n.docId !== selectedDocId) return false;
      if (filterType === 'cornell' && n.format !== 'cornell') return false;
      if (filterType === 'feynman' && !n.feynmanSimpleExplanation) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const contentMatch = n.content.toLowerCase().includes(q);
      const cueMatch = n.cornellCues?.toLowerCase().includes(q);
      const sumMatch = n.cornellSummary?.toLowerCase().includes(q);
      const docMatch = ((n.docId ? docMap.get(n.docId) : '') || '').toLowerCase().includes(q);
      return contentMatch || cueMatch || sumMatch || docMatch;
    });
  }, [notes, selectedDocId, filterType, searchQuery, docMap]);

  if (!open) return null;

  const handleInsert = (note: StickyNoteRecord) => {
    const docName = (note.docId ? docMap.get(note.docId) : '') || 'Documento de Lectura';
    const pageStr = note.page ? ` (pág. ${note.page})` : '';

    let citationHtml = '';
    if (note.format === 'cornell' && (note.cornellCues || note.cornellSummary)) {
      citationHtml = `
        <blockquote style="border-left: 3px solid #6366f1; padding-left: 12px; margin: 1em 0; color: #475569; font-style: italic;">
          <strong>Concepto:</strong> ${note.cornellCues || 'Apunte Cornell'}<br />
          "${note.content}"<br />
          ${note.cornellSummary ? `<strong>Síntesis:</strong> ${note.cornellSummary}<br />` : ''}
          <small style="color: #64748b;">— Fuente: <em>${docName}</em>${pageStr}</small>
        </blockquote>
      `;
    } else {
      citationHtml = `
        <blockquote style="border-left: 3px solid #6366f1; padding-left: 12px; margin: 1em 0; color: #475569; font-style: italic;">
          "${note.content}"<br />
          <small style="color: #64748b;">— En: <em>${docName}</em>${pageStr}</small>
        </blockquote>
      `;
    }

    onInsertCitation(citationHtml);
  };

  return (
    <aside className="w-80 sm:w-96 border-l border-indigo-500/25 bg-slate-900/95 backdrop-blur-xl flex flex-col h-full shadow-2xl z-30 flex-shrink-0 animate-in slide-in-from-right duration-200">
      {/* Cabecera */}
      <div className="p-3.5 border-b border-indigo-500/20 bg-slate-950/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Quote className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-tight">Cajón de Fuentes y Citas</h3>
            <p className="text-[10px] text-slate-400">Inserta apuntes de lectura con 1 clic</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          title="Cerrar cajón"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="p-3 border-b border-indigo-500/15 space-y-2 bg-slate-950/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar notas, palabras clave o fuentes..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2 py-0.5 rounded-lg border font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            Todas ({notes.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('cornell')}
            className={`px-2 py-0.5 rounded-lg border font-medium transition-colors ${
              filterType === 'cornell'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            Cornell
          </button>
          <button
            type="button"
            onClick={() => setFilterType('feynman')}
            className={`px-2 py-0.5 rounded-lg border font-medium transition-colors ${
              filterType === 'feynman'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            Feynman
          </button>
        </div>

        {documents.length > 0 && (
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Todos los documentos de lectura</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({notes.filter((n) => n.docId === d.id).length} notas)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Lista de notas */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-500 space-y-1.5">
            <Quote className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
            <p className="text-xs font-medium text-slate-400">No se encontraron notas o citas</p>
            <p className="text-[10px] text-slate-500">
              Crea notas en tus lecturas de PDF, DOCX o PPTX para citarlas directamente aquí.
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const docName = (note.docId ? docMap.get(note.docId) : '') || 'Documento';
            return (
              <div
                key={note.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 transition-all group space-y-2"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="text-[10px] font-mono font-medium text-indigo-400 truncate max-w-[170px]">
                    {docName} · p.{note.page || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleInsert(note)}
                    className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-colors"
                    title="Insertar cita en el editor"
                  >
                    <span>Citar</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {note.format === 'cornell' && note.cornellCues && (
                  <div className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    Clave: {note.cornellCues}
                  </div>
                )}

                <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
                  "{note.content}"
                </p>

                {note.format === 'cornell' && note.cornellSummary && (
                  <p className="text-[10px] text-slate-400 italic border-l-2 border-emerald-500/40 pl-2">
                    Resumen: {note.cornellSummary}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pie del cajón */}
      <div className="p-2.5 border-t border-indigo-500/15 bg-slate-950/70 text-[10px] text-slate-400 text-center">
        {filteredNotes.length} apuntes disponibles para fundamentar tu trabajo
      </div>
    </aside>
  );
};
