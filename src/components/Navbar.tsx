import React from 'react';
import {
  BookOpen,
  Clock,
  Cloud,
  FileText,
  HardDrive,
  HelpCircle,
  LayoutGrid,
  Palette,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { StudySettings, UserProfile } from '../types/studyflow';

export type AppModule = 'docs' | 'pomodoro' | 'board';

interface NavbarProps {
  currentModule: AppModule;
  onSwitchModule: (mod: AppModule) => void;
  settings: StudySettings;
  onToggleAudio: () => void;
  user: UserProfile | null;
  syncStatus: 'local' | 'synced' | 'syncing' | 'error';
  onOpenAccountModal: () => void;
  onOpenAppearanceModal: () => void;
  onOpenTutorial: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentModule,
  onSwitchModule,
  settings,
  onToggleAudio,
  user,
  syncStatus,
  onOpenAccountModal,
  onOpenAppearanceModal,
  onOpenTutorial,
}) => {
  const { mode, remainingSeconds, elapsedSeconds, isRunning, toggleTimer } = useTimer();

  const isPageStopwatch = mode === 'study' && settings.intervalMode === 'pages';
  const displaySec = isPageStopwatch ? elapsedSeconds : remainingSeconds;
  const mins = Math.floor(displaySec / 60);
  const secs = displaySec % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const tabs: Array<{
    id: AppModule;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'docs',
      label: 'Material y Visor',
      shortLabel: 'Visor',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'pomodoro',
      label: 'Pomodoro y Ruta',
      shortLabel: 'Pomodoro',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: 'board',
      label: 'Pizarra y Exportación',
      shortLabel: 'Pizarra',
      icon: <LayoutGrid className="w-4 h-4" />,
    },
  ];

  return (
    <header className="min-h-[3.5rem] py-1.5 sf-header-chrome backdrop-blur flex items-center justify-between px-2.5 sm:px-4 gap-2 z-40 select-none flex-shrink-0">
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 flex-shrink-0">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2 truncate">
          <span>StudyFlow</span>
          <span className="hidden xl:inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            2.0
          </span>
        </h1>
      </div>

      <nav
        data-tour-id="tour-nav-tabs"
        className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-950/75 p-1 rounded-xl border border-indigo-500/20"
      >
        {tabs.map((tab) => {
          const active = currentModule === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSwitchModule(tab.id)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 sm:gap-2 transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline lg:hidden">{tab.shortLabel}</span>
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs flex-shrink-0">
        <button
          type="button"
          onClick={toggleTimer}
          title={isRunning ? 'Pausar temporizador' : 'Iniciar temporizador'}
          className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/35 text-slate-200 transition-colors"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-indigo-400 animate-pulse' : 'bg-indigo-500'
            }`}
          />
          <span className="font-mono font-semibold">{formattedTime}</span>
          {isRunning ? (
            <Pause className="w-3 h-3 text-indigo-300" />
          ) : (
            <Play className="w-3 h-3 text-indigo-300" />
          )}
        </button>

        <button
          type="button"
          onClick={onOpenTutorial}
          title="Tutorial rápido de StudyFlow"
          aria-label="Tutorial rápido de StudyFlow"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-500/20 border border-slate-700 hover:border-indigo-400/50 text-slate-200 transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span className="hidden xl:inline text-xs font-medium">Guía</span>
        </button>

        <button
          type="button"
          onClick={onOpenAppearanceModal}
          title="Personalizar tema, colores y tipografía"
          aria-label="Personalizar tema, colores y tipografía"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-200 transition-colors"
        >
          <Palette className="w-4 h-4 text-indigo-400" />
          <span className="hidden lg:inline text-xs font-medium">Tema</span>
          <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
        </button>

        <button
          type="button"
          onClick={onOpenAccountModal}
          title="Cuenta, sincronización y respaldo"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
        >
          {user ? (
            <>
              <Cloud
                className={`w-3.5 h-3.5 ${
                  syncStatus === 'error'
                    ? 'text-rose-400'
                    : syncStatus === 'syncing'
                      ? 'text-amber-400 animate-pulse'
                      : 'text-emerald-400'
                }`}
              />
              <span className="hidden lg:inline max-w-[120px] truncate text-[11px]">
                {user.fullName || user.email}
              </span>
            </>
          ) : (
            <>
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline text-[11px]">Local / Cuenta</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleAudio}
          title={settings.audioEnabled ? 'Silenciar alertas' : 'Activar alertas sonoras'}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
        >
          {settings.audioEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>
    </header>
  );
};

