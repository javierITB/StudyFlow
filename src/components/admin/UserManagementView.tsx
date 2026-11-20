import React, { useState } from 'react';
import {
  Users,
  Search,
  Ban,
  CheckCircle2,
  Sliders,
  Trash2,
  FolderOpen,
  FileText,
  X,
} from 'lucide-react';
import {
  AdminUserRecord,
  AdminSystemSettings,
  formatBytes,
  updateUserStatus,
  updateUserQuota,
  deleteUserAccount,
} from '../../lib/adminData';

interface UserManagementViewProps {
  users: AdminUserRecord[];
  settings?: AdminSystemSettings;
  onRefreshUsers: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  settings,
  onRefreshUsers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'under_review'>('all');

  // Estados de modales
  const [suspendModalUser, setSuspendModalUser] = useState<AdminUserRecord | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  const [quotaModalUser, setQuotaModalUser] = useState<AdminUserRecord | null>(null);
  const [selectedQuotaBytes, setSelectedQuotaBytes] = useState<number>(1073741824);

  const [inspectModalUser, setInspectModalUser] = useState<AdminUserRecord | null>(null);

  // Filtrado de usuarios
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleConfirmSuspend = async () => {
    if (!suspendModalUser) return;
    await updateUserStatus(
      suspendModalUser.id,
      'suspended',
      suspensionReason.trim() || 'Dado de baja por el administrador del sistema.'
    );
    setSuspendModalUser(null);
    setSuspensionReason('');
    onRefreshUsers();
  };

  const handleReactivate = async (user: AdminUserRecord) => {
    await updateUserStatus(user.id, 'active');
    onRefreshUsers();
  };

  const handleConfirmQuota = async () => {
    if (!quotaModalUser) return;
    await updateUserQuota(quotaModalUser.id, selectedQuotaBytes);
    setQuotaModalUser(null);
    onRefreshUsers();
  };

  const handleDeleteUser = async (user: AdminUserRecord) => {
    if (
      confirm(
        `¿Confirmas la eliminación DEFINITIVA de la cuenta de ${user.fullName} (@${user.username})? Esta acción purgará todos sus documentos y es irreversible.`
      )
    ) {
      await deleteUserAccount(user.id);
      onRefreshUsers();
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera y Controles de Búsqueda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Directorio de Usuarios & Control de Cuotas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Supervisa estados de cuenta, asignación de almacenamiento y acciones de baja
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Barra de Búsqueda */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, @username o correo..."
              className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64 transition-colors"
            />
          </div>

          {/* Filtro de Estado */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({users.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'suspended'
                  ? 'bg-rose-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dados de Baja
            </button>
            <button
              onClick={() => setStatusFilter('under_review')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'under_review'
                  ? 'bg-amber-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              En Observación
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3.5 px-4">Estudiante / Usuario</th>
                <th className="py-3.5 px-4">Rol & Estado</th>
                <th className="py-3.5 px-4">Almacenamiento / Cuota</th>
                <th className="py-3.5 px-4">Documentos</th>
                <th className="py-3.5 px-4">Última Actividad</th>
                <th className="py-3.5 px-4 text-right">Acciones de Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No se encontraron usuarios coincidentes con el criterio de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const percent = Math.min(100, Math.round((user.storageBytes / user.quotaBytes) * 100));
                  const warningLimit = settings?.storageWarningPercent ?? 75;
                  const criticalLimit = settings?.storageCriticalPercent ?? 90;
                  const isOverQuota = user.storageBytes >= user.quotaBytes || percent >= criticalLimit;
                  const isWarning = percent >= warningLimit && !isOverQuota;

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/25 transition-colors">
                      {/* Usuario */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {user.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{user.fullName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              @{user.username} • {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rol & Estado */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
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
                          <div className="text-[10px] text-slate-400 capitalize">
                            Rol: {user.role === 'teacher' ? 'Docente' : user.role === 'researcher' ? 'Investigador' : 'Estudiante'}
                          </div>
                          {user.suspensionReason && (
                            <div className="text-[10px] text-rose-300 italic max-w-xs truncate" title={user.suspensionReason}>
                              Motivo: {user.suspensionReason}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Almacenamiento & Cuota */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5 w-44">
                          <div className="flex justify-between items-baseline text-[11px]">
                            <span className="font-mono font-bold text-white">{formatBytes(user.storageBytes)}</span>
                            <span className="text-slate-400 font-mono text-[10px]">de {formatBytes(user.quotaBytes)}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOverQuota
                                  ? 'bg-rose-500'
                                  : isWarning
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className={isOverQuota ? 'text-rose-400 font-bold' : isWarning ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                              {percent}% ocupado
                            </span>
                            {isOverQuota && <span className="text-rose-400 font-bold">¡Límite Crítico!</span>}
                            {isWarning && !isOverQuota && <span className="text-amber-400 font-semibold">Alerta Preventiva</span>}
                          </div>
                        </div>
                      </td>

                      {/* Documentos */}
                      <td className="py-4 px-4 font-mono text-slate-300">
                        <div>{user.documentsCount} documentos</div>
                        <div className="text-[10px] text-slate-400">{user.worksCount} redacciones TipTap</div>
                      </td>

                      {/* Última Actividad */}
                      <td className="py-4 px-4 text-slate-400 text-[11px]">
                        <div>{new Date(user.lastLoginAt).toLocaleDateString('es-CL')}</div>
                        <div className="text-[10px] text-slate-400">{new Date(user.lastLoginAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ver archivos */}
                          <button
                            onClick={() => setInspectModalUser(user)}
                            title="Ver expediente de archivos y almacenamiento"
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                          </button>

                          {/* Ajustar Cuota */}
                          <button
                            onClick={() => {
                              setQuotaModalUser(user);
                              setSelectedQuotaBytes(user.quotaBytes);
                            }}
                            title="Ajustar límite de cuota"
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {/* Dar de baja / Reactivar */}
                          {user.status === 'suspended' ? (
                            <button
                              onClick={() => handleReactivate(user)}
                              title="Reactivar usuario"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSuspendModalUser(user);
                                setSuspensionReason('');
                              }}
                              title="Dar de baja / Suspender usuario"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Eliminar cuenta */}
                          <button
                            onClick={() => handleDeleteUser(user)}
                            title="Eliminar usuario definitivamente"
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Dar de Baja / Suspender Usuario */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Dar de Baja / Suspender Cuenta</h3>
                <p className="text-xs text-slate-400">{suspendModalUser.fullName} (@{suspendModalUser.username})</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mt-2 mb-4 leading-relaxed">
              El usuario perderá el acceso a la plataforma de inmediato y sus sincronizaciones en la nube quedarán congeladas hasta que sea reactivado.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Motivo de la Suspensión (Quedará registrado en el registro de auditoría)
              </label>
              <textarea
                rows={3}
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Ejemplo: Infracción de derechos de autor en plantillas, uso excesivo de almacenamiento sin autorización..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                Confirmar Baja de Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Ajustar Cuota de Almacenamiento */}
      {quotaModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-cyan-400 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Ajustar Cuota de Almacenamiento</h3>
                <p className="text-xs text-slate-400">{quotaModalUser.fullName} • Ocupa actualmente {formatBytes(quotaModalUser.storageBytes)}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Selecciona el nuevo límite de espacio físico que este estudiante tendrá permitido almacenar en StudyFlowConnect:
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {[
                { label: '500 MB', bytes: 524288000 },
                { label: '1 GB (Estándar)', bytes: 1073741824 },
                { label: '2 GB (Investigador)', bytes: 2147483648 },
                { label: '5 GB (Avanzado)', bytes: 5368709120 },
                { label: '10 GB (Docente)', bytes: 10737418240 },
                { label: '25 GB (Ilimitado)', bytes: 26843545600 },
              ].map((opt) => (
                <button
                  key={opt.bytes}
                  type="button"
                  onClick={() => setSelectedQuotaBytes(opt.bytes)}
                  className={`p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                    selectedQuotaBytes === opt.bytes
                      ? 'bg-cyan-500/15 border-cyan-500 text-white font-semibold ring-1 ring-cyan-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="text-white font-medium">{opt.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{formatBytes(opt.bytes)}</div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuotaModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmQuota}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
              >
                Guardar Nueva Cuota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Inspeccionar Expediente de Archivos del Usuario */}
      {inspectModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Archivos de {inspectModalUser.fullName}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Total: {formatBytes(inspectModalUser.storageBytes)} • {inspectModalUser.documentsCount} documentos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectModalUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {inspectModalUser.topFiles && inspectModalUser.topFiles.length > 0 ? (
                inspectModalUser.topFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate mr-3">
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="text-slate-200 truncate font-mono text-[11px]">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] uppercase font-mono text-slate-400">
                        {file.type}
                      </span>
                      <span className="font-mono text-white font-semibold text-[11px]">{formatBytes(file.size)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Este usuario no tiene archivos de gran volumen registrados.
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Registrado el {new Date(inspectModalUser.registeredAt).toLocaleDateString('es-CL')}</span>
              <button
                type="button"
                onClick={() => setInspectModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
