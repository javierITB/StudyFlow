import {
  CalibrationSessionMetric,
  CalibrationTourState,
  StudyStrategyId,
} from '../types/studyflow';
import { getStrategyDescriptor } from './studyMethods';

export const DEFAULT_CALIBRATION_SEQUENCE: StudyStrategyId[] = [
  'pomodoro',
  'flowtime',
  'ultradian_52_17',
];

export const EXTENDED_CALIBRATION_SEQUENCE: StudyStrategyId[] = [
  'pomodoro',
  'flowtime',
  'ultradian_52_17',
  'strict_timeboxing',
];

export function createCalibrationTour(
  sequence: StudyStrategyId[] = DEFAULT_CALIBRATION_SEQUENCE
): CalibrationTourState {
  const uniqueSeq = Array.from(new Set(sequence)).slice(0, 4);
  const validSeq = uniqueSeq.length >= 2 ? uniqueSeq : DEFAULT_CALIBRATION_SEQUENCE;
  return {
    isActive: true,
    sequence: validSeq,
    currentIndex: 0,
    sessions: [],
    startedAt: new Date().toISOString(),
  };
}

export function buildCalibrationSessionMetric(params: {
  strategyId: StudyStrategyId;
  realStudySeconds: number;
  breakSeconds: number;
  pagesAdvanced: number;
  notesAndOcclusionsCreated: number;
  fatigueRating: 1 | 2 | 3 | 4 | 5;
}): CalibrationSessionMetric {
  const studyMin = Math.max(0.5, params.realStudySeconds / 60);
  const effectivePagesPerMin = Number(
    (Math.max(0, params.pagesAdvanced) / studyMin).toFixed(2)
  );
  const synthesisPerHour = Number(
    ((Math.max(0, params.notesAndOcclusionsCreated) / studyMin) * 60).toFixed(1)
  );
  const descriptor = getStrategyDescriptor(params.strategyId);

  return {
    id: `cal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    strategyId: params.strategyId,
    strategyName: descriptor.shortName,
    realStudySeconds: Math.max(0, Math.round(params.realStudySeconds)),
    breakSeconds: Math.max(0, Math.round(params.breakSeconds)),
    pagesAdvanced: Math.max(0, params.pagesAdvanced),
    notesAndOcclusionsCreated: Math.max(0, params.notesAndOcclusionsCreated),
    effectivePagesPerMin,
    synthesisPerHour,
    fatigueRating: params.fatigueRating,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Puntaje compuesto de calibración (0..100+):
 * Prioriza velocidad efectiva de avance + densidad de síntesis activa,
 * penalizando sesiones con alto índice de fatiga (1=fresco, 5=agotado).
 */
export function computeCalibrationCompositeScore(
  metric: CalibrationSessionMetric,
  allMetrics: CalibrationSessionMetric[]
): number {
  const maxSpeed = Math.max(0.1, ...allMetrics.map((m) => m.effectivePagesPerMin));
  const maxSynthesis = Math.max(1, ...allMetrics.map((m) => m.synthesisPerHour));

  const speedNorm = (metric.effectivePagesPerMin / maxSpeed) * 50;
  const synthesisNorm = (metric.synthesisPerHour / maxSynthesis) * 25;
  const comfortNorm = ((6 - metric.fatigueRating) / 5) * 25;

  return Math.round(speedNorm + synthesisNorm + comfortNorm);
}

export function pickCalibrationWinner(
  sessions: CalibrationSessionMetric[]
): StudyStrategyId | undefined {
  if (sessions.length === 0) return undefined;
  let best = sessions[0];
  let bestScore = -1;
  for (const s of sessions) {
    const score = computeCalibrationCompositeScore(s, sessions);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best.strategyId;
}

export function advanceCalibrationTour(
  tour: CalibrationTourState,
  metric: CalibrationSessionMetric
): CalibrationTourState {
  const nextSessions = [...tour.sessions, metric];
  const nextIndex = tour.currentIndex + 1;
  const finished = nextIndex >= tour.sequence.length;

  return {
    ...tour,
    sessions: nextSessions,
    currentIndex: finished ? tour.sequence.length - 1 : nextIndex,
    isActive: !finished,
    completedAt: finished ? new Date().toISOString() : undefined,
    recommendedWinner: finished
      ? pickCalibrationWinner(nextSessions)
      : pickCalibrationWinner(nextSessions),
  };
}

