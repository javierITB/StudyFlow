import React, { useEffect, useState } from 'react';
import {
  Globe,
  Loader2,
  Search,
  Sparkles,
  Star,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { CommunityTemplateRecord } from '../../types/studyflow';
import {
  searchCommunityTemplates,
  rateCommunityTemplate,
  deleteCommunityTemplate,
} from '../../lib/communityTemplates';

interface CommunityCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: CommunityTemplateRecord) => void;
  currentUserId?: string | null;
  onOpenAuthModal?: () => void;
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const CATEGORIES = [
  'Todas',
  'Ingeniería & Tecnología',
  'Ciencias de la Salud & Medicina',
  'Ciencias Exactas & Físico-Matemáticas',
  'Derecho & Ciencias Jurídicas',
  'Ciencias Sociales & Psicología',
  'Humanidades & Filosofía',
  'Economía, Negocios & Gestión',
  'Metodología de la Investigación',
];

export const CommunityCatalogModal: React.FC<CommunityCatalogModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  currentUserId,
  onOpenAuthModal,
  onNotify,
}) => {
  const [templates, setTemplates] = useState<CommunityTemplateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState<'top_rated' | 'recent' | 'popular'>('top_rated');
  const [ratingLoadingId, setRatingLoadingId] = useState<string | null>(null);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const results = await searchCommunityTemplates({
        query: searchQuery,
        category: selectedCategory,
        sortBy,
        userId: currentUserId,
      });
      setTemplates(results);
    } catch (err) {
      console.error('Error cargando catálogo comunitario:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadTemplates();
    }
  }, [isOpen, selectedCategory, sortBy]);

  // Debounce para búsqueda por texto
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      void loadTemplates();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleRate = async (templateId: string, ratingValue: number) => {
    if (!currentUserId) {
      onNotify?.('Inicia sesión para calificar plantillas de la comunidad', 'info');
      onOpenAuthModal?.();
      return;
    }

    setRatingLoadingId(templateId);
    try {
      const stats = await rateCommunityTemplate(templateId, currentUserId, ratingValue);
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId
            ? {
                ...t,
                avgRating: stats.avgRating,
                ratingCount: stats.ratingCount,
                userRating: stats.userRating,
              }
            : t
        )
      );
      onNotify?.(`¡Calificación de ${ratingValue} estrellas guardada!`, 'success');
    } catch (err: any) {
      console.error('Error al calificar:', err);
      onNotify?.('No se pudo guardar la calificación', 'error');
    } finally {
      setRatingLoadingId(null);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!currentUserId) return;
    if (!window.confirm('¿Seguro que deseas eliminar esta plantilla de la comunidad?')) return;

    try {
      await deleteCommunityTemplate(templateId, currentUserId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      onNotify?.('Plantilla eliminada de la comunidad', 'info');
    } catch (err) {
      console.error('Error al eliminar plantilla:', err);
      onNotify?.('Error al eliminar la plantilla', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Encabezado */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Comunidad de Plantillas Públicas
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {templates.length} disponibles
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Descubre formatos técnicos, tesis y protocolos compartidos por investigadores y estudiantes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/30 grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
          {/* Buscador */}
          <div className="sm:col-span-5 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por título, autor, perfil técnico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-white outline-none placeholder-slate-500 transition-colors"
            />
          </div>

          {/* Categoría */}
          <div className="sm:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-slate-200 outline-none transition-colors"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenar por */}
          <div className="sm:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-slate-200 outline-none transition-colors"
            >
              <option value="top_rated">⭐ Mejor valoradas</option>
              <option value="popular">🔥 Más populares</option>
              <option value="recent">⏱️ Más recientes</option>
            </select>
          </div>
        </div>

        {/* Listado de Tarjetas de la Comunidad */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Consultando catálogo de la comunidad...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-500">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200 mb-1">
                  No se encontraron plantillas comunitarias
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Sé el primero en publicar una plantilla desde el editor activo usando el botón «Publicar como plantilla».
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tmpl) => {
                const isAuthor = currentUserId && tmpl.authorId === currentUserId;
                const isRating = ratingLoadingId === tmpl.id;

                return (
                  <div
                    key={tmpl.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between group shadow-sm hover:shadow-indigo-500/10"
                  >
                    <div>
                      {/* Cabecera de la tarjeta: Categoría y Rating */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                            {tmpl.category}
                          </span>
                          {tmpl.technicalProfile && (
                            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                              {tmpl.technicalProfile}
                            </span>
                          )}
                        </div>

                        {/* Puntuación y Estrellas */}
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg text-amber-300 text-xs font-bold font-mono">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{tmpl.avgRating > 0 ? tmpl.avgRating.toFixed(1) : 'Nuevo'}</span>
                          <span className="text-[10px] text-amber-400/70 font-normal">
                            ({tmpl.ratingCount})
                          </span>
                        </div>
                      </div>

                      {/* Título */}
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors mb-1.5 line-clamp-1">
                        {tmpl.title}
                      </h3>

                      {/* Descripción */}
                      <p className="text-xs text-slate-300 mb-3 line-clamp-2 leading-relaxed">
                        {tmpl.description}
                      </p>

                      {/* Metadatos: Autor y Extensión */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          <span className="truncate max-w-[120px] font-medium text-slate-300">
                            {tmpl.authorName}
                          </span>
                        </div>
                        {tmpl.targetWords > 0 && (
                          <div className="flex items-center gap-1 font-mono text-slate-400">
                            <span>~{tmpl.targetWords} pal</span>
                          </div>
                        )}
                        <span className="uppercase text-[10px] font-mono text-slate-500">
                          {tmpl.paperSize || 'carta'}
                        </span>
                      </div>
                    </div>

                    {/* Fila inferior: Calificación interactiva y Botón Usar */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      {/* Selector de calificación interactivo (1-5 estrellas) */}
                      <div className="flex items-center gap-1" title="Califica esta plantilla de 1 a 5 estrellas">
                        {isRating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        ) : (
                          [1, 2, 3, 4, 5].map((star) => {
                            const isFilled = (tmpl.userRating || 0) >= star;
                            return (
                              <button
                                key={star}
                                type="button"
                                onClick={() => handleRate(tmpl.id, star)}
                                className="p-0.5 hover:scale-125 transition-transform"
                                title={`Votar ${star} estrella${star > 1 ? 's' : ''}`}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    isFilled
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-600 hover:text-amber-400'
                                  }`}
                                />
                              </button>
                            );
                          })
                        )}
                        {tmpl.userRating && (
                          <span className="text-[10px] text-amber-400 font-mono ml-1">
                            Tu voto: {tmpl.userRating}★
                          </span>
                        )}
                      </div>

                      {/* Acciones: Eliminar si es autor + Botón Usar */}
                      <div className="flex items-center gap-2">
                        {isAuthor && (
                          <button
                            type="button"
                            onClick={() => handleDelete(tmpl.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                            title="Eliminar tu plantilla de la comunidad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTemplate(tmpl);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Usar plantilla</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
