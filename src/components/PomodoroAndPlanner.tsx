import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Folder,
  Gauge,
  Link2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Route,
  SkipForward,
  Sliders,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  DiagnosticData,
  DocumentRecord,
  FolderRecord,
  PersistedPlanState,
  RouteStep,
  StudyMethodPreset,
  StudyPlanResult,
  StudySettings,
  TaskRecord,
} from '../types/studyflow';
import { STUDY_METHOD_PRESETS, applyPresetToSettings } from '../lib/studyMethods';
import { computeRecommendedPomodoro } from '../lib/diagnosticEngine';
import { useTimer } from '../context/TimerContext';
import { RouteTimeline } from './RouteTimeline';

interface PomodoroAndPlannerProps {
  folders: FolderRecord[];
  documents: DocumentRecord[];
  tasks: TaskRecord[];
  settings: StudySettings;
  planState: PersistedPlanState;
  planResult: StudyPlanResult;
  diagnosticData: DiagnosticData;
  onStartDiagnosticInViewer: () => void;
  onOpenDiagnosticModal: () => void;
  onUpdateSettings: (next: StudySettings) => Promise<void>;
  onUpdatePlanState: (patch: Partial<PersistedPlanState>) => Promise<void>;
  onStartRouteStepInViewer: (step: RouteStep, nextStep: RouteStep | null) => void;
  onToggleStepCompleted: (stepId: string) => Promise<void>;
  onAddTask: (title: string, docId: string | null, folderId: string | null) => Promise<void>;
  onToggleTask: (taskId: string) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  forceSessionKey?: number;
}

function formatDeadlineShort(deadlineStr: string): string {
  if (!deadlineStr) return 'Sin fecha límite';
  const parsed = new Date(deadlineStr);
  if (Number.isNaN(parsed.getTime())) return deadlineStr;
  return parsed.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const PomodoroAndPlanner: React.FC<PomodoroAndPlannerProps> = ({
  folders,
  documents,
  tasks,
  settings,
  planState,
  planResult,
  diagnosticData,
  onStartDiagnosticInViewer,
  onOpenDiagnosticModal,
  onUpdateSettings,
  onUpdatePlanState,
  onStartRouteStepInViewer,
  onToggleStepCompleted,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onNotify,
  forceSessionKey = 0,
}) => {
  const {
    mode,
    remainingSeconds,
    elapsedSeconds,
    totalDurationSeconds,
    isRunning,
    cyclesCompleted,
    totalPlannedBlocks,
    activeRouteStep,
    setMode,
    toggleTimer,
    resetTimer,
    skipCycle,
    setTotalPlannedBlocks,
    completeCurrentBlock,
  } = useTimer();

  // Vista principal enfocada ('session') vs configuración completa ('setup')
  const [plannerView, setPlannerView] = useState<'session' | 'setup'>('session');
  const [rightTab, setRightTab] = useState<'route' | 'tasks'>('route');
  const [showAdvancedCycles, setShowAdvancedCycles] = useState<boolean>(false);
  const [showTaskLinks, setShowTaskLinks] = useState<boolean>(false);

  useEffect(() => {
    if (forceSessionKey > 0) {
      setPlannerView('session');
    }
  }, [forceSessionKey]);

  const [folderPlanFilter, setFolderPlanFilter] = useState<string>('all');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDocId, setNewTaskDocId] = useState('');
  const [newTaskFolderId, setNewTaskFolderId] = useState('');

  // Ordenar documentos segun orderedDocIds
  const orderedDocuments = useMemo(() => {
    const orderMap = new Map(planState.orderedDocIds.map((id, idx) => [id, idx]));
    return [...documents].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : Number.MAX_SAFE_INTEGER;
      return idxA - idxB;
    });
  }, [documents, planState.orderedDocIds]);

  const visibleDocumentsForPlan = useMemo(() => {
    if (folderPlanFilter === 'all') return orderedDocuments;
    if (folderPlanFilter === 'unassigned') {
      return orderedDocuments.filter((d) => !d.folderId);
    }
    return orderedDocuments.filter((d) => d.folderId === folderPlanFilter);
  }, [orderedDocuments, folderPlanFilter]);

  const selectedDocSet = new Set(planState.selectedDocIds);
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  const nextPendingStudy = useMemo(() => {
    const idx = planResult.steps.findIndex((s) => s.type === 'study' && !s.completed);
    if (idx < 0) return null;
    return {
      step: planResult.steps[idx],
      nextStep: idx + 1 < planResult.steps.length ? planResult.steps[idx + 1] : null,
    };
  }, [planResult.steps]);

  const handleSelectPreset = async (presetId: StudyMethodPreset['id']) => {
    const next = applyPresetToSettings(settings, presetId);
    await onUpdateSettings(next);
    onNotify('Método de estudio actualizado', 'success');
  };

  const handleCustomSettingChange = async (patch: Partial<StudySettings>) => {
    await onUpdateSettings({
      ...settings,
      ...patch,
      presetId: 'custom',
    });
  };

  const handleToggleDocInPlan = async (docId: string, checked: boolean) => {
    const nextIds = checked
      ? Array.from(new Set([...planState.selectedDocIds, docId]))
      : planState.selectedDocIds.filter((id) => id !== docId);
    await onUpdatePlanState({ selectedDocIds: nextIds });
  };

  const handleSelectFolderDocsOnly = async (folderId: string) => {
    setFolderPlanFilter(folderId);
    if (folderId === 'all') return;
    const matchingIds = documents
      .filter((d) => (folderId === 'unassigned' ? !d.folderId : d.folderId === folderId))
      .map((d) => d.id);
    await onUpdatePlanState({ selectedDocIds: matchingIds });
  };

  const handleToggleAllVisibleDocs = async () => {
    const visibleIds = visibleDocumentsForPlan.map((d) => d.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedDocSet.has(id));
    if (allSelected) {
      await onUpdatePlanState({
        selectedDocIds: planState.selectedDocIds.filter((id) => !visibleIds.includes(id)),
      });
    } else {
      await onUpdatePlanState({
        selectedDocIds: Array.from(new Set([...planState.selectedDocIds, ...visibleIds])),
      });
    }
  };

  const handleMoveDocOrder = async (docId: string, direction: -1 | 1) => {
    const currentOrder = orderedDocuments.map((d) => d.id);
    const idx = currentOrder.indexOf(docId);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= currentOrder.length) return;
    const copy = [...currentOrder];
    const [removed] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, removed);
    await onUpdatePlanState({ orderedDocIds: copy });
  };

  const handleApplyPlanToTimer = (returnToSession = false) => {
    if (planResult.totalStudyBlocks <= 0) {
      onNotify('No hay bloques calculados para aplicar', 'warning');
      return;
    }
    setTotalPlannedBlocks(planResult.totalStudyBlocks);
    onNotify(
      `Plan aplicado: ${planResult.totalStudyBlocks} bloques de estudio programados`,
      'success'
    );
    if (returnToSession) {
      setPlannerView('session');
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    await onAddTask(trimmed, newTaskDocId || null, newTaskFolderId || null);
    setNewTaskTitle('');
  };

  const completedRouteBlocksCount = planResult.steps.filter(
    (s) => s.type === 'study' && s.completed
  ).length;

  const isPageStopwatch = mode === 'study' && settings.intervalMode === 'pages';
  const displaySec = isPageStopwatch ? elapsedSeconds : remainingSeconds;
  const clockMins = Math.floor(displaySec / 60);
  const clockSecs = displaySec % 60;
  const formattedClock = `${String(clockMins).padStart(2, '0')}:${String(clockSecs).padStart(2, '0')}`;
  const circumference = 276.46;
  const progressRatio = isPageStopwatch
    ? (elapsedSeconds % 60) / 60
    : remainingSeconds / Math.max(1, totalDurationSeconds);
  const strokeOffset = circumference * (1 - progressRatio);

  const effectiveGoal = totalPlannedBlocks || planResult.totalStudyBlocks || 1;
  const goalCompleted = Math.max(cyclesCompleted, completedRouteBlocksCount);
  const goalPct = Math.min(100, Math.round((goalCompleted / effectiveGoal) * 100));

  const feasibilityBadge = (() => {
    switch (planResult.feasibility) {
      case 'no_material':
        return {
          text: 'Sin material',
          cls: 'bg-slate-800 text-slate-400 border border-slate-700',
        };
      case 'expired':
        return {
          text: 'Fecha vencida',
          cls: 'bg-rose-900/60 text-rose-300 border border-rose-700/50',
        };
      case 'critical':
        return {
          text: 'Sobrecarga Crítica',
          cls: 'bg-rose-900/60 text-rose-300 border border-rose-700/50',
        };
      case 'tight':
        return {
          text: 'Horario Ajustado',
          cls: 'bg-amber-900/60 text-amber-300 border border-amber-700/50',
        };
      case 'optimal':
        return {
          text: 'Ruta Óptima',
          cls: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
        };
    }
  })();

  const activePresetLabel = useMemo(() => {
    if (settings.presetId === 'custom') {
      return settings.intervalMode === 'pages'
        ? `Personalizado · ${settings.pagesPerBlock} págs`
        : `Personalizado · ${settings.studyMinutes}/${settings.shortBreakMinutes}/${settings.longBreakMinutes}m`;
    }
    const found = STUDY_METHOD_PRESETS.find((p) => p.id === settings.presetId);
    return found ? `${found.name} (${found.badge})` : 'Pomodoro Clásico';
  }, [settings]);

  const pendingTasksCount = tasks.filter((t) => !t.completed).length;

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'pending') return !t.completed;
    if (taskFilter === 'completed') return t.completed;
    return true;
  });

  const diagnosticSummary = useMemo(
    () =>
      computeRecommendedPomodoro(diagnosticData.samples, diagnosticData.criterion),
    [diagnosticData.samples, diagnosticData.criterion]
  );

  const quickPresets = STUDY_METHOD_PRESETS.filter(
    (p) =>
      p.id === 'classic' ||
      p.id === 'deep' ||
      p.id === 'compact' ||
      p.id === 'pages'
  );

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-5 lg:p-6 sf-env-canvas">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        {/* Barra superior minimalista de estado y navegación interna */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-indigo-500/25 rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-indigo-500/25">
            <button
              type="button"
              onClick={() => setPlannerView('session')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                plannerView === 'session'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Sesión y Ruta</span>
            </button>
            <button
              type="button"
              onClick={() => setPlannerView('setup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                plannerView === 'setup'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configurar Plan y Ciclos</span>
            </button>
          </div>

          {/* Resumen discreto siempre a la vista */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setPlannerView('setup')}
              className="px-2.5 py-1 rounded-lg bg-slate-950/60 hover:bg-indigo-500/15 border border-indigo-500/25 text-slate-300 flex items-center gap-1.5 transition-colors"
              title="Cambiar método de estudio"
            >
              <Sliders className="w-3 h-3 text-indigo-400" />
              <span className="truncate max-w-[210px]">{activePresetLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => setPlannerView('setup')}
              className="px-2.5 py-1 rounded-lg bg-slate-950/60 hover:bg-indigo-500/15 border border-indigo-500/25 text-slate-300 flex items-center gap-1.5 transition-colors"
              title="Editar fecha objetivo y material del plan"
            >
              <Calendar className="w-3 h-3 text-indigo-400" />
              <span>{formatDeadlineShort(planState.deadline)}</span>
              <span className="text-slate-500">·</span>
              <span className="font-mono text-indigo-300">{planResult.totalPages} págs</span>
            </button>

            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${feasibilityBadge.cls}`}
            >
              {feasibilityBadge.text}
            </span>
          </div>
        </div>

        {plannerView === 'session' ? (
          /* ================= VISTA 1: ENFOQUE Y RUTA (CALMA Y CLARA) ================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
            {/* IZQUIERDA: RELOJ POMODORO LIMPIO + CAMBIO RÁPIDO */}
            <div data-tour-id="tour-pomodoro-clock" className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900/95 backdrop-blur-md border border-indigo-500/25 sf-accent-glow rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col items-center">
                {/* Selector Estudio | Descanso Corto | Descanso Largo */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 bg-slate-950/85 p-1 rounded-xl border border-indigo-500/25 mb-4">
                  <button
                    type="button"
                    onClick={() => setMode('study')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mode === 'study'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {settings.intervalMode === 'pages'
                      ? `Meta ${settings.pagesPerBlock} págs`
                      : `Estudio (${settings.studyMinutes}m)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('short')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mode === 'short'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Corto ({settings.shortBreakMinutes}m)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('long')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mode === 'long'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Largo ({settings.longBreakMinutes}m)
                  </button>
                </div>

                {/* Paso activo o siguiente bloque sugerido */}
                {activeRouteStep ? (
                  <div className="w-full mb-4 px-3 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold block">
                        En curso ahora
                      </span>
                      <span className="text-white font-medium truncate block">
                        {activeRouteStep.docName}
                        {activeRouteStep.startPage
                          ? ` · Págs. ${activeRouteStep.startPage}–${activeRouteStep.endPage}`
                          : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={completeCurrentBlock}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex-shrink-0"
                    >
                      Completar
                    </button>
                  </div>
                ) : (
                  nextPendingStudy && (
                    <div className="w-full mb-4 px-3 py-2 rounded-xl bg-slate-950/60 border border-indigo-500/25 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                          Siguiente paso sugerido
                        </span>
                        <span className="text-slate-200 font-medium truncate block">
                          {nextPendingStudy.step.docName} · Págs.{' '}
                          {nextPendingStudy.step.startPage}–{nextPendingStudy.step.endPage}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onStartRouteStepInViewer(
                            nextPendingStudy.step,
                            nextPendingStudy.nextStep
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex items-center gap-1 flex-shrink-0"
                      >
                        <Play className="w-3 h-3" />
                        <span>Abrir</span>
                      </button>
                    </div>
                  )
                )}

                {/* Aro del reloj */}
                <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center my-1">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-slate-800"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round"
                      className={`transition-all duration-300 ${
                        mode === 'study'
                          ? 'text-indigo-500'
                          : mode === 'short'
                            ? 'text-sky-500'
                            : 'text-purple-500'
                      }`}
                      fill="transparent"
                    />
                  </svg>

                  <div className="absolute flex flex-col items-center justify-center text-center px-4">
                    <span className="text-5xl font-extrabold tracking-tight font-mono text-white">
                      {formattedClock}
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-widest text-indigo-400 mt-1.5">
                      {mode === 'study'
                        ? settings.intervalMode === 'pages'
                          ? 'Avance por Páginas'
                          : 'Sesión de Estudio'
                        : mode === 'short'
                          ? 'Descanso Corto'
                          : 'Descanso Largo'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Bloque #{cyclesCompleted + 1}
                    </span>
                  </div>
                </div>

                {/* Controles principales */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                  <button
                    type="button"
                    onClick={resetTimer}
                    title="Reiniciar reloj"
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleTimer}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                  >
                    {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isRunning ? 'Pausar' : 'Iniciar'}</span>
                  </button>

                  {mode === 'study' && (
                    <button
                      type="button"
                      onClick={completeCurrentBlock}
                      title="Marcar bloque completado y pasar a descanso"
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Completar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={skipCycle}
                    title="Saltar ciclo"
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Progreso de la meta */}
                <div className="w-full mt-5 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span>Progreso del plan</span>
                    <span className="font-mono text-slate-200">
                      {goalCompleted} / {effectiveGoal} bloques ({goalPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${goalPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Cambio rápido de ritmo en 1 clic sin abrumar */}
              <div className="bg-slate-900/90 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Ritmo rápido</span>
                  <button
                    type="button"
                    onClick={() => setPlannerView('setup')}
                    className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1 font-medium"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Personalizar</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {quickPresets.map((preset) => {
                    const active = settings.presetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => void handleSelectPreset(preset.id)}
                        className={`px-2.5 py-2 rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-indigo-500/20 border-indigo-400 text-white'
                            : 'bg-slate-950/45 border-slate-800 text-slate-300 hover:border-indigo-500/40'
                        }`}
                      >
                        <div className="text-[11px] font-semibold truncate">{preset.name}</div>
                        <div className="text-[10px] font-mono text-indigo-300 mt-0.5">
                          {preset.badge}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-800/80">
                  <span className="truncate">
                    {diagnosticSummary.stats.sampleCount > 0
                      ? `Calibrado: ${diagnosticSummary.recommendedSettings.speedMinPerPage} min/pág`
                      : '¿No sabes qué ritmo usar?'}
                  </span>
                  <button
                    type="button"
                    onClick={
                      diagnosticSummary.stats.sampleCount > 0
                        ? onOpenDiagnosticModal
                        : onStartDiagnosticInViewer
                    }
                    className="text-emerald-300 hover:text-emerald-200 font-medium flex items-center gap-1 flex-shrink-0"
                  >
                    <Activity className="w-3 h-3" />
                    <span>
                      {diagnosticSummary.stats.sampleCount > 0
                        ? 'Ver diagnóstico'
                        : 'Medir mi ritmo'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* DERECHA: RUTA DE HOY Y TAREAS UNIFICADAS */}
            <div
              data-tour-id="tour-pomodoro-route"
              className="lg:col-span-7 bg-slate-900/90 backdrop-blur-md border border-indigo-500/25 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
            >
              {/* Cabecera limpia con switch Ruta | Tareas */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-indigo-500/25">
                  <button
                    type="button"
                    onClick={() => setRightTab('route')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      rightTab === 'route'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Route className="w-3.5 h-3.5" />
                    <span>Ruta de estudio ({planResult.totalStudyBlocks})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightTab('tasks')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      rightTab === 'tasks'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tareas ({pendingTasksCount})</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPlannerView('setup')}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-indigo-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Ajustar fecha y archivos</span>
                </button>
              </div>

              {rightTab === 'route' ? (
                <div className="space-y-3">
                  {/* Resumen amigable de 1 línea en lugar de múltiples cajas */}
                  <div className="px-3 py-2 rounded-xl bg-slate-950/55 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                    <span>
                      <strong className="text-white">{planResult.totalPages} págs</strong> en{' '}
                      <strong className="text-white">
                        {planResult.daysAvailable}{' '}
                        {planResult.daysAvailable === 1 ? 'día' : 'días'}
                      </strong>{' '}
                      · Tiempo total estimado:{' '}
                      <span className="font-mono text-indigo-300">
                        {Math.floor(planResult.totalMinutes / 60)}h{' '}
                        {planResult.totalMinutes % 60}m
                      </span>
                    </span>
                    <span className="text-slate-400">{planResult.blocksPerDay} bloques/día</span>
                  </div>

                  <RouteTimeline
                    planResult={planResult}
                    activeRouteStepId={activeRouteStep?.id || null}
                    onStartRouteStep={onStartRouteStepInViewer}
                    onToggleStepCompleted={onToggleStepCompleted}
                  />
                </div>
              ) : (
                /* TAREAS SIMPLIFICADAS */
                <div className="space-y-4">
                  <form onSubmit={handleTaskSubmit} className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Escribe una tarea o meta pendiente..."
                        required
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowTaskLinks((v) => !v)}
                          title="Vincular opcionalmente a una carpeta o archivo"
                          className={`px-2.5 py-2 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                            showTaskLinks || newTaskFolderId || newTaskDocId
                              ? 'bg-indigo-500/20 border-indigo-500/45 text-indigo-200'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Vincular</span>
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Agregar</span>
                        </button>
                      </div>
                    </div>

                    {showTaskLinks && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 fade-in">
                        <select
                          value={newTaskFolderId}
                          onChange={(e) => setNewTaskFolderId(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">(Sin carpeta / ramo)</option>
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              Ramo: {f.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={newTaskDocId}
                          onChange={(e) => setNewTaskDocId(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">(Sin archivo vinculado)</option>
                          {documents.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              {doc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </form>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {filteredTasks.length} {filteredTasks.length === 1 ? 'tarea' : 'tareas'}
                    </span>
                    <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                      {(
                        [
                          { id: 'all', label: 'Todas' },
                          { id: 'pending', label: 'Pendientes' },
                          { id: 'completed', label: 'Completas' },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setTaskFilter(f.id)}
                          className={`px-2 py-0.5 rounded font-medium ${
                            taskFilter === f.id
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {filteredTasks.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">
                        Sin tareas aquí todavía. Agrega una arriba para organizarte.
                      </p>
                    ) : (
                      filteredTasks.map((t) => {
                        const docLinked = documents.find((d) => d.id === t.docId);
                        const folderLinked = folders.find((f) => f.id === t.folderId);
                        return (
                          <div
                            key={t.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                              t.completed
                                ? 'bg-slate-950/40 border-slate-800 opacity-60'
                                : 'bg-slate-950/60 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={t.completed}
                                onChange={() => void onToggleTask(t.id)}
                                className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <span
                                  className={`block truncate ${
                                    t.completed
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-200'
                                  }`}
                                >
                                  {t.title}
                                </span>
                                {(folderLinked || docLinked) && (
                                  <div className="flex flex-wrap gap-2 mt-0.5">
                                    {folderLinked && (
                                      <span className="text-[10px] text-emerald-300 font-mono">
                                        {folderLinked.name}
                                      </span>
                                    )}
                                    {docLinked && (
                                      <span className="text-[10px] text-indigo-300 font-mono truncate max-w-[200px]">
                                        {docLinked.name}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => void onDeleteTask(t.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ================= VISTA 2: CONFIGURAR PLAN Y CICLOS (PASO A PASO) ================= */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Configuración guiada de tu plan
                </h2>
                <p className="text-xs text-slate-400">
                  Ajusta tu método, calibra tu velocidad real o define fecha y archivos objetivo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlannerView('session')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Sesión y Ruta</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* PASO 1: MÉTODO Y DIAGNÓSTICO */}
              <div className="lg:col-span-6 bg-slate-900/90 backdrop-blur-md border border-indigo-500/25 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      Paso 1
                    </span>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      Método de Estudio y Ritmo
                    </h3>
                  </div>
                </div>

                {/* Calibración por lectura real */}
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <Gauge className="w-4 h-4" />
                      Modo Diagnóstico Real
                    </span>
                    <span className="font-mono text-[10px] text-slate-300">
                      {diagnosticSummary.stats.sampleCount} págs medidas
                    </span>
                  </div>

                  {diagnosticSummary.stats.sampleCount === 0 ? (
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Lee unas páginas en el visor y deja que el sistema calcule automáticamente tus ciclos ideales.
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-200 leading-relaxed">
                      <strong>{diagnosticSummary.difficultyLabel}:</strong> recomendado{' '}
                      <span className="font-mono text-emerald-300">
                        {diagnosticSummary.recommendedSettings.studyMinutes}/
                        {diagnosticSummary.recommendedSettings.shortBreakMinutes}/
                        {diagnosticSummary.recommendedSettings.longBreakMinutes} min
                      </span>{' '}
                      a{' '}
                      <span className="font-mono text-emerald-300">
                        {diagnosticSummary.recommendedSettings.speedMinPerPage} min/pág
                      </span>
                      .
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={onStartDiagnosticInViewer}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>
                        {diagnosticData.isActive
                          ? 'Ir al visor (Midiendo)'
                          : 'Medir ritmo en el visor'}
                      </span>
                    </button>
                    {diagnosticSummary.stats.sampleCount > 0 && (
                      <button
                        type="button"
                        onClick={onOpenDiagnosticModal}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium"
                      >
                        Ver / Aplicar perfil
                      </button>
                    )}
                  </div>
                </div>

                {/* Presets claros */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Elige una plantilla rápida
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STUDY_METHOD_PRESETS.map((preset) => {
                      const active = settings.presetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => void handleSelectPreset(preset.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            active
                              ? 'bg-indigo-600/20 border-indigo-400 text-white shadow-sm'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-indigo-500/40'
                          }`}
                        >
                          <div className="text-[11px] font-semibold leading-tight">
                            {preset.name}
                          </div>
                          <div className="text-[10px] font-mono text-indigo-300 mt-1">
                            {preset.badge}
                          </div>
                        </button>
                      );
                    })}
                    <div
                      className={`p-2.5 rounded-xl border text-left ${
                        settings.presetId === 'custom'
                          ? 'bg-indigo-600/20 border-indigo-400 text-white'
                          : 'bg-slate-950/30 border-slate-800/70 text-slate-400'
                      }`}
                    >
                      <div className="text-[11px] font-semibold">Personalizado</div>
                      <div className="text-[10px] mt-1">Ajuste manual</div>
                    </div>
                  </div>
                </div>

                {/* Parametros esenciales */}
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  {settings.intervalMode === 'time' ? (
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Estudio (min/bloque)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={settings.studyMinutes}
                        onChange={(e) =>
                          void handleCustomSettingChange({
                            studyMinutes: Math.max(5, Number(e.target.value) || 25),
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Páginas / Slides por bloque
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={settings.pagesPerBlock}
                        onChange={(e) =>
                          void handleCustomSettingChange({
                            pagesPerBlock: Math.max(1, Number(e.target.value) || 5),
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Ritmo (min/página)
                    </label>
                    <input
                      type="number"
                      min={0.5}
                      max={60}
                      step={0.5}
                      value={settings.speedMinPerPage}
                      onChange={(e) =>
                        void handleCustomSettingChange({
                          speedMinPerPage: Math.max(0.5, Number(e.target.value) || 3),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Descanso corto (min)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={45}
                      value={settings.shortBreakMinutes}
                      onChange={(e) =>
                        void handleCustomSettingChange({
                          shortBreakMinutes: Math.max(1, Number(e.target.value) || 5),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Descanso largo (min)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={90}
                      value={settings.longBreakMinutes}
                      onChange={(e) =>
                        void handleCustomSettingChange({
                          longBreakMinutes: Math.max(2, Number(e.target.value) || 15),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Acordeón discreto para opciones avanzadas de ciclos */}
                <div className="border-t border-slate-800/80 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedCycles((v) => !v)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white py-1"
                  >
                    <span className="flex items-center gap-1.5">
                      {showAdvancedCycles ? (
                        <ChevronDown className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-indigo-400" />
                      )}
                      <span>Opciones avanzadas (unidades y reglas de bloques)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {settings.intervalMode === 'time' ? 'Tiempo' : 'Páginas'} ·{' '}
                      {settings.blockAllocationMode === 'pack'
                        ? 'Empaquetar'
                        : settings.blockAllocationMode === 'exact_doc'
                          ? 'Exacto'
                          : 'Completo'}
                    </span>
                  </button>

                  {showAdvancedCycles && (
                    <div className="mt-3 space-y-3 text-xs fade-in">
                      <div className="space-y-1.5">
                        <label className="block text-slate-300 font-medium">
                          Unidad del bloque
                        </label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                          <button
                            type="button"
                            onClick={() =>
                              void handleCustomSettingChange({ intervalMode: 'time' })
                            }
                            className={`py-1.5 px-2 rounded-lg font-semibold transition-colors ${
                              settings.intervalMode === 'time'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Por Tiempo (min)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCustomSettingChange({ intervalMode: 'pages' })
                            }
                            className={`py-1.5 px-2 rounded-lg font-semibold transition-colors ${
                              settings.intervalMode === 'pages'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Por Páginas / Slides
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-slate-300 font-medium">
                          Manejo de archivos cortos
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                          <button
                            type="button"
                            onClick={() =>
                              void handleCustomSettingChange({ blockAllocationMode: 'pack' })
                            }
                            className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                              settings.blockAllocationMode === 'pack'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Empaquetar en bloque
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCustomSettingChange({
                                blockAllocationMode: 'exact_doc',
                              })
                            }
                            className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                              settings.blockAllocationMode === 'exact_doc'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Tiempo exacto / doc
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCustomSettingChange({
                                blockAllocationMode: 'full_block',
                              })
                            }
                            className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                              settings.blockAllocationMode === 'full_block'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Bloque completo / doc
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1 border-t border-slate-800/80">
                        <label className="flex items-start gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={settings.longBreakBetweenDocs}
                            onChange={(e) =>
                              void handleCustomSettingChange({
                                longBreakBetweenDocs: e.target.checked,
                              })
                            }
                            className="mt-0.5 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                          />
                          <span>
                            <strong className="text-white">Descanso largo entre documentos</strong>{' '}
                            y cortos dentro del mismo archivo
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={settings.resumeFromCurrentPage}
                            onChange={(e) =>
                              void handleCustomSettingChange({
                                resumeFromCurrentPage: e.target.checked,
                              })
                            }
                            className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                          />
                          <span>Planificar solo páginas pendientes (desde página actual)</span>
                        </label>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-slate-400">
                            Descanso largo también cada N bloques internos:
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={12}
                            value={settings.longBreakEveryNBlocks}
                            onChange={(e) =>
                              void handleCustomSettingChange({
                                longBreakEveryNBlocks: Math.max(
                                  0,
                                  Number(e.target.value) || 0
                                ),
                              })
                            }
                            className="w-16 text-center bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PASO 2: FECHA OBJETIVO, MATERIAL Y VIABILIDAD */}
              <div className="lg:col-span-6 bg-slate-900/90 backdrop-blur-md border border-indigo-500/25 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      Paso 2
                    </span>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      Fecha Objetivo y Material
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${feasibilityBadge.cls}`}
                  >
                    {feasibilityBadge.text}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">
                        Fecha límite (Deadline)
                      </label>
                      <input
                        type="datetime-local"
                        value={planState.deadline}
                        onChange={(e) =>
                          void onUpdatePlanState({ deadline: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-medium text-slate-300 flex items-center gap-1">
                          <Folder className="w-3.5 h-3.5 text-indigo-400" />
                          Filtrar carpeta
                        </label>
                        <button
                          type="button"
                          onClick={() => void handleToggleAllVisibleDocs()}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                        >
                          Alternar todos
                        </button>
                      </div>
                      <select
                        value={folderPlanFilter}
                        onChange={(e) => void handleSelectFolderDocsOnly(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="all">Todas las carpetas</option>
                        <option value="unassigned">Sin carpeta asignada</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            Ramo: {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Lista ordenada de documentos */}
                  <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                    {visibleDocumentsForPlan.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic p-2">
                        No hay documentos en esta carpeta.
                      </p>
                    ) : (
                      visibleDocumentsForPlan.map((doc) => {
                        const checked = selectedDocSet.has(doc.id);
                        const folderName = doc.folderId ? folderMap.get(doc.folderId) : null;
                        return (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-900"
                          >
                            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  void handleToggleDocInPlan(doc.id, e.target.checked)
                                }
                                className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                              />
                              <span className="truncate flex-1" title={doc.name}>
                                {doc.name}
                              </span>
                              {folderName && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hidden sm:inline">
                                  {folderName}
                                </span>
                              )}
                              <span className="font-mono text-[10px] text-slate-400">
                                {doc.pageCount}p
                              </span>
                            </label>

                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => void handleMoveDocOrder(doc.id, -1)}
                                title="Subir prioridad"
                                className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleMoveDocOrder(doc.id, 1)}
                                title="Bajar prioridad"
                                className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Resumen de viabilidad compacto */}
                  <div className="p-3.5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-2.5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Páginas</span>
                        <div className="text-sm font-bold text-white font-mono">
                          {planResult.totalPages}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Tiempo total</span>
                        <div className="text-sm font-bold text-indigo-400 font-mono">
                          {Math.floor(planResult.totalMinutes / 60)}h{' '}
                          {planResult.totalMinutes % 60}m
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Disponible</span>
                        <div className="text-sm font-bold text-white font-mono">
                          {planResult.hoursUntilDeadline.toFixed(1)}h
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Bloques</span>
                        <div className="text-sm font-bold text-emerald-400 font-mono">
                          {planResult.totalStudyBlocks}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {planResult.recommendation}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleApplyPlanToTimer(true)}
                      className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Aplicar Meta y Volver a Sesión</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
