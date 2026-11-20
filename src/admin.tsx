import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './theme-overrides.css';
import {
  AdminSession,
  getAndVerifyAdminSession,
  logoutAdmin,
  appendAuditRecord,
} from './lib/adminAuth';
import {
  WebUsageMetrics,
  AdminUserRecord,
  AdminSuggestionRecord,
  AdminTemplateRecord,
  AdminSystemSettings,
  computeWebUsageMetrics,
  getAdminUsers,
  getAdminSuggestions,
  getAdminTemplates,
  getAdminSystemSettings,
} from './lib/adminData';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminLockScreen } from './components/admin/AdminLockScreen';
import { AdminLayout, AdminTab } from './components/admin/AdminLayout';
import { MetricsDashboard } from './components/admin/MetricsDashboard';
import { UserManagementView } from './components/admin/UserManagementView';
import { SuggestionsView } from './components/admin/SuggestionsView';
import { TemplateModerationView } from './components/admin/TemplateModerationView';
import { AuditLogView } from './components/admin/AuditLogView';
import { SystemSettingsView } from './components/admin/SystemSettingsView';

export const AdminApp: React.FC = () => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [currentTab, setCurrentTab] = useState<AdminTab>('metrics');

  // Configuración dinámica del sistema
  const [systemSettings, setSystemSettings] = useState<AdminSystemSettings>(getAdminSystemSettings());

  // Datos administrativos
  const [metrics, setMetrics] = useState<WebUsageMetrics | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [suggestions, setSuggestions] = useState<AdminSuggestionRecord[]>([]);
  const [templates, setTemplates] = useState<AdminTemplateRecord[]>([]);

  // Temporizador de inactividad dinámico
  const timeoutSeconds = systemSettings.autoLockTimeoutMinutes * 60;
  const [inactivitySeconds, setInactivitySeconds] = useState(timeoutSeconds);
  const lastActivityTimeRef = useRef<number>(Date.now());

  // Carga inicial y verificación de sesión
  useEffect(() => {
    const initSession = async () => {
      const active = await getAndVerifyAdminSession();
      setSession(active);
      setCheckingSession(false);
    };
    initSession();
  }, []);

  // Cargar datos administrativos cuando hay sesión activa
  const refreshAllData = useCallback(async () => {
    try {
      const [m, u, s, t] = await Promise.all([
        computeWebUsageMetrics(),
        getAdminUsers(),
        getAdminSuggestions(),
        getAdminTemplates(),
      ]);
      setMetrics(m);
      setUsers(u);
      setSuggestions(s);
      setTemplates(t);
    } catch (err) {
      console.error('[AdminApp] Error cargando datos administrativos:', err);
    }
  }, []);

  useEffect(() => {
    if (session && !isLocked) {
      refreshAllData();
    }
  }, [session, isLocked, refreshAllData]);

  // Detector de inactividad configurable
  useEffect(() => {
    if (!session || isLocked) return;

    // Si el auto-bloqueo está desactivado (0 minutos)
    if (systemSettings.autoLockTimeoutMinutes <= 0) {
      setInactivitySeconds(0);
      return;
    }

    const currentTimeout = systemSettings.autoLockTimeoutMinutes * 60;

    const resetActivity = () => {
      lastActivityTimeRef.current = Date.now();
      setInactivitySeconds(currentTimeout);
    };

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('scroll', resetActivity);
    window.addEventListener('click', resetActivity);

    const interval = setInterval(() => {
      const idle = Math.floor((Date.now() - lastActivityTimeRef.current) / 1000);
      const remaining = Math.max(0, currentTimeout - idle);
      setInactivitySeconds(remaining);

      if (remaining === 0) {
        setIsLocked(true);
        void appendAuditRecord(
          'CONSOLE_LOCKED',
          `Consola bloqueada automáticamente por inactividad (${systemSettings.autoLockTimeoutMinutes} min).`,
          'info'
        );
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('scroll', resetActivity);
      window.removeEventListener('click', resetActivity);
      clearInterval(interval);
    };
  }, [session, isLocked, systemSettings.autoLockTimeoutMinutes]);

  const handleAuthenticated = (newSession: AdminSession) => {
    setSession(newSession);
    setIsLocked(false);
    lastActivityTimeRef.current = Date.now();
    setInactivitySeconds(systemSettings.autoLockTimeoutMinutes * 60);
  };

  const handleManualLock = () => {
    setIsLocked(true);
    void appendAuditRecord('CONSOLE_LOCKED', 'Consola bloqueada manualmente por el operador root.', 'info');
  };

  const handleUnlock = () => {
    setIsLocked(false);
    lastActivityTimeRef.current = Date.now();
    setInactivitySeconds(systemSettings.autoLockTimeoutMinutes * 60);
    void appendAuditRecord('CONSOLE_UNLOCKED', 'Consola desbloqueada exitosamente con PIN 2FA.', 'info');
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setSession(null);
    setIsLocked(false);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        Verificando firma criptográfica HMAC de la sesión...
      </div>
    );
  }

  if (!session) {
    return <AdminLogin onAuthenticated={handleAuthenticated} />;
  }

  const pendingSuggestionsCount = suggestions.filter((s) => s.status === 'pendiente').length;
  const underReviewTemplatesCount = templates.filter((t) => t.status === 'under_review').length;

  return (
    <>
      {isLocked && <AdminLockScreen onUnlock={handleUnlock} onLogout={handleLogout} />}

      <AdminLayout
        session={session}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onLockConsole={handleManualLock}
        onLogout={handleLogout}
        inactivityRemainingSeconds={inactivitySeconds}
        pendingSuggestionsCount={pendingSuggestionsCount}
        underReviewTemplatesCount={underReviewTemplatesCount}
      >
        {currentTab === 'metrics' && metrics && (
          <MetricsDashboard
            metrics={metrics}
            users={users}
            settings={systemSettings}
            onNavigateToUsers={() => setCurrentTab('users')}
          />
        )}

        {currentTab === 'users' && (
          <UserManagementView
            users={users}
            settings={systemSettings}
            onRefreshUsers={refreshAllData}
          />
        )}

        {currentTab === 'suggestions' && (
          <SuggestionsView
            suggestions={suggestions}
            onRefreshSuggestions={refreshAllData}
          />
        )}

        {currentTab === 'templates' && (
          <TemplateModerationView
            templates={templates}
            onRefreshTemplates={refreshAllData}
          />
        )}

        {currentTab === 'audit' && <AuditLogView />}

        {currentTab === 'settings' && (
          <SystemSettingsView
            onSettingsChanged={(newSettings) => setSystemSettings(newSettings)}
          />
        )}
      </AdminLayout>
    </>
  );
};

ReactDOM.createRoot(document.getElementById('admin-root')!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
