import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  Folder,
  Gauge,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Route,
  Sliders,
  SkipForward,
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

  const handleApplyPlanToTimer = () => {
    if (planResult.totalStudyBlocks <= 0) {
      onNotify('No hay bloques calculados para aplicar', 'warning');
      return;
    }
    setTotalPlannedBlocks(planResult.totalStudyBlocks);
    onNotify(
      `Plan aplicado: ${planResult.totalStudyBlocks} bloques de estudio programados`,
      'success'
    );
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

  // Reloj SVG
  const isPageStopwatch = mode === 'study' && settings.intervalMode === 'pages';
  const displaySec = isPageStopwatch ? elapsedSeconds : remainingSeconds;
  const clockMins = Math.floor(displaySec / 60);
  const clockSecs = displaySec % 60;
  const formattedClock = `${String(clockMins).padStart(2, '0')}:${String(clockSecs).padStart(2, '0')}`;
  const circumference = 276.46;
  const progressRatio = isPageStopwatch
    ? (elapsedSeconds % 60) / 60
    : remainingSeconds / Math.max(1, totalDurationSeconds);
  const strokeOffset = isPageStopwatch
    ? circumference * (1 - progressRatio)
    : circumference * (1 - progressRatio);

  const effectiveGoal =
    totalPlannedBlocks || planResult.totalStudyBlocks || 1;
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

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-950">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: CONFIGURACION DE METODO Y PLANIFICADOR */}
        <div className="lg:col-span-5 space-y-6">
          {/* Panel 1: Configuracion flexible de metodo y ciclos */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Método de Estudio y Ciclos
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ajusta los tiempos o calibra tu velocidad real con el Modo Diagnóstico
              </p>
            </div>

            {/* Tarjeta Modo Diagnostico */}
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4" />
                  Modo Diagnóstico Real
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-emerald-500/30 text-emerald-300">
                  {diagnosticSummary.stats.sampleCount} págs medidas
                </span>
              </div>

              {diagnosticSummary.stats.sampleCount === 0 ? (
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Lee unas páginas de prueba y el sistema detectará tu tiempo real por
                  página para proponerte el ciclo Pomodoro ideal automáticamente.
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
                      : 'Iniciar diagnóstico en visor'}
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

            {/* Presets de metodos */}
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
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
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
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950/30 border-slate-800/70 text-slate-400'
                }`}
              >
                <div className="text-[11px] font-semibold">Personalizado</div>
                <div className="text-[10px] mt-1">Ajuste libre abajo</div>
              </div>
            </div>

            {/* Tipo de intervalo: Tiempo vs Paginas */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Unidad del bloque de estudio
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => void handleCustomSettingChange({ intervalMode: 'time' })}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
                    settings.intervalMode === 'time'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Por Tiempo (min)
                </button>
                <button
                  type="button"
                  onClick={() => void handleCustomSettingChange({ intervalMode: 'pages' })}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
                    settings.intervalMode === 'pages'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Por Páginas / Slides
                </button>
              </div>
            </div>

            {/* Estrategia para archivos cortos vs duracion del bloque */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Manejo de archivos cortos y tiempos de lectura
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => void handleCustomSettingChange({ blockAllocationMode: 'pack' })}
                  className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                    settings.blockAllocationMode === 'pack'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Agrupa archivos cortos consecutivos dentro del mismo bloque Pomodoro y luego aplica el descanso"
                >
                  Empaquetar en bloque
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void handleCustomSettingChange({ blockAllocationMode: 'exact_doc' })
                  }
                  className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                    settings.blockAllocationMode === 'exact_doc'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ajusta el temporizador al tiempo estimado exacto de cada archivo"
                >
                  Tiempo exacto / doc
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void handleCustomSettingChange({ blockAllocationMode: 'full_block' })
                  }
                  className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                    settings.blockAllocationMode === 'full_block'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Asigna un bloque Pomodoro completo a cada archivo"
                >
                  Bloque completo / doc
                </button>
              </div>
            </div>

            {/* Parametros numericos editables */}
            <div className="grid grid-cols-2 gap-3 text-xs">
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

            {/* Reglas de descansos en la ruta */}
            <div className="space-y-2 pt-1 text-xs border-t border-slate-800/80">
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
                  <strong className="text-white">Descanso largo entre documentos</strong> y
                  descansos cortos dentro del mismo archivo
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
                      longBreakEveryNBlocks: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-16 text-center bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Panel 2: Fecha limite, Material y Diagnostico */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Fecha Objetivo y Material
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ordena tus archivos para proponer la ruta óptima
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Fecha y Hora Objetivo (Deadline)
                </label>
                <input
                  type="datetime-local"
                  value={planState.deadline}
                  onChange={(e) =>
                    void onUpdatePlanState({ deadline: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>

              {/* Filtro por carpeta/ramo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-slate-300 flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5 text-indigo-400" />
                    Filtrar por Carpeta / Ramo
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleToggleAllVisibleDocs()}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Alternar visibles
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
                      Ramo: {f.name} (seleccionar carpeta)
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista con orden de estudio */}
              <div className="max-h-44 overflow-y-auto space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                {visibleDocumentsForPlan.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    No hay documentos en esta vista.
                  </p>
                ) : (
                  visibleDocumentsForPlan.map((doc) => {
                    const checked = selectedDocSet.has(doc.id);
                    const folderName = doc.folderId ? folderMap.get(doc.folderId) : null;
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-2 py-1 px-1.5 rounded hover:bg-slate-900"
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
                            title="Subir prioridad en la ruta"
                            className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleMoveDocOrder(doc.id, 1)}
                            title="Bajar prioridad en la ruta"
                            className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Panel Resultados Matematicos */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Diagnóstico de Viabilidad</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${feasibilityBadge.cls}`}>
                  {feasibilityBadge.text}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-medium">Páginas a cubrir</div>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    {planResult.totalPages}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-medium">
                    Tiempo Total (c/ pausas)
                  </div>
                  <div className="text-lg font-bold text-indigo-400 font-mono mt-0.5">
                    {Math.floor(planResult.totalMinutes / 60)}h{' '}
                    {planResult.totalMinutes % 60}m
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-medium">Horas hasta Límite</div>
                  <div
                    className={`text-lg font-bold font-mono mt-0.5 ${
                      planResult.hoursUntilDeadline <= 0 ? 'text-rose-500' : 'text-amber-400'
                    }`}
                  >
                    {planResult.hoursUntilDeadline <= 0
                      ? 'Vencido'
                      : `${planResult.hoursUntilDeadline.toFixed(1)}h`}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-medium">Bloques en Ruta</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                    {planResult.totalStudyBlocks}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                {planResult.recommendation}
              </div>

              <button
                type="button"
                onClick={handleApplyPlanToTimer}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Aplicar Meta al Temporizador
              </button>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: RELOJ, RUTA PROPUESTA Y TAREAS */}
        <div className="lg:col-span-7 space-y-6">
          {/* Reloj Pomodoro / Seguimiento de Paginas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center">
            <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => setMode('study')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'short'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Descanso Corto ({settings.shortBreakMinutes}m)
              </button>
              <button
                type="button"
                onClick={() => setMode('long')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'long'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Descanso Largo ({settings.longBreakMinutes}m)
              </button>
            </div>

            {/* Banner de bloque activo si viene de ruta */}
            {activeRouteStep && (
              <div className="w-full max-w-md mb-4 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold block">
                    Paso activo de la ruta
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
            )}

            <div className="relative w-60 h-60 flex items-center justify-center my-1">
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
                <span className="text-[11px] font-medium uppercase tracking-widest text-indigo-400 mt-2">
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

            <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={resetTimer}
                title="Reiniciar"
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={toggleTimer}
                className="px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span>{isRunning ? 'Pausar' : 'Iniciar Sesión'}</span>
              </button>

              {mode === 'study' && (
                <button
                  type="button"
                  onClick={completeCurrentBlock}
                  title="Marcar bloque completado y pasar a descanso"
                  className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Completar bloque</span>
                </button>
              )}

              <button
                type="button"
                onClick={skipCycle}
                title="Saltar ciclo"
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full mt-6 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Progreso hacia la meta del plan</span>
                <span className="font-mono text-slate-200">
                  {goalCompleted} / {effectiveGoal} bloques
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

          {/* Ruta de Estudio Generada Paso a Paso */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Route className="w-4 h-4 text-indigo-400" />
                  Ruta Propuesta hasta el Objetivo
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Descansos cortos intra-archivo y descansos largos al cambiar de documento
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                {planResult.daysAvailable} {planResult.daysAvailable === 1 ? 'día' : 'días'}
              </span>
            </div>

            <RouteTimeline
              planResult={planResult}
              activeRouteStepId={activeRouteStep?.id || null}
              onStartRouteStep={onStartRouteStepInViewer}
              onToggleStepCompleted={onToggleStepCompleted}
            />
          </div>

          {/* Lista de Tareas de Estudio */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  Lista de Tareas de Estudio
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Organiza entregas vinculadas a tus carpetas o archivos
                </p>
              </div>

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

            <form onSubmit={handleTaskSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Descripción de la tarea o meta..."
                required
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />

              <select
                value={newTaskFolderId}
                onChange={(e) => setNewTaskFolderId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="">(Sin carpeta)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>

              <select
                value={newTaskDocId}
                onChange={(e) => setNewTaskDocId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 max-w-[180px]"
              >
                <option value="">(Sin archivo)</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </form>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredTasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  No hay tareas en esta vista.
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
                          : 'bg-slate-900 border-slate-800'
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
                              t.completed ? 'line-through text-slate-400' : 'text-slate-200'
                            }`}
                          >
                            {t.title}
                          </span>
                          <div className="flex flex-wrap gap-2 mt-0.5">
                            {folderLinked && (
                              <span className="text-[10px] text-emerald-400 font-mono">
                                Ramo: {folderLinked.name}
                              </span>
                            )}
                            {docLinked && (
                              <span className="text-[10px] text-indigo-400 font-mono">
                                Archivo: {docLinked.name}
                              </span>
                            )}
                          </div>
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
        </div>
      </div>
    </div>
  );
};

