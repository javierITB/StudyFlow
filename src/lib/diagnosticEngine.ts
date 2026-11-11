import {
  DiagnosticCriterion,
  DiagnosticRecommendation,
  DiagnosticStats,
  DifficultyLevel,
  DocumentType,
  PageReadingSample,
} from '../types/studyflow';

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

export function formatDurationCompact(totalSeconds: number): string {
  const sec = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

