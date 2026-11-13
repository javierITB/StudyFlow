import React, { useMemo, useState } from 'react';
import {
  Activity,
  Brain,
  CheckCircle2,
  FlaskConical,
  Gauge,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  DiagnosticCriterion,
  DiagnosticRecommendation,
  DocumentRecord,
  LearnerProfile,
  PageReadingSample,
  StrategyMatchSuggestion,
  StudyStrategyId,
} from '../types/studyflow';
import {
  DEFAULT_LEARNER_PROFILE,
  computeAdaptiveStrategyRecommendation,
  formatDurationCompact,
} from '../lib/diagnosticEngine';

interface DiagnosticModalProps {
  open: boolean;
  isActive: boolean;
  activeDoc: DocumentRecord | null;
  documents?: DocumentRecord[];
  hoursUntilDeadline?: number;
  samples: PageReadingSample[];
  criterion: DiagnosticCriterion;
  learnerProfile?: LearnerProfile;
  onClose: () => void;
  onToggleDiagnostic: (active: boolean) => void;
  onChangeCriterion: (criterion: DiagnosticCriterion) => void;
  onChangeLearnerProfile?: (profile: LearnerProfile) => void;
  onRemoveSample: (docId: string, page: number) => void;
  onResetSamples: () => void;
  onApplyRecommendation: (rec: DiagnosticRecommendation) => void;
  onApplyStrategyMatch?: (match: StrategyMatchSuggestion, rec: DiagnosticRecommendation) => void;
  onStartCalibrationFromMatches?: (strategies: StudyStrategyId[]) => void;
}

export const DiagnosticModal: React.FC<DiagnosticModalProps> = ({
  open,
  isActive,
  activeDoc,
  documents = [],
  hoursUntilDeadline = 72,
  samples,
  criterion,
  learnerProfile = DEFAULT_LEARNER_PROFILE,
  onClose,
  onToggleDiagnostic,
  onChangeCriterion,
  onChangeLearnerProfile,
  onRemoveSample,
  onResetSamples,
  onApplyRecommendation,
  onApplyStrategyMatch,
  onStartCalibrationFromMatches,
}) => {
  const [modalTab, setModalTab] = useState<'profile' | 'samples'>('profile');
  const [scope, setScope] = useState<'all' | 'current'>('all');

  const scopedSamples = useMemo(() => {
    if (scope === 'current' && activeDoc) {
      return samples.filter((s) => s.docId === activeDoc.id);
    }
    return samples;
  }, [samples, scope, activeDoc]);

  const recommendation = useMemo(
    () =>
      computeAdaptiveStrategyRecommendation({
        samples: scopedSamples,
        criterion,
        learnerProfile,
        documents: documents.length > 0 ? documents : activeDoc ? [activeDoc] : [],
        hoursUntilDeadline,
      }),
    [scopedSamples, criterion, learnerProfile, documents, activeDoc, hoursUntilDeadline]
  );

  if (!open) return null;

  const updateProfileField = <K extends keyof LearnerProfile>(
    key: K,
    val: LearnerProfile[K]
  ) => {
    const next = { ...learnerProfile, [key]: val };
    onChangeLearnerProfile?.(next);
  };

  const confidenceBadge = (() => {
    switch (recommendation.confidence) {
      case 'insufficient':
        return {
          text: 'Sin muestras previas',
          cls: 'bg-slate-800 text-slate-400 border-slate-700',
        };
      case 'preliminary':
        return {
          text: 'Preliminar (1–2 págs)',
          cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        };
      case 'calibrated':
        return {
          text: 'Calibrado (3–4 págs)',
          cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        };
      case 'high':
        return {
          text: 'Alta precisión (5+ págs)',
          cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        };
    }
  })();

  const difficultyAccent = (() => {
    switch (recommendation.difficulty) {
      case 'agile':
        return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
      case 'standard':
        return 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30';
      case 'dense':
        return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
      case 'extreme':
        return 'text-rose-300 bg-rose-500/10 border-rose-500/30';
    }
  })();

  const topMatches = recommendation.strategyMatches || [];
  const totalPagesContext = (
    documents.length > 0 ? documents : activeDoc ? [activeDoc] : []
  ).reduce((sum, d) => sum + (d.pageCount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">
                  Diagnóstico Previo y Recomendador de Estrategia
                </h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${confidenceBadge.cls}`}
                >
                  {confidenceBadge.text}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cruza tu forma de concentrarte, tus plazos y el material cargado para
                recomendar el método óptimo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de pestaña */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setModalTab('profile')}
            className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              modalTab === 'profile'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Perfil y Estrategia Sugerida</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('samples')}
            className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              modalTab === 'samples'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Muestras por Página ({samples.length})</span>
          </button>
        </div>

        {modalTab === 'profile' ? (
          <div className="space-y-4">
            {/* Resumen de contexto analizado */}
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Material cargado</div>
                <div className="font-mono font-bold text-white mt-0.5">
                  {documents.length || (activeDoc ? 1 : 0)} arch · {totalPagesContext} págs
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Margen disponible</div>
                <div className="font-mono font-bold text-indigo-300 mt-0.5">
                  {hoursUntilDeadline > 0
                    ? `${Math.round(hoursUntilDeadline)}h disponibles`
                    : 'Sin fecha límite'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Ritmo medido</div>
                <div className="font-mono font-bold text-emerald-300 mt-0.5">
                  {recommendation.recommendedSettings.speedMinPerPage} min/pág
                </div>
              </div>
            </div>

            {/* Cuestionario rápido de 4 ejes sobre forma de ser y estudio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="font-semibold text-slate-200 block">
                  1. ¿Cómo fluye mejor tu concentración?
                </label>
                <div className="space-y-1">
                  {(
                    [
                      {
                        id: 'short_bursts',
                        label: 'Bloques cortos constantes',
                        sub: 'Me cuesta arrancar o me saturo rápido',
                      },
                      {
                        id: 'flow_uninterrupted',
                        label: 'Sin alarmas de corte (Flujo)',
                        sub: 'Si me interrumpe un reloj pierdo el hilo',
                      },
                      {
                        id: 'deep_immersion',
                        label: 'Inmersión prolongada (50–90m)',
                        sub: 'Prefiero sesiones largas y descansos amplios',
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateProfileField('focusPattern', opt.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-colors ${
                        learnerProfile.focusPattern === opt.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-[11px]">{opt.label}</div>
                      <div className="text-[10px] text-slate-400">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="font-semibold text-slate-200 block">
                  2. ¿Cuál es tu prioridad con este texto?
                </label>
                <div className="space-y-1">
                  {(
                    [
                      {
                        id: 'comprehension',
                        label: 'Comprender conceptos complejos',
                        sub: 'Asimilar capítulos densos desde cero',
                      },
                      {
                        id: 'retention',
                        label: 'Memorizar fórmulas o datos',
                        sub: 'Evocar sin mirar y repaso espaciado',
                      },
                      {
                        id: 'volume_deadline',
                        label: 'Cumplir cuota contra fecha límite',
                        sub: 'Avanzar muchas páginas sin quedarme atrás',
                      },
                      {
                        id: 'multi_subject',
                        label: 'Alternar varios ramos/archivos',
                        sub: 'Evitar monotonía estudiando un solo texto',
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateProfileField('primaryGoal', opt.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-colors ${
                        learnerProfile.primaryGoal === opt.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-[11px]">{opt.label}</div>
                      <div className="text-[10px] text-slate-400">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="font-semibold text-slate-200 block">
                  3. ¿Cómo te llevas con las metas por reloj?
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {(
                    [
                      {
                        id: 'strict_goals',
                        label: 'Me ordenan las sub-metas estrictas',
                        sub: 'Quiero saber exactamente en qué página ir',
                      },
                      {
                        id: 'flexible_pace',
                        label: 'Prefiero ritmo flexible',
                        sub: 'Ajustar descansos según mi fatiga real',
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateProfileField('timePressureTolerance', opt.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-colors ${
                        learnerProfile.timePressureTolerance === opt.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-[11px]">{opt.label}</div>
                      <div className="text-[10px] text-slate-400">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="font-semibold text-slate-200 block">
                  4. ¿Cómo prefieres sintetizar y repasar?
                </label>
                <div className="space-y-1">
                  {(
                    [
                      {
                        id: 'active_recall',
                        label: 'Active Recall + Oclusión FSRS',
                        sub: 'Tapar texto/fórmulas y autoevaluarme',
                      },
                      {
                        id: 'structured_cornell',
                        label: 'Apuntes Cornell estructurados',
                        sub: 'Claves, desarrollo y resumen exportable',
                      },
                      {
                        id: 'guided_sq3r',
                        label: 'Lectura guiada paso a paso (SQ3R)',
                        sub: 'Explorar, formular preguntas y recitar',
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateProfileField('reviewPreference', opt.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-colors ${
                        learnerProfile.reviewPreference === opt.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-[11px]">{opt.label}</div>
                      <div className="text-[10px] text-slate-400">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ranking Top 3 de Sistemas Recomendados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Sistemas Recomendados para Ti
                </h4>
                {onStartCalibrationFromMatches && topMatches.length >= 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      onStartCalibrationFromMatches(topMatches.map((m) => m.strategyId))
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5 transition-colors"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>Probar estas {topMatches.length} en Calibración A/B</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {topMatches.map((match, idx) => (
                  <div
                    key={match.strategyId}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      idx === 0
                        ? 'bg-indigo-500/10 border-indigo-400/60 shadow-md'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            idx === 0
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          #{idx + 1} · {match.compatibilityScore}% afinidad
                        </span>
                        <span className="text-xs font-bold text-white">{match.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-sky-300">
                          + {match.synthesisLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {match.whyItFits}
                      </p>
                    </div>

                    {onApplyStrategyMatch && (
                      <button
                        type="button"
                        onClick={() => onApplyStrategyMatch(match, recommendation)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex-shrink-0 flex items-center gap-1.5 transition-colors ${
                          idx === 0
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Usar este sistema</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Estado de grabacion + Alcance */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Activity
                  className={`w-4 h-4 ${
                    isActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
                  }`}
                />
                <span className="text-slate-200 font-medium">
                  {isActive
                    ? 'Medición activa mientras lees en el visor'
                    : 'Medición pausada'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {activeDoc && (
                  <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setScope('all')}
                      className={`px-2 py-1 rounded-md font-medium ${
                        scope === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'
                      }`}
                    >
                      Todos ({samples.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope('current')}
                      className={`px-2 py-1 rounded-md font-medium ${
                        scope === 'current' ? 'bg-slate-800 text-white' : 'text-slate-400'
                      }`}
                    >
                      Solo actual
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onToggleDiagnostic(!isActive)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {isActive ? 'Pausar medición' : 'Activar medición'}
                </button>
              </div>
            </div>

            {/* Selector de criterio matematico */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-medium text-slate-300">
                Fórmula de cálculo de velocidad y dificultad
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(
                  [
                    {
                      id: 'balanced',
                      title: 'Equilibrado',
                      desc: '65% Mediana + 35% P75',
                    },
                    {
                      id: 'average',
                      title: 'Tiempo Medio',
                      desc: 'Promedio real directo',
                    },
                    {
                      id: 'max',
                      title: 'Conservador (Máx.)',
                      desc: '40% P75 + 60% Máximo',
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeCriterion(opt.id)}
                    className={`p-2 rounded-lg text-left transition-colors ${
                      criterion === opt.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">{opt.title}</div>
                    <div
                      className={`text-[10px] ${
                        criterion === opt.id ? 'text-indigo-100' : 'text-slate-400'
                      }`}
                    >
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Diagnostico y Estadisticas */}
            <div className={`p-4 rounded-xl border space-y-3 ${difficultyAccent}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {recommendation.difficultyLabel}
                </span>
                <span className="font-mono text-xs font-semibold">
                  Ritmo base: {recommendation.recommendedSettings.speedMinPerPage} min/pág
                </span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">{recommendation.rationale}</p>

              <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                <div className="p-2 rounded-lg bg-slate-950/60 border border-black/20">
                  <div className="text-[10px] text-slate-400">Mínimo</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {formatDurationCompact(recommendation.stats.minSeconds)}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/60 border border-black/20">
                  <div className="text-[10px] text-slate-400">Mediana</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {formatDurationCompact(recommendation.stats.medianSeconds)}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/60 border border-black/20">
                  <div className="text-[10px] text-slate-400">Promedio</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {formatDurationCompact(recommendation.stats.meanSeconds)}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/60 border border-black/20">
                  <div className="text-[10px] text-slate-400">Máximo</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {formatDurationCompact(recommendation.stats.maxSeconds)}
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta del Perfil Pomodoro Recomendado */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Parámetros Base Calculados por Lectura
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Estudio</div>
                  <div className="text-base font-bold font-mono text-indigo-400 mt-0.5">
                    {recommendation.recommendedSettings.studyMinutes}m
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Desc. Corto</div>
                  <div className="text-base font-bold font-mono text-sky-400 mt-0.5">
                    {recommendation.recommendedSettings.shortBreakMinutes}m
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Desc. Largo</div>
                  <div className="text-base font-bold font-mono text-purple-400 mt-0.5">
                    {recommendation.recommendedSettings.longBreakMinutes}m
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Velocidad</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    {recommendation.recommendedSettings.speedMinPerPage}m/p
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-400">Meta Págs</div>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {recommendation.recommendedSettings.pagesPerBlock}p
                  </div>
                </div>
              </div>
            </div>

            {/* Muestras capturadas por pagina */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  Páginas medidas ({scopedSamples.length})
                </span>
                {samples.length > 0 && (
                  <button
                    type="button"
                    onClick={onResetSamples}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reiniciar muestras</span>
                  </button>
                )}
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                {scopedSamples.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-3">
                    Aún no hay muestras registradas. Activa el diagnóstico y lee al menos 3
                    segundos por página.
                  </p>
                ) : (
                  scopedSamples.map((s) => (
                    <div
                      key={`${s.docId}_${s.page}`}
                      className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-slate-900 border border-slate-800/80"
                    >
                      <div className="min-w-0 truncate flex-1">
                        <span className="text-slate-200 font-medium">{s.docName}</span>
                        <span className="text-slate-400 font-mono ml-2">
                          {s.fileType === 'pptx' ? 'Slide' : 'Pág.'} {s.page}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="font-mono text-indigo-300">
                          {formatDurationCompact(s.activeSeconds)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveSample(s.docId, s.page)}
                          title="Descartar esta muestra"
                          className="text-slate-500 hover:text-rose-400 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Acciones finales */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
          >
            Seguir leyendo
          </button>
          {modalTab === 'samples' && (
            <button
              type="button"
              disabled={recommendation.stats.sampleCount === 0}
              onClick={() => onApplyRecommendation(recommendation)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold text-white flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aplicar Velocidad Medida</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
