import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  User,
  Fingerprint,
  AlertTriangle,
  Eye,
  EyeOff,
  Terminal,
  Cpu,
} from 'lucide-react';
import {
  authenticateMasterAdmin,
  getRateLimitState,
  MASTER_ADMIN_USERNAME,
  DEFAULT_MASTER_PASSWORD,
  DEFAULT_MASTER_PIN,
  AdminSession,
} from '../../lib/adminAuth';

interface AdminLoginProps {
  onAuthenticated: (session: AdminSession) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onAuthenticated }) => {
  const [username, setUsername] = useState(MASTER_ADMIN_USERNAME);
  const [passphrase, setPassphrase] = useState('');
  const [pin, setPin] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingCooldown, setRemainingCooldown] = useState<number>(0);

  // Comprobar estado de limitador de tasa
  useEffect(() => {
    const checkRateLimit = () => {
      const state = getRateLimitState();
      if (state.lockedUntil && Date.now() < state.lockedUntil) {
        setRemainingCooldown(Math.ceil((state.lockedUntil - Date.now()) / 1000));
      } else {
        setRemainingCooldown(0);
      }
    };
    checkRateLimit();
    const interval = setInterval(checkRateLimit, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (remainingCooldown > 0) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const result = await authenticateMasterAdmin(username, passphrase, pin);
      if (result.success && result.session) {
        onAuthenticated(result.session);
      } else {
        setErrorMsg(result.error || 'Autenticación denegada por el núcleo de seguridad.');
        const state = getRateLimitState();
        if (state.lockedUntil) {
          setRemainingCooldown(Math.ceil((state.lockedUntil - Date.now()) / 1000));
        }
      }
    } catch {
      setErrorMsg('Error criptográfico al evaluar credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const fillDefaultCredentials = () => {
    setUsername(MASTER_ADMIN_USERNAME);
    setPassphrase(DEFAULT_MASTER_PASSWORD);
    setPin(DEFAULT_MASTER_PIN);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      {/* Fondo con rejilla y resplandor cian/índigo */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b15_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-8 relative z-10">
        {/* Cabecera del Portal */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 mb-4 shadow-inner ring-8 ring-indigo-500/5">
            <ShieldCheck className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            StudyFlowConnect
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              ROOT
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Consola Administrativa Master & Gobernanza Local</p>

          <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Nodo Local Protegido • Host 127.0.0.1
          </div>
        </div>

        {/* Alerta de bloqueo por fuerza bruta */}
        {remainingCooldown > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Consola Temporalmente Bloqueada</p>
              <p className="mt-1 text-slate-300">
                Se detectaron múltiples intentos erróneos. Espera{' '}
                <span className="font-mono font-bold text-rose-400">{remainingCooldown}s</span> antes de intentar
                nuevamente.
              </p>
            </div>
          </div>
        )}

        {/* Mensaje de Error */}
        {errorMsg && remainingCooldown === 0 && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Identificador Master (Usuario Root)
              </span>
              <span className="text-[10px] font-mono text-slate-500">vicho.root</span>
            </label>
            <input
              type="text"
              required
              disabled={remainingCooldown > 0}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition-colors disabled:opacity-50"
              placeholder="vicho.root"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                Contraseña Criptográfica Maestra
              </span>
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="text-[11px] text-slate-400 hover:text-indigo-300 inline-flex items-center gap-1"
              >
                {showPassphrase ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPassphrase ? 'Ocultar' : 'Mostrar'}
              </button>
            </label>
            <div className="relative">
              <input
                type={showPassphrase ? 'text' : 'password'}
                required
                disabled={remainingCooldown > 0}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition-colors disabled:opacity-50 pr-10"
                placeholder="••••••••••••••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                PIN Maestro de 6 Dígitos (2FA Físico)
              </span>
              <span className="text-[10px] font-mono text-cyan-400/80">6 DÍGITOS</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              disabled={remainingCooldown > 0}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-center text-lg tracking-[0.5em] font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
              placeholder="••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || remainingCooldown > 0}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Cpu className="w-4 h-4 animate-spin" />
                <span>Verificando Firma HMAC-SHA256...</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4" />
                <span>Acceder a la Consola Root</span>
              </>
            )}
          </button>
        </form>

        {/* Atajo Rápido para Entorno Local de Desarrollo */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <button
            type="button"
            onClick={fillDefaultCredentials}
            className="w-full py-2 px-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Autocompletar Credenciales de Desarrollo Local</span>
          </button>
          <p className="text-[10px] text-center text-slate-500 mt-2 font-mono">
            vicho.root • StudyFlowAdmin2026!#Master • PIN 749201
          </p>
        </div>

        {/* Enlace de regreso a la aplicación principal */}
        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-xs text-slate-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
          >
            ← Volver a StudyFlowConnect Principal
          </a>
        </div>
      </div>
    </div>
  );
};
