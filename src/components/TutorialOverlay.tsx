import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Sparkles,
  X,
} from 'lucide-react';
import { AppModule } from './Navbar';

export interface TutorialStep {
  id: string;
  targetId: string;
  module: AppModule;
  requiresSidebar?: boolean;
  badge: string;
  title: string;
  description: string;
  tip: string;
  preferredPlacement?: 'bottom' | 'right' | 'left' | 'top';
}

export const EXPRESS_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome-nav',
    targetId: 'tour-nav-tabs',
    module: 'docs',
    badge: 'Paso 1 · Navegación',
    title: 'Tus 3 espacios principales',
    description:
      'Aquí cambias al instante entre tu Visor de estudio, el Reloj Pomodoro con ruta diaria y la Pizarra de apuntes.',
    tip: 'A la derecha tienes el temporizador rápido, el personalizador de Tema, tu cuenta/respaldo y esta Guía.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'upload-material',
    targetId: 'tour-sidebar-upload',
    module: 'docs',
    requiresSidebar: true,
    badge: 'Paso 2 · Material',
    title: 'Carga PDF, Word o PowerPoint',
    description:
      'Arrastra tus guías, apuntes o presentaciones (.pdf, .docx, .pptx) y organízalas en carpetas por ramo.',
    tip: 'Puedes colapsar este panel en cualquier momento desde su botón superior para leer con más espacio.',
    preferredPlacement: 'right',
  },
  {
    id: 'viewer-tools',
    targetId: 'tour-viewer-tools',
    module: 'docs',
    badge: 'Paso 3 · Visor',
    title: 'Modo libro, inmersivo y post-its',
    description:
      'Cambia entre 1 hoja o 2 hojas tipo libro, activa Pantalla Completa inmersiva con dock inferior y pega notas sin tapar el texto.',
    tip: 'Con "+ Al margen" tus apuntes se acomodan automáticamente fuera de la hoja.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'pomodoro-focus',
    targetId: 'tour-pomodoro-clock',
    module: 'pomodoro',
    badge: 'Paso 4 · Ritmo',
    title: 'Pomodoro y Diagnóstico real',
    description:
      'Controla tus sesiones de estudio y descansos. Con "Medir mi ritmo" en el visor, el sistema calcula ciclos ideales según tu velocidad real.',
    tip: 'Al completar un bloque, el descanso arranca automáticamente con pantalla en blur.',
    preferredPlacement: 'right',
  },
  {
    id: 'study-route',
    targetId: 'tour-pomodoro-route',
    module: 'pomodoro',
    badge: 'Paso 5 · Ruta',
    title: 'Ruta automática y tareas',
    description:
      'Tu planificador divide las páginas por días y etapas hasta tu fecha límite. Alterna aquí entre la Ruta paso a paso y tus Tareas.',
    tip: 'Pulsa "Ajustar fecha y archivos" cuando quieras recalcular prioridades o fecha objetivo.',
    preferredPlacement: 'left',
  },
  {
    id: 'board-theme',
    targetId: 'tour-kanban-toolbar',
    module: 'board',
    badge: 'Paso 6 · Pizarra y Tema',
    title: 'Organiza tus notas y personaliza todo',
    description:
      'Todos los post-its aparecen agrupados por Ideas, Preguntas, Resumen y Tareas para arrastrarlos y exportarlos a PDF.',
    tip: 'Desde "Tema" arriba puedes cambiar colores, tipografía o subir tu propio fondo de pantalla.',
    preferredPlacement: 'bottom',
  },
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialOverlayProps {
  open: boolean;
  onClose: (markCompleted: boolean) => void;
  onNavigateModule: (mod: AppModule) => void;
  onEnsureSidebarOpen: () => void;
  onEnsurePomodoroSession: () => void;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  open,
  onClose,
  onNavigateModule,
  onEnsureSidebarOpen,
  onEnsurePomodoroSession,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const currentStep = EXPRESS_TUTORIAL_STEPS[stepIndex] || EXPRESS_TUTORIAL_STEPS[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === EXPRESS_TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open]);

  const measureTarget = useCallback(() => {
    if (!open || typeof document === 'undefined') return;
    setViewport({ w: window.innerWidth, h: window.innerHeight });

    const el = document.querySelector<HTMLElement>(
      `[data-tour-id="${currentStep.targetId}"]`
    );
    if (!el) {
      setTargetRect(null);
      return;
    }

    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) {
      setTargetRect(null);
      return;
    }

    if (r.top < 0 || r.bottom > window.innerHeight) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    const pad = 6;
    const clampedTop = Math.max(4, r.top - pad);
    const clampedLeft = Math.max(4, r.left - pad);
    const maxW = window.innerWidth - clampedLeft - 4;
    const maxH = window.innerHeight - clampedTop - 4;

    setTargetRect({
      top: clampedTop,
      left: clampedLeft,
      width: Math.min(r.width + pad * 2, maxW),
      height: Math.min(r.height + pad * 2, maxH),
    });
  }, [open, currentStep.targetId]);

  useEffect(() => {
    if (!open) return;

    onNavigateModule(currentStep.module);
    if (currentStep.requiresSidebar) {
      onEnsureSidebarOpen();
    }
    if (currentStep.module === 'pomodoro') {
      onEnsurePomodoroSession();
    }

    const t1 = window.setTimeout(measureTarget, 50);
    const t2 = window.setTimeout(measureTarget, 180);
    const t3 = window.setTimeout(measureTarget, 340);

    const handleReposition = () => measureTarget();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [
    open,
    currentStep,
    onNavigateModule,
    onEnsureSidebarOpen,
    onEnsurePomodoroSession,
    measureTarget,
  ]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(true);
      } else if (e.key === 'ArrowRight') {
        if (stepIndex < EXPRESS_TUTORIAL_STEPS.length - 1) {
          setStepIndex((i) => i + 1);
        } else {
          onClose(true);
        }
      } else if (e.key === 'ArrowLeft' && stepIndex > 0) {
        setStepIndex((i) => i - 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, stepIndex, onClose]);

  if (!open) return null;

  const cardWidth = Math.min(368, viewport.w - 24);
  const estCardHeight = 250;
  const gap = 16;

  const computeCardPosition = (): React.CSSProperties => {
    if (!targetRect || viewport.w < 640) {
      return {
        left: '50%',
        bottom: '20px',
        transform: 'translateX(-50%)',
        width: `${cardWidth}px`,
      };
    }

    const placements: Array<'bottom' | 'right' | 'left' | 'top'> = [
      currentStep.preferredPlacement || 'bottom',
      'bottom',
      'right',
      'left',
      'top',
    ];

    for (const place of placements) {
      if (
        place === 'bottom' &&
        targetRect.top + targetRect.height + gap + estCardHeight <= viewport.h - 12
      ) {
        const left = clamp(
          targetRect.left + targetRect.width / 2 - cardWidth / 2,
          16,
          viewport.w - cardWidth - 16
        );
        return {
          top: `${targetRect.top + targetRect.height + gap}px`,
          left: `${left}px`,
          width: `${cardWidth}px`,
        };
      }

      if (place === 'top' && targetRect.top - gap - estCardHeight >= 12) {
        const left = clamp(
          targetRect.left + targetRect.width / 2 - cardWidth / 2,
          16,
          viewport.w - cardWidth - 16
        );
        return {
          top: `${targetRect.top - gap - estCardHeight}px`,
          left: `${left}px`,
          width: `${cardWidth}px`,
        };
      }

      if (
        place === 'right' &&
        targetRect.left + targetRect.width + gap + cardWidth <= viewport.w - 16
      ) {
        const top = clamp(targetRect.top, 16, viewport.h - estCardHeight - 16);
        return {
          top: `${top}px`,
          left: `${targetRect.left + targetRect.width + gap}px`,
          width: `${cardWidth}px`,
        };
      }

      if (place === 'left' && targetRect.left - gap - cardWidth >= 16) {
        const top = clamp(targetRect.top, 16, viewport.h - estCardHeight - 16);
        return {
          top: `${top}px`,
          left: `${targetRect.left - gap - cardWidth}px`,
          width: `${cardWidth}px`,
        };
      }
    }

    return {
      left: '50%',
      bottom: '20px',
      transform: 'translateX(-50%)',
      width: `${cardWidth}px`,
    };
  };

  return (
    <div
      className="fixed inset-0 z-[70] pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-card-title"
    >
      {/* Capa clickeable para omitir o atenuar cuando no hay spotlight recortado */}
      <div
        className={`fixed inset-0 transition-colors duration-300 ${
          targetRect ? 'bg-transparent' : 'bg-slate-950/75 backdrop-blur-sm'
        }`}
        onClick={() => onClose(true)}
      />

      {/* Marco Spotlight iluminado */}
      {targetRect && (
        <div
          className="fixed pointer-events-none rounded-2xl border-2 border-indigo-400 transition-all duration-300 ease-out"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            boxShadow:
              '0 0 0 9999px rgba(4, 6, 12, 0.72), 0 0 28px 2px rgb(var(--sf-accent-500) / 0.45)',
          }}
        />
      )}

      {/* Tarjeta guiada flotante */}
      <div
        style={computeCardPosition()}
        onClick={(e) => e.stopPropagation()}
        className="fixed z-10 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-indigo-500/50 sf-accent-glow shadow-2xl p-4 sm:p-5 space-y-3.5 transition-all duration-300 ease-out fade-in"
      >
        {/* Cabecera tarjeta */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/45 flex items-center justify-center flex-shrink-0">
              <Compass className="w-4 h-4 text-indigo-400" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                {currentStep.badge}
              </span>
              <h3
                id="tutorial-card-title"
                className="text-sm font-bold text-white leading-snug"
              >
                {currentStep.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onClose(true)}
            title="Omitir tutorial (Esc)"
            aria-label="Omitir tutorial"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Explicación concisa */}
        <p className="text-xs text-slate-200 leading-relaxed">
          {currentStep.description}
        </p>

        {/* Micro-tip práctico */}
        <div className="px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-2 text-[11px] text-indigo-200 leading-snug">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <span>{currentStep.tip}</span>
        </div>

        {/* Puntos de progreso */}
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          {EXPRESS_TUTORIAL_STEPS.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStepIndex(idx)}
              aria-label={`Ir al paso ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === stepIndex
                  ? 'w-6 bg-indigo-500'
                  : idx < stepIndex
                    ? 'w-2 bg-indigo-400/60'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Botones de navegación */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => onClose(true)}
            className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors px-1.5 py-1"
          >
            Omitir tutorial
          </button>

          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Atrás</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  onClose(true);
                } else {
                  setStepIndex((i) => i + 1);
                }
              }}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {isLast ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>¡Listo, a estudiar!</span>
                </>
              ) : (
                <>
                  <span>Siguiente</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
