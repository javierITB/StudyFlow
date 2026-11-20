import React, { useState } from 'react';
import { Lock, ShieldAlert, Fingerprint, LogOut } from 'lucide-react';
import { DEFAULT_MASTER_PIN } from '../../lib/adminAuth';

interface AdminLockScreenProps {
  onUnlock: () => void;
  onLogout: () => void;
}

export const AdminLockScreen: React.FC<AdminLockScreenProps> = ({ onUnlock, onLogout }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === DEFAULT_MASTER_PIN) {
      setError(null);
      setPin('');
      onUnlock();
    } else {
      setError('PIN Maestro inválido');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 animate-bounce" />
        </div>
        <h2 className="text-lg font-bold text-white">Consola Administrativa Bloqueada</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          Sesión protegida por inactividad. Ingresa tu PIN de 6 dígitos para reanudar.
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full py-2.5 px-4 text-center text-xl font-mono tracking-[0.5em] bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Fingerprint className="w-4 h-4" />
            <span>Desbloquear Consola</span>
          </button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          className="mt-4 text-xs text-slate-400 hover:text-rose-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión Root</span>
        </button>
      </div>
    </div>
  );
};
