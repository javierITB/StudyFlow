import { StudyMethodPreset, StudySettings } from '../types/studyflow';

export const DEFAULT_STUDY_SETTINGS: StudySettings = {
  presetId: 'classic',
  intervalMode: 'time',
  studyMinutes: 25,
  pagesPerBlock: 5,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEveryNBlocks: 4,
  longBreakBetweenDocs: true,
  speedMinPerPage: 3,
  resumeFromCurrentPage: true,
  audioEnabled: true,
};

export const STUDY_METHOD_PRESETS: StudyMethodPreset[] = [
  {
    id: 'classic',
    name: 'Pomodoro Clásico',
    subtitle: 'Equilibrio estándar para lectura constante',
    badge: '25 / 5 / 15 min',
    config: {
      presetId: 'classic',
      intervalMode: 'time',
      studyMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEveryNBlocks: 4,
      longBreakBetweenDocs: true,
    },
  },
  {
    id: 'deep',
    name: 'Bloque Profundo',
    subtitle: 'Ciclos largos para materias densas o resolución',
    badge: '50 / 10 / 25 min',
    config: {
      presetId: 'deep',
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
    name: 'Micro-Sesiones',
    subtitle: 'Bloques acotados de arranque rápido',
    badge: '15 / 3 / 10 min',
    config: {
      presetId: 'compact',
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
    name: 'Extenso (75/15)',
    subtitle: 'Sesiones prolongadas de alta inmersión',
    badge: '75 / 15 / 30 min',
    config: {
      presetId: 'marathon',
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
    name: 'Avance por Páginas',
    subtitle: 'Avanza metas de páginas o diapositivas por bloque',
    badge: '5 págs · 5/15 min',
    config: {
      presetId: 'pages',
      intervalMode: 'pages',
      pagesPerBlock: 5,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEveryNBlocks: 4,
      longBreakBetweenDocs: true,
    },
  },
];

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

