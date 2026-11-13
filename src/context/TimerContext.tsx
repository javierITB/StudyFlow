import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  RouteSegment,
  RouteStep,
  StudySettings,
  StudyStrategyId,
} from '../types/studyflow';
import { playStudyTone } from '../lib/audio';
import {
  computeFlowtimeBreakMinutes,
  resolveActiveStrategyId,
} from '../lib/studyMethods';

export type TimerMode = 'study' | 'short' | 'long';

export interface TransitionPromptState {
  kind: 'segment_early' | 'block_early';
  unusedSeconds: number;
  nextSegment?: RouteSegment | null;
  recommendedBreakType: 'short' | 'long';
  recommendedBreakMinutes: number;
}

export interface StrictOverduePromptState {
  step: RouteStep;
  currentPage: number;
  targetEndPage: number;
  remainingPages: number;
  recommendedBreakMinutes: number;
}

export interface StudyBlockTelemetry {
  strategyId: StudyStrategyId;
  realStudySeconds: number;
  breakSeconds: number;
  step: RouteStep | null;
}

interface ActiveRouteContext {
  step: RouteStep;
  nextStep: RouteStep | null;
}

interface TimerContextValue {
  mode: TimerMode;
  activeStrategy: StudyStrategyId;
  isStopwatchActive: boolean;
  remainingSeconds: number;
  elapsedSeconds: number;
  totalDurationSeconds: number;
  isRunning: boolean;
  cyclesCompleted: number;
  totalPlannedBlocks: number;
  activeRouteStep: RouteStep | null;
  activeNextStep: RouteStep | null;
  activeSegmentIndex: number;
  canExtendStudyFromBreak: boolean;
  transitionPrompt: TransitionPromptState | null;
  strictOverduePrompt: StrictOverduePromptState | null;
  setMode: (mode: TimerMode, customMinutes?: number) => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  skipCycle: () => void;
  stopFlowtimeForFatigue: () => void;
  setTotalPlannedBlocks: (count: number) => void;
  startRouteStep: (
    step: RouteStep,
    nextStep?: RouteStep | null,
    segmentIndex?: number
  ) => void;
  setActiveSegmentIndex: (index: number) => void;
  completeCurrentBlock: () => void;
  completeCurrentSegment: () => void;
  chooseContinueNextSegment: () => RouteSegment | null;
  chooseStartBreak: (includeUnusedSeconds: boolean) => void;
  chooseSkipBreakToNextBlock: () => void;
  dismissTransitionPrompt: () => void;
  resolveStrictOverdueWithBreak: () => void;
  resolveStrictOverdueWithExtraTime: (extraMinutes?: number) => void;
  dismissStrictOverduePrompt: () => void;
  adjustTimerSeconds: (deltaSeconds: number) => void;
  extendStudyAndAdaptPlan: (extraMinutes?: number) => void;
  skipBreakAndContinue: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

interface TimerProviderProps {
  settings: StudySettings;
  plannedSteps?: RouteStep[];
  getDocCurrentPage?: (docId: string) => number;
  onNotify: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onStepCompleted?: (stepId: string, docId: string | null, endPage?: number) => void;
  onStrictBlockOverdue?: (step: RouteStep, reachedPage: number) => void;
  onBreakCompleted?: (telemetry: StudyBlockTelemetry) => void;
  onFlowtimeCompleted?: (realStudySeconds: number, docId: string | null) => void;
  onStepReopenedAndAdapted?: (
    step: RouteStep | null,
    extraMinutes: number
  ) => void;
  onRequestOpenSegment?: (segment: RouteSegment) => void;
  children: React.ReactNode;
}

export const TimerProvider: React.FC<TimerProviderProps> = ({
  settings,
  plannedSteps = [],
  getDocCurrentPage,
  onNotify,
  onStepCompleted,
  onStrictBlockOverdue,
  onBreakCompleted,
  onFlowtimeCompleted,
  onStepReopenedAndAdapted,
  onRequestOpenSegment,
  children,
}) => {
  const [mode, setModeState] = useState<TimerMode>('study');
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number>(
    settings.studyMinutes * 60
  );
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    settings.studyMinutes * 60
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(0);
  const [totalPlannedBlocks, setTotalPlannedBlocks] = useState<number>(0);
  const [activeRoute, setActiveRoute] = useState<ActiveRouteContext | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const [canExtendStudyFromBreak, setCanExtendStudyFromBreak] = useState<boolean>(false);
  const [transitionPrompt, setTransitionPrompt] = useState<TransitionPromptState | null>(
    null
  );
  const [strictOverduePrompt, setStrictOverduePrompt] =
    useState<StrictOverduePromptState | null>(null);
  const [lastCompletedStudyStep, setLastCompletedStudyStep] = useState<RouteStep | null>(
    null
  );
  const [accumulatedExtraMinutes, setAccumulatedExtraMinutes] = useState<number>(0);

  const activeStrategy = resolveActiveStrategyId(settings);
  const isStopwatchActive =
    mode === 'study' &&
    (settings.intervalMode === 'pages' || activeStrategy === 'flowtime');

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const activeStrategyRef = useRef(activeStrategy);
  activeStrategyRef.current = activeStrategy;

  const activeRouteRef = useRef(activeRoute);
  activeRouteRef.current = activeRoute;

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const cyclesRef = useRef(cyclesCompleted);
  cyclesRef.current = cyclesCompleted;

  const remainingRef = useRef(remainingSeconds);
  remainingRef.current = remainingSeconds;

  const elapsedRef = useRef(elapsedSeconds);
  elapsedRef.current = elapsedSeconds;

  const totalDurationRef = useRef(totalDurationSeconds);
  totalDurationRef.current = totalDurationSeconds;

  const lastStudyTelemetryRef = useRef<{
    strategyId: StudyStrategyId;
    realStudySeconds: number;
    breakSeconds: number;
    step: RouteStep | null;
  } | null>(null);

  const plannedStepsRef = useRef(plannedSteps);
  plannedStepsRef.current = plannedSteps;

  const getDocCurrentPageRef = useRef(getDocCurrentPage);
  getDocCurrentPageRef.current = getDocCurrentPage;

  const onStepCompletedRef = useRef(onStepCompleted);
  onStepCompletedRef.current = onStepCompleted;

  const onStrictBlockOverdueRef = useRef(onStrictBlockOverdue);
  onStrictBlockOverdueRef.current = onStrictBlockOverdue;

  const onBreakCompletedRef = useRef(onBreakCompleted);
  onBreakCompletedRef.current = onBreakCompleted;

  const onFlowtimeCompletedRef = useRef(onFlowtimeCompleted);
  onFlowtimeCompletedRef.current = onFlowtimeCompleted;

  const onStepReopenedRef = useRef(onStepReopenedAndAdapted);
  onStepReopenedRef.current = onStepReopenedAndAdapted;

  const onRequestOpenSegmentRef = useRef(onRequestOpenSegment);
  onRequestOpenSegmentRef.current = onRequestOpenSegment;

  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;

  const getDurationForMode = useCallback((targetMode: TimerMode, customMin?: number) => {
    const s = settingsRef.current;
    if (customMin && customMin > 0) return Math.round(customMin * 60);
    if (targetMode === 'study') return Math.max(60, s.studyMinutes * 60);
    if (targetMode === 'short') return Math.max(60, s.shortBreakMinutes * 60);
    return Math.max(60, s.longBreakMinutes * 60);
  }, []);

  const resolveBreakPlan = useCallback((nextCycleCount: number) => {
    const s = settingsRef.current;
    const routeCtx = activeRouteRef.current;

    if (routeCtx?.nextStep && routeCtx.nextStep.type !== 'study') {
      return {
        breakMode: (routeCtx.nextStep.type === 'long_break' ? 'long' : 'short') as
          | 'short'
          | 'long',
        breakMinutes: routeCtx.nextStep.durationMinutes,
      };
    }
    if (s.longBreakEveryNBlocks > 0 && nextCycleCount % s.longBreakEveryNBlocks === 0) {
      return {
        breakMode: 'long' as const,
        breakMinutes: s.longBreakMinutes,
      };
    }
    return {
      breakMode: 'short' as const,
      breakMinutes: s.shortBreakMinutes,
    };
  }, []);

  // Sincronizar duracion en reposo cuando el usuario cambia la configuracion de ciclos
  useEffect(() => {
    if (isRunning || activeRoute || transitionPrompt) return;
    if (mode === 'study') {
      const dur = Math.max(60, settings.studyMinutes * 60);
      setTotalDurationSeconds(dur);
      setRemainingSeconds(dur);
    } else if (mode === 'short') {
      const dur = Math.max(60, settings.shortBreakMinutes * 60);
      setTotalDurationSeconds(dur);
      setRemainingSeconds(dur);
    } else {
      const dur = Math.max(60, settings.longBreakMinutes * 60);
      setTotalDurationSeconds(dur);
      setRemainingSeconds(dur);
    }
  }, [
    settings.studyMinutes,
    settings.shortBreakMinutes,
    settings.longBreakMinutes,
    isRunning,
    activeRoute,
    transitionPrompt,
    mode,
  ]);

  const setMode = useCallback(
    (nextMode: TimerMode, customMinutes?: number) => {
      setIsRunning(false);
      setTransitionPrompt(null);
      setCanExtendStudyFromBreak(false);
      setModeState(nextMode);
      const dur = getDurationForMode(nextMode, customMinutes);
      setTotalDurationSeconds(dur);
      setRemainingSeconds(dur);
      setElapsedSeconds(0);
    },
    [getDurationForMode]
  );

  const launchBreakTimer = useCallback(
    (
      breakMode: 'short' | 'long',
      breakSeconds: number,
      allowExtendBack: boolean,
      completedStep: RouteStep | null,
      recordedStudySeconds?: number
    ) => {
      const dur = Math.max(30, Math.round(breakSeconds));
      const realStudySecs =
        recordedStudySeconds !== undefined
          ? recordedStudySeconds
          : activeStrategyRef.current === 'flowtime'
            ? elapsedRef.current
            : Math.max(1, totalDurationRef.current - remainingRef.current);

      lastStudyTelemetryRef.current = {
        strategyId: activeStrategyRef.current,
        realStudySeconds: realStudySecs,
        breakSeconds: dur,
        step: completedStep || activeRouteRef.current?.step || null,
      };

      setTransitionPrompt(null);
      setStrictOverduePrompt(null);
      setLastCompletedStudyStep(completedStep);
      setCanExtendStudyFromBreak(allowExtendBack);
      setModeState(breakMode);
      setTotalDurationSeconds(dur);
      setRemainingSeconds(dur);
      setElapsedSeconds(0);
      setIsRunning(true);
    },
    []
  );

  const commitStudyCompletionAndStartBreak = useCallback(
    (extraBreakSeconds = 0, allowExtendBack = true, recordedStudySecs?: number) => {
      const s = settingsRef.current;
      const routeCtx = activeRouteRef.current;
      const nextCycles = cyclesRef.current + 1;
      setCyclesCompleted(nextCycles);
      playStudyTone('success', s.audioEnabled);

      let completedStep: RouteStep | null = null;
      if (routeCtx?.step && routeCtx.step.type === 'study') {
        completedStep = routeCtx.step;
        onStepCompletedRef.current?.(
          routeCtx.step.id,
          routeCtx.step.docId,
          routeCtx.step.endPage
        );
      }

      const { breakMode, breakMinutes } = resolveBreakPlan(nextCycles);
      const totalBreakSecs = breakMinutes * 60 + Math.max(0, extraBreakSeconds);

      launchBreakTimer(
        breakMode,
        totalBreakSecs,
        allowExtendBack,
        completedStep,
        recordedStudySecs
      );

      const totalBreakMinLabel = Math.round(totalBreakSecs / 60);
      onNotifyRef.current(
        `${breakMode === 'long' ? 'Descanso largo' : 'Descanso corto'} iniciado (${totalBreakMinLabel} min).`,
        'success'
      );
    },
    [resolveBreakPlan, launchBreakTimer]
  );

  const stopFlowtimeForFatigue = useCallback(() => {
    const studiedSeconds = Math.max(1, elapsedRef.current);
    const s = settingsRef.current;
    const routeCtx = activeRouteRef.current;
    const breakMinutes = computeFlowtimeBreakMinutes(studiedSeconds);
    const nextCycles = cyclesRef.current + 1;

    setCyclesCompleted(nextCycles);
    playStudyTone('success', s.audioEnabled);

    let completedStep: RouteStep | null = null;
    if (routeCtx?.step && routeCtx.step.type === 'study') {
      completedStep = routeCtx.step;
      onStepCompletedRef.current?.(
        routeCtx.step.id,
        routeCtx.step.docId,
        routeCtx.step.endPage
      );
    }

    onFlowtimeCompletedRef.current?.(
      studiedSeconds,
      routeCtx?.step?.docId || null
    );

    launchBreakTimer(
      breakMinutes >= 15 ? 'long' : 'short',
      breakMinutes * 60,
      false,
      completedStep,
      studiedSeconds
    );

    const minsStudied = Math.max(1, Math.round(studiedSeconds / 60));
    onNotifyRef.current(
      `Flowtime pausado (${minsStudied} min efectivos). Descanso proporcional de ${breakMinutes} min iniciado.`,
      'success'
    );
  }, [launchBreakTimer]);

  const advanceToNextRouteStep = useCallback(
    (completedStep: RouteStep | null, autoStart: boolean) => {
      const steps = plannedStepsRef.current;
      const s = settingsRef.current;
      const completedIdx = completedStep
        ? steps.findIndex((st) => st.id === completedStep.id)
        : -1;

      const searchFrom = completedIdx >= 0 ? completedIdx + 1 : 0;
      let nextStudyIdx = steps.findIndex(
        (st, idx) =>
          idx >= searchFrom &&
          st.type === 'study' &&
          !st.completed &&
          st.id !== completedStep?.id
      );

      if (nextStudyIdx < 0 && searchFrom > 0) {
        nextStudyIdx = steps.findIndex(
          (st) => st.type === 'study' && !st.completed && st.id !== completedStep?.id
        );
      }

      if (nextStudyIdx >= 0) {
        const nextStudy = steps[nextStudyIdx];
        const afterNext =
          nextStudyIdx + 1 < steps.length ? steps[nextStudyIdx + 1] : null;
        setActiveRoute({ step: nextStudy, nextStep: afterNext });
        setActiveSegmentIndex(0);
        setAccumulatedExtraMinutes(0);
        setCanExtendStudyFromBreak(false);
        setTransitionPrompt(null);
        setStrictOverduePrompt(null);
        setModeState('study');
        const dur = Math.max(60, nextStudy.durationMinutes * 60);
        setTotalDurationSeconds(dur);
        setRemainingSeconds(dur);
        setElapsedSeconds(0);
        setIsRunning(autoStart);

        const firstSeg = nextStudy.segments?.[0];
        if (firstSeg) {
          onRequestOpenSegmentRef.current?.(firstSeg);
        } else if (nextStudy.docId) {
          onRequestOpenSegmentRef.current?.({
            docId: nextStudy.docId,
            docName: nextStudy.docName,
            startPage: nextStudy.startPage || 1,
            endPage: nextStudy.endPage || 1,
            pageCount: nextStudy.pageCount || 1,
            estimatedMinutes: nextStudy.durationMinutes,
          });
        }
        return;
      }

      setActiveRoute(null);
      setCanExtendStudyFromBreak(false);
      setTransitionPrompt(null);
      setStrictOverduePrompt(null);
      setModeState('study');
      const dur = Math.max(60, s.studyMinutes * 60);
      setTotalDurationSeconds(dur);
      setRemainingSeconds(dur);
      setElapsedSeconds(0);
      setIsRunning(false);

      if (steps.some((st) => st.type === 'study')) {
        onNotifyRef.current('¡Has completado todos los bloques de la ruta!', 'success');
      }
    },
    []
  );

  const emitBreakCompletionTelemetry = useCallback(() => {
    const telemetry = lastStudyTelemetryRef.current;
    if (telemetry) {
      lastStudyTelemetryRef.current = null;
      onBreakCompletedRef.current?.(telemetry);
    }
  }, []);

  const handleCountdownZero = useCallback(() => {
    const s = settingsRef.current;
    const strategy = activeStrategyRef.current;
    if (modeRef.current === 'study') {
      const routeStep = activeRouteRef.current?.step;
      if (strategy === 'strict_timeboxing' && routeStep && routeStep.docId) {
        const targetEnd =
          routeStep.endPage ||
          routeStep.segments?.[routeStep.segments.length - 1]?.endPage ||
          0;
        const currentPage = getDocCurrentPageRef.current
          ? getDocCurrentPageRef.current(routeStep.docId)
          : targetEnd;

        if (targetEnd > 0 && currentPage < targetEnd) {
          const remainingPages = targetEnd - currentPage;
          const { breakMinutes } = resolveBreakPlan(cyclesRef.current + 1);
          setIsRunning(false);
          playStudyTone('breakEnd', s.audioEnabled);
          onStrictBlockOverdueRef.current?.(routeStep, currentPage);
          setStrictOverduePrompt({
            step: routeStep,
            currentPage,
            targetEndPage: targetEnd,
            remainingPages,
            recommendedBreakMinutes: breakMinutes,
          });
          onNotifyRef.current(
            `Bloque desfasado: faltaron ${remainingPages} págs. Redistribuidas en los próximos bloques.`,
            'warning'
          );
          return;
        }
      }

      commitStudyCompletionAndStartBreak(0, true, totalDurationRef.current);
    } else {
      playStudyTone('breakEnd', s.audioEnabled);
      onNotifyRef.current('Descanso finalizado. Listo para continuar.', 'info');
      emitBreakCompletionTelemetry();
      advanceToNextRouteStep(lastCompletedStudyStep, false);
    }
  }, [
    commitStudyCompletionAndStartBreak,
    lastCompletedStudyStep,
    advanceToNextRouteStep,
    resolveBreakPlan,
    emitBreakCompletionTelemetry,
  ]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      if (isStopwatchActive) {
        setElapsedSeconds((prev) => prev + 1);
      } else {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            window.clearInterval(interval);
            window.setTimeout(() => handleCountdownZero(), 0);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, isStopwatchActive, handleCountdownZero]);

  const toggleTimer = useCallback(() => {
    setIsRunning((prev) => {
      if (!prev) {
        playStudyTone('tick', settingsRef.current.audioEnabled);
      }
      return !prev;
    });
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTransitionPrompt(null);
    setStrictOverduePrompt(null);
    setElapsedSeconds(0);
    setRemainingSeconds(totalDurationSeconds);
    onNotifyRef.current('Temporizador reiniciado', 'info');
  }, [totalDurationSeconds]);

  const skipCycle = useCallback(() => {
    setIsRunning(false);
    setTransitionPrompt(null);
    setStrictOverduePrompt(null);
    if (mode === 'study') {
      if (activeStrategyRef.current === 'flowtime') {
        stopFlowtimeForFatigue();
        return;
      }
      const { breakMode, breakMinutes } = resolveBreakPlan(cyclesRef.current + 1);
      const elapsedStudy = Math.max(60, totalDurationRef.current - remainingRef.current);
      launchBreakTimer(
        breakMode,
        breakMinutes * 60,
        false,
        activeRouteRef.current?.step ?? null,
        elapsedStudy
      );
    } else {
      emitBreakCompletionTelemetry();
      advanceToNextRouteStep(lastCompletedStudyStep, false);
    }
  }, [
    mode,
    resolveBreakPlan,
    launchBreakTimer,
    advanceToNextRouteStep,
    lastCompletedStudyStep,
    stopFlowtimeForFatigue,
    emitBreakCompletionTelemetry,
  ]);

  const startRouteStep = useCallback(
    (step: RouteStep, nextStep: RouteStep | null = null, segmentIndex = 0) => {
      setActiveRoute({ step, nextStep });
      setActiveSegmentIndex(segmentIndex);
      setTransitionPrompt(null);
      setCanExtendStudyFromBreak(false);
      setAccumulatedExtraMinutes(0);
      setElapsedSeconds(0);

      if (step.type === 'study') {
        setModeState('study');
        const dur = Math.max(60, step.durationMinutes * 60);
        setTotalDurationSeconds(dur);
        setRemainingSeconds(dur);
        setIsRunning(true);
        playStudyTone('tick', settingsRef.current.audioEnabled);
      } else {
        const breakMode: TimerMode = step.type === 'long_break' ? 'long' : 'short';
        setModeState(breakMode);
        const dur = Math.max(60, step.durationMinutes * 60);
        setTotalDurationSeconds(dur);
        setRemainingSeconds(dur);
        setIsRunning(true);
      }
    },
    []
  );

  // Completar sub-archivo dentro de un bloque empaquetado (o bloque unico)
  const completeCurrentSegment = useCallback(() => {
    if (modeRef.current !== 'study') {
      handleCountdownZero();
      return;
    }

    const s = settingsRef.current;
    const routeCtx = activeRouteRef.current;
    const segments = routeCtx?.step?.segments || [];
    const hasNextSegment =
      segments.length > 1 && activeSegmentIndex < segments.length - 1;

    if (hasNextSegment) {
      const nextSeg = segments[activeSegmentIndex + 1];
      const { breakMode, breakMinutes } = resolveBreakPlan(cyclesRef.current + 1);
      setTransitionPrompt({
        kind: 'segment_early',
        unusedSeconds: s.intervalMode === 'time' ? remainingRef.current : 0,
        nextSegment: nextSeg,
        recommendedBreakType: breakMode,
        recommendedBreakMinutes: breakMinutes,
      });
      return;
    }

    // Ultimo segmento o bloque simple: si queda >= 60s en modo tiempo, preguntar que hacer con el sobrante
    if (s.intervalMode === 'time' && remainingRef.current >= 60) {
      const { breakMode, breakMinutes } = resolveBreakPlan(cyclesRef.current + 1);
      setTransitionPrompt({
        kind: 'block_early',
        unusedSeconds: remainingRef.current,
        nextSegment: null,
        recommendedBreakType: breakMode,
        recommendedBreakMinutes: breakMinutes,
      });
      return;
    }

    commitStudyCompletionAndStartBreak(0, true);
  }, [
    activeSegmentIndex,
    resolveBreakPlan,
    commitStudyCompletionAndStartBreak,
    handleCountdownZero,
  ]);

  const completeCurrentBlock = useCallback(() => {
    if (modeRef.current !== 'study') {
      handleCountdownZero();
      return;
    }
    const s = settingsRef.current;
    if (s.intervalMode === 'time' && remainingRef.current >= 60) {
      const { breakMode, breakMinutes } = resolveBreakPlan(cyclesRef.current + 1);
      const segments = activeRouteRef.current?.step?.segments || [];
      const nextSeg =
        segments.length > 1 && activeSegmentIndex < segments.length - 1
          ? segments[activeSegmentIndex + 1]
          : null;
      setTransitionPrompt({
        kind: nextSeg ? 'segment_early' : 'block_early',
        unusedSeconds: remainingRef.current,
        nextSegment: nextSeg,
        recommendedBreakType: breakMode,
        recommendedBreakMinutes: breakMinutes,
      });
      return;
    }
    commitStudyCompletionAndStartBreak(0, true);
  }, [
    activeSegmentIndex,
    resolveBreakPlan,
    commitStudyCompletionAndStartBreak,
    handleCountdownZero,
  ]);

  const chooseContinueNextSegment = useCallback((): RouteSegment | null => {
    const seg = transitionPrompt?.nextSegment ?? null;
    if (!seg) return null;
    setActiveSegmentIndex((prev) => prev + 1);
    setTransitionPrompt(null);
    setIsRunning(true);
    playStudyTone('tick', settingsRef.current.audioEnabled);
    onRequestOpenSegmentRef.current?.(seg);
    return seg;
  }, [transitionPrompt]);

  const chooseStartBreak = useCallback(
    (includeUnusedSeconds: boolean) => {
      const unused = includeUnusedSeconds ? transitionPrompt?.unusedSeconds || 0 : 0;
      setTransitionPrompt(null);
      commitStudyCompletionAndStartBreak(unused, false);
    },
    [transitionPrompt, commitStudyCompletionAndStartBreak]
  );

  const chooseSkipBreakToNextBlock = useCallback(() => {
    const s = settingsRef.current;
    const routeCtx = activeRouteRef.current;
    const nextCycles = cyclesRef.current + 1;
    setCyclesCompleted(nextCycles);
    setTransitionPrompt(null);
    playStudyTone('success', s.audioEnabled);

    const stepCompleted = routeCtx?.step?.type === 'study' ? routeCtx.step : null;
    if (stepCompleted) {
      onStepCompletedRef.current?.(
        stepCompleted.id,
        stepCompleted.docId,
        stepCompleted.endPage
      );
    }

    advanceToNextRouteStep(stepCompleted, true);
  }, [advanceToNextRouteStep]);

  const dismissTransitionPrompt = useCallback(() => {
    setTransitionPrompt(null);
  }, []);

  const resolveStrictOverdueWithBreak = useCallback(() => {
    if (!strictOverduePrompt) return;
    const { step, recommendedBreakMinutes } = strictOverduePrompt;
    setStrictOverduePrompt(null);
    launchBreakTimer(
      'short',
      recommendedBreakMinutes * 60,
      false,
      step,
      totalDurationRef.current
    );
  }, [strictOverduePrompt, launchBreakTimer]);

  const resolveStrictOverdueWithExtraTime = useCallback(
    (extraMinutes = 5) => {
      if (!strictOverduePrompt) return;
      const { step } = strictOverduePrompt;
      setStrictOverduePrompt(null);
      setModeState('study');
      const dur = Math.max(60, extraMinutes * 60);
      setTotalDurationSeconds(dur);
      setRemainingSeconds(dur);
      setElapsedSeconds(0);
      setIsRunning(true);
      playStudyTone('tick', settingsRef.current.audioEnabled);
      onStepReopenedRef.current?.(step, extraMinutes);
    },
    [strictOverduePrompt]
  );

  const dismissStrictOverduePrompt = useCallback(() => {
    setStrictOverduePrompt(null);
  }, []);

  const adjustTimerSeconds = useCallback((deltaSeconds: number) => {
    setRemainingSeconds((prev) => {
      const next = Math.max(30, prev + deltaSeconds);
      setTotalDurationSeconds((tot) => Math.max(tot, next));
      return next;
    });
  }, []);

  const extendStudyAndAdaptPlan = useCallback(
    (extraMinutes = 5) => {
      const targetStep = lastCompletedStudyStep || activeRouteRef.current?.step || null;
      const newExtraTotal = accumulatedExtraMinutes + extraMinutes;
      setAccumulatedExtraMinutes(newExtraTotal);

      setCyclesCompleted((prev) => Math.max(0, prev - 1));
      setCanExtendStudyFromBreak(false);
      setTransitionPrompt(null);
      setStrictOverduePrompt(null);
      setModeState('study');
      const dur = Math.max(60, extraMinutes * 60);
      setTotalDurationSeconds(dur);
      setRemainingSeconds(dur);
      setElapsedSeconds(0);
      setIsRunning(true);

      playStudyTone('tick', settingsRef.current.audioEnabled);
      onStepReopenedRef.current?.(targetStep, extraMinutes);
    },
    [lastCompletedStudyStep, accumulatedExtraMinutes]
  );

  const skipBreakAndContinue = useCallback(() => {
    const s = settingsRef.current;
    playStudyTone('breakEnd', s.audioEnabled);
    emitBreakCompletionTelemetry();
    advanceToNextRouteStep(lastCompletedStudyStep, true);
  }, [lastCompletedStudyStep, advanceToNextRouteStep, emitBreakCompletionTelemetry]);

  const value = useMemo<TimerContextValue>(
    () => ({
      mode,
      activeStrategy,
      isStopwatchActive,
      remainingSeconds,
      elapsedSeconds,
      totalDurationSeconds,
      isRunning,
      cyclesCompleted,
      totalPlannedBlocks,
      activeRouteStep: activeRoute?.step ?? null,
      activeNextStep: activeRoute?.nextStep ?? null,
      activeSegmentIndex,
      canExtendStudyFromBreak,
      transitionPrompt,
      strictOverduePrompt,
      setMode,
      toggleTimer,
      resetTimer,
      skipCycle,
      stopFlowtimeForFatigue,
      setTotalPlannedBlocks,
      startRouteStep,
      setActiveSegmentIndex,
      completeCurrentBlock,
      completeCurrentSegment,
      chooseContinueNextSegment,
      chooseStartBreak,
      chooseSkipBreakToNextBlock,
      dismissTransitionPrompt,
      resolveStrictOverdueWithBreak,
      resolveStrictOverdueWithExtraTime,
      dismissStrictOverduePrompt,
      adjustTimerSeconds,
      extendStudyAndAdaptPlan,
      skipBreakAndContinue,
    }),
    [
      mode,
      activeStrategy,
      isStopwatchActive,
      remainingSeconds,
      elapsedSeconds,
      totalDurationSeconds,
      isRunning,
      cyclesCompleted,
      totalPlannedBlocks,
      activeRoute,
      activeSegmentIndex,
      canExtendStudyFromBreak,
      transitionPrompt,
      strictOverduePrompt,
      setMode,
      toggleTimer,
      resetTimer,
      skipCycle,
      stopFlowtimeForFatigue,
      startRouteStep,
      completeCurrentBlock,
      completeCurrentSegment,
      chooseContinueNextSegment,
      chooseStartBreak,
      chooseSkipBreakToNextBlock,
      dismissTransitionPrompt,
      resolveStrictOverdueWithBreak,
      resolveStrictOverdueWithExtraTime,
      dismissStrictOverduePrompt,
      adjustTimerSeconds,
      extendStudyAndAdaptPlan,
      skipBreakAndContinue,
    ]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer debe usarse dentro de TimerProvider');
  return ctx;
}
