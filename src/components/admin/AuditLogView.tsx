import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Download,
} from 'lucide-react';
import { AdminAuditRecord, getAuditRecords } from '../../lib/adminAuth';

export const AuditLogView: React.FC = () => {
  const [records] = useState<AdminAuditRecord[]>(getAuditRecords());
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.targetId && r.targetId.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesAction = filterAction === 'all' || r.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const exportAuditLogJson = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudyFlow_Security_Audit_Log_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera y Controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Registro de Auditoría & Seguridad Criptográfica
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Trazabilidad inmutable de accesos, bajas de usuarios, cambios de cuota y firmas HMAC
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en eventos de auditoría..."
              className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-56 transition-colors"
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todas las Acciones</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="USER_BANNED">USER_BANNED</option>
            <option value="USER_ACTIVATED">USER_ACTIVATED</option>
            <option value="QUOTA_CHANGED">QUOTA_CHANGED</option>
            <option value="TEMPLATE_MODERATED">TEMPLATE_MODERATED</option>
            <option value="SUGGESTION_UPDATED">SUGGESTION_UPDATED</option>
          </select>

          <button
            onClick={exportAuditLogJson}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Exportar JSON</span>
          </button>
        </div>
      </div>

      {/* Tabla de Eventos */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-sans font-medium">
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Acción</th>
                <th className="py-3 px-4">Gravedad</th>
                <th className="py-3 px-4">Detalle Operativo</th>
                <th className="py-3 px-4 text-right">Firma HMAC Digest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                    No hay registros de auditoría registrados para este filtro.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isCritical = rec.severity === 'critical';
                  const isWarning = rec.severity === 'warning';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-800/25 transition-colors">
                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(rec.timestamp).toLocaleString('es-CL')}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-white text-[11px] px-2 py-0.5 rounded bg-slate-800">
                          {rec.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium ${
                            isCritical
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isWarning
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              isCritical ? 'bg-rose-400' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                          />
                          {rec.severity.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans text-slate-200 text-xs">
                        {rec.details}
                        {rec.targetId && (
                          <span className="ml-2 font-mono text-[10px] text-slate-400">
                            [Target: {rec.targetId}]
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right text-[10px] text-indigo-400 font-mono">
                        {rec.signature ? `${rec.signature.substring(0, 16)}...` : 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
