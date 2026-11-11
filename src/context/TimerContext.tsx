import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RouteStep, StudySettings } from '../types/studyflow';
import { playStudyTone } from '../lib/audio';

export type TimerMode = 'study' | 'short' | 'long';

interface ActiveRouteContext {
  step: RouteStep;
  nextStep: RouteStep | null;
}

interface TimerContextValue {
  mode: TimerMode;
  remainingSeconds: number;
  elapsedSeconds: number;
  totalDurationSeconds: number;
  isRunning: boolean;
  cyclesCompleted: number;
  totalPlannedBlocks: number;
  activeRouteStep: RouteStep | null;
  activeNextStep: RouteStep | null;
  setMode: (mode: TimerMode, customMinutes?: number) => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  skipCycle: () => void;
  setTotalPlannedBlocks: (count: number) => void;
  startRouteStep: (step: RouteStep, nextStep?: RouteStep | null) => void;
  completeCurrentBlock: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

interface TimerProviderProps {
  settings: StudySettings;
  onNotify: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onStepCompleted?: (stepId: string, docId: string | null, endPage?: number) => void;
  children: React.ReactNode;
}

export const TimerProvider: React.FC<TimerProviderProps> = ({
  settings,
  onNotify,
  onStepCompleted,
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

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const activeRouteRef = useRef(activeRoute);
  activeRouteRef.current = activeRoute;

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const cyclesRef = useRef(cyclesCompleted);
  cyclesRef.current = cyclesCompleted;

  const onStepCompletedRef = useRef(onStepCompleted);
  onStepCompletedRef.current = onStepCompleted;

  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;

  const getDurationForMode = useCallback((targetMode: TimerMode, customMin?: number) => {
    const s = settingsRef.current;
    if (customMin && customMin > 0) return customMin * 60;
    if (targetMode === 'study') return Math.max(60, s.studyMinutes * 60);
    if (targetMode === 'short') return Math.max(60, s.shortBreakMinutes * 60);
    return Math.max(60, s.longBreakMinutes * 60);
  }, []);

  // Sincronizar duracion en reposo cuando el usuario cambia la configuracion de ciclos
  useEffect(() => {
    if (isRunning || activeRoute) return;
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
    mode,
  ]);

  const setMode = useCallback(
    (nextMode: TimerMode, customMinutes?: number) => {
      setIsRunning(false);
      setModeState(nextMode);
      const dur = getDurationForMode(nextMode, customMinutes);
      setTotalDurationSeconds(dur);
      setRemainingSeconds(dur);
      setElapsedSeconds(0);
    },
    [getDurationForMode]
  );

  const finishStudyBlockAndTransition = useCallback(
    (manualPageCompletion = false) => {
      const s = settingsRef.current;
      const routeCtx = activeRouteRef.current;
      const nextCycles = cyclesRef.current + 1;
      setCyclesCompleted(nextCycles);
      playStudyTone('success', s.audioEnabled);

      if (routeCtx?.step && routeCtx.step.type === 'study') {
        onStepCompletedRef.current?.(
          routeCtx.step.id,
          routeCtx.step.docId,
          routeCtx.step.endPage
        );
      }

      // Decidir si sigue descanso largo (cambio de documento o cada N bloques) o corto
      let nextBreakMode: TimerMode = 'short';
      let nextBreakMinutes = s.shortBreakMinutes;

      if (routeCtx?.nextStep && routeCtx.nextStep.type !== 'study') {
        nextBreakMode = routeCtx.nextStep.type === 'long_break' ? 'long' : 'short';
        nextBreakMinutes = routeCtx.nextStep.durationMinutes;
      } else if (
        s.longBreakEveryNBlocks > 0 &&
        nextCycles % s.longBreakEveryNBlocks === 0
      ) {
        nextBreakMode = 'long';
        nextBreakMinutes = s.longBreakMinutes;
      }

      setIsRunning(false);
      setModeState(nextBreakMode);
      const dur = Math.max(60, nextBreakMinutes * 60);
      setTotalDurationSeconds(dur);
      setRemainingSeconds(dur);
      setElapsedSeconds(0);

      onNotifyRef.current(
        manualPageCompletion
          ? `Bloque completado. Inicia tu ${nextBreakMode === 'long' ? 'descanso largo' : 'descanso corto'} (${nextBreakMinutes} min).`
          : `Sesión completada. Es hora de un ${nextBreakMode === 'long' ? 'descanso largo' : 'descanso corto'}.`,
        'success'
      );
    },
    []
  );

  const handleCountdownZero = useCallback(() => {
    const s = settingsRef.current;
    if (modeRef.current === 'study') {
      finishStudyBlockAndTransition(false);
    } else {
      playStudyTone('breakEnd', s.audioEnabled);
      setIsRunning(false);
      setModeState('study');
      const dur = Math.max(60, s.studyMinutes * 60);
      setTotalDurationSeconds(dur);
      setRemainingSeconds(dur);
      setElapsedSeconds(0);
      onNotifyRef.current('Descanso finalizado. Listo para el siguiente bloque.', 'info');
    }
  }, [finishStudyBlockAndTransition]);

  useEffect(() => {
    if (!isRunning) return;

    const isStopwatchMode =
      mode === 'study' && settings.intervalMode === 'pages';

    const interval = window.setInterval(() => {
      if (isStopwatchMode) {
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
  }, [isRunning, mode, settings.intervalMode, handleCountdownZero]);

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
    setElapsedSeconds(0);
    setRemainingSeconds(totalDurationSeconds);
    onNotifyRef.current('Temporizador reiniciado', 'info');
  }, [totalDurationSeconds]);

  const skipCycle = useCallback(() => {
    setIsRunning(false);
    if (mode === 'study') {
      setMode('short');
    } else {
      setMode('study');
    }
  }, [mode, setMode]);

  const startRouteStep = useCallback(
    (step: RouteStep, nextStep: RouteStep | null = null) => {
      setActiveRoute({ step, nextStep });
      setIsRunning(false);
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

  const completeCurrentBlock = useCallback(() => {
    if (mode === 'study') {
      finishStudyBlockAndTransition(true);
    } else {
      handleCountdownZero();
    }
  }, [mode, finishStudyBlockAndTransition, handleCountdownZero]);

  const value = useMemo<TimerContextValue>(
    () => ({
      mode,
      remainingSeconds,
      elapsedSeconds,
      totalDurationSeconds,
      isRunning,
      cyclesCompleted,
      totalPlannedBlocks,
      activeRouteStep: activeRoute?.step ?? null,
      activeNextStep: activeRoute?.nextStep ?? null,
      setMode,
      toggleTimer,
      resetTimer,
      skipCycle,
      setTotalPlannedBlocks,
      startRouteStep,
      completeCurrentBlock,
    }),
    [
      mode,
      remainingSeconds,
      elapsedSeconds,
      totalDurationSeconds,
      isRunning,
      cyclesCompleted,
      totalPlannedBlocks,
      activeRoute,
      setMode,
      toggleTimer,
      resetTimer,
      skipCycle,
      startRouteStep,
      completeCurrentBlock,
    ]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer debe usarse dentro de TimerProvider');
  return ctx;
}

