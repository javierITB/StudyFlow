import React, { useRef, useState } from 'react';
import {
  Cloud,
  Download,
  HardDrive,
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

interface AccountModalProps {
  open: boolean;
  user: UserProfile | null;
  syncStatus: 'local' | 'synced' | 'syncing' | 'error';
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<void>;
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
  onSignOut,
  onSyncNow,
  onExportBackup,
  onImportBackup,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        await onSignIn(email.trim(), password);
      } else {
        await onSignUp(email.trim(), password, fullName.trim());
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
              Supabase y agrega <code className="text-indigo-300">VITE_SUPABASE_URL</code>{' '}
              y <code className="text-indigo-300">VITE_SUPABASE_PUBLISHABLE_KEY</code> (o{' '}
              <code className="text-indigo-300">VITE_SUPABASE_ANON_KEY</code>) en tus
              variables de entorno.
            </p>
          </div>
        ) : user ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{user.fullName || 'Estudiante'}</p>
                <p className="text-slate-400">{user.email}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                {syncStatus === 'syncing'
                  ? 'Sincronizando...'
                  : syncStatus === 'error'
                    ? 'Error de sync'
                    : 'Sincronizado'}
              </span>
            </div>
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
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="estudiante@universidad.cl"
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
              disabled={isSubmitting}
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

