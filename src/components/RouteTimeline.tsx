import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Coffee,
  FileText,
  Play,
  Sparkles,
} from 'lucide-react';
import { RouteStep, StudyPlanResult } from '../types/studyflow';

interface RouteTimelineProps {
  planResult: StudyPlanResult;
  activeRouteStepId: string | null;
  compact?: boolean;
  onStartRouteStep: (step: RouteStep, nextStep: RouteStep | null) => void;
  onToggleStepCompleted: (stepId: string) => Promise<void>;
}

interface StageItem {
  stageNumber: number;
  step: RouteStep;
  nextStep: RouteStep | null;
  trailingBreak: RouteStep | null;
  collapsedTitle: string;
  partLabel: string | null;
}

function formatMinutesHuman(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

export const RouteTimeline: React.FC<RouteTimelineProps> = ({
  planResult,
  activeRouteStepId,
  compact = false,
  onStartRouteStep,
  onToggleStepCompleted,
}) => {
  const [manualToggles, setManualToggles] = useState<Record<string, boolean>>({});
  const [manualDayToggles, setManualDayToggles] = useState<Record<number, boolean>>({});

  // Determinar la etapa actual (la activa en el reloj o la primera pendiente)
  const currentStageId = useMemo(() => {
    if (
      activeRouteStepId &&
      planResult.steps.some((s) => s.id === activeRouteStepId && s.type === 'study')
    ) {
      return activeRouteStepId;
    }
    const firstPending = planResult.steps.find(
      (s) => s.type === 'study' && !s.completed
    );
    return firstPending?.id || null;
  }, [planResult.steps, activeRouteStepId]);

  const currentDayNumber = useMemo(() => {
    const step = planResult.steps.find((s) => s.id === currentStageId);
    return step?.dayNumber ?? planResult.steps[0]?.dayNumber ?? 1;
  }, [planResult.steps, currentStageId]);

  // Al avanzar a una nueva etapa actual, asegurar que su dia y etapa se desplieguen automaticamente
  useEffect(() => {
    if (!currentStageId) return;
    setManualToggles((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, currentStageId)) return prev;
      const copy = { ...prev };
      delete copy[currentStageId];
      return copy;
    });
  }, [currentStageId]);

  useEffect(() => {
    setManualDayToggles((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, currentDayNumber)) return prev;
      const copy = { ...prev };
      delete copy[currentDayNumber];
      return copy;
    });
  }, [currentDayNumber]);

  // Transformar pasos planos en etapas numeradas + metricas por dia
  const stagesByDay = useMemo(() => {
    const studySteps = planResult.steps.filter((s) => s.type === 'study');

    const docTotalOccurrences = new Map<string, number>();
    studySteps.forEach((step) => {
      const segs = step.segments || (step.docId ? [{ docId: step.docId }] : []);
      const uniqueIds = new Set(segs.map((s) => s.docId));
      uniqueIds.forEach((id) => {
        docTotalOccurrences.set(id, (docTotalOccurrences.get(id) || 0) + 1);
      });
    });

    const docCurrentIndex = new Map<string, number>();
    const dayMap = new Map<
      number,
      {
        label: string;
        stages: StageItem[];
        totalStudyMinutes: number;
        totalBreakMinutes: number;
        totalPages: number;
        docNames: string[];
      }
    >();
    let stageCounter = 0;

    planResult.steps.forEach((step, idx) => {
      if (step.type !== 'study') {
        if (dayMap.has(step.dayNumber)) {
          dayMap.get(step.dayNumber)!.totalBreakMinutes += step.durationMinutes;
        }
        return;
      }
      stageCounter++;

      const nextStep =
        idx + 1 < planResult.steps.length ? planResult.steps[idx + 1] : null;
      const trailingBreak =
        nextStep && nextStep.type !== 'study' ? nextStep : null;

      const segs = step.segments || [];
      let partLabel: string | null = null;
      let collapsedTitle = step.docName;

      if (segs.length === 1) {
        const seg = segs[0];
        const totalForDoc = docTotalOccurrences.get(seg.docId) || 1;
        const currPart = (docCurrentIndex.get(seg.docId) || 0) + 1;
        docCurrentIndex.set(seg.docId, currPart);
        collapsedTitle = seg.docName;
        if (totalForDoc > 1) {
          partLabel = `Parte ${currPart}/${totalForDoc}`;
        }
      } else if (segs.length > 1) {
        segs.forEach((seg) => {
          docCurrentIndex.set(seg.docId, (docCurrentIndex.get(seg.docId) || 0) + 1);
        });
        collapsedTitle = `${segs[0].docName} + ${segs.length - 1} más`;
        partLabel = `${segs.length} archivos`;
      } else if (step.docId) {
        const totalForDoc = docTotalOccurrences.get(step.docId) || 1;
        const currPart = (docCurrentIndex.get(step.docId) || 0) + 1;
        docCurrentIndex.set(step.docId, currPart);
        if (totalForDoc > 1) {
          partLabel = `Parte ${currPart}/${totalForDoc}`;
        }
      }

      if (!dayMap.has(step.dayNumber)) {
        dayMap.set(step.dayNumber, {
          label: step.dayLabel,
          stages: [],
          totalStudyMinutes: 0,
          totalBreakMinutes: 0,
          totalPages: 0,
          docNames: [],
        });
      }

      const dayEntry = dayMap.get(step.dayNumber)!;
      dayEntry.stages.push({
        stageNumber: stageCounter,
        step,
        nextStep,
        trailingBreak,
        collapsedTitle,
        partLabel,
      });
      dayEntry.totalStudyMinutes += step.durationMinutes;
      dayEntry.totalPages += step.pageCount || 0;

      if (segs.length > 0) {
        segs.forEach((s) => {
          if (!dayEntry.docNames.includes(s.docName)) {
            dayEntry.docNames.push(s.docName);
          }
        });
      } else if (step.docName && !dayEntry.docNames.includes(step.docName)) {
        dayEntry.docNames.push(step.docName);
      }
    });

    return Array.from(dayMap.entries());
  }, [planResult.steps]);

  const isDayExpanded = (dayNum: number): boolean => {
    if (Object.prototype.hasOwnProperty.call(manualDayToggles, dayNum)) {
      return manualDayToggles[dayNum];
    }
    return dayNum === currentDayNumber;
  };

  const toggleDay = (dayNum: number) => {
    setManualDayToggles((prev) => {
      const currentVal = Object.prototype.hasOwnProperty.call(prev, dayNum)
        ? prev[dayNum]
        : dayNum === currentDayNumber;
      return { ...prev, [dayNum]: !currentVal };
    });
  };

  const isStageExpanded = (stepId: string): boolean => {
    if (Object.prototype.hasOwnProperty.call(manualToggles, stepId)) {
      return manualToggles[stepId];
    }
    return stepId === currentStageId;
  };

  const toggleStage = (stepId: string) => {
    setManualToggles((prev) => {
      const currentVal = Object.prototype.hasOwnProperty.call(prev, stepId)
        ? prev[stepId]
        : stepId === currentStageId;
      return { ...prev, [stepId]: !currentVal };
    });
  };

  if (stagesByDay.length === 0) {
    return (
      <div className="text-center py-8 px-4 text-xs text-slate-400">
        <Sparkles className="w-7 h-7 mx-auto text-slate-600 mb-2" />
        Selecciona al menos un documento para visualizar tu ruta de estudio.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${compact ? '' : 'max-h-[460px] overflow-y-auto pr-1'}`}>
      {stagesByDay.map(([dayNum, group]) => {
        const isCurrentDay = dayNum === currentDayNumber;
        const dayExpanded = isDayExpanded(dayNum);
        const completedCount = group.stages.filter((s) => s.step.completed).length;
        const totalCount = group.stages.length;
        const isDayDone = totalCount > 0 && completedCount === totalCount;
        const dayTotalMins = group.totalStudyMinutes + group.totalBreakMinutes;
        const dayPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return (
          <div
            key={dayNum}
            className={`rounded-2xl border overflow-hidden transition-colors ${
              isCurrentDay
                ? 'border-indigo-500/55 bg-indigo-500/[0.09]'
                : isDayDone
                  ? 'border-emerald-500/25 bg-slate-950/40 opacity-75'
                  : 'border-slate-800 bg-slate-900/50'
            }`}
          >
            {/* Cabecera colapsable del Dia con carga de trabajo */}
            <button
              type="button"
              onClick={() => toggleDay(dayNum)}
              className={`w-full px-3 py-2.5 text-left transition-colors hover:bg-white/[0.02] ${
                dayExpanded && isCurrentDay ? 'border-b border-indigo-500/25' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {dayExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                  <Clock
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isCurrentDay
                        ? 'text-indigo-400'
                        : isDayDone
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                    }`}
                  />
                  <span
                    className={`text-xs font-bold truncate ${
                      isCurrentDay ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {group.label}
                  </span>
                  {isCurrentDay && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-600 text-white flex-shrink-0">
                      Activo
                    </span>
                  )}
                  {isDayDone && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                      Listo
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-mono text-slate-300 flex-shrink-0">
                  {completedCount}/{totalCount} etapas
                </span>
              </div>

              <div className="mt-1.5 pl-5 flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                <span>
                  Carga: {formatMinutesHuman(dayTotalMins)} ({group.totalPages} págs)
                </span>
                {!dayExpanded && group.docNames.length > 0 && (
                  <span className="truncate max-w-[140px] text-slate-400 font-sans">
                    {group.docNames[0]}
                    {group.docNames.length > 1 ? ` +${group.docNames.length - 1}` : ''}
                  </span>
                )}
              </div>

              <div className="mt-1.5 ml-5 h-1 bg-slate-950/80 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isDayDone ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${dayPct}%` }}
                />
              </div>
            </button>

            {dayExpanded && (
              <div className="p-2.5 space-y-1.5 bg-slate-950/30">
                {group.stages.map(
                  ({
                    stageNumber,
                    step,
                    nextStep,
                    trailingBreak,
                    collapsedTitle,
                    partLabel,
                  }) => {
                    const isCurrent = step.id === currentStageId;
                    const isActiveRunning = step.id === activeRouteStepId;
                    const expanded = isStageExpanded(step.id);
                    const segments = step.segments || [];

                    return (
                      <div key={step.id} className="space-y-1">
                        <div
                          className={`rounded-xl border transition-all overflow-hidden ${
                            step.completed
                              ? 'bg-slate-950/35 border-slate-800/70 opacity-65'
                              : isCurrent
                                ? 'bg-indigo-500/20 border-indigo-400/80 ring-1 ring-indigo-500/30 shadow-sm'
                                : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/40'
                          }`}
                        >
                          {/* Cabecera compacta de la Etapa */}
                          <div
                            onClick={() => toggleStage(step.id)}
                            className="px-3 py-2 flex items-center justify-between gap-2 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void onToggleStepCompleted(step.id);
                                }}
                                title="Marcar etapa completada"
                                className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 ${
                                  step.completed
                                    ? 'bg-emerald-600 border-emerald-500 text-white'
                                    : isCurrent
                                      ? 'border-indigo-400 hover:bg-indigo-500/20'
                                      : 'border-slate-600 hover:border-indigo-400'
                                }`}
                              >
                                {step.completed && <Check className="w-3 h-3" />}
                              </button>

                              <span className="text-slate-400 flex-shrink-0">
                                {expanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                      isActiveRunning
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : isCurrent
                                          ? 'bg-indigo-600 text-white'
                                          : 'bg-slate-800 text-slate-300'
                                    }`}
                                  >
                                    Etapa {stageNumber}
                                  </span>
                                  {partLabel && (
                                    <span className="text-[10px] font-mono text-indigo-200 bg-indigo-500/15 border border-indigo-500/35 px-1.5 py-0.5 rounded">
                                      {partLabel}
                                    </span>
                                  )}
                                  {step.status === 'overdue' && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                      Desfasado
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono text-slate-400 ml-auto">
                                    {step.durationMinutes}m
                                  </span>
                                </div>

                                <div
                                  className={`text-xs font-semibold truncate mt-1 ${
                                    step.completed
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-100'
                                  }`}
                                  title={collapsedTitle}
                                >
                                  {collapsedTitle}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Detalles desplegados (por defecto solo la etapa actual o al hacer clic) */}
                          {expanded && (
                            <div className="px-3 pb-3 pt-2 border-t border-slate-800/80 bg-slate-950/40 space-y-2.5 fade-in">
                              {segments.length > 0 ? (
                                <div className="space-y-1.5">
                                  {segments.map((seg, sIdx) => (
                                    <div
                                      key={`${seg.docId}_${sIdx}`}
                                      className="flex items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="text-slate-200 font-medium truncate">
                                          {segments.length > 1 ? `${sIdx + 1}. ` : ''}
                                          {seg.docName}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                          Págs. {seg.startPage}–{seg.endPage} ({seg.pageCount}{' '}
                                          {seg.pageCount === 1 ? 'pág' : 'págs'})
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-mono text-indigo-300 flex-shrink-0">
                                        ~{seg.estimatedMinutes}m
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-300 font-mono">
                                  Págs. {step.startPage}–{step.endPage} · {step.durationMinutes}{' '}
                                  min
                                </div>
                              )}

                              <div className="flex items-center justify-between gap-2 pt-0.5">
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                                  {trailingBreak ? (
                                    <>
                                      <Coffee
                                        className={`w-3 h-3 flex-shrink-0 ${
                                          trailingBreak.type === 'long_break'
                                            ? 'text-purple-300'
                                            : 'text-sky-300'
                                        }`}
                                      />
                                      <span className="truncate">
                                        Luego:{' '}
                                        {trailingBreak.type === 'long_break'
                                          ? `Descanso largo (${trailingBreak.durationMinutes}m)`
                                          : `Descanso corto (${trailingBreak.durationMinutes}m)`}
                                      </span>
                                    </>
                                  ) : (
                                    <span>Última etapa del plan</span>
                                  )}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStartRouteStep(step, nextStep);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 flex-shrink-0 transition-colors ${
                                    isActiveRunning
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                  }`}
                                >
                                  {compact ? (
                                    <Play className="w-3 h-3" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    {isActiveRunning ? 'En curso' : 'Iniciar etapa'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Conector sutil entre etapas cuando hay descanso */}
                        {trailingBreak && !expanded && (
                          <div className="flex items-center justify-center py-0.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                trailingBreak.type === 'long_break'
                                  ? 'text-purple-300/80 bg-purple-950/25'
                                  : 'text-sky-300/75 bg-sky-950/20'
                              }`}
                            >
                              <Coffee className="w-2.5 h-2.5" />
                              {trailingBreak.type === 'long_break'
                                ? `Descanso largo · ${trailingBreak.durationMinutes}m`
                                : `Descanso corto · ${trailingBreak.durationMinutes}m`}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
