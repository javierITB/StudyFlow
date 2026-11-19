import React, { useState } from 'react';
import {
  ChevronLeft,
  FilePlus,
  FileText,
  FolderPlus,
  PenTool,
  Search,
  Sliders,
  Sparkles,
  Target,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { StudyWorkDraft, UserProfile } from '../../types/studyflow';

interface WorksSidebarProps {
  works: StudyWorkDraft[];
  activeWorkId: string | null;
  onSelectWork: (id: string | null) => void;
  onCreateNewWork: () => void;
  onDeleteWork: (id: string) => void;
  onCloseDrawer?: () => void;
  onOpenTemplates: () => void;
  onOpenImportModal?: () => void;
  onExportToReadings: (work: StudyWorkDraft) => void;
  user?: UserProfile | null;
  onOpenAccountModal?: () => void;
  syncStatusLabel?: string;
}

export const WorksSidebar: React.FC<WorksSidebarProps> = ({
  works,
  activeWorkId,
  onSelectWork,
  onCreateNewWork,
  onDeleteWork,
  onCloseDrawer,
  onOpenTemplates,
  onOpenImportModal,
  onExportToReadings,
  user,
  onOpenAccountModal,
  syncStatusLabel = 'Nube activa',
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWorks = works.filter((w) =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-full h-full sf-sidebar-chrome backdrop-blur-md flex flex-col overflow-hidden border-r border-indigo-500/20">
      {/* Cabecera superior integrada */}
      <div className="h-14 xl:h-16 sf-header-chrome border-b border-indigo-500/20 px-3.5 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 flex-shrink-0">
            <PenTool className="w-4 h-4 xl:w-5 xl:h-5 text-white" />
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="text-xs xl:text-sm font-bold tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap truncate">
              <span>StudyFlexConnect</span>
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 truncate">
              Taller de Redacción
            </span>
          </div>
        </div>
        {onCloseDrawer && (
          <button
            type="button"
            onClick={onCloseDrawer}
            title="Colapsar panel lateral"
            className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-500/20 border border-indigo-500/35 hover:border-indigo-400 text-indigo-300 flex-shrink-0 transition-colors lg:hidden"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Acciones principales y Búsqueda */}
      <div className="p-3 border-b border-indigo-500/20 space-y-2 bg-slate-900/60">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={onCreateNewWork}
            title="Nuevo trabajo en blanco"
            className="py-2 px-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1 shadow-sm transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Nuevo</span>
          </button>
          <button
            type="button"
            onClick={onOpenImportModal}
            title="Importar archivo (.md, .docx, .pdf, .pptx)"
            className="py-2 px-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-indigo-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Importar</span>
          </button>
          <button
            type="button"
            onClick={onOpenTemplates}
            title="Galería de plantillas académicas"
            className="py-2 px-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-indigo-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Plantillas</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título de trabajo..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Lista de borradores y trabajos */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* Acceso a Galería de Plantillas y Lienzo Nuevo */}
        <button
          type="button"
          onClick={() => onSelectWork(null)}
          className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
            activeWorkId === null
              ? 'bg-indigo-600/20 border-indigo-400/90 ring-1 ring-indigo-500/40 text-white'
              : 'bg-slate-900/60 border-indigo-500/20 text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold truncate">Galería de Plantillas</div>
            <div className="text-[10px] text-slate-400">Nuevo trabajo o lienzo en blanco</div>
          </div>
        </button>

        {filteredWorks.length > 0 && (
          <div className="pt-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5">
              Mis Redacciones ({filteredWorks.length})
            </div>
          </div>
        )}

        {filteredWorks.length === 0 ? (
          <div className="text-center py-6 px-3 text-slate-500 space-y-2">
            <FileText className="w-7 h-7 mx-auto text-slate-600 opacity-60" />
            <p className="text-xs font-medium text-slate-400">Sin borradores guardados</p>
            <p className="text-[11px] text-slate-500">
              Selecciona una plantilla en el panel de la derecha para comenzar.
            </p>
          </div>
        ) : (
          filteredWorks.map((work) => {
            const isActive = work.id === activeWorkId;
            const targetPct =
              work.targetWordCount && work.targetWordCount > 0
                ? Math.min(100, Math.round((work.wordCount / work.targetWordCount) * 100))
                : null;

            return (
              <div
                key={work.id}
                onClick={() => onSelectWork(work.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer group space-y-2 ${
                  isActive
                    ? 'bg-indigo-500/20 border-indigo-400/90 ring-1 ring-indigo-500/40 shadow-sm'
                    : 'bg-slate-900/85 border-indigo-500/20 hover:border-indigo-400/50 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                      {work.title || 'Trabajo sin título'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExportToReadings(work);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-purple-300 hover:bg-slate-800"
                      title="Agregar a biblioteca de Lecturas"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteWork(work.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"
                      title="Eliminar trabajo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono">
                    {work.wordCount} {work.wordCount === 1 ? 'palabra' : 'palabras'}
                  </span>
                  <span>{new Date(work.updatedAt).toLocaleDateString('es-ES')}</span>
                </div>

                {targetPct !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Target className="w-3 h-3 text-indigo-400" />
                        <span>Meta {work.targetWordCount}</span>
                      </span>
                      <span className="font-mono text-indigo-300 font-semibold">{targetPct}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${targetPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pie del sidebar alineado con DocumentSidebar */}
      <div className="border-t border-indigo-500/20 bg-slate-950/80 p-2.5 space-y-2 flex-shrink-0">
        {onCloseDrawer && (
          <button
            type="button"
            onClick={onCloseDrawer}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
            title="Contraer menú lateral"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
            <span>Contraer menú</span>
          </button>
        )}

        {user && (
          <div
            onClick={onOpenAccountModal}
            role={onOpenAccountModal ? 'button' : undefined}
            tabIndex={onOpenAccountModal ? 0 : undefined}
            title={onOpenAccountModal ? 'Gestionar cuenta y sincronización' : undefined}
            className={`flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/90 border border-indigo-500/20 ${
              onOpenAccountModal ? 'hover:border-indigo-400/50 hover:bg-slate-900 cursor-pointer transition-all' : ''
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
                {user.fullName?.charAt(0).toUpperCase() ||
                  user.username?.charAt(0).toUpperCase() ||
                  'V'}
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-xs font-semibold text-white truncate leading-tight">
                  {user.fullName || (user.username ? `@${user.username}` : 'Vicente')}
                </span>
                <span className="text-[10px] font-medium text-indigo-400/90 uppercase tracking-wider truncate">
                  Estudiante
                </span>
              </div>
            </div>
            {onOpenAccountModal && (
              <Sliders className="w-3.5 h-3.5 text-slate-400 hover:text-white flex-shrink-0" />
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span>{works.length} {works.length === 1 ? 'trabajo' : 'trabajos'}</span>
          <span className="text-indigo-300 font-medium">{syncStatusLabel}</span>
        </div>
      </div>
    </aside>
  );
};
