import React, { useState, useEffect } from 'react';
import {
  LayoutTemplate,
  Search,
  Star,
  Download,
  Eye,
  Ban,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  AdminTemplateRecord,
  updateTemplateStatus,
  deleteTemplateAdmin,
} from '../../lib/adminData';

interface TemplateModerationViewProps {
  templates: AdminTemplateRecord[];
  onRefreshTemplates: () => void;
}

export const TemplateModerationView: React.FC<TemplateModerationViewProps> = ({
  templates,
  onRefreshTemplates,
}) => {
  const [localTemplates, setLocalTemplates] = useState<AdminTemplateRecord[]>(templates);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<AdminTemplateRecord | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  useEffect(() => {
    setLocalTemplates(templates);
  }, [templates]);

  const filteredTemplates = localTemplates.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleFeature = async (t: AdminTemplateRecord) => {
    const nextStatus = t.status === 'featured' ? 'published' : 'featured';
    setLocalTemplates((prev) =>
      prev.map((item) => (item.id === t.id ? { ...item, status: nextStatus } : item))
    );
    await updateTemplateStatus(t.id, nextStatus);
    onRefreshTemplates();
  };

  const handleArchive = async (t: AdminTemplateRecord) => {
    setLocalTemplates((prev) =>
      prev.map((item) => (item.id === t.id ? { ...item, status: 'archived' } : item))
    );
    setNotification({ text: `Plantilla "${t.title}" dada de baja y oculta de la comunidad pública.`, type: 'warning' });
    await updateTemplateStatus(t.id, 'archived', 'Dada de baja por moderación administrativa.');
    onRefreshTemplates();
    setTimeout(() => setNotification(null), 4000);
  };

  const handleApprove = async (t: AdminTemplateRecord) => {
    setLocalTemplates((prev) =>
      prev.map((item) => (item.id === t.id ? { ...item, status: 'published' } : item))
    );
    setNotification({ text: `Plantilla "${t.title}" republicada para la comunidad.`, type: 'success' });
    await updateTemplateStatus(t.id, 'published');
    onRefreshTemplates();
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDelete = async (t: AdminTemplateRecord) => {
    if (confirm(`¿Eliminar definitivamente la plantilla "${t.title}"? Esta acción no se puede deshacer.`)) {
      setLocalTemplates((prev) => prev.filter((item) => item.id !== t.id));
      setNotification({ text: `Plantilla "${t.title}" eliminada definitivamente.`, type: 'success' });
      await deleteTemplateAdmin(t.id);
      onRefreshTemplates();
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Notificación */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabecera y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-indigo-400" />
            Moderación y Control de Plantillas Comunitarias
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Supervisa plantillas públicas, destaca material académico canónico y retira contenido inadecuado
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar plantilla o autor..."
              className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-56 transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todos los Estados</option>
            <option value="featured">Destacadas</option>
            <option value="published">Publicadas</option>
            <option value="under_review">En Revisión</option>
            <option value="archived">Dadas de Baja / Archivadas</option>
          </select>
        </div>
      </div>

      {/* Grid de Plantillas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.length === 0 ? (
          <div className="lg:col-span-3 py-12 text-center text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
            No se encontraron plantillas con los criterios especificados.
          </div>
        ) : (
          filteredTemplates.map((tpl) => {
            const isFeatured = tpl.status === 'featured';
            const isArchived = tpl.status === 'archived';
            const isReview = tpl.status === 'under_review';

            return (
              <div
                key={tpl.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                      {tpl.category}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        isFeatured
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          : isArchived
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : isReview
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isFeatured
                        ? '★ Destacada'
                        : isArchived
                        ? 'Dada de Baja'
                        : isReview
                        ? 'En Revisión'
                        : 'Publicada'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors">
                    {tpl.title}
                  </h3>

                  <div className="text-[11px] text-slate-400 mt-1">Por {tpl.authorName}</div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {tpl.tags.map((tag, idx) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {tpl.avgRating.toFixed(2)} ({tpl.ratingCount})
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      {tpl.downloadsCount} usos
                    </span>
                  </div>
                </div>

                {/* Acciones de Moderación */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1">
                  <button
                    onClick={() => setPreviewTemplate(tpl)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Vista Previa</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleFeature(tpl)}
                      title={isFeatured ? 'Quitar de destacadas' : 'Marcar como destacada en portada'}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isFeatured
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 border-transparent'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFeatured ? 'fill-amber-400' : ''}`} />
                    </button>

                    {isArchived ? (
                      <button
                        onClick={() => handleApprove(tpl)}
                        title="Republicar plantilla"
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchive(tpl)}
                        title="Dar de baja / Ocultar de la comunidad"
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(tpl)}
                      title="Eliminar permanentemente"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Vista Previa Segura */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">{previewTemplate.title}</h3>
                <p className="text-xs text-slate-400">
                  {previewTemplate.category} • Formato {previewTemplate.paperSize.toUpperCase()} • Meta:{' '}
                  {previewTemplate.targetWords} palabras
                </p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hoja de papel simulada con estilos canónicos */}
            <div className="flex-1 overflow-y-auto bg-stone-100 text-slate-900 p-8 rounded-xl shadow-inner font-serif text-xs leading-relaxed border border-stone-300">
              <div
                dangerouslySetInnerHTML={{ __html: previewTemplate.contentHtml }}
                className="prose prose-sm max-w-none"
              />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Publicado por {previewTemplate.authorName}</span>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
