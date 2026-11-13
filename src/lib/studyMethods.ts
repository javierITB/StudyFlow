import {
  StrategyDescriptor,
  StudyMethodPreset,
  StudySettings,
  StudyStrategyId,
  SynthesisMethodId,
} from '../types/studyflow';
import { DEFAULT_APPEARANCE } from './themes';

export const DEFAULT_STUDY_SETTINGS: StudySettings = {
  presetId: 'classic',
  activeStrategy: 'pomodoro',
  preferredSynthesis: 'standard_notes',
  defaultNoteFormat: 'standard',
  intervalMode: 'time',
  blockAllocationMode: 'pack',
  studyMinutes: 25,
  pagesPerBlock: 5,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEveryNBlocks: 4,
  longBreakBetweenDocs: true,
  speedMinPerPage: 3,
  resumeFromCurrentPage: true,
  audioEnabled: true,
  appearance: DEFAULT_APPEARANCE,
};

export const SYNTHESIS_METHOD_LABELS: Record<SynthesisMethodId, string> = {
  standard_notes: 'Post-its Libres',
  cornell: 'Método Cornell (3 campos + PDF)',
  fsrs_occlusion: 'Oclusión + Repetición Espaciada FSRS',
  feynman: 'Técnica Feynman (Simplificación)',
  sq3r: 'Lectura Guiada SQ3R (5 etapas)',
};

/**
 * Catálogo declarativo extensible de estrategias cognitivas y motores de temporización.
 * Centraliza los descriptores para que Diagnóstico, Selector Directo, Calibración A/B y Timer
 * se adapten sin acoplar lógica dispersa en componentes.
 */
export const STUDY_STRATEGY_CATALOG: StrategyDescriptor[] = [
  {
    id: 'pomodoro',
    presetId: 'classic',
    name: 'Pomodoro Clásico',
    shortName: 'Pomodoro 25/5',
    category: 'timing',
    tagline: 'Ciclos estructurados de enfoque constante con pausas breves regulares.',
    badge: '25 / 5 / 15 min',
    idealFor: ['Combate procrastinación', 'Lectura conceptual estándar', 'Pausas preventivas'],
    recommendedSynthesis: 'standard_notes',
    defaultNoteFormat: 'standard',
    usesCountdown: true,
    enablesSq3r: false,
    isStrictTimebox: false,
    isInterleaving: false,
    defaultConfig: {
      presetId: 'classic',
      activeStrategy: 'pomodoro',
      intervalMode: 'time',
      studyMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEveryNBlocks: 4,
      longBreakBetweenDocs: true,
    },
  },
  {
    id: 'flowtime',
    presetId: 'flowtime',
    name: 'Flowtime (Cronómetro Flujo)',
    shortName: 'Flowtime',
    category: 'timing',
    tagline: 'Reloj ascendente sin alarmas de corte; descansas proporcionalmente al detener por fatiga.',
    badge: '00:00 → ∞ · Pausa prop.',
    idealFor: ['No romper estado de flujo', 'Medir velocidad real (págs/min)', 'Textos inmersivos'],
    recommendedSynthesis: 'cornell',
    defaultNoteFormat: 'cornell',
    usesCountdown: false,
    enablesSq3r: false,
    isStrictTimebox: false,
    isInterleaving: false,
    defaultConfig: {
      presetId: 'flowtime',
      activeStrategy: 'flowtime',
      intervalMode: 'time',
      studyMinutes: 40,
      shortBreakMinutes: 8,
      longBreakMinutes: 15,
      longBreakEveryNBlocks: 0,
      longBreakBetweenDocs: false,
    },
  },
  {
    id: 'ultradian_52_17',
    presetId: 'ultradian_52_17',
    name: 'Ultradiano 52/17',
    shortName: 'Ultradiano 52/17',
    category: 'timing',
    tagline: 'Bloques de alta productividad de 52 minutos con descanso recuperador de 17 minutos.',
    badge: '52 / 17 min',
    idealFor: ['Sesiones intensas sostenidas', 'Recálculo de cuota por bloque', 'Alta retención'],
    recommendedSynthesis: 'fsrs_occlusion',
    defaultNoteFormat: 'standard',
    usesCountdown: true,
    enablesSq3r: false,
    isStrictTimebox: false,
    isInterleaving: false,
    defaultConfig: {
      presetId: 'ultradian_52_17',
      activeStrategy: 'ultradian_52_17',
      intervalMode: 'time',
      studyMinutes: 52,
      shortBreakMinutes: 17,
      longBreakMinutes: 25,
      longBreakEveryNBlocks: 3,
      longBreakBetweenDocs: true,
    },
  },
  {
    id: 'ultradian_90_20',
    presetId: 'ultradian_90_20',
    name: 'Ultradiano Profundo 90/20',
    shortName: 'Ultradiano 90/20',
    category: 'timing',
    tagline: 'Ciclo ultradiano completo (90 min de inmersión total + 20 min de recuperación neural).',
    badge: '90 / 20 min',
    idealFor: ['Resolución técnica profunda', 'Estudio de exámenes complejos', 'Bloques largos'],
    recommendedSynthesis: 'feynman',
    defaultNoteFormat: 'cornell',
    usesCountdown: true,
    enablesSq3r: false,
    isStrictTimebox: false,
    isInterleaving: false,
    defaultConfig: {
      presetId: 'ultradian_90_20',
      activeStrategy: 'ultradian_90_20',
      intervalMode: 'time',
      studyMinutes: 90,
      shortBreakMinutes: 20,
      longBreakMinutes: 30,
      longBreakEveryNBlocks: 2,
      longBreakBetweenDocs: true,
    },
  },
  {
    id: 'strict_timeboxing',
    presetId: 'strict_timeboxing',
    name: 'Timeboxing Estricto por Páginas',
    shortName: 'Timeboxing',
    category: 'timing',
    tagline: 'Sub-metas cerradas de páginas; si expira sin completar, marca desfase y redistribuye.',
    badge: 'Meta cerrada · Auto-ajuste',
    idealFor: ['Fechas límite ajustadas', 'Evitar quedarse pegado en 1 página', 'Disciplina de avance'],
    recommendedSynthesis: 'standard_notes',
    defaultNoteFormat: 'standard',
    usesCountdown: true,
    enablesSq3r: false,
    isStrictTimebox: true,
    isInterleaving: false,
    defaultConfig: {
      presetId: 'strict_timeboxing',
      activeStrategy: 'strict_timeboxing',
      intervalMode: 'time',
      studyMinutes: 30,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEveryNBlocks: 4,
      longBreakBetweenDocs: true,
    },
  },
  {
    id: 'interleaving',
    presetId: 'interleaving',
    name: 'Interleaving Multi-documento',
    shortName: 'Interleaving',
    category: 'retention',
    tagline: 'Alterna automáticamente 2–3 documentos por bloque (Round-Robin ponderado por fecha límite).',
    badge: 'Rotación ponderada',
    idealFor: ['Varios ramos a la vez', 'Evitar fatiga por monotonía', 'Mejor transferencia cognitiva'],
    recommendedSynthesis: 'fsrs_occlusion',
    defaultNoteFormat: 'standard',
    usesCountdown: true,
    enablesSq3r: false,
    isStrictTimebox: false,
    isInterleaving: true,
    defaultConfig: {
      presetId: 'interleaving',
      activeStrategy: 'interleaving',
      intervalMode: 'time',
      studyMinutes: 30,
      shortBreakMinutes: 6,
      longBreakMinutes: 18,
      longBreakEveryNBlocks: 3,
      longBreakBetweenDocs: false,
    },
  },
  {
    id: 'sq3r',
    presetId: 'sq3r',
    name: 'Método SQ3R (Lectura Guiada)',
    shortName: 'SQ3R 5 Etapas',
    category: 'guided',
    tagline: 'Flujo secuencial por archivo: Explorar (Survey) → Preguntar → Leer → Recitar → Repasar.',
    badge: '5 Etapas guiadas',
    idealFor: ['Capítulos nuevos y densos', 'Comprensión profunda', 'Lectura activa estructurada'],
    recommendedSynthesis: 'sq3r',
    defaultNoteFormat: 'cornell',
    usesCountdown: true,
    enablesSq3r: true,
    isStrictTimebox: false,
    isInterleaving: false,
    defaultConfig: {
      presetId: 'sq3r',
      activeStrategy: 'sq3r',
      intervalMode: 'time',
      studyMinutes: 35,
      shortBreakMinutes: 7,
      longBreakMinutes: 20,
      longBreakEveryNBlocks: 3,
      longBreakBetweenDocs: true,
      defaultNoteFormat: 'cornell',
    },
  },
];

export const STUDY_METHOD_PRESETS: StudyMethodPreset[] = [
  {
    id: 'classic',
    strategyId: 'pomodoro',
    name: 'Pomodoro Clásico',
    subtitle: 'Equilibrio estándar para lectura constante',
    badge: '25 / 5 / 15 min',
    config: {
      presetId: 'classic',
      activeStrategy: 'pomodoro',
      intervalMode: 'time',
      studyMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEveryNBlocks: 4,
      longBreakBetweenDocs: true,
    },
  },
  {
    id: 'flowtime',
    strategyId: 'flowtime',
    name: 'Flowtime',
    subtitle: 'Cronómetro libre sin cortes con descanso proporcional al detener',
    badge: '00:00 → ∞ · Proporcional',
    config: STUDY_STRATEGY_CATALOG.find((s) => s.id === 'flowtime')!.defaultConfig,
  },
  {
    id: 'ultradian_52_17',
    strategyId: 'ultradian_52_17',
    name: 'Ultradiano 52/17',
    subtitle: 'Bloque intenso de 52 min con pausa recuperadora de 17 min',
    badge: '52 / 17 min',
    config: STUDY_STRATEGY_CATALOG.find((s) => s.id === 'ultradian_52_17')!.defaultConfig,
  },
  {
    id: 'ultradian_90_20',
    strategyId: 'ultradian_90_20',
    name: 'Ultradiano 90/20',
    subtitle: 'Inmersión ultradiana profunda de 90 min y pausa de 20 min',
    badge: '90 / 20 min',
    config: STUDY_STRATEGY_CATALOG.find((s) => s.id === 'ultradian_90_20')!.defaultConfig,
  },
  {
    id: 'strict_timeboxing',
    strategyId: 'strict_timeboxing',
    name: 'Timeboxing Estricto',
    subtitle: 'Sub-metas cerradas de páginas con redistribución automática si hay desfase',
    badge: '30 min · Auto-ajuste',
    config: STUDY_STRATEGY_CATALOG.find((s) => s.id === 'strict_timeboxing')!.defaultConfig,
  },
  {
    id: 'interleaving',
    strategyId: 'interleaving',
    name: 'Interleaving Multi-doc',
    subtitle: 'Rotación ponderada entre 2–3 documentos al terminar cada bloque',
    badge: 'Round-Robin ponderado',
    config: STUDY_STRATEGY_CATALOG.find((s) => s.id === 'interleaving')!.defaultConfig,
  },
  {
    id: 'sq3r',
    strategyId: 'sq3r',
    name: 'Flujo SQ3R',
    subtitle: 'Máquina secuencial Survey → Question → Read → Recite → Review',
    badge: '5 Etapas',
    config: STUDY_STRATEGY_CATALOG.find((s) => s.id === 'sq3r')!.defaultConfig,
  },
  {
    id: 'deep',
    strategyId: 'pomodoro',
    name: 'Bloque Profundo (50/10)',
    subtitle: 'Ciclos largos para materias densas o resolución',
    badge: '50 / 10 / 25 min',
    config: {
      presetId: 'deep',
      activeStrategy: 'pomodoro',
      intervalMode: 'time',
      studyMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 25,
      longBreakEveryNBlocks: 3,
      longBreakBetweenDocs: true,
    },
  },
  {
    id: 'compact',
    strategyId: 'pomodoro',
    name: 'Micro-Sesiones (15/3)',
    subtitle: 'Bloques acotados de arranque rápido',
    badge: '15 / 3 / 10 min',
    config: {
      presetId: 'compact',
      activeStrategy: 'pomodoro',
      intervalMode: 'time',
      studyMinutes: 15,
      shortBreakMinutes: 3,
      longBreakMinutes: 10,
      longBreakEveryNBlocks: 4,
      longBreakBetweenDocs: true,
    },
  },
  {
    id: 'marathon',
    strategyId: 'pomodoro',
    name: 'Extenso (75/15)',
    subtitle: 'Sesiones prolongadas de alta inmersión',
    badge: '75 / 15 / 30 min',
    config: {
      presetId: 'marathon',
      activeStrategy: 'pomodoro',
      intervalMode: 'time',
      studyMinutes: 75,
      shortBreakMinutes: 15,
      longBreakMinutes: 30,
      longBreakEveryNBlocks: 2,
      longBreakBetweenDocs: true,
    },
  },
  {
    id: 'pages',
    strategyId: 'pomodoro',
    name: 'Avance por Páginas',
    subtitle: 'Avanza metas de páginas o diapositivas por bloque',
    badge: '5 págs · 5/15 min',
    config: {
      presetId: 'pages',
      activeStrategy: 'pomodoro',
      intervalMode: 'pages',
      pagesPerBlock: 5,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEveryNBlocks: 4,
      longBreakBetweenDocs: true,
    },
  },
];

export function resolveActiveStrategyId(settings: StudySettings): StudyStrategyId {
  if (settings.activeStrategy) return settings.activeStrategy;
  switch (settings.presetId) {
    case 'flowtime':
      return 'flowtime';
    case 'ultradian_90_20':
      return 'ultradian_90_20';
    case 'ultradian_52_17':
      return 'ultradian_52_17';
    case 'strict_timeboxing':
      return 'strict_timeboxing';
    case 'interleaving':
      return 'interleaving';
    case 'sq3r':
      return 'sq3r';
    default:
      return 'pomodoro';
  }
}

export function getStrategyDescriptor(strategyId: StudyStrategyId): StrategyDescriptor {
  return (
    STUDY_STRATEGY_CATALOG.find((s) => s.id === strategyId) || STUDY_STRATEGY_CATALOG[0]
  );
}

/**
 * Calcula el descanso proporcional de Flowtime según segundos continuos estudiados:
 * - < 25 min -> 5 min
 * - 25–50 min -> 8 min
 * - 50–90 min -> 10 min
 * - 90–120 min -> 15 min
 * - > 120 min -> 20 min
 */
export function computeFlowtimeBreakMinutes(studySeconds: number): number {
  const mins = Math.max(0, studySeconds) / 60;
  if (mins < 25) return 5;
  if (mins < 50) return 8;
  if (mins < 90) return 10;
  if (mins <= 120) return 15;
  return 20;
}

export function applyPresetToSettings(
  current: StudySettings,
  presetId: StudyMethodPreset['id']
): StudySettings {
  const preset = STUDY_METHOD_PRESETS.find((p) => p.id === presetId);
  if (!preset) return current;
  return {
    ...current,
    ...preset.config,
    presetId,
  };
}

export function applyStrategyToSettings(
  current: StudySettings,
  strategyId: StudyStrategyId
): StudySettings {
  const descriptor = getStrategyDescriptor(strategyId);
  return {
    ...current,
    ...descriptor.defaultConfig,
    activeStrategy: strategyId,
    presetId: descriptor.presetId,
    preferredSynthesis: descriptor.recommendedSynthesis,
    defaultNoteFormat: descriptor.defaultNoteFormat,
  };
}
