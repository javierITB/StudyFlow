import React, { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  HardDrive,
  LogIn,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  X,
  ShieldCheck,
} from 'lucide-react';

interface AuthWelcomeModalProps {
  open: boolean;
  onOpenSignIn: () => void;
  onDismiss: () => void;
}

type AnimationPhase = 'modal' | 'compressing' | 'tooltip';

export const AuthWelcomeModal: React.FC<AuthWelcomeModalProps> = ({
  open,
  onOpenSignIn,
  onDismiss,
}) => {
  const [phase, setPhase] = useState<AnimationPhase>('modal');
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [flyStyle, setFlyStyle] = useState<React.CSSProperties>({});
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Reset phase when opened
  useEffect(() => {
    if (open) {
      setPhase('modal');
      setFlyStyle({});
    }
  }, [open]);

  // Keep target button position updated for tooltip positioning
  useEffect(() => {
    if (!open) return;
    const updateTarget = () => {
      const el = document.getElementById('nav-account-button');
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };
    updateTarget();
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    return () => {
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [open]);

  if (!open) return null;

  const handleStartSignIn = () => {
    onDismiss();
    onOpenSignIn();
  };

  const handleContinueLocal = () => {
    const cardEl = cardRef.current;
    const targetEl = document.getElementById('nav-account-button');

    if (!cardEl || !targetEl) {
      // Fallback if elements not found
      setPhase('tooltip');
      return;
    }

    const cardBox = cardEl.getBoundingClientRect();
    const targetBox = targetEl.getBoundingClientRect();
    setTargetRect(targetBox);

    const cardCenterX = cardBox.left + cardBox.width / 2;
    const cardCenterY = cardBox.top + cardBox.height / 2;
    const targetCenterX = targetBox.left + targetBox.width / 2;
    const targetCenterY = targetBox.top + targetBox.height / 2;

    const deltaX = targetCenterX - cardCenterX;
    const deltaY = targetCenterY - cardCenterY;

    // Check for prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setPhase('tooltip');
      return;
    }

    // Trigger flight animation
    setPhase('compressing');
    setFlyStyle({
      transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.08)`,
      opacity: 0.15,
      filter: 'blur(2px)',
      borderRadius: '9999px',
      transition:
        'transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 650ms ease-in-out, filter 650ms ease-in-out, border-radius 700ms ease',
      pointerEvents: 'none',
    });

    window.setTimeout(() => {
      setPhase('tooltip');
    }, 720);
  };

  const handleFinishTooltip = () => {
    onDismiss();
  };

  return (
    <>
      {/* PHASE 1 & 2: MODAL AND COMPRESSING ANIMATION */}
      {phase !== 'tooltip' && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 transition-colors duration-500 ${
            phase === 'compressing'
              ? 'bg-slate-950/0 pointer-events-none'
              : 'bg-slate-950/80 backdrop-blur-sm'
          }`}
        >
          <div
            ref={cardRef}
            style={flyStyle}
            className="relative bg-slate-900 border border-indigo-500/30 rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl shadow-indigo-950/50 space-y-5 text-slate-100 will-change-transform"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    ¡Bienvenido a StudyFlow!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Tu espacio inteligente para estudiar sin distracciones
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinueLocal}
                title="Continuar en modo local"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Value comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option A: Supabase Cloud Account */}
              <div className="p-4 rounded-xl bg-gradient-to-b from-indigo-950/50 to-slate-900 border border-indigo-500/40 hover:border-indigo-400/70 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
                    <Cloud className="w-4 h-4 text-cyan-400" />
                    <span>Conectar Cuenta</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium ml-auto">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sincroniza tus lecturas, rutas, notas y pomodoro entre tu PC, iPad y celular en la nube.
                  </p>
                  <ul className="text-[11px] text-slate-400 space-y-1 pt-1">
                    <li className="flex items-center gap-1.5 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>Respaldo continuo en Supabase</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>Estudia desde cualquier dispositivo</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleStartSignIn}
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Iniciar sesión o Crear cuenta</span>
                </button>
              </div>

              {/* Option B: Local Mode */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                    <HardDrive className="w-4 h-4 text-indigo-400" />
                    <span>Modo Local</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium ml-auto">
                      Sin registro
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Comienza al instante sin cuenta ni correos. Tus datos se guardan en el navegador de este dispositivo.
                  </p>
                  <ul className="text-[11px] text-slate-400 space-y-1 pt-1">
                    <li className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span>Privado y 100% offline (IndexedDB)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span>Podrás iniciar sesión más adelante</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleContinueLocal}
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all group"
                >
                  <span>Continuar en modo local</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-slate-400" />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-center text-slate-500 pt-1">
              Puedes cambiar a cuenta sincronizada o exportar tus respaldos en cualquier momento.
            </p>
          </div>
        </div>
      )}

      {/* PHASE 3: TUTORIAL COACHMARK POINTING TO NAVBAR ACCOUNT BUTTON */}
      {phase === 'tooltip' && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Spotlight highlight over the button in header */}
          {targetRect && (
            <div
              style={{
                top: Math.max(0, targetRect.top - 4),
                left: Math.max(0, targetRect.left - 4),
                width: targetRect.width + 8,
                height: targetRect.height + 8,
              }}
              className="absolute rounded-xl ring-4 ring-indigo-400 ring-offset-2 ring-offset-slate-950 animate-pulse pointer-events-none transition-all duration-300"
            />
          )}

          {/* Floating Tutorial Popover */}
          <div
            style={{
              top: targetRect ? targetRect.bottom + 12 : 56,
              right: targetRect
                ? Math.max(12, window.innerWidth - targetRect.right - 10)
                : 16,
            }}
            className="absolute pointer-events-auto max-w-xs sm:max-w-sm w-[92vw] sm:w-auto bg-slate-900 border-2 border-indigo-400/90 rounded-2xl p-4 shadow-2xl shadow-indigo-950/80 text-slate-100 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Arrow caret pointing to target button */}
            <div className="absolute -top-2.5 right-6 w-5 h-5 bg-slate-900 border-t-2 border-l-2 border-indigo-400/90 rotate-45" />

            <div className="relative space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <HardDrive className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Modo Local Activado
                </span>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-white">
                  Por aquí podrás iniciar sesión más adelante
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tus documentos, notas y pomodoros se guardan en este navegador. Cuando quieras sincronizar entre tu computador, iPad o teléfono, solo haz clic aquí en <strong>Local / Cuenta</strong>.
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleStartSignIn}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                >
                  Iniciar sesión ahora
                </button>

                <button
                  type="button"
                  onClick={handleFinishTooltip}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
                >
                  <span>¡Entendido!</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

