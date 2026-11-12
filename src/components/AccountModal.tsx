import React, { useEffect, useRef, useState } from 'react';
import {
  AtSign,
  Check,
  Cloud,
  Download,
  Edit3,
  HardDrive,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { UserProfile } from '../types/studyflow';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { formatErrorMessageEs } from '../lib/errorMessages';
import {
  checkUsernameAvailable,
  normalizeUsername,
  validateUsernameFormat,
} from '../lib/collaboration';

interface AccountModalProps {
  open: boolean;
  user: UserProfile | null;
  syncStatus: 'local' | 'synced' | 'syncing' | 'error';
  onClose: () => void;
  onSignIn: (identifier: string, password: string) => Promise<void>;
  onSignUp: (
    email: string,
    password: string,
    fullName: string,
    username: string
  ) => Promise<void>;
  onUpdateUsername: (username: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncNow: () => Promise<void>;
  onExportBackup: () => void;
  onImportBackup: (file: File) => Promise<void>;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  open,
  user,
  syncStatus,
  onClose,
  onSignIn,
  onSignUp,
  onUpdateUsername,
  onSignOut,
  onSyncNow,
  onExportBackup,
  onImportBackup,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [usernameFeedback, setUsernameFeedback] = useState<string>('');

  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setEditingUsername(false);
      setErrorMsg(null);
      return;
    }
    if (user?.username) {
      setNewUsername(user.username);
    }
  }, [open, user?.username]);

  // Validación en vivo de @username en registro o edición
  const targetUsernameToCheck = editingUsername ? newUsername : usernameInput;
  const shouldCheckUsername =
    open &&
    isSupabaseConfigured &&
    ((authMode === 'register' && !user) || (Boolean(user) && editingUsername));

  useEffect(() => {
    if (!shouldCheckUsername) {
      setUsernameStatus('idle');
      setUsernameFeedback('');
      return;
    }

    const raw = targetUsernameToCheck;
    if (!raw.trim()) {
      setUsernameStatus('idle');
      setUsernameFeedback('');
      return;
    }

    const validation = validateUsernameFormat(raw);
    if (!validation.valid) {
      setUsernameStatus('invalid');
      setUsernameFeedback(validation.error || 'Formato inválido');
      return;
    }

    if (editingUsername && user?.username === validation.normalized) {
      setUsernameStatus('available');
      setUsernameFeedback('Es tu @usuario actual.');
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');
    setUsernameFeedback('Verificando disponibilidad...');

    const timer = window.setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(validation.normalized);
        if (cancelled) return;
        if (available) {
          setUsernameStatus('available');
          setUsernameFeedback(`@${validation.normalized} disponible`);
        } else {
          setUsernameStatus('taken');
          setUsernameFeedback(`@${validation.normalized} ya está en uso`);
        }
      } catch {
        if (!cancelled) {
          setUsernameStatus('idle');
          setUsernameFeedback('');
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [shouldCheckUsername, targetUsernameToCheck, editingUsername, user?.username]);

  if (!open) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (authMode === 'register') {
      const check = validateUsernameFormat(usernameInput);
      if (!check.valid) {
        setErrorMsg(check.error || 'Nombre de usuario inválido');
        return;
      }
      if (usernameStatus === 'taken') {
        setErrorMsg(`El nombre de usuario @${check.normalized} ya está en uso.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        await onSignIn(identifier.trim(), password);
      } else {
        const cleanUser = normalizeUsername(usernameInput);
        await onSignUp(identifier.trim(), password, fullName.trim(), cleanUser);
      }
      onClose();
    } catch (err) {
      setErrorMsg(
        formatErrorMessageEs(err, 'Error al autenticar con Supabase')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const check = validateUsernameFormat(newUsername);
    if (!check.valid) {
      setErrorMsg(check.error || 'Nombre de usuario inválido');
      return;
    }
    setIsUpdatingUsername(true);
    try {
      await onUpdateUsername(check.normalized);
      setEditingUsername(false);
    } catch (err) {
      setErrorMsg(
        formatErrorMessageEs(err, 'No se pudo actualizar el nombre de usuario')
      );
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {user ? (
              <Cloud className="w-5 h-5 text-emerald-400" />
            ) : (
              <HardDrive className="w-5 h-5 text-indigo-400" />
            )}
            <div>
              <h3 className="text-sm font-bold text-white">
                Cuenta de Estudiante y Sincronización
              </h3>
              <p className="text-[11px] text-slate-400">
                {isSupabaseConfigured
                  ? 'Supabase conectado para múltiples estudiantes'
                  : 'Modo local activo (IndexedDB)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Estado de Supabase */}
        {!isSupabaseConfigured ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-amber-300">
              Variables de Supabase no configuradas aún
            </div>
            <p className="text-slate-300 leading-relaxed">
              Actualmente tus carpetas, archivos, notas, método de estudio y ruta se
              guardan localmente en tu navegador (IndexedDB).
            </p>
            <p className="text-slate-400 leading-relaxed">
              Para activar cuentas multi-estudiante en Vercel, ejecuta{' '}
              <code className="text-indigo-300">supabase/schema.sql</code> en tu proyecto
              Supabase y agrega <code className="text-indigo-300">SUPABASE_URL</code>{' '}
              y <code className="text-indigo-300">SUPABASE_PUBLISHABLE_KEY</code> (o{' '}
              <code className="text-indigo-300">SUPABASE_ANON_KEY</code>) en tus
              variables de entorno.
            </p>
          </div>
        ) : user ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="font-semibold text-white text-sm">
                  {user.fullName || 'Estudiante'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {user.username ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/35 text-indigo-300 font-mono text-[11px]">
                      @{user.username}
                    </span>
                  ) : (
                    <span className="text-amber-300 text-[11px]">
                      Sin @usuario asignado
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setNewUsername(user.username || '');
                      setEditingUsername((v) => !v);
                      setErrorMsg(null);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{editingUsername ? 'Cancelar' : 'Cambiar @usuario'}</span>
                  </button>
                </div>
                <p className="text-slate-400">{user.email}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex-shrink-0">
                {syncStatus === 'syncing'
                  ? 'Sincronizando...'
                  : syncStatus === 'error'
                    ? 'Error de sync'
                    : 'Sincronizado'}
              </span>
            </div>

            {editingUsername && (
              <form
                onSubmit={handleSaveUsername}
                className="pt-2 border-t border-slate-800 space-y-2"
              >
                <label className="block text-slate-300 font-medium">
                  Nuevo nombre de usuario único
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <AtSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="tu_usuario"
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={
                      isUpdatingUsername ||
                      usernameStatus === 'taken' ||
                      usernameStatus === 'invalid' ||
                      usernameStatus === 'checking'
                    }
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 flex items-center gap-1"
                  >
                    {isUpdatingUsername ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Guardar</span>
                  </button>
                </div>
                {usernameFeedback && (
                  <p
                    className={`text-[11px] ${
                      usernameStatus === 'available'
                        ? 'text-emerald-400'
                        : usernameStatus === 'taken' || usernameStatus === 'invalid'
                          ? 'text-rose-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {usernameFeedback}
                  </p>
                )}
              </form>
            )}

            {errorMsg && (
              <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => void onSyncNow()}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sincronizar ahora
              </button>
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="py-2 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 font-medium flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMsg(null);
                }}
                className={`py-1.5 rounded-lg font-semibold ${
                  authMode === 'login'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMsg(null);
                }}
                className={`py-1.5 rounded-lg font-semibold ${
                  authMode === 'register'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Crear Cuenta
              </button>
            </div>

            {authMode === 'register' && (
              <>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Nombre de usuario único (@usuario)
                  </label>
                  <div className="relative">
                    <AtSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="ej: vicho_udp"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  {usernameFeedback ? (
                    <p
                      className={`mt-1 text-[11px] ${
                        usernameStatus === 'available'
                          ? 'text-emerald-400'
                          : usernameStatus === 'taken' || usernameStatus === 'invalid'
                            ? 'text-rose-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {usernameFeedback}
                    </p>
                  ) : (
                    <p className="mt-1 text-[10px] text-slate-500">
                      3 a 24 caracteres: minúsculas, números o guión bajo (_).
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                {authMode === 'login'
                  ? 'Correo electrónico o @usuario'
                  : 'Correo electrónico'}
              </label>
              <input
                type={authMode === 'login' ? 'text' : 'email'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  authMode === 'login'
                    ? 'estudiante@universidad.cl o @vicho_udp'
                    : 'estudiante@universidad.cl'
                }
                autoCapitalize="none"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Contraseña</label>
              <input
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                (authMode === 'register' &&
                  (usernameStatus === 'taken' ||
                    usernameStatus === 'invalid' ||
                    usernameStatus === 'checking'))
              }
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authMode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? 'Ingresando...' : 'Entrar a mi cuenta'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Registrando...' : 'Registrar estudiante'}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Respaldo local JSON */}
        <div className="pt-3 border-t border-slate-800 space-y-2.5 text-xs">
          <div className="font-semibold text-slate-300">
            Respaldo portátil (Carpetas, Notas, Tareas y Método)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onExportBackup}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON</span>
            </button>
            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar JSON</span>
            </button>
            <input
              ref={backupInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImportBackup(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
