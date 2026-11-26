import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilePlus,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Pencil,
  PenTool,
  Plus,
  Search,
  Share2,
  Sliders,
  Sparkles,
  Target,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { FolderColor, FolderRecord, StudyWorkDraft, UserProfile } from '../../types/studyflow';
import { FOLDER_COLOR_CLASSES } from '../../lib/documentUtils';

const FOLDER_COLORS: FolderColor[] = [
  'indigo',
  'emerald',
  'amber',
  'rose',
  'sky',
  'purple',
];

interface WorksSidebarProps {
  works: StudyWorkDraft[];
  folders?: FolderRecord[];
  activeWorkId: string | null;
  onSelectWork: (id: string | null) => void;
  onCreateNewWork: () => void;
  onDeleteWork: (id: string) => void;
  onRenameWork?: (id: string, newTitle: string) => void;
  onShareWork?: (work: StudyWorkDraft) => void;
  onCreateFolder?: (name: string, color: FolderColor) => Promise<void>;
  onDeleteFolder?: (folder: FolderRecord) => void;
  onMoveWorkToFolder?: (workId: string, folderId: string | null) => Promise<void>;
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
  folders = [],
  activeWorkId,
  onSelectWork,
  onCreateNewWork,
  onDeleteWork,
  onRenameWork,
  onShareWork,
  onCreateFolder,
  onDeleteFolder,
  onMoveWorkToFolder,
  onCloseDrawer,
  onOpenTemplates,
  onOpenImportModal,
  onExportToReadings,
  user,
  onOpenAccountModal,
  syncStatusLabel = 'Nube activa',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<FolderColor>('indigo');
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [moveMenuWorkId, setMoveMenuWorkId] = useState<string | null>(null);

  // Orden consistente y estable: los trabajos más recientes arriba
  const sortedWorks = useMemo(() => {
    return [...works].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [works]);

  const filteredWorks = useMemo(
    () =>
      sortedWorks.filter((w) =>
        (w.title || '').toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [sortedWorks, searchQuery]
  );

  const validFolderIds = useMemo(() => new Set(folders.map((f) => f.id)), [folders]);

  const worksByFolder = useMemo(() => {
    const map = new Map<string | null, StudyWorkDraft[]>();
    map.set(null, []);
    for (const f of folders) {
      map.set(f.id, []);
    }
    for (const w of filteredWorks) {
      const key = w.folderId && validFolderIds.has(w.folderId) ? w.folderId : null;
      const list = map.get(key) || [];
      list.push(w);
      map.set(key, list);
    }
    return map;
  }, [filteredWorks, folders, validFolderIds]);

  const toggleFolderExpanded = (folderKey: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderKey]: !prev[folderKey],
    }));
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed || !onCreateFolder) return;
    await onCreateFolder(trimmed, newFolderColor);
    setNewFolderName('');
    setShowNewFolderForm(false);
  };

  const handleFolderDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    const workId = e.dataTransfer.getData('application/x-studyflow-work');
    if (workId && onMoveWorkToFolder) {
      await onMoveWorkToFolder(workId, targetFolderId);
      if (targetFolderId) {
        setCollapsedFolders((prev) => ({ ...prev, [targetFolderId]: false }));
      }
    }
  };

  const handleStartRename = (e: React.MouseEvent, work: StudyWorkDraft) => {
    e.stopPropagation();
    setEditingWorkId(work.id);
    setEditingTitle(work.title || 'Trabajo sin título');
  };

  const handleSaveRename = (workId: string) => {
    const trimmed = editingTitle.trim() || 'Trabajo sin título';
    onRenameWork?.(workId, trimmed);
    setEditingWorkId(null);
  };

  const handleCancelRename = () => {
    setEditingWorkId(null);
  };

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

        {works.length > 0 || folders.length > 0 ? (
          <div className="pt-2 flex items-center justify-between px-1 mb-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Mis Redacciones ({filteredWorks.length})
            </div>
            {onCreateFolder && (
              <button
                type="button"
                onClick={() => setShowNewFolderForm((v) => !v)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-[10px] font-semibold text-indigo-300 transition-colors"
                title="Nueva carpeta para ordenar redacciones"
              >
                <Plus className="w-3 h-3" />
                <span>Carpeta</span>
              </button>
            )}
          </div>
        ) : null}

        {showNewFolderForm && onCreateFolder && (
          <form
            onSubmit={handleCreateFolderSubmit}
            className="p-2.5 rounded-xl bg-slate-900/95 border border-indigo-500/35 space-y-2"
          >
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nombre de la carpeta..."
              autoFocus
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewFolderColor(c)}
                    className={`w-3.5 h-3.5 rounded-full ${FOLDER_COLOR_CLASSES[c].dot} ${
                      newFolderColor === c ? 'ring-2 ring-white scale-110' : 'opacity-65'
                    }`}
                    title={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowNewFolderForm(false)}
                  className="px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold"
                >
                  Crear
                </button>
              </div>
            </div>
          </form>
        )}

        {filteredWorks.length === 0 && folders.length === 0 ? (
          <div className="text-center py-6 px-3 text-slate-500 space-y-2">
            <FileText className="w-7 h-7 mx-auto text-slate-600 opacity-60" />
            <p className="text-xs font-medium text-slate-400">Sin borradores guardados</p>
            <p className="text-[11px] text-slate-500">
              Selecciona una plantilla en el panel de la derecha para comenzar.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              const renderWorkCard = (work: StudyWorkDraft) => {
                const isActive = work.id === activeWorkId;
                const isMoveOpen = moveMenuWorkId === work.id;
                const targetPct =
                  work.targetWordCount && work.targetWordCount > 0
                    ? Math.min(100, Math.round((work.wordCount / work.targetWordCount) * 100))
                    : null;

                return (
                  <div key={work.id} className="relative">
                    <div
                      draggable={Boolean(onMoveWorkToFolder)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/x-studyflow-work', work.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={() => onSelectWork(work.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer group space-y-1.5 ${
                        isActive
                          ? 'bg-indigo-500/20 border-indigo-400/90 ring-1 ring-indigo-500/40 shadow-sm'
                          : 'bg-slate-900/85 border-indigo-500/20 hover:border-indigo-400/50 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        {editingWorkId === work.id ? (
                          <div
                            className="flex items-center gap-1.5 flex-1 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveRename(work.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelRename();
                                }
                              }}
                              autoFocus
                              placeholder="Nombre del documento..."
                              className="flex-1 bg-slate-950 border border-indigo-400 rounded-lg px-2 py-0.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-400 font-semibold"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveRename(work.id);
                              }}
                              className="p-1 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                              title="Guardar nombre"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelRename();
                              }}
                              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div
                              className="flex items-center gap-1.5 min-w-0 flex-1"
                              onDoubleClick={(e) => handleStartRename(e, work)}
                              title="Doble clic para renombrar"
                            >
                              {onMoveWorkToFolder && (
                                <span
                                  className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing flex-shrink-0"
                                  title="Arrastra hacia otra carpeta"
                                >
                                  <GripVertical className="w-3 h-3" />
                                </span>
                              )}
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

                            <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 flex-shrink-0">
                              {onShareWork && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShareWork(work);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-teal-300 hover:bg-slate-800"
                                  title="Compartir redacción (en vivo o copia)"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onMoveWorkToFolder && folders.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMoveMenuWorkId((prev) =>
                                      prev === work.id ? null : work.id
                                    );
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                                  title="Mover a carpeta"
                                >
                                  <FolderInput className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => handleStartRename(e, work)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800"
                                title="Renombrar trabajo"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
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
                                title={
                                  work.isShared
                                    ? 'Salir de redacción compartida'
                                    : 'Eliminar trabajo'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono truncate">
                            {work.wordCount} {work.wordCount === 1 ? 'palabra' : 'palabras'}
                          </span>
                          {work.paperSize && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/15 border border-indigo-500/25 text-[9px] font-mono text-indigo-300 uppercase shrink-0">
                              {work.paperSize === 'legal'
                                ? 'Oficio'
                                : work.paperSize === 'a4'
                                  ? 'A4'
                                  : 'Carta'}
                            </span>
                          )}
                          {work.isShared && (
                            <span
                              className="px-1.5 py-0.2 rounded bg-teal-500/15 border border-teal-500/30 text-[9px] font-medium text-teal-300 flex items-center gap-0.5 shrink-0"
                              title={
                                work.ownerUsername
                                  ? `Compartido por @${work.ownerUsername}`
                                  : 'Redacción colaborativa'
                              }
                            >
                              <Users className="w-2.5 h-2.5 text-teal-400" />
                              <span>Colab{work.ownerUsername ? ` @${work.ownerUsername}` : ''}</span>
                            </span>
                          )}
                        </div>
                        <span>{new Date(work.updatedAt).toLocaleDateString('es-ES')}</span>
                      </div>

                      {targetPct !== null && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Target className="w-3 h-3 text-indigo-400" />
                              <span>Meta {work.targetWordCount}</span>
                            </span>
                            <span className="font-mono text-indigo-300 font-semibold">
                              {targetPct}%
                            </span>
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

                    {isMoveOpen && onMoveWorkToFolder && (
                      <div
                        className="mt-1 p-1.5 rounded-xl bg-slate-950 border border-indigo-500/35 shadow-xl space-y-0.5 z-20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-[10px] font-semibold text-slate-400 px-2 py-0.5">
                          Mover a carpeta:
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void onMoveWorkToFolder(work.id, null);
                            setMoveMenuWorkId(null);
                          }}
                          className={`w-full text-left px-2 py-1 rounded-lg text-[11px] flex items-center justify-between ${
                            !work.folderId
                              ? 'bg-indigo-600/25 text-indigo-200 font-semibold'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>Sin carpeta (Raíz)</span>
                          {!work.folderId && <Check className="w-3 h-3 text-indigo-400" />}
                        </button>
                        {folders.map((f) => {
                          const c = FOLDER_COLOR_CLASSES[f.color || 'indigo'];
                          const selected = work.folderId === f.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                void onMoveWorkToFolder(work.id, f.id);
                                setMoveMenuWorkId(null);
                              }}
                              className={`w-full text-left px-2 py-1 rounded-lg text-[11px] flex items-center justify-between gap-2 ${
                                selected
                                  ? 'bg-indigo-600/25 text-white font-semibold'
                                  : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <span className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                                <span className="truncate">{f.name}</span>
                              </span>
                              {selected && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              };

              const rootWorks = worksByFolder.get(null) || [];

              return (
                <>
                  {folders.map((folder) => {
                    const folderWorks = worksByFolder.get(folder.id) || [];
                    const isCollapsed = Boolean(collapsedFolders[folder.id]);
                    const colorCfg = FOLDER_COLOR_CLASSES[folder.color || 'indigo'];
                    const isDragTarget = dragOverFolderId === folder.id;

                    return (
                      <div
                        key={folder.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverFolderId(folder.id);
                        }}
                        onDragLeave={() => {
                          if (dragOverFolderId === folder.id) setDragOverFolderId(null);
                        }}
                        onDrop={(e) => void handleFolderDrop(e, folder.id)}
                        className={`rounded-xl border transition-colors ${
                          isDragTarget
                            ? 'border-indigo-400 bg-indigo-500/15'
                            : 'border-slate-800/80 bg-slate-900/40'
                        }`}
                      >
                        <div
                          onClick={() => toggleFolderExpanded(folder.id)}
                          className="flex items-center justify-between px-2.5 py-2 cursor-pointer group"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            {isCollapsed ? (
                              <Folder className={`w-3.5 h-3.5 ${colorCfg.iconText} shrink-0`} />
                            ) : (
                              <FolderOpen className={`w-3.5 h-3.5 ${colorCfg.iconText} shrink-0`} />
                            )}
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {folder.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 shrink-0">
                              ({folderWorks.length})
                            </span>
                          </div>
                          {onDeleteFolder && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteFolder(folder);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Eliminar carpeta"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {!isCollapsed && (
                          <div className="px-2 pb-2 space-y-1.5">
                            {folderWorks.length === 0 ? (
                              <div className="text-[10px] text-slate-500 italic px-2 py-1.5">
                                Arrastra o mueve una redacción aquí
                              </div>
                            ) : (
                              folderWorks.map(renderWorkCard)
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Trabajos sin carpeta */}
                  {(rootWorks.length > 0 || folders.length > 0) && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverFolderId('__root__');
                      }}
                      onDragLeave={() => {
                        if (dragOverFolderId === '__root__') setDragOverFolderId(null);
                      }}
                      onDrop={(e) => void handleFolderDrop(e, null)}
                      className={`space-y-1.5 rounded-xl transition-colors ${
                        dragOverFolderId === '__root__'
                          ? 'bg-indigo-500/10 ring-1 ring-indigo-400/50 p-1.5'
                          : ''
                      }`}
                    >
                      {folders.length > 0 && (
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-1 pt-1">
                          Sin carpeta ({rootWorks.length})
                        </div>
                      )}
                      {rootWorks.map(renderWorkCard)}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
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
