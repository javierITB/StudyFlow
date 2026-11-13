import React, { useState } from 'react';
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  FileText,
  HardDrive,
  HelpCircle,
  LayoutGrid,
  Palette,
  PanelLeftOpen,
  Pause,
  Play,
  Square,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import {
  LayoutStyleId,
  StudySettings,
  StudyStrategyId,
  UserProfile,
} from '../types/studyflow';
import {
  STUDY_STRATEGY_CATALOG,
  computeFlowtimeBreakMinutes,
  getStrategyDescriptor,
} from '../lib/studyMethods';

export type AppModule = 'docs' | 'pomodoro' | 'board';

interface NavbarProps {
  currentModule: AppModule;
  onSwitchModule: (mod: AppModule) => void;
  settings: StudySettings;
  onSelectStrategy?: (strategyId: StudyStrategyId) => Promise<void>;
  onOpenDiagnosticModal?: () => void;
  onToggleAudio: () => void;
  user: UserProfile | null;
  syncStatus: 'local' | 'synced' | 'syncing' | 'error';
  onOpenAccountModal: () => void;
  onOpenFriendsModal: () => void;
  onOpenAppearanceModal: () => void;
  onOpenTutorial: () => void;
  notificationsSlot?: React.ReactNode;
  hideBrandOnDesktop?: boolean;
  layoutStyle?: LayoutStyleId;
  showOpenSidebarButton?: boolean;
  onOpenSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentModule,
  onSwitchModule,
  settings,
  onSelectStrategy,
  onOpenDiagnosticModal,
  onToggleAudio,
  user,
  syncStatus,
  onOpenAccountModal,
  onOpenFriendsModal,
  onOpenAppearanceModal,
  onOpenTutorial,
  notificationsSlot,
  hideBrandOnDesktop = false,
  layoutStyle = 'islands',
  showOpenSidebarButton = false,
  onOpenSidebar,
}) => {
  const {
    mode,
    activeStrategy,
    isStopwatchActive,
    remainingSeconds,
    elapsedSeconds,
    isRunning,
    toggleTimer,
    stopFlowtimeForFatigue,
  } = useTimer();
  const [rightIslandCompact, setRightIslandCompact] = useState(false);
  const [strategyMenuOpen, setStrategyMenuOpen] = useState(false);

  const displaySec = isStopwatchActive ? elapsedSeconds : remainingSeconds;
  const mins = Math.floor(displaySec / 60);
  const secs = displaySec % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const activeStrategyDesc = getStrategyDescriptor(activeStrategy);
  const flowtimeBreakPreview = computeFlowtimeBreakMinutes(elapsedSeconds);

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

  const userDisplayLabel = user
    ? user.username
      ? `@${user.username}`
      : user.fullName || user.email
    : 'Local / Cuenta';

  const userInitial = user
    ? (user.fullName || user.username || user.email || 'E').slice(0, 1).toUpperCase()
    : 'L';

  const renderTimerControl = (compactShape: boolean) => (
    <div className="relative flex items-center gap-0.5 flex-shrink-0">
      <button
        type="button"
        onClick={toggleTimer}
        title={isRunning ? 'Pausar temporizador' : 'Iniciar temporizador'}
        className={`flex items-center gap-1 px-2 ${
          compactShape ? 'py-1.5 rounded-xl' : 'py-1 xl:px-2.5 xl:py-1.5 rounded-lg'
        } bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-slate-200 transition-colors`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isRunning
              ? activeStrategy === 'flowtime' && mode === 'study'
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-indigo-400 animate-pulse'
              : 'bg-indigo-500'
          }`}
        />
        <span className="font-mono font-semibold text-[11px]">{formattedTime}</span>
        {isRunning ? (
          <Pause className="w-3 h-3 text-indigo-300" />
        ) : (
          <Play className="w-3 h-3 text-indigo-300" />
        )}
      </button>

      {mode === 'study' && activeStrategy === 'flowtime' && (
        <button
          type="button"
          onClick={stopFlowtimeForFatigue}
          title={`Detener Flowtime por fatiga (descanso proporcional: ${flowtimeBreakPreview} min)`}
          className={`flex items-center gap-1 px-1.5 ${
            compactShape ? 'py-1.5 rounded-xl' : 'py-1 rounded-lg'
          } bg-amber-600/25 hover:bg-amber-600/40 border border-amber-500/45 text-amber-200 text-[10px] font-semibold transition-colors`}
        >
          <Square className="w-2.5 h-2.5 fill-current" />
          <span className="hidden xl:inline">{flowtimeBreakPreview}m</span>
        </button>
      )}

      {onSelectStrategy && (
        <button
          type="button"
          onClick={() => setStrategyMenuOpen((v) => !v)}
          title={`Estrategia activa: ${activeStrategyDesc.name}`}
          aria-label="Cambiar estrategia de estudio"
          className={`p-1.5 ${
            compactShape ? 'rounded-xl' : 'rounded-lg'
          } bg-slate-800/80 hover:bg-indigo-500/20 border border-slate-700/70 text-slate-300 transition-colors`}
        >
          <ChevronDown className="w-3 h-3 text-indigo-300" />
        </button>
      )}

      {strategyMenuOpen && onSelectStrategy && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setStrategyMenuOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-slate-900 border border-indigo-500/35 shadow-2xl p-2 z-50 space-y-1 text-xs fade-in">
            <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Estrategia de estudio</span>
              <span className="text-indigo-300">{activeStrategyDesc.shortName}</span>
            </div>
            {STUDY_STRATEGY_CATALOG.map((item) => {
              const selected = item.id === activeStrategy;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setStrategyMenuOpen(false);
                    void onSelectStrategy(item.id);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl border transition-colors ${
                    selected
                      ? 'bg-indigo-600/25 border-indigo-400 text-white'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[11px]">{item.shortName}</span>
                    <span className="font-mono text-[10px] text-indigo-300">
                      {item.badge}
                    </span>
                  </div>
                </button>
              );
            })}
            {onOpenDiagnosticModal && (
              <button
                type="button"
                onClick={() => {
                  setStrategyMenuOpen(false);
                  onOpenDiagnosticModal();
                }}
                className="w-full mt-1 py-1.5 px-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-[11px] flex items-center justify-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Diagnóstico: sugerirme estrategia</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );

  // MODO ISLAS DINÁMICAS (Por defecto)
  if (layoutStyle === 'islands') {
    return (
      <header className="pointer-events-none absolute top-2 sm:top-2.5 inset-x-0 px-2 sm:px-3.5 z-40 flex items-center justify-between gap-2 select-none">
        {/* Isla izquierda: Marca + botón reabrir panel (solo cuando no está fijo en desktop) */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div
            className={`pointer-events-auto flex items-center gap-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-indigo-500/30 shadow-xl px-2 py-1 ${
              hideBrandOnDesktop ? 'lg:hidden' : ''
            }`}
          >
            {showOpenSidebarButton && onOpenSidebar && (
              <button
                type="button"
                onClick={onOpenSidebar}
                title="Abrir panel de material y ruta"
                aria-label="Abrir panel lateral"
                className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/30 flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="hidden sm:inline text-xs font-bold tracking-tight text-white pr-1 whitespace-nowrap">
              StudyFlow
            </span>
          </div>
        </div>

        {/* Isla central: Pestañas de módulos */}
        <nav
          data-tour-id="tour-nav-tabs"
          className="pointer-events-auto flex items-center gap-0.5 sm:gap-1 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-indigo-500/30 shadow-xl p-1 flex-shrink-0"
        >
          {tabs.map((tab) => {
            const active = currentModule === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSwitchModule(tab.id)}
                title={tab.label}
                className={`px-2 sm:px-2.5 xl:px-3 py-1.5 rounded-xl text-[11px] xl:text-xs font-medium flex items-center gap-1 sm:gap-1.5 whitespace-nowrap transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.icon}
                <span className={active ? 'sm:hidden' : 'hidden'}>{tab.shortLabel}</span>
                <span className="hidden sm:inline xl:hidden">{tab.shortLabel}</span>
                <span className="hidden xl:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Burbuja derecha estilo Dynamic Island (compactable) */}
        <div className="flex items-center justify-end flex-1 min-w-0">
          <div className="pointer-events-auto flex items-center gap-1 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-indigo-500/30 shadow-xl p-1 text-xs max-w-full">
            {/* Temporizador rápido y Selector de estrategia */}
            {renderTimerControl(true)}

            {!rightIslandCompact && (
              <>
                <button
                  type="button"
                  onClick={onOpenTutorial}
                  title="Tutorial rápido de StudyFlow"
                  aria-label="Tutorial rápido de StudyFlow"
                  className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-indigo-500/20 border border-slate-700/70 hover:border-indigo-400/50 text-slate-200 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                </button>

                <button
                  type="button"
                  onClick={onOpenAppearanceModal}
                  title="Personalizar tema, estilo de interfaz y fondo"
                  aria-label="Personalizar tema"
                  className="p-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-200 transition-colors"
                >
                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                </button>

                {user && (
                  <>
                    {notificationsSlot}
                    <button
                      type="button"
                      onClick={onOpenFriendsModal}
                      title="Amigos y Documentos Compartidos"
                      aria-label="Amigos y Documentos Compartidos"
                      className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/70 text-slate-200 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={onToggleAudio}
                  title={settings.audioEnabled ? 'Silenciar alertas' : 'Activar alertas sonoras'}
                  aria-label={settings.audioEnabled ? 'Silenciar alertas' : 'Activar alertas sonoras'}
                  className="hidden sm:flex p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/70 text-slate-300 transition-colors"
                >
                  {settings.audioEnabled ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>

                <span className="w-px h-5 bg-slate-700/70 mx-0.5 hidden sm:block" />
              </>
            )}

            {/* Chip de Cuenta estilo perfil con avatar */}
            <button
              type="button"
              id="nav-account-button"
              data-tour-id="tour-account-button"
              onClick={onOpenAccountModal}
              title={
                user
                  ? `${userDisplayLabel} · Cuenta y sincronización`
                  : 'Cuenta, sincronización y respaldo'
              }
              className="flex items-center gap-1.5 pl-1.5 pr-1 sm:pl-2 sm:pr-1 py-0.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-200 transition-colors"
            >
              {!rightIslandCompact && (
                <div className="hidden xl:flex flex-col items-end leading-tight max-w-[100px] pr-0.5">
                  <span className="text-[11px] font-semibold text-white truncate max-w-full">
                    {user ? userDisplayLabel : 'Local'}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">
                    {user ? (syncStatus === 'syncing' ? 'Sync...' : 'En nube') : 'Sin cuenta'}
                  </span>
                </div>
              )}
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                  user
                    ? syncStatus === 'error'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-indigo-300'
                }`}
              >
                {user ? userInitial : <HardDrive className="w-3.5 h-3.5" />}
              </div>
            </button>

            {/* Botón para compactar o expandir la burbuja */}
            <button
              type="button"
              onClick={() => setRightIslandCompact((v) => !v)}
              title={
                rightIslandCompact
                  ? 'Expandir herramientas del header'
                  : 'Compactar burbuja para liberar espacio'
              }
              aria-label={
                rightIslandCompact ? 'Expandir herramientas' : 'Compactar herramientas'
              }
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {rightIslandCompact ? (
                <ChevronLeft className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </header>
    );
  }

  // MODO CLÁSICO (Interfaz secundaria ajustable)
  return (
    <header className="h-12 xl:h-14 sf-header-chrome backdrop-blur flex items-center justify-between px-2 sm:px-3 xl:px-4 gap-1.5 sm:gap-2 z-40 select-none flex-shrink-0">
      <div
        className={`flex items-center gap-2 flex-shrink-0 ${
          hideBrandOnDesktop ? 'lg:hidden' : ''
        }`}
      >
        <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 flex-shrink-0">
          <BookOpen className="w-4 h-4 xl:w-5 xl:h-5 text-white" />
        </div>
        <h1 className="hidden sm:flex text-sm xl:text-base font-bold tracking-tight text-white items-center gap-1.5 whitespace-nowrap">
          <span>StudyFlow</span>
          <span className="hidden xl:inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            2.0
          </span>
        </h1>
      </div>

      <nav
        data-tour-id="tour-nav-tabs"
        className="flex items-center gap-0.5 sm:gap-1 bg-slate-950/75 p-0.5 sm:p-1 rounded-xl border border-indigo-500/20 flex-shrink-0"
      >
        {tabs.map((tab) => {
          const active = currentModule === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSwitchModule(tab.id)}
              title={tab.label}
              className={`px-2 sm:px-2.5 xl:px-3 py-1 xl:py-1.5 rounded-lg text-[11px] xl:text-xs font-medium flex items-center gap-1 sm:gap-1.5 whitespace-nowrap transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.icon}
              <span className={active ? 'sm:hidden' : 'hidden'}>{tab.shortLabel}</span>
              <span className="hidden sm:inline xl:hidden">{tab.shortLabel}</span>
              <span className="hidden xl:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-1 sm:gap-1.5 text-xs flex-shrink-0 whitespace-nowrap">
        {renderTimerControl(false)}

        <button
          type="button"
          onClick={onOpenTutorial}
          title="Tutorial rápido de StudyFlow"
          aria-label="Tutorial rápido de StudyFlow"
          className="flex items-center gap-1 p-1.5 xl:px-2 xl:py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-500/20 border border-slate-700 hover:border-indigo-400/50 text-slate-200 transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span className="hidden xl:inline text-xs font-medium">Guía</span>
        </button>

        <button
          type="button"
          onClick={onOpenAppearanceModal}
          title="Personalizar tema, colores y tipografía"
          aria-label="Personalizar tema, colores y tipografía"
          className="flex items-center gap-1.5 p-1.5 sm:px-2 xl:px-2.5 xl:py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-200 transition-colors"
        >
          <Palette className="w-4 h-4 text-indigo-400" />
          <span className="hidden xl:inline text-xs font-medium">Tema</span>
          <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
        </button>

        {user && (
          <>
            {notificationsSlot}
            <button
              type="button"
              onClick={onOpenFriendsModal}
              title="Amigos y Documentos Compartidos"
              aria-label="Amigos y Documentos Compartidos"
              className="flex items-center gap-1 p-1.5 xl:px-2 xl:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="hidden xl:inline text-xs font-medium">Amigos</span>
            </button>
          </>
        )}

        <button
          type="button"
          id="nav-account-button"
          data-tour-id="tour-account-button"
          onClick={onOpenAccountModal}
          title={
            user
              ? `${user.username ? `@${user.username} · ` : ''}${user.fullName || user.email} · Cuenta y sincronización`
              : 'Cuenta, sincronización y respaldo'
          }
          className="flex items-center gap-1.5 p-1.5 sm:px-2 xl:px-2.5 xl:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
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
              <span className="hidden xl:inline max-w-[115px] truncate text-[11px]">
                {user.username ? `@${user.username}` : user.fullName || user.email}
              </span>
            </>
          ) : (
            <>
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xl:inline text-[11px]">Local / Cuenta</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleAudio}
          title={settings.audioEnabled ? 'Silenciar alertas' : 'Activar alertas sonoras'}
          aria-label={settings.audioEnabled ? 'Silenciar alertas' : 'Activar alertas sonoras'}
          className="hidden sm:flex p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
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
