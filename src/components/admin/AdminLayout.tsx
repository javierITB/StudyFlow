import React from 'react';
import {
  ShieldCheck,
  HardDrive,
  Users,
  MessageSquare,
  LayoutTemplate,
  History,
  Lock,
  LogOut,
  ExternalLink,
  ChevronRight,
  Cpu,
  Sliders,
} from 'lucide-react';
import { AdminSession } from '../../lib/adminAuth';

export type AdminTab = 'metrics' | 'users' | 'suggestions' | 'templates' | 'audit' | 'settings';

interface AdminLayoutProps {
  session: AdminSession;
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onLockConsole: () => void;
  onLogout: () => void;
  inactivityRemainingSeconds: number;
  pendingSuggestionsCount: number;
  underReviewTemplatesCount: number;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  session,
  currentTab,
  onSelectTab,
  onLockConsole,
  onLogout,
  inactivityRemainingSeconds,
  pendingSuggestionsCount,
  underReviewTemplatesCount,
  children,
}) => {
  const isAutoLockDisabled = inactivityRemainingSeconds <= 0;
  const lockMinutes = Math.floor(inactivityRemainingSeconds / 60);
  const lockSeconds = inactivityRemainingSeconds % 60;
  const lockTimeFormatted = isAutoLockDisabled ? 'Desactivado' : `${lockMinutes}:${lockSeconds.toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* 1. Topbar Ejecutiva y de Seguridad Criptográfica */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">StudyFlowConnect</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ROOT ADMIN
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Consola Central de Gobernanza, Cuotas y Auditoría</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800 text-[11px] font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              NODO LOCAL [127.0.0.1:5180]
            </span>
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
              <Cpu className="w-3 h-3 text-indigo-400" />
              HMAC-SHA256 VERIFICADO
            </span>
          </div>
        </div>

        {/* Acciones de la derecha: temporizador de inactividad, bloqueo y salida */}
        <div className="flex items-center gap-3">
          {/* Temporizador de auto-bloqueo */}
          <div
            title="Tiempo restante antes del bloqueo automático por inactividad"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400"
          >
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Auto-bloqueo: {lockTimeFormatted}</span>
          </div>

          {/* Botón Bloquear Consola */}
          <button
            onClick={onLockConsole}
            title="Bloquear pantalla de la consola ahora"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700/60 transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Bloquear</span>
          </button>

          {/* Enlace a App Principal */}
          <a
            href="/"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors flex items-center gap-1.5 text-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Ir a StudyFlow</span>
          </a>

          {/* Botón Salir */}
          <button
            onClick={onLogout}
            title="Cerrar sesión administrativa"
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* 2. Cuerpo Principal con Barra Lateral de Navegación */}
      <div className="flex-1 flex overflow-hidden">
        {/* Barra Lateral */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col justify-between p-4 shrink-0 hidden md:flex">
          <nav className="space-y-1.5">
            <button
              onClick={() => onSelectTab('metrics')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'metrics'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4" />
                <span>Métricas & Almacenamiento</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => onSelectTab('users')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'users'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Gestión de Usuarios</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => onSelectTab('suggestions')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'suggestions'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4" />
                <span>Buzón de Sugerencias</span>
              </div>
              {pendingSuggestionsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                  {pendingSuggestionsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('templates')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'templates'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutTemplate className="w-4 h-4" />
                <span>Plantillas Comunitarias</span>
              </div>
              {underReviewTemplatesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                  {underReviewTemplatesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('audit')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4" />
                <span>Registro de Auditoría</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => onSelectTab('settings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4" />
                <span>Configuración & Umbrales</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          </nav>

          {/* Tarjeta de Información de Sesión */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{session.username}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">Rol: {session.role}</div>
            <div className="text-[10px] text-slate-400 font-mono">ID: {session.adminId}</div>
          </div>
        </aside>

        {/* Contenido Dinámico de la Pestaña */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
