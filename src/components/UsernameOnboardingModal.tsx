import React, { useEffect, useState } from 'react';
import { AtSign, Check, Loader2, Sparkles, X } from 'lucide-react';
import {
  checkUsernameAvailable,
  validateUsernameFormat,
} from '../lib/collaboration';
import { formatErrorMessageEs } from '../lib/errorMessages';

interface UsernameOnboardingModalProps {
  open: boolean;
  fullName: string;
  onSaveUsername: (username: string) => Promise<void>;
  onDismiss?: () => void;
}

export const UsernameOnboardingModal: React.FC<UsernameOnboardingModalProps> = ({
  open,
  fullName,
  onSaveUsername,
  onDismiss,
}) => {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!username.trim()) {
      setStatus('idle');
      setFeedback('');
      return;
    }
    const validation = validateUsernameFormat(username);
    if (!validation.valid) {
      setStatus('invalid');
      setFeedback(validation.error || 'Formato inválido');
      return;
    }
    let cancelled = false;
    setStatus('checking');
    setFeedback('Verificando disponibilidad...');
    const t = window.setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(validation.normalized);
        if (cancelled) return;
        if (available) {
          setStatus('available');
          setFeedback(`@${validation.normalized} disponible`);
        } else {
          setStatus('taken');
          setFeedback(`@${validation.normalized} ya está en uso`);
        }
      } catch {
        if (!cancelled) {
          setStatus('idle');
          setFeedback('');
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, username]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const validation = validateUsernameFormat(username);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Nombre de usuario inválido');
      return;
    }
    setSaving(true);
    try {
      await onSaveUsername(validation.normalized);
    } catch (err) {
      setErrorMsg(
        formatErrorMessageEs(err, 'No se pudo registrar tu nombre de usuario')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Elige tu @usuario único
              </h3>
              <p className="text-xs text-slate-400">
                Hola {fullName || 'estudiante'}, define tu identificador para agregar amigos y compartir apuntes.
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              title="Definir más adelante"
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Nombre de usuario único
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej: vicho_udp"
                autoCapitalize="none"
                autoCorrect="off"
                autoFocus
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            {feedback ? (
              <p
                className={`mt-1.5 text-[11px] ${
                  status === 'available'
                    ? 'text-emerald-400'
                    : status === 'taken' || status === 'invalid'
                      ? 'text-rose-400'
                      : 'text-slate-400'
                }`}
              >
                {feedback}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-500">
                3 a 24 caracteres usando minúsculas (a-z), números o guión bajo (_).
              </p>
            )}
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={
              saving ||
              status === 'taken' ||
              status === 'invalid' ||
              status === 'checking'
            }
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>{saving ? 'Guardando...' : 'Confirmar mi @usuario'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

