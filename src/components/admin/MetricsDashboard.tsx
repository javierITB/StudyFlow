import React from 'react';
import {
  Users,
  HardDrive,
  FileText,
  Activity,
  Clock,
  BookOpen,
  PenTool,
  Flame,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { WebUsageMetrics, AdminUserRecord, AdminSystemSettings, formatBytes } from '../../lib/adminData';

interface MetricsDashboardProps {
  metrics: WebUsageMetrics;
  users: AdminUserRecord[];
  settings?: AdminSystemSettings;
  onNavigateToUsers: () => void;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  metrics,
  users,
  settings,
  onNavigateToUsers,
}) => {
  const globalStoragePercent = Math.min(
    100,
    Math.round((metrics.totalStorageUsedBytes / Math.max(1, metrics.totalStorageLimitBytes)) * 100)
  );

  // Ordenar usuarios por consumo de almacenamiento descendente
  const sortedUsersByStorage = [...users].sort((a, b) => b.storageBytes - a.storageBytes);

  return (
    <div className="space-y-6">
      {/* 1. Tarjetas KPI Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Usuarios */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Usuarios Registrados</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{metrics.totalUsers}</span>
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {metrics.activeUsersToday} activos hoy
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {metrics.suspendedUsers} dados de baja o en observación
          </p>
        </div>

        {/* KPI 2: Almacenamiento Global */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Almacenamiento Ocupado</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {formatBytes(metrics.totalStorageUsedBytes)}
            </span>
            <span className="text-xs text-slate-400">de {formatBytes(metrics.totalStorageLimitBytes)}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                globalStoragePercent >= (settings?.storageCriticalPercent ?? 90)
                  ? 'bg-rose-500'
                  : globalStoragePercent >= (settings?.storageWarningPercent ?? 75)
                  ? 'bg-amber-400'
                  : 'bg-cyan-400'
              }`}
              style={{ width: `${globalStoragePercent}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Documentos Almacenados */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Total Documentos</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{metrics.totalDocumentsStored}</span>
            <span className="text-xs text-emerald-400 font-medium">+{metrics.totalWorksDrafts} redacciones</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <span>{metrics.totalWhiteboards} pizarras vectoriales activas</span>
          </p>
        </div>

        {/* KPI 4: Telemetría de Estudio */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Horas de Estudio & Palabras</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{metrics.totalPomodoroHours}h</span>
            <span className="text-xs text-slate-400">Pomodoro</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            {metrics.totalWordsWrittenGlobal.toLocaleString()} palabras redactadas
          </p>
        </div>
      </div>

      {/* 2. Desglose de Almacenamiento por Formato & Popularidad de Módulos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Desglose por Formato de Archivo */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Desglose Físico de Almacenamiento por Formato
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribución exacta de los bytes almacenados en el disco del servidor / Supabase Storage
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-slate-400">
              Total: {formatBytes(metrics.totalStorageUsedBytes)}
            </span>
          </div>

          {/* Barra multicolor de distribución */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800 mb-5">
            <div
              className="bg-rose-500 transition-all"
              style={{ width: `${(metrics.storageByType.pdf / metrics.totalStorageUsedBytes) * 100}%` }}
              title={`PDF: ${formatBytes(metrics.storageByType.pdf)}`}
            />
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${(metrics.storageByType.docx / metrics.totalStorageUsedBytes) * 100}%` }}
              title={`DOCX: ${formatBytes(metrics.storageByType.docx)}`}
            />
            <div
              className="bg-indigo-500 transition-all"
              style={{ width: `${(metrics.storageByType.works / metrics.totalStorageUsedBytes) * 100}%` }}
              title={`Redacciones TipTap: ${formatBytes(metrics.storageByType.works)}`}
            />
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${(metrics.storageByType.whiteboards / metrics.totalStorageUsedBytes) * 100}%` }}
              title={`Pizarras: ${formatBytes(metrics.storageByType.whiteboards)}`}
            />
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${(metrics.storageByType.notesAndOther / metrics.totalStorageUsedBytes) * 100}%` }}
              title={`Notas y Otros: ${formatBytes(metrics.storageByType.notesAndOther)}`}
            />
          </div>

          {/* Leyenda y métricas detalladas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span>Libros & Papers PDF</span>
              </div>
              <p className="text-base font-bold text-white mt-1.5 font-mono">
                {formatBytes(metrics.storageByType.pdf)}
              </p>
              <p className="text-[10px] text-slate-400">
                {Math.round((metrics.storageByType.pdf / metrics.totalStorageUsedBytes) * 100)}% del espacio total
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span>Documentos DOCX</span>
              </div>
              <p className="text-base font-bold text-white mt-1.5 font-mono">
                {formatBytes(metrics.storageByType.docx)}
              </p>
              <p className="text-[10px] text-slate-400">
                {Math.round((metrics.storageByType.docx / metrics.totalStorageUsedBytes) * 100)}% del espacio total
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                <span>Redacciones TipTap</span>
              </div>
              <p className="text-base font-bold text-white mt-1.5 font-mono">
                {formatBytes(metrics.storageByType.works)}
              </p>
              <p className="text-[10px] text-slate-400">
                {Math.round((metrics.storageByType.works / metrics.totalStorageUsedBytes) * 100)}% del espacio total
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Pizarras Vectoriales</span>
              </div>
              <p className="text-base font-bold text-white mt-1.5 font-mono">
                {formatBytes(metrics.storageByType.whiteboards)}
              </p>
              <p className="text-[10px] text-slate-400">
                {Math.round((metrics.storageByType.whiteboards / metrics.totalStorageUsedBytes) * 100)}% del espacio
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span>Notas Cornell & Trazos</span>
              </div>
              <p className="text-base font-bold text-white mt-1.5 font-mono">
                {formatBytes(metrics.storageByType.notesAndOther)}
              </p>
              <p className="text-[10px] text-slate-400">
                {Math.round((metrics.storageByType.notesAndOther / metrics.totalStorageUsedBytes) * 100)}% del espacio
              </p>
            </div>
          </div>
        </div>

        {/* Popularidad de Módulos */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-indigo-400" />
              Módulos Más Utilizados
            </h3>
            <p className="text-xs text-slate-400 mb-5">Telemetría de tiempo de sesión en la plataforma</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-indigo-400" /> Redacción & Trabajos
                  </span>
                  <span className="text-indigo-400 font-mono font-semibold">
                    {metrics.moduleActivityPercentage.writer}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${metrics.moduleActivityPercentage.writer}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> Visor PDF & Material
                  </span>
                  <span className="text-cyan-400 font-mono font-semibold">
                    {metrics.moduleActivityPercentage.docsViewer}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${metrics.moduleActivityPercentage.docsViewer}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> Pomodoro & Ruta de Estudio
                  </span>
                  <span className="text-amber-400 font-mono font-semibold">
                    {metrics.moduleActivityPercentage.pomodoroPlanner}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${metrics.moduleActivityPercentage.pomodoroPlanner}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-emerald-400" /> Pizarra de Dibujo & Canvas
                  </span>
                  <span className="text-emerald-400 font-mono font-semibold">
                    {metrics.moduleActivityPercentage.board}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${metrics.moduleActivityPercentage.board}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Sesiones registradas hoy</span>
            <span className="font-mono text-white font-semibold">{metrics.dailyActivityLast7Days[6].sessions}</span>
          </div>
        </div>
      </div>

      {/* 3. Tabla de Usuarios con Mayor Almacenamiento Consumido */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              Consumo de Almacenamiento por Usuario (Top Consumidores)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Supervisión de cuotas y uso de espacio en disco por cada estudiante y docente
            </p>
          </div>
          <button
            onClick={onNavigateToUsers}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            Ver Directorio Completo ({users.length} usuarios) →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-3 pr-4">Usuario</th>
                <th className="pb-3 px-4">Estado</th>
                <th className="pb-3 px-4">Docs / Redacciones</th>
                <th className="pb-3 px-4">Espacio Utilizado</th>
                <th className="pb-3 px-4">Cuota Asignada</th>
                <th className="pb-3 pl-4 text-right">Ocupación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedUsersByStorage.slice(0, 5).map((user) => {
                const percent = Math.min(100, Math.round((user.storageBytes / user.quotaBytes) * 100));
                const isOverQuota = user.storageBytes > user.quotaBytes;
                const isWarning = percent > 75;

                return (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="font-medium text-white">{user.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        @{user.username} • {user.email}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          user.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : user.status === 'suspended'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${
                            user.status === 'active'
                              ? 'bg-emerald-400'
                              : user.status === 'suspended'
                              ? 'bg-rose-400'
                              : 'bg-amber-400'
                          }`}
                        />
                        {user.status === 'active'
                          ? 'Activo'
                          : user.status === 'suspended'
                          ? 'Dado de Baja'
                          : 'En Observación'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {user.documentsCount} docs • {user.worksCount} borradores
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      {formatBytes(user.storageBytes)}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">{formatBytes(user.quotaBytes)}</td>

                    <td className="py-3.5 pl-4 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span
                          className={`font-mono text-xs font-semibold ${
                            isOverQuota
                              ? 'text-rose-400'
                              : isWarning
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {percent}%
                        </span>
                        <div className="w-20 bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              isOverQuota ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
