import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldAlert,
  Lock,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  AdminSystemSettings,
  DEFAULT_SYSTEM_SETTINGS,
  getAdminSystemSettings,
  updateAdminSystemSettings,
  formatBytes,
} from '../../lib/adminData';
import { appendAuditRecord } from '../../lib/adminAuth';

interface SystemSettingsViewProps {
  onSettingsChanged?: (newSettings: AdminSystemSettings) => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  onSettingsChanged,
}) => {
  const [settings, setSettings] = useState<AdminSystemSettings>(getAdminSystemSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setSettings(getAdminSystemSettings());
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateAdminSystemSettings(settings);
    setSettings(updated);
    setSavedSuccess(true);

    await appendAuditRecord(
      'SECURITY_CONFIG_CHANGED',
      `Configuración de gobernanza actualizada: Umbral Alerta=${updated.storageWarningPercent}%, Umbral Crítico=${updated.storageCriticalPercent}%, Auto-Bloqueo=${updated.autoLockTimeoutMinutes}min, Cuota Base=${formatBytes(updated.defaultNewUserQuotaBytes)}.`,
      'warning'
    );

    if (onSettingsChanged) {
      onSettingsChanged(updated);
    }

    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  const handleResetDefaults = async () => {
    if (confirm('¿Restablecer todos los umbrales y tiempos a sus valores predeterminados de fábrica?')) {
      const reset = updateAdminSystemSettings(DEFAULT_SYSTEM_SETTINGS);
      setSettings(reset);
      setSavedSuccess(true);

      await appendAuditRecord(
        'SECURITY_CONFIG_CHANGED',
        'Configuración de gobernanza restablecida a los valores predeterminados.',
        'info'
      );

      if (onSettingsChanged) {
        onSettingsChanged(reset);
      }

      setTimeout(() => {
        setSavedSuccess(false);
      }, 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Cabecera */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            Configuración de Gobernanza & Parámetros del Sistema
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Personaliza los umbrales de alerta de almacenamiento, reglas de auto-bloqueo y cuotas base.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Configuración aplicada con éxito</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Sección 1: Umbrales de Almacenamiento */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Límites y Alertas de Almacenamiento</h3>
              <p className="text-xs text-slate-400">
                Define el comportamiento reactivo de la interfaz cuando un estudiante agota su espacio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Umbral Preventivo */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Umbral Preventivo (Warning)</span>
                </label>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {settings.storageWarningPercent}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={95}
                step={5}
                value={settings.storageWarningPercent}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    storageWarningPercent: Number(e.target.value),
                    // Asegurar que el umbral crítico no sea menor que el preventivo
                    storageCriticalPercent: Math.max(prev.storageCriticalPercent, Number(e.target.value) + 5),
                  }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Al superar este porcentaje, la barra de almacenamiento se tiñe de amarillo preventivo en el directorio de usuarios y métricas.
              </p>
            </div>

            {/* Umbral Crítico y Bloqueo */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Umbral Crítico & Auto-Bloqueo</span>
                </label>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {settings.storageCriticalPercent}%
                </span>
              </div>
              <input
                type="range"
                min={75}
                max={100}
                step={5}
                value={settings.storageCriticalPercent}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    storageCriticalPercent: Number(e.target.value),
                    storageWarningPercent: Math.min(prev.storageWarningPercent, Number(e.target.value) - 5),
                  }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Al alcanzar este límite, el usuario se marca en rojo crítico y se activa la bandera de bloqueo de subida para prevenir saturación de base de datos.
              </p>
            </div>
          </div>

          {/* Visualizador interactivo de ejemplo */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Simulación visual de la escala de estados según tus valores actuales:</span>
            </span>
            <div className="relative h-6 w-full bg-slate-900 rounded-lg overflow-hidden flex border border-slate-800">
              <div
                style={{ width: `${settings.storageWarningPercent}%` }}
                className="bg-emerald-500/30 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-300 border-r border-emerald-500/50"
              >
                Normal (0% - {settings.storageWarningPercent}%)
              </div>
              <div
                style={{ width: `${settings.storageCriticalPercent - settings.storageWarningPercent}%` }}
                className="bg-amber-500/30 flex items-center justify-center text-[10px] font-mono font-bold text-amber-300 border-r border-amber-500/50"
              >
                Alerta ({settings.storageWarningPercent}% - {settings.storageCriticalPercent}%)
              </div>
              <div
                style={{ width: `${100 - settings.storageCriticalPercent}%` }}
                className="bg-rose-500/40 flex items-center justify-center text-[10px] font-mono font-bold text-rose-300"
              >
                Crítico / Bloqueo ({settings.storageCriticalPercent}% - 100%)
              </div>
            </div>
          </div>
        </div>

        {/* Sección 2: Seguridad de la Consola y Auto-Bloqueo */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Seguridad de la Consola Root & Auto-Bloqueo</h3>
              <p className="text-xs text-slate-400">
                Controla el tiempo de cierre de sesión o bloqueo de pantalla por inactividad del operador.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-200">
                Tiempo de Inactividad para Bloquear Pantalla
              </label>
              <select
                value={settings.autoLockTimeoutMinutes}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    autoLockTimeoutMinutes: Number(e.target.value),
                  }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={5}>5 minutos (Seguridad Alta · Auditoría estricta)</option>
                <option value={10}>10 minutos</option>
                <option value={15}>15 minutos (Recomendado estándar)</option>
                <option value={30}>30 minutos</option>
                <option value={60}>60 minutos (1 hora)</option>
                <option value={0}>Desactivado (No bloquear automáticamente)</option>
              </select>
              <p className="text-[11px] text-slate-400">
                Al cumplirse el lapso sin movimientos de cursor ni teclado, la consola se bloquea exigiendo la contraseña maestra.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-200">
                Cuota Predeterminada para Nuevas Cuentas
              </label>
              <select
                value={settings.defaultNewUserQuotaBytes}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    defaultNewUserQuotaBytes: Number(e.target.value),
                  }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={524288000}>500 MB (Plan básico)</option>
                <option value={1073741824}>1 GB (Plan Estándar para Estudiantes)</option>
                <option value={2147483648}>2 GB (Plan Avanzado)</option>
                <option value={5368709120}>5 GB (Plan Investigador / Tesista)</option>
                <option value={10737418240}>10 GB (Plan Docente Máximo)</option>
              </select>
              <p className="text-[11px] text-slate-400">
                Espacio máximo en bytes asignado por defecto cuando un nuevo perfil se registra en la base de datos Supabase.
              </p>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Valores de Fábrica</span>
          </button>

          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración de Gobernanza</span>
          </button>
        </div>
      </form>
    </div>
  );
};
