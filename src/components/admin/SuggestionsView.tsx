import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  ThumbsUp,
  Edit3,
  X,
} from 'lucide-react';
import { AdminSuggestionRecord, updateSuggestionStatus } from '../../lib/adminData';

interface SuggestionsViewProps {
  suggestions: AdminSuggestionRecord[];
  onRefreshSuggestions: () => void;
}

export const SuggestionsView: React.FC<SuggestionsViewProps> = ({
  suggestions,
  onRefreshSuggestions,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [activeModalSuggestion, setActiveModalSuggestion] = useState<AdminSuggestionRecord | null>(null);
  const [modalStatus, setModalStatus] = useState<AdminSuggestionRecord['status']>('pendiente');
  const [modalNotes, setModalNotes] = useState('');

  const filteredSuggestions = suggestions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'all' || s.category === categoryFilter;
    const matchesStat = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesCat && matchesStat;
  });

  const handleOpenModal = (s: AdminSuggestionRecord) => {
    setActiveModalSuggestion(s);
    setModalStatus(s.status);
    setModalNotes(s.adminNotes || '');
  };

  const handleSaveStatus = async () => {
    if (!activeModalSuggestion) return;
    await updateSuggestionStatus(activeModalSuggestion.id, modalStatus, modalNotes.trim());
    setActiveModalSuggestion(null);
    onRefreshSuggestions();
  };

  return (
    <div className="space-y-6">
      {/* Cabecera y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            Buzón de Sugerencias & Feedback de Estudiantes
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Revisa peticiones de mejoras, reportes de estudiantes y gestiona su ciclo de implementación
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en sugerencias..."
              className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-56 transition-colors"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todas las Categorías</option>
            <option value="redaccion">Redacción</option>
            <option value="visor_pdf">Visor PDF</option>
            <option value="pomodoro">Pomodoro</option>
            <option value="pizarra">Pizarra</option>
            <option value="rendimiento">Rendimiento</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todos los Estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_revision">En Revisión</option>
            <option value="aprobada">Aprobadas</option>
            <option value="implementada">Implementadas</option>
            <option value="descartada">Descartadas</option>
          </select>
        </div>
      </div>

      {/* Lista de Sugerencias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSuggestions.length === 0 ? (
          <div className="md:col-span-2 py-12 text-center text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
            No se encontraron sugerencias con los filtros aplicados.
          </div>
        ) : (
          filteredSuggestions.map((sug) => {
            const isImplemented = sug.status === 'implementada';
            const isApproved = sug.status === 'aprobada';
            const isReview = sug.status === 'en_revision';
            const isCritical = sug.priority === 'critica';
            const isHigh = sug.priority === 'alta';

            return (
              <div
                key={sug.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                        isCritical
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : isHigh
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      Prioridad {sug.priority}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        isImplemented
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isApproved
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : isReview
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {sug.status === 'implementada'
                        ? '✓ Implementada'
                        : sug.status === 'aprobada'
                        ? '● Aprobada'
                        : sug.status === 'en_revision'
                        ? 'En Revisión'
                        : sug.status === 'descartada'
                        ? 'Descartada'
                        : 'Pendiente'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors">
                    {sug.title}
                  </h3>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{sug.description}</p>

                  {sug.adminNotes && (
                    <div className="mt-3 p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-[11px] text-indigo-300">
                      <span className="font-semibold text-white">Respuesta del Administrador: </span>
                      {sug.adminNotes}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono text-white">
                      <ThumbsUp className="w-3.5 h-3.5 text-indigo-400" /> {sug.votes} votos
                    </span>
                    <span>Por {sug.authorName}</span>
                  </div>

                  <button
                    onClick={() => handleOpenModal(sug)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-indigo-400" />
                    <span>Gestionar</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal para Gestionar Estado y Notas */}
      {activeModalSuggestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                Actualizar Estado de la Sugerencia
              </h3>
              <button
                onClick={() => setActiveModalSuggestion(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-medium mb-3">"{activeModalSuggestion.title}"</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Nuevo Estado</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_revision">En Revisión por Desarrollo</option>
                  <option value="aprobada">Aprobada / En Planificación</option>
                  <option value="implementada">Implementada en Producción</option>
                  <option value="descartada">Descartada / Fuera de Alcance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Notas de Respuesta Administrativa (Visibles en el feedback público)
                </label>
                <textarea
                  rows={3}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Detalla la resolución, versión donde se incluye o motivo del descarte..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalSuggestion(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
