import React from 'react';
import {
  Clock,
  FilePlus2,
  FileText,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  Loader2,
  Plus,
  Scale,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { StudyWorkDraft } from '../../types/studyflow';

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

interface TemplatesWelcomeHubProps {
  works: StudyWorkDraft[];
  onSelectTemplate: (templateId: string) => void;
  onOpenWork: (id: string) => void;
  onDeleteWork?: (id: string) => void;
  isCreating?: boolean;
  creatingTemplateId?: string | null;
}

export const TemplatesWelcomeHub: React.FC<TemplatesWelcomeHubProps> = ({
  works,
  onSelectTemplate,
  onOpenWork,
  onDeleteWork,
  isCreating = false,
  creatingTemplateId = null,
}) => {
  const renderMiniature = (type: TemplateCardItem['previewType']) => {
    switch (type) {
      case 'blank':
        return (
          <div className="w-full h-32 rounded-md bg-white border border-slate-200/90 shadow-sm p-3 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-indigo-400 transition-colors">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-1 text-slate-400 group-hover:text-indigo-600 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Hoja Limpia
            </span>
            <div className="absolute inset-x-4 bottom-2 h-0.5 bg-slate-100 rounded-full" />
          </div>
        );

      case 'essay':
        return (
          <div className="w-full h-32 rounded-md bg-white border border-slate-200/90 shadow-sm p-2.5 flex flex-col justify-between relative overflow-hidden text-[7px] leading-tight text-slate-700 select-none">
            <div className="space-y-1">
              <div className="h-2 w-3/4 bg-slate-800 rounded-xs mb-1" />
              <div className="h-1 w-full bg-slate-200 rounded-xs" />
              <div className="h-1 w-5/6 bg-slate-200 rounded-xs" />
            </div>
            <div className="border-l-2 border-indigo-500 pl-1.5 py-0.5 my-1 bg-indigo-50/50 rounded-r">
              <div className="h-1 w-4/5 bg-indigo-300 rounded-xs" />
              <div className="h-1 w-3/5 bg-indigo-200 rounded-xs mt-0.5" />
            </div>
            <div className="space-y-1">
              <div className="h-1.5 w-1/2 bg-slate-700 rounded-xs" />
              <div className="h-1 w-full bg-slate-200 rounded-xs" />
            </div>
          </div>
        );

      case 'lab':
        return (
          <div className="w-full h-32 rounded-md bg-white border border-slate-200/90 shadow-sm p-2.5 flex flex-col justify-between relative overflow-hidden text-[7px] select-none">
            <div>
              <div className="h-2 w-2/3 bg-emerald-900 rounded-xs mb-1" />
              <div className="h-1 w-full bg-slate-200 rounded-xs mb-1" />
            </div>
            {/* Mini tabla científica */}
            <div className="border border-slate-200 rounded overflow-hidden my-1">
              <div className="grid grid-cols-3 bg-slate-100 p-0.5 border-b border-slate-200 font-bold text-slate-600">
                <span className="text-[6px] truncate">Exp #</span>
                <span className="text-[6px] truncate">Var (x)</span>
                <span className="text-[6px] truncate">Val (y)</span>
              </div>
              <div className="grid grid-cols-3 p-0.5 border-b border-slate-100 text-slate-500">
                <span className="text-[6px]">1</span>
                <span className="text-[6px]">12.5</span>
                <span className="text-[6px]">24.8</span>
              </div>
              <div className="grid grid-cols-3 p-0.5 text-slate-500">
                <span className="text-[6px]">2</span>
                <span className="text-[6px]">25.0</span>
                <span className="text-[6px]">49.2</span>
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
    <div className="w-full h-full overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 bg-slate-950/60 sf-env-canvas">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Cabecera del Hub */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Taller de Redacción & Trabajos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ¿Qué deseas redactar hoy?
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Elige una plantilla académica con metodología probada o inicia en blanco. Podrás
            incorporar tablas, saltos de página y citas directas de tus documentos leídos.
          </p>
        </div>

        {/* Sección de Plantillas: Grid de Tarjetas con Miniaturas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Plantillas Disponibles
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {TEMPLATE_CARDS.length} opciones
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

                  {/* Detalles de la plantilla */}
                  <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 truncate">
                          {card.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors leading-snug">
                        {card.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 mt-1">
                        {card.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">
                        {card.badge}
                      </span>
                      {isCurrentCreating ? (
                        <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5 animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          <span>Abriendo...</span>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                          Elegir →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección de Trabajos Guardados (si existen) */}
        {works.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Continuar Trabajo Guardado ({works.length})</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {works.map((work) => {
                const targetPct =
                  work.targetWordCount && work.targetWordCount > 0
                    ? Math.min(100, Math.round((work.wordCount / work.targetWordCount) * 100))
                    : null;

                return (
                  <div
                    key={work.id}
                    className="group relative flex flex-col justify-between bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 transition-all duration-200"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          onClick={() => onOpenWork(work.id)}
                          className="min-w-0 flex-1 cursor-pointer"
                        >
                          <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                            {work.title}
                          </h3>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>
                              Editado {new Date(work.updatedAt).toLocaleDateString('es-ES')}
                            </span>
                          </p>
                        </div>

                        {onDeleteWork && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteWork(work.id);
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar borrador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
      </div>
    </div>
  );
};
