import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock,
  FilePlus2,
  FileText,
  FlaskConical,
  Globe,
  GraduationCap,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Scale,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { CommunityTemplateRecord, StudyWorkDraft } from '../../types/studyflow';
import { fetchTopCommunityTemplates, rateCommunityTemplate } from '../../lib/communityTemplates';
import { CommunityCatalogModal } from './CommunityCatalogModal';

export interface TemplateCardItem {
  id: string;
  name: string;
  category: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  targetWords: number;
  previewType: 'blank' | 'essay' | 'lab' | 'feynman' | 'monograph';
}

export const TEMPLATE_CARDS: TemplateCardItem[] = [
  {
    id: 'blank',
    name: 'Documento en Blanco',
    category: 'Lienzo Libre',
    badge: 'Sin formato previo',
    description: 'Comienza a redactar desde cero con hoja limpia, libertad de formato, tablas y citas.',
    icon: <FilePlus2 className="w-5 h-5 text-indigo-400" />,
    targetWords: 0,
    previewType: 'blank',
  },
  {
    id: 'essay',
    name: 'Ensayo Académico',
    category: 'Argumentativo',
    badge: '1.200 palabras sugeridas',
    description: 'Estructura clásica con planteamiento de tesis, fundamentación en 3 argumentos, refutación y conclusión.',
    icon: <Scale className="w-5 h-5 text-indigo-400" />,
    targetWords: 1200,
    previewType: 'essay',
  },
  {
    id: 'lab_report',
    name: 'Informe de Laboratorio',
    category: 'Ciencias & Experimental',
    badge: '1.500 palabras · IMRyD',
    description: 'Estructura IMRyD con resumen (Abstract), tabla de muestreo de datos, discusión y análisis de error.',
    icon: <FlaskConical className="w-5 h-5 text-emerald-400" />,
    targetWords: 1500,
    previewType: 'lab',
  },
  {
    id: 'feynman_synthesis',
    name: 'Síntesis Técnica Feynman',
    category: 'Dominio Conceptual',
    badge: '600 palabras · 4 Pasos',
    description: 'Explica un tema complejo con tus propias palabras cotidianas, detecta lagunas y crea analogías claras.',
    icon: <Lightbulb className="w-5 h-5 text-amber-400" />,
    targetWords: 600,
    previewType: 'feynman',
  },
  {
    id: 'monograph',
    name: 'Monografía o Tesis Breve',
    category: 'Investigación Formal',
    badge: '3.000 palabras · Capitular',
    description: 'Estructura formal con portada institucional, resumen, capítulos temáticos y referencias bibliográficas.',
    icon: <GraduationCap className="w-5 h-5 text-purple-400" />,
    targetWords: 3000,
    previewType: 'monograph',
  },
];

export interface TemplatesWelcomeHubProps {
  works: StudyWorkDraft[];
  onSelectTemplate: (templateId: string) => void;
  onSelectCommunityTemplate?: (tmpl: CommunityTemplateRecord) => void;
  onOpenWork: (id: string) => void;
  onDeleteWork?: (id: string) => void;
  onRenameWork?: (id: string, newTitle: string) => void;
  onShareWork?: (work: StudyWorkDraft) => void;
  isCreating?: boolean;
  creatingTemplateId?: string | null;
  currentUserId?: string | null;
  onOpenAuthModal?: () => void;
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
  onOpenImportModal?: () => void;
}

export const TemplatesWelcomeHub: React.FC<TemplatesWelcomeHubProps> = ({
  works,
  onSelectTemplate,
  onSelectCommunityTemplate,
  onOpenWork,
  onDeleteWork,
  onRenameWork,
  onShareWork,
  isCreating = false,
  creatingTemplateId = null,
  currentUserId,
  onOpenAuthModal,
  onNotify,
  onOpenImportModal,
}) => {
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Orden consistente: documentos editados más recientemente primero
  const sortedWorks = useMemo(() => {
    return [...works].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [works]);

  const handleStartRename = (e: React.MouseEvent, work: StudyWorkDraft) => {
    e.stopPropagation();
    setEditingWorkId(work.id);
    setEditingTitle(work.title || 'Trabajo sin título');
  };

  const handleSaveRename = (workId: string) => {
    const trimmed = editingTitle.trim() || 'Trabajo sin título';
    onRenameWork?.(workId, trimmed);
    setEditingWorkId(null);
  };

  const handleCancelRename = () => {
    setEditingWorkId(null);
  };
  const [topCommunityTemplates, setTopCommunityTemplates] = useState<CommunityTemplateRecord[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [communityCatalogOpen, setCommunityCatalogOpen] = useState(false);
  const [ratingLoadingId, setRatingLoadingId] = useState<string | null>(null);

  const loadCommunityTop = async () => {
    setIsLoadingCommunity(true);
    try {
      const top5 = await fetchTopCommunityTemplates(5, currentUserId);
      setTopCommunityTemplates(top5);
    } catch (err) {
      console.warn('Error cargando top comunitario:', err);
    } finally {
      setIsLoadingCommunity(false);
    }
  };

  useEffect(() => {
    void loadCommunityTop();
  }, [currentUserId]);

  const handleRate = async (templateId: string, ratingValue: number) => {
    if (!currentUserId) {
      onNotify?.('Inicia sesión para calificar plantillas de la comunidad', 'info');
      onOpenAuthModal?.();
      return;
    }

    setRatingLoadingId(templateId);
    try {
      const stats = await rateCommunityTemplate(templateId, currentUserId, ratingValue);
      setTopCommunityTemplates((prev) =>
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

  const renderMiniature = (type: TemplateCardItem['previewType']) => {
    switch (type) {
      case 'blank':
        return (
          <div className="w-full h-32 rounded-md bg-white border border-slate-200/90 shadow-sm p-3 flex flex-col items-center justify-center text-slate-300 relative overflow-hidden">
            <div className="w-12 h-16 border-2 border-dashed border-slate-200 rounded-sm flex items-center justify-center">
              <Plus className="w-4 h-4 text-slate-300" />
            </div>
            <span className="text-[9px] font-mono mt-1 text-slate-400">Lienzo limpio</span>
          </div>
        );

      case 'essay':
        return (
          <div className="w-full h-32 rounded-md bg-white border border-slate-200/90 shadow-sm p-2.5 flex flex-col justify-between relative overflow-hidden text-[7px] select-none">
            <div>
              <div className="h-2 w-3/4 bg-slate-900 rounded-xs mb-1" />
              <div className="h-1 w-1/2 bg-slate-400 rounded-xs mb-2" />
              <div className="p-1 bg-indigo-50 border-l-2 border-indigo-500 rounded-r text-indigo-900 font-semibold mb-1">
                Tesis de partida
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="h-1 w-full bg-slate-200 rounded-xs" />
              <div className="h-1 w-5/6 bg-slate-200 rounded-xs" />
              <div className="h-1 w-2/3 bg-slate-200 rounded-xs" />
            </div>
          </div>
        );

      case 'lab':
        return (
          <div className="w-full h-32 rounded-md bg-white border border-slate-200/90 shadow-sm p-2.5 flex flex-col justify-between relative overflow-hidden text-[7px] select-none">
            <div>
              <div className="h-2 w-2/3 bg-emerald-900 rounded-xs mb-1" />
              <div className="h-1 w-1/3 bg-emerald-500/40 rounded-xs mb-1.5" />
            </div>
            <div className="border border-slate-200 rounded overflow-hidden my-0.5">
              <div className="grid grid-cols-3 bg-slate-100 p-0.5 font-bold text-slate-600">
                <span>N°</span>
                <span>V (mL)</span>
                <span>T (°C)</span>
              </div>
              <div className="grid grid-cols-3 p-0.5 text-slate-500 border-t border-slate-100">
                <span>1</span>
                <span>10.5</span>
                <span>24.1</span>
              </div>
            </div>
            <div className="h-1 w-1/2 bg-slate-300 rounded-xs" />
          </div>
        );

      case 'feynman':
        return (
          <div className="w-full h-32 rounded-md bg-white border border-slate-200/90 shadow-sm p-2.5 flex flex-col justify-between relative overflow-hidden text-[7px] select-none">
            <div>
              <div className="h-2 w-3/4 bg-amber-900 rounded-xs mb-1 flex items-center justify-between" />
              <div className="h-1 w-full bg-slate-200 rounded-xs" />
            </div>
            <div className="grid grid-cols-2 gap-1 my-1">
              <div className="bg-amber-50 border border-amber-200/60 p-1 rounded">
                <span className="text-[6px] font-bold text-amber-700 block">1. Simple</span>
                <div className="h-0.5 w-full bg-amber-200 rounded-xs mt-0.5" />
              </div>
              <div className="bg-blue-50 border border-blue-200/60 p-1 rounded">
                <span className="text-[6px] font-bold text-blue-700 block">2. Analogía</span>
                <div className="h-0.5 w-full bg-blue-200 rounded-xs mt-0.5" />
              </div>
            </div>
            <div className="border-t border-dashed border-slate-200 pt-0.5">
              <div className="h-1 w-2/3 bg-slate-300 rounded-xs" />
            </div>
          </div>
        );

      case 'monograph':
        return (
          <div className="w-full h-32 rounded-md bg-white border border-slate-200/90 shadow-sm p-2.5 flex flex-col justify-between items-center text-center relative overflow-hidden text-[7px] select-none">
            <div className="h-1 w-1/3 bg-purple-300 rounded-xs mb-1" />
            <div className="space-y-0.5 w-full flex flex-col items-center">
              <div className="h-2 w-3/4 bg-slate-900 rounded-xs" />
              <div className="h-1 w-1/2 bg-slate-300 rounded-xs" />
            </div>
            <div className="w-full border-t border-slate-200 pt-1 space-y-0.5">
              <div className="h-1 w-full bg-slate-200 rounded-xs" />
              <div className="h-1 w-4/5 bg-slate-200 rounded-xs mx-auto" />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 bg-slate-950/60 sf-env-canvas custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Cabecera del Hub */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Taller de Redacción & Trabajos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ¿Qué deseas redactar hoy?
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Elige una plantilla académica con metodología probada, explora los formatos mejor
              calificados por la comunidad o continúa tus borradores guardados.
            </p>
          </div>
          {onOpenImportModal && (
            <button
              type="button"
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto flex-shrink-0 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-white" />
              <span>Importar (.md, .pdf, .docx, .pptx)</span>
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN 1: TRABAJOS GUARDADOS (MIS REDACCIONES EXISTENTES)               */}
        {/* ========================================================================= */}
        {works.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Tus Redacciones en Curso
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {works.length} trabajo{works.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedWorks.map((work) => {
                const targetPct =
                  work.targetWordCount && work.targetWordCount > 0
                    ? Math.min(100, Math.round((work.wordCount / work.targetWordCount) * 100))
                    : null;

                const isEditing = editingWorkId === work.id;

                return (
                  <div
                    key={work.id}
                    className="group relative flex flex-col justify-between bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 transition-all duration-200 shadow-sm"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        {isEditing ? (
                          <div
                            className="flex items-center gap-1.5 flex-1 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveRename(work.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelRename();
                                }
                              }}
                              autoFocus
                              placeholder="Nombre del documento..."
                              className="flex-1 bg-slate-950 border border-indigo-400 rounded-lg px-2.5 py-1 text-sm text-white font-bold outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(work.id)}
                              className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20"
                              title="Guardar nombre"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelRename}
                              className="p-1 rounded text-slate-400 hover:bg-slate-800"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div
                              onClick={() => onOpenWork(work.id)}
                              onDoubleClick={(e) => handleStartRename(e, work)}
                              className="min-w-0 flex-1 cursor-pointer"
                              title="Doble clic para renombrar"
                            >
                              <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                                {work.title || 'Trabajo sin título'}
                              </h3>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>
                                  Editado {new Date(work.updatedAt).toLocaleDateString('es-ES')}
                                </span>
                                {work.paperSize && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-500/15 border border-indigo-500/25 text-[9px] font-mono text-indigo-300 uppercase">
                                    {work.paperSize === 'legal' ? 'Oficio' : work.paperSize === 'a4' ? 'A4' : 'Carta'}
                                  </span>
                                )}
                                {work.isShared && (
                                  <span
                                    className="px-1.5 py-0.2 rounded bg-teal-500/15 border border-teal-500/30 text-[9px] font-medium text-teal-300 inline-flex items-center gap-1"
                                    title={work.ownerUsername ? `Compartido por @${work.ownerUsername}` : 'Colaborativo'}
                                  >
                                    <Users className="w-2.5 h-2.5 text-teal-400" />
                                    <span>Colab{work.ownerUsername ? ` @${work.ownerUsername}` : ''}</span>
                                  </span>
                                )}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {onShareWork && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShareWork(work);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800"
                                  title="Compartir redacción (en vivo o copia)"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onRenameWork && (
                                <button
                                  type="button"
                                  onClick={(e) => handleStartRename(e, work)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800"
                                  title="Renombrar trabajo"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteWork && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteWork(work.id);
                                  }}
                                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                                  title="Eliminar borrador"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div
                        onClick={() => onOpenWork(work.id)}
                        className="cursor-pointer space-y-1.5 pt-1"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                          <span>{work.wordCount} palabras</span>
                          {work.targetWordCount ? (
                            <span className="text-indigo-300">{targetPct}% meta</span>
                          ) : (
                            <span className="text-slate-500">Sin meta fija</span>
                          )}
                        </div>

                        {targetPct !== null && (
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                              style={{ width: `${targetPct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenWork(work.id)}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <span>Abrir editor</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 2: PLANTILLAS OFICIALES POR DEFECTO                              */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Plantillas Disponibles por Defecto
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {TEMPLATE_CARDS.length} opciones oficiales
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {TEMPLATE_CARDS.map((card) => {
              const isCurrentCreating = isCreating && creatingTemplateId === card.id;
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    if (!isCreating) {
                      onSelectTemplate(card.id);
                    }
                  }}
                  className={`group relative flex flex-col justify-between bg-slate-900/80 hover:bg-slate-900 border rounded-2xl p-3.5 shadow-lg transition-all duration-200 text-left ${
                    isCurrentCreating
                      ? 'border-indigo-400 ring-2 ring-indigo-500/50 shadow-indigo-500/20 cursor-wait'
                      : isCreating
                      ? 'opacity-60 cursor-not-allowed border-slate-800'
                      : 'border-slate-800 hover:border-indigo-500/60 hover:shadow-indigo-500/10 cursor-pointer'
                  }`}
                >
                  {/* Miniatura visual de la hoja */}
                  <div className="mb-3 transform group-hover:-translate-y-1 transition-transform duration-200">
                    {renderMiniature(card.previewType)}
                  </div>

                  <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                          {card.category}
                        </span>
                        {card.targetWords > 0 && (
                          <span className="text-[10px] font-mono text-slate-500">
                            ~{card.targetWords} pal
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors">
                        {card.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {card.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 font-medium">{card.badge}</span>
                      <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {isCurrentCreating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN 3: COMUNIDAD DE PLANTILLAS (TOP 5 MEJOR VALORADAS)               */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Plantillas de la Comunidad (Top 5 Mejor Valoradas)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCommunityCatalogOpen(true)}
              className="px-3 py-1 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Ver más</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoadingCommunity ? (
            <div className="h-32 flex items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Cargando plantillas top de la comunidad...</span>
            </div>
          ) : topCommunityTemplates.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center text-slate-400 text-xs space-y-2">
              <p className="font-semibold text-slate-300">
                Aún no hay plantillas publicadas en la comunidad
              </p>
              <p className="text-slate-500 max-w-md mx-auto">
                Puedes redactar tu propio documento y publicarlo como plantilla pública desde el editor
                para que otros usuarios lo califiquen y utilicen.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {topCommunityTemplates.map((tmpl, idx) => {
                const isRating = ratingLoadingId === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    className="group relative flex flex-col justify-between bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-2xl p-3.5 shadow-lg transition-all duration-200 text-left"
                  >
                    <div>
                      {/* Badge de Ranking Top */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono">
                          #{idx + 1} Top
                        </span>
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded text-amber-300 text-[10px] font-bold font-mono">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{tmpl.avgRating > 0 ? tmpl.avgRating.toFixed(1) : 'Nuevo'}</span>
                          <span className="text-[9px] text-amber-400/70 font-normal">
                            ({tmpl.ratingCount})
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider block mb-0.5 truncate">
                        {tmpl.technicalProfile || tmpl.category}
                      </span>

                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-200 transition-colors line-clamp-1 mb-1">
                        {tmpl.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">
                        {tmpl.description}
                      </p>

                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mb-2">
                        <User className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[120px]">{tmpl.authorName}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      {/* Votación rápida */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Calificar:</span>
                        <div className="flex items-center gap-0.5">
                          {isRating ? (
                            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                          ) : (
                            [1, 2, 3, 4, 5].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => handleRate(tmpl.id, s)}
                                className="p-0.5 hover:scale-125 transition-transform"
                                title={`Votar ${s} estrellas`}
                              >
                                <Star
                                  className={`w-3 h-3 ${
                                    (tmpl.userRating || 0) >= s
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-600 hover:text-amber-400'
                                  }`}
                                />
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectCommunityTemplate) {
                            onSelectCommunityTemplate(tmpl);
                          }
                        }}
                        className="w-full py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Usar plantilla</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Catálogo Completo de la Comunidad */}
      <CommunityCatalogModal
        isOpen={communityCatalogOpen}
        onClose={() => setCommunityCatalogOpen(false)}
        onSelectTemplate={(tmpl) => {
          if (onSelectCommunityTemplate) {
            onSelectCommunityTemplate(tmpl);
          }
        }}
        currentUserId={currentUserId}
        onOpenAuthModal={onOpenAuthModal}
        onNotify={onNotify}
      />
    </div>
  );
};
