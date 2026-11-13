import {
  DiagnosticCriterion,
  DiagnosticRecommendation,
  DiagnosticStats,
  DifficultyLevel,
  DocumentRecord,
  DocumentType,
  LearnerProfile,
  PageReadingSample,
  StrategyMatchSuggestion,
  StudyStrategyId,
  SynthesisMethodId,
} from '../types/studyflow';
import {
  STUDY_STRATEGY_CATALOG,
  SYNTHESIS_METHOD_LABELS,
} from './studyMethods';

export const DEFAULT_LEARNER_PROFILE: LearnerProfile = {
  focusPattern: 'short_bursts',
  primaryGoal: 'comprehension',
  timePressureTolerance: 'flexible_pace',
  reviewPreference: 'active_recall',
};

export const MIN_VALID_SAMPLE_SECONDS = 3;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const weight = idx - lo;
  return sorted[lo] * (1 - weight) + sorted[hi] * weight;
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Registra o acumula segundos activos de lectura en una pagina especifica.
 * Filtra micro-visitas (<3s) al crear muestras nuevas para evitar sesgar el diagnostico al hojear.
 */
export function mergeReadingSample(
  samples: PageReadingSample[],
  input: {
    docId: string;
    docName: string;
    fileType: DocumentType;
    page: number;
    addedSeconds: number;
  }
): PageReadingSample[] {
  const added = Math.round(input.addedSeconds);
  if (added <= 0) return samples;

  const existingIdx = samples.findIndex(
    (s) => s.docId === input.docId && s.page === input.page
  );

  const nowIso = new Date().toISOString();

  if (existingIdx >= 0) {
    const next = [...samples];
    next[existingIdx] = {
      ...next[existingIdx],
      docName: input.docName,
      activeSeconds: next[existingIdx].activeSeconds + added,
      updatedAt: nowIso,
    };
    return next;
  }

  if (added < MIN_VALID_SAMPLE_SECONDS) {
    return samples;
  }

  return [
    ...samples,
    {
      docId: input.docId,
      docName: input.docName,
      fileType: input.fileType,
      page: input.page,
      activeSeconds: added,
      updatedAt: nowIso,
    },
  ];
}

export function computeDiagnosticStats(samples: PageReadingSample[]): DiagnosticStats {
  const valid = samples
    .map((s) => s.activeSeconds)
    .filter((sec) => sec >= MIN_VALID_SAMPLE_SECONDS)
    .sort((a, b) => a - b);

  if (valid.length === 0) {
    return {
      sampleCount: 0,
      totalSeconds: 0,
      minSeconds: 0,
      maxSeconds: 0,
      meanSeconds: 0,
      medianSeconds: 0,
      p75Seconds: 0,
    };
  }

  const totalSeconds = valid.reduce((sum, s) => sum + s, 0);
  const meanSeconds = totalSeconds / valid.length;
  const medianSeconds = percentile(valid, 0.5);
  const p75Seconds = percentile(valid, 0.75);

  return {
    sampleCount: valid.length,
    totalSeconds,
    minSeconds: valid[0],
    maxSeconds: valid[valid.length - 1],
    meanSeconds,
    medianSeconds,
    p75Seconds,
  };
}

function classifyDifficulty(minutesPerPage: number): {
  difficulty: DifficultyLevel;
  label: string;
  rationale: string;
} {
  if (minutesPerPage < 1.2) {
    return {
      difficulty: 'agile',
      label: 'Lectura Ágil / Diapositivas',
      rationale:
        'Ritmo rápido por página o slide. Admite bloques de concentración extendidos (45–50 min) sin fatiga temprana.',
    };
  }
  if (minutesPerPage < 2.8) {
    return {
      difficulty: 'standard',
      label: 'Densidad Estándar / Conceptual',
      rationale:
        'Carga cognitiva equilibrada. Bloques intermedios de 25–35 min optimizan retención y toma de apuntes.',
    };
  }
  if (minutesPerPage < 5.0) {
    return {
      difficulty: 'dense',
      label: 'Densidad Alta / Analítica',
      rationale:
        'Material exigente por página. Ciclos más acotados (20–25 min) con pausas frecuentes previenen el agotamiento mental.',
    };
  }
  return {
    difficulty: 'extreme',
    label: 'Complejidad Extrema / Técnica',
    rationale:
      'Alta carga de análisis por página. Se recomiendan sprints cortos (15 min) y descansos largos cada 3 bloques.',
  };
}

/**
 * Calcula el perfil Pomodoro recomendado a partir de muestras reales de lectura:
 * - 'balanced': 0.65 * Mediana + 0.35 * P75 (resistente a pausas atipicas y captura paginas dificiles)
 * - 'average': Promedio aritmetico directo
 * - 'max': 0.40 * P75 + 0.60 * Maximo observado (planificacion conservadora contra paginas mas lentas)
 *
 * Duracion del bloque: curva continua inversa a la densidad por pagina:
 *   studyMinutes = clamp(round5(48 / (1 + 0.35 * (minPerPage - 0.8))), 15, 50)
 */
export function computeRecommendedPomodoro(
  samples: PageReadingSample[],
  criterion: DiagnosticCriterion = 'balanced'
): DiagnosticRecommendation {
  const stats = computeDiagnosticStats(samples);

  const confidence: DiagnosticRecommendation['confidence'] =
    stats.sampleCount === 0
      ? 'insufficient'
      : stats.sampleCount < 3
        ? 'preliminary'
        : stats.sampleCount < 5
          ? 'calibrated'
          : 'high';

  if (stats.sampleCount === 0) {
    return {
      stats,
      criterion,
      confidence,
      difficulty: 'standard',
      difficultyLabel: 'Sin muestras suficientes',
      rationale:
        'Activa el diagnóstico y lee al menos 1 a 3 páginas de tu material para calibrar tus tiempos reales.',
      effectiveSecondsPerPage: 180,
      recommendedSettings: {
        studyMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakEveryNBlocks: 4,
        speedMinPerPage: 3,
        pagesPerBlock: 8,
      },
    };
  }

  let effectiveSecondsPerPage = stats.medianSeconds;
  if (criterion === 'balanced') {
    effectiveSecondsPerPage = 0.65 * stats.medianSeconds + 0.35 * stats.p75Seconds;
  } else if (criterion === 'average') {
    effectiveSecondsPerPage = stats.meanSeconds;
  } else {
    effectiveSecondsPerPage = 0.4 * stats.p75Seconds + 0.6 * stats.maxSeconds;
  }

  // Limitar velocidad efectiva entre 0.5 y 30 min/pagina
  const rawMinPerPage = Math.max(0.5, Math.min(30, effectiveSecondsPerPage / 60));
  const speedMinPerPage = Number(rawMinPerPage.toFixed(1));

  const rawStudy = 48 / (1 + 0.35 * (rawMinPerPage - 0.8));
  const studyMinutes = Math.max(15, Math.min(50, roundToNearest(rawStudy, 5)));

  const shortBreakMinutes = Math.max(
    5,
    Math.min(10, Math.round(studyMinutes * 0.2 + (rawMinPerPage >= 4.0 ? 1 : 0)))
  );

  const longBreakMinutes = Math.max(
    15,
    Math.min(30, roundToNearest(shortBreakMinutes * 3, 5))
  );

  const longBreakEveryNBlocks = rawMinPerPage >= 3.5 ? 3 : 4;
  const pagesPerBlock = Math.max(1, Math.round(studyMinutes / rawMinPerPage));

  const { difficulty, label, rationale } = classifyDifficulty(rawMinPerPage);

  return {
    stats,
    criterion,
    confidence,
    difficulty,
    difficultyLabel: label,
    rationale,
    effectiveSecondsPerPage: Math.round(effectiveSecondsPerPage),
    recommendedSettings: {
      studyMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      longBreakEveryNBlocks,
      speedMinPerPage,
      pagesPerBlock,
    },
  };
}

export interface AdaptiveDiagnosisParams {
  samples: PageReadingSample[];
  criterion?: DiagnosticCriterion;
  learnerProfile?: LearnerProfile;
  documents?: DocumentRecord[];
  hoursUntilDeadline?: number;
}

/**
 * Cruza muestras reales por página, forma de ser del estudiante, tipo/volumen del material
 * cargado y margen hasta la fecha límite para sugerir el Top 3 de sistemas de estudio.
 */
export function computeAdaptiveStrategyRecommendation({
  samples,
  criterion = 'balanced',
  learnerProfile = DEFAULT_LEARNER_PROFILE,
  documents = [],
  hoursUntilDeadline = 72,
}: AdaptiveDiagnosisParams): DiagnosticRecommendation {
  const base = computeRecommendedPomodoro(samples, criterion);
  const docCount = documents.length;
  const totalPages = documents.reduce((acc, d) => acc + Math.max(1, d.pageCount || 1), 0);
  const hasSlides = documents.some((d) => d.fileType === 'pptx');
  const hasLongDenseDocs = documents.some((d) => (d.pageCount || 0) >= 25);
  const isTightDeadline = hoursUntilDeadline > 0 && hoursUntilDeadline <= 24;
  const estimatedHoursNeeded = (totalPages * base.recommendedSettings.speedMinPerPage) / 60;
  const loadRatio =
    hoursUntilDeadline > 0 && estimatedHoursNeeded > 0
      ? estimatedHoursNeeded / Math.max(1, hoursUntilDeadline)
      : 0.3;

  const preferredSynthesis: SynthesisMethodId =
    learnerProfile.reviewPreference === 'structured_cornell'
      ? 'cornell'
      : learnerProfile.reviewPreference === 'guided_sq3r'
        ? 'sq3r'
        : base.difficulty === 'dense' || base.difficulty === 'extreme'
          ? 'feynman'
          : 'fsrs_occlusion';

  const scoreStrategy = (id: StudyStrategyId): { score: number; reason: string } => {
    let score = 58;
    const reasons: string[] = [];

    switch (id) {
      case 'pomodoro':
        if (learnerProfile.focusPattern === 'short_bursts') {
          score += 24;
          reasons.push('tu atención rinde mejor en bloques acotados');
        }
        if (base.difficulty === 'dense' || base.difficulty === 'extreme') {
          score += 10;
          reasons.push('pausas regulares evitan saturación ante texto denso');
        }
        if (learnerProfile.timePressureTolerance === 'strict_goals') score += 8;
        if (learnerProfile.focusPattern === 'flow_uninterrupted') score -= 12;
        break;

      case 'flowtime':
        if (learnerProfile.focusPattern === 'flow_uninterrupted') {
          score += 30;
          reasons.push('no corta tu concentración en mitad de una idea');
        }
        if (learnerProfile.timePressureTolerance === 'flexible_pace') {
          score += 14;
          reasons.push('calcula descansos proporcionales a tu ritmo real');
        }
        if (base.stats.sampleCount === 0) {
          score += 6;
          reasons.push('mide tu velocidad real de páginas/minuto automáticamente');
        }
        if (learnerProfile.timePressureTolerance === 'strict_goals' && isTightDeadline) {
          score -= 10;
        }
        break;

      case 'ultradian_52_17':
        if (learnerProfile.focusPattern === 'deep_immersion') {
          score += 26;
          reasons.push('aprovecha picos sostenidos de 52 min con recuperación de 17 min');
        }
        if (base.difficulty === 'standard' || hasSlides) {
          score += 12;
          reasons.push('equilibra avance continuo y pausas regenerativas');
        }
        if (learnerProfile.primaryGoal === 'retention') score += 8;
        if (learnerProfile.focusPattern === 'short_bursts') score -= 14;
        break;

      case 'ultradian_90_20':
        if (learnerProfile.focusPattern === 'deep_immersion') {
          score += 28;
          reasons.push('alineado a tu preferencia por inmersión profunda de ciclo largo');
        }
        if (base.difficulty === 'agile' || learnerProfile.primaryGoal === 'comprehension') {
          score += 10;
          reasons.push('permite cerrar capítulos o ejercicios largos sin cortes tempranos');
        }
        if (learnerProfile.focusPattern === 'short_bursts' || isTightDeadline) score -= 18;
        break;

      case 'strict_timeboxing':
        if (learnerProfile.timePressureTolerance === 'strict_goals') {
          score += 24;
          reasons.push('transforma la ruta en sub-metas cerradas por página');
        }
        if (learnerProfile.primaryGoal === 'volume_deadline' || isTightDeadline || loadRatio > 0.45) {
          score += 22;
          reasons.push('redistribuye páginas automáticamente si hay desfase frente a la entrega');
        }
        if (learnerProfile.timePressureTolerance === 'flexible_pace') score -= 10;
        break;

      case 'interleaving':
        if (docCount >= 2) {
          score += 22;
          reasons.push(`alterna tus ${docCount} archivos ponderando fechas límite`);
        } else {
          score -= 22;
        }
        if (learnerProfile.primaryGoal === 'multi_subject') {
          score += 24;
          reasons.push('reduce monotonía y mejora transferencia entre materias');
        }
        if (learnerProfile.primaryGoal === 'retention') score += 8;
        break;

      case 'sq3r':
        if (learnerProfile.reviewPreference === 'guided_sq3r') {
          score += 26;
          reasons.push('guía la lectura con exploración, preguntas previas y evocación');
        }
        if (learnerProfile.primaryGoal === 'comprehension') {
          score += 16;
          reasons.push('ideal para asimilar capítulos densos desde cero');
        }
        if (hasLongDenseDocs || base.difficulty === 'dense' || base.difficulty === 'extreme') {
          score += 10;
          reasons.push('estructura material extenso antes de leer en detalle');
        }
        if (isTightDeadline && hasSlides) score -= 12;
        break;
    }

    const clamped = Math.max(40, Math.min(99, score));
    const fallbackReason =
      reasons.length > 0
        ? reasons.join('; ')
        : 'Opción equilibrada para tu carga de lectura actual';
    return {
      score: clamped,
      reason: fallbackReason.charAt(0).toUpperCase() + fallbackReason.slice(1) + '.',
    };
  };

  const strategyMatches: StrategyMatchSuggestion[] = STUDY_STRATEGY_CATALOG.map(
    (descriptor) => {
      const { score, reason } = scoreStrategy(descriptor.id);
      const synthesis: SynthesisMethodId =
        descriptor.id === 'sq3r'
          ? 'sq3r'
          : learnerProfile.reviewPreference === 'structured_cornell'
            ? 'cornell'
            : learnerProfile.primaryGoal === 'retention' ||
                learnerProfile.reviewPreference === 'active_recall'
              ? 'fsrs_occlusion'
              : preferredSynthesis;

      return {
        strategyId: descriptor.id,
        title: descriptor.name,
        compatibilityScore: score,
        recommendedSynthesis: synthesis,
        synthesisLabel: SYNTHESIS_METHOD_LABELS[synthesis],
        whyItFits: reason,
        suggestedSettings: {
          ...descriptor.defaultConfig,
          activeStrategy: descriptor.id,
          presetId: descriptor.presetId,
          preferredSynthesis: synthesis,
          defaultNoteFormat: synthesis === 'cornell' ? 'cornell' : descriptor.defaultNoteFormat,
          ...(descriptor.id === 'pomodoro'
            ? {
                studyMinutes: base.recommendedSettings.studyMinutes,
                shortBreakMinutes: base.recommendedSettings.shortBreakMinutes,
                longBreakMinutes: base.recommendedSettings.longBreakMinutes,
                longBreakEveryNBlocks: base.recommendedSettings.longBreakEveryNBlocks,
              }
            : {}),
          speedMinPerPage: base.recommendedSettings.speedMinPerPage,
        },
      };
    }
  )
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, 3);

  return {
    ...base,
    strategyMatches,
  };
}

export function formatDurationCompact(totalSeconds: number): string {
  const sec = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

