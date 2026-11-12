import React, { useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Loader2,
  PanelLeftClose,
  Presentation,
  Route,
  Share2,
  Sliders,
  Trash2,
  UploadCloud,
  Users,
} from 'lucide-react';
import {
  DocumentRecord,
  FolderColor,
  FolderRecord,
  RouteStep,
  StudyPlanResult,
} from '../types/studyflow';
import { FOLDER_COLOR_CLASSES, formatFileSize } from '../lib/documentUtils';
import { RouteTimeline } from './RouteTimeline';

interface DocumentSidebarProps {
  folders: FolderRecord[];
  documents: DocumentRecord[];
  sharedDocuments?: DocumentRecord[];
  activeDocId: string | null;
  speedMinPerPage: number;
  isUploading: boolean;
  syncStatusLabel: string;
  planResult: StudyPlanResult;
  activeRouteStepId: string | null;
  onCreateFolder: (name: string, color: FolderColor) => Promise<void>;
  onDeleteFolder: (folder: FolderRecord) => void;
  onUploadFiles: (files: FileList, targetFolderId?: string | null) => Promise<void>;
  onOpenDocument: (docId: string) => void;
  onMoveDocumentToFolder: (docId: string, folderId: string | null) => Promise<void>;
  onDeleteDocument: (doc: DocumentRecord) => void;
  onShareDocument?: (doc: DocumentRecord) => void;
  onStartRouteStep: (step: RouteStep, nextStep: RouteStep | null) => void;
  onToggleStepCompleted: (stepId: string) => Promise<void>;
  onOpenPlannerTab: () => void;
  onCloseDrawer?: () => void;
}

const FOLDER_COLORS: FolderColor[] = [
  'indigo',
  'emerald',
  'amber',
  'sky',
  'purple',
  'rose',
];

function formatAcademicTime(pages: number, speedMinPerPage: number): string {
  const mins = Math.round(pages * Math.max(0.5, speedMinPerPage));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  folders,
  documents,
  sharedDocuments = [],
  activeDocId,
  speedMinPerPage,
  isUploading,
  syncStatusLabel,
  planResult,
  activeRouteStepId,
  onCreateFolder,
  onDeleteFolder,
  onUploadFiles,
  onOpenDocument,
  onMoveDocumentToFolder,
  onDeleteDocument,
  onShareDocument,
  onStartRouteStep,
  onToggleStepCompleted,
  onOpenPlannerTab,
  onCloseDrawer,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadFolderTargetRef = useRef<string | null>(null);

  const [sidebarTab, setSidebarTab] = useState<'files' | 'route'>('files');
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<FolderColor>('indigo');
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Estado colapsado por carpeta (por defecto todas abiertas para ver las hojas agrupadas)
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [moveMenuDocId, setMoveMenuDocId] = useState<string | null>(null);

  const unassignedDocs = useMemo(
    () => documents.filter((d) => !d.folderId),
    [documents]
  );

  const totalPagesAll = useMemo(
    () => documents.reduce((acc, d) => acc + (d.pageCount || 0), 0),
    [documents]
  );

  const studySteps = useMemo(
    () => planResult.steps.filter((s) => s.type === 'study'),
    [planResult.steps]
  );
  const completedStudyStepsCount = studySteps.filter((s) => s.completed).length;

  const toggleFolderExpanded = (folderKey: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderKey]: !prev[folderKey],
    }));
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    await onCreateFolder(trimmed, newFolderColor);
    setNewFolderName('');
    setShowNewFolderForm(false);
  };

  const handleFolderDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    const internalDocId = e.dataTransfer.getData('application/x-studyflow-doc');
    if (internalDocId) {
      await onMoveDocumentToFolder(internalDocId, targetFolderId);
      if (targetFolderId) {
        setCollapsedFolders((prev) => ({ ...prev, [targetFolderId]: false }));
      }
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onUploadFiles(e.dataTransfer.files, targetFolderId);
      if (targetFolderId) {
        setCollapsedFolders((prev) => ({ ...prev, [targetFolderId]: false }));
      }
    }
  };

  const triggerUploadIntoFolder = (folderId: string | null) => {
    if (isUploading) return;
    uploadFolderTargetRef.current = folderId;
    fileInputRef.current?.click();
  };

  const renderDocIcon = (doc: DocumentRecord, active: boolean) => {
    const colorClass = active
      ? 'bg-indigo-600 text-white'
      : doc.fileType === 'pptx'
        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
        : doc.fileType === 'docx'
          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
          : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/35';

    return (
      <div
        className={`w-6 h-6 rounded-md ${colorClass} flex items-center justify-center flex-shrink-0`}
      >
        {doc.fileType === 'pptx' ? (
          <Presentation className="w-3.5 h-3.5" />
        ) : doc.fileType === 'docx' ? (
          <FileSpreadsheet className="w-3.5 h-3.5" />
        ) : (
          <FileText className="w-3.5 h-3.5" />
        )}
      </div>
    );
  };

  const renderDocumentLeaf = (doc: DocumentRecord) => {
    const isActive = doc.id === activeDocId;
    const progressPct = Math.min(
      100,
      Math.round(((doc.currentPage || 1) / Math.max(1, doc.pageCount)) * 100)
    );
    const isMoveOpen = moveMenuDocId === doc.id;

    return (
      <div key={doc.id} className="relative">
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-studyflow-doc', doc.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
          className={`group relative rounded-lg border px-2.5 py-2 transition-all ${isActive
              ? 'bg-indigo-500/20 border-indigo-400/90 ring-1 ring-indigo-500/45 shadow-sm'
              : 'bg-slate-900/85 border-indigo-500/20 hover:border-indigo-400/60 hover:bg-indigo-500/5'
            }`}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing flex-shrink-0"
              title="Arrastra hacia otra carpeta"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>

            <div
              onClick={() => onOpenDocument(doc.id)}
              className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
            >
              {renderDocIcon(doc, isActive)}
              <div className="min-w-0 flex-1">
                <h4
                  className="text-[11px] font-semibold text-slate-100 truncate leading-tight"
                  title={doc.name}
                >
                  {doc.name}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                  <span className="uppercase font-mono text-[9px] px-1.5 rounded bg-indigo-500/15 text-indigo-200 border border-indigo-500/30">
                    {doc.fileType}
                  </span>
                  <span className="font-mono">
                    {doc.currentPage}/{doc.pageCount}{' '}
                    {doc.fileType === 'pptx' ? 'slides' : 'págs'}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span>{formatFileSize(doc.size)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0">
              {onShareDocument && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShareDocument(doc);
                  }}
                  title="Compartir documento o iniciar sesión colaborativa"
                  className="p-1.5 sm:p-1 rounded text-slate-400 hover:text-emerald-300 hover:bg-slate-800 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveMenuDocId(isMoveOpen ? null : doc.id);
                }}
                title="Mover a otra carpeta"
                className="p-1.5 sm:p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
              >
                <FolderInput className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteDocument(doc);
                }}
                title="Eliminar documento"
                className="p-1.5 sm:p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="w-full h-1 bg-slate-800/80 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Menu rapido contextual para mover sin tener dropdown fijo en cada tarjeta */}
        {isMoveOpen && (
          <div className="mt-1 p-1.5 rounded-lg bg-slate-950 border border-slate-700 shadow-xl space-y-0.5 text-[11px] z-30 relative fade-in">
            <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Mover hoja a:
            </div>
            <button
              type="button"
              onClick={() => {
                setMoveMenuDocId(null);
                void onMoveDocumentToFolder(doc.id, null);
              }}
              className={`w-full text-left px-2 py-1 rounded flex items-center justify-between ${!doc.folderId
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800/70'
                }`}
            >
              <span>Sin carpeta</span>
              {!doc.folderId && <Check className="w-3 h-3 text-indigo-400" />}
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setMoveMenuDocId(null);
                  void onMoveDocumentToFolder(doc.id, f.id);
                }}
                className={`w-full text-left px-2 py-1 rounded flex items-center justify-between ${doc.folderId === f.id
                    ? 'bg-indigo-600/30 text-white'
                    : 'text-slate-300 hover:bg-slate-800/70'
                  }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    className={`w-2 h-2 rounded-full ${FOLDER_COLOR_CLASSES[f.color || 'indigo'].dot
                      }`}
                  />
                  <span className="truncate">{f.name}</span>
                </span>
                {doc.folderId === f.id && <Check className="w-3 h-3 text-indigo-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-full h-full sf-sidebar-chrome backdrop-blur-md flex flex-col overflow-hidden">
      {/* Cabecera superior de marca integrada (alineada con la altura del Navbar) */}
      <div className="h-12 xl:h-14 sf-header-chrome border-b border-indigo-500/20 px-3 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 flex-shrink-0">
            <BookOpen className="w-4 h-4 xl:w-5 xl:h-5 text-white" />
          </div>
          <span className="text-sm xl:text-base font-bold tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap truncate">
            <span>StudyFlow</span>
            <span className="inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              2.0
            </span>
          </span>
        </div>
        {onCloseDrawer && (
          <button
            type="button"
            onClick={onCloseDrawer}
            title="Colapsar panel lateral"
            aria-label="Colapsar panel lateral"
            className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-500/20 border border-indigo-500/35 hover:border-indigo-400 text-indigo-300 flex-shrink-0 transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Switch Compacto Archivos | Ruta del Plan */}
      <div className="px-3 pt-2.5 pb-2 border-b border-indigo-500/25 bg-slate-900/60 flex items-center gap-2">
        <div className="flex-1 grid grid-cols-2 gap-1 bg-slate-950/80 p-1 rounded-xl border border-indigo-500/30">
          <button
            type="button"
            onClick={() => setSidebarTab('files')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${sidebarTab === 'files'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
              }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Archivos ({documents.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('route')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${sidebarTab === 'route'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
              }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>
              Ruta ({completedStudyStepsCount}/{studySteps.length})
            </span>
          </button>
        </div>
      </div>

      {sidebarTab === 'files' ? (
        <>
          {/* Subida de archivos */}
          <div
            data-tour-id="tour-sidebar-upload"
            className="p-3 border-b border-slate-800 space-y-2.5"
          >
            <div
              onClick={() => triggerUploadIntoFolder(null)}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragOverUpload(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOverUpload(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOverUpload(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverUpload(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  void onUploadFiles(e.dataTransfer.files, null);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${isDragOverUpload
                  ? 'border-indigo-400 bg-indigo-500/15'
                  : 'border-indigo-500/35 hover:border-indigo-400 bg-indigo-500/[0.04] hover:bg-indigo-500/10'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const target = uploadFolderTargetRef.current;
                    uploadFolderTargetRef.current = null;
                    void onUploadFiles(e.target.files, target);
                  }
                  e.target.value = '';
                }}
              />
              <div className="flex flex-col items-center pointer-events-none">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-indigo-400 mb-1 animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6 text-indigo-400 mb-1" />
                )}
                <p className="text-xs font-medium text-slate-200">
                  {isUploading ? 'Procesando archivo...' : 'Arrastra PDF, DOCX o PPTX'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  O suéltalos directo sobre una carpeta
                </p>
              </div>
            </div>

            {/* Encabezado Carpetas + Carga academica total */}
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Carpetas / Ramos
                </span>
                {documents.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-400">
                    ({totalPagesAll} págs)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowNewFolderForm((v) => !v)}
                className="px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-[11px] text-indigo-300 flex items-center gap-1 font-medium transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Nueva carpeta</span>
              </button>
            </div>

            {showNewFolderForm && (
              <form
                onSubmit={handleCreateFolderSubmit}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-700 space-y-2 fade-in"
              >
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ej. Cálculo II, Derecho Civil..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {FOLDER_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewFolderColor(c)}
                        className={`w-4 h-4 rounded-full ${FOLDER_COLOR_CLASSES[c].dot} ${newFolderColor === c ? 'ring-2 ring-white scale-110' : 'opacity-65'
                          }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowNewFolderForm(false)}
                      className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="text-[10px] px-2.5 py-1 rounded bg-indigo-600 text-white font-semibold"
                    >
                      Crear
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Arbol vertical de Folders tipo archivador con hojas hacia abajo */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {documents.length === 0 && folders.length === 0 && sharedDocuments.length === 0 ? (
              <div className="text-center py-8 px-4 text-slate-400">
                <Folder className="w-9 h-9 mx-auto text-slate-600 mb-2" />
                <p className="text-xs font-medium text-slate-400">
                  Sin carpetas ni documentos todavía
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Crea carpetas para tus ramos y agrupa tus PDF, DOCX o PPTX debajo de cada una.
                </p>
              </div>
            ) : (
              <>
                {folders.map((folder) => {
                  const folderDocs = documents.filter((d) => d.folderId === folder.id);
                  const folderPages = folderDocs.reduce(
                    (acc, d) => acc + (d.pageCount || 0),
                    0
                  );
                  const readPages = folderDocs.reduce(
                    (acc, d) =>
                      acc + Math.min(d.pageCount || 1, Math.max(0, (d.currentPage || 1) - 1)),
                    0
                  );
                  const folderPct =
                    folderPages > 0 ? Math.round((readPages / folderPages) * 100) : 0;
                  const isCollapsed = Boolean(collapsedFolders[folder.id]);
                  const isDragTarget = dragOverFolderId === folder.id;
                  const colorCfg = FOLDER_COLOR_CLASSES[folder.color || 'indigo'];

                  return (
                    <div
                      key={folder.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverFolderId(folder.id);
                      }}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={(e) => void handleFolderDrop(e, folder.id)}
                      className="group/folder"
                    >
                      {/* Pestaña superior estética del folder integrada */}
                      <div
                        onClick={() => toggleFolderExpanded(folder.id)}
                        className="flex items-end cursor-pointer select-none"
                      >
                        <div
                          className={`h-2.5 w-20 rounded-t-lg border-t border-l border-r -mb-[1px] relative z-10 flex items-center px-2 transition-all ${
                            isDragTarget
                              ? 'border-indigo-400 bg-indigo-500/20'
                              : `${colorCfg.border} ${colorCfg.headerBg}`
                          }`}
                          style={{ backgroundColor: 'rgb(var(--sf-bg-panel))' }}
                        >
                          <div
                            className={`h-1 w-full rounded-full ${colorCfg.tabBg} opacity-90`}
                          />
                        </div>
                      </div>

                      {/* Cuerpo principal del Folder */}
                      <div
                        className={`rounded-xl !rounded-tl-none border transition-all overflow-hidden relative z-0 ${
                          isDragTarget
                            ? 'border-indigo-400 bg-indigo-500/15 ring-2 ring-indigo-500/40'
                            : `${colorCfg.border} ${colorCfg.headerBg}`
                        }`}
                      >
                        <div
                          onClick={() => toggleFolderExpanded(folder.id)}
                          className="p-2.5 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-slate-400 flex-shrink-0">
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </span>
                            {isCollapsed ? (
                              <Folder className={`w-4 h-4 flex-shrink-0 ${colorCfg.iconText}`} />
                            ) : (
                              <FolderOpen
                                className={`w-4 h-4 flex-shrink-0 ${colorCfg.iconText}`}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate">
                                  {folder.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-300/80 font-mono mt-0.5">
                                <span>
                                  {folderDocs.length}{' '}
                                  {folderDocs.length === 1 ? 'archivo' : 'archivos'}
                                </span>
                                <span>•</span>
                                <span>{folderPages} págs</span>
                                {folderPages > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-indigo-300">
                                      ~{formatAcademicTime(folderPages, speedMinPerPage)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerUploadIntoFolder(folder.id);
                              }}
                              title={`Subir archivos en "${folder.name}"`}
                              className="px-1.5 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-[10px] text-slate-300 opacity-100 lg:opacity-0 lg:group-hover/folder:opacity-100 transition-opacity"
                            >
                              + Subir
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteFolder(folder);
                              }}
                              title="Eliminar carpeta"
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-900/70 opacity-100 lg:opacity-0 lg:group-hover/folder:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

            {/* Barra de carga/avance del folder */}
            {folderPages > 0 && (
              <div className="px-2.5 pb-2">
                <div className="w-full h-1 bg-slate-950/70 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colorCfg.dot} transition-all`}
                    style={{ width: `${folderPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Hojas (documentos) apiladas dentro del folder */}
            {!isCollapsed && (
              <div className="px-2.5 pb-2.5 pt-1 bg-slate-950/45 border-t border-slate-800/70">
                {folderDocs.length === 0 ? (
                  <div className="py-3 text-center text-[11px] text-slate-500 border border-dashed border-slate-800 rounded-lg">
                    Arrastra hojas aquí para agrupar en {folder.name}
                  </div>
                ) : (
                  <div
                    className={`pl-2.5 border-l-2 ${colorCfg.guideBorder} space-y-1.5`}
                  >
                    {folderDocs.map((doc) => renderDocumentLeaf(doc))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
                })}

      {/* Carpeta de materiales sueltos / sin asignar */}
      {(unassignedDocs.length > 0 || folders.length > 0) && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverFolderId('unassigned');
          }}
          onDragLeave={() => setDragOverFolderId(null)}
          onDrop={(e) => void handleFolderDrop(e, null)}
        >
            {/* Pestaña superior estética integrada */}
            <div
              onClick={() => toggleFolderExpanded('unassigned')}
              className="flex items-end cursor-pointer select-none"
            >
              <div
                className={`h-2.5 w-16 rounded-t-lg border-t border-l border-r -mb-[1px] relative z-10 flex items-center px-2 transition-all ${dragOverFolderId === 'unassigned'
                    ? 'border-indigo-400 bg-indigo-500/20'
                    : 'border-indigo-500/35 bg-indigo-500/10'
                  }`}
                style={{ backgroundColor: 'rgb(var(--sf-bg-panel))' }}
              >
                <div className="h-1 w-full rounded-full bg-indigo-400/70" />
              </div>
            </div>
            <div
                    ? 'border-indigo-400 bg-indigo-500/15'
                    : 'border-indigo-500/30 bg-indigo-500/[0.05]'
                  }`}
                    >
                      <div
                        onClick={() => toggleFolderExpanded('unassigned')}
                        className="p-2.5 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-indigo-300">
                            {collapsedFolders['unassigned'] ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </span>
                          <Folder className="w-4 h-4 text-indigo-400" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-100 block">
                              Sin carpeta
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {unassignedDocs.length}{' '}
                              {unassignedDocs.length === 1 ? 'archivo' : 'archivos'} •{' '}
                              {unassignedDocs.reduce(
                                (acc, d) => acc + (d.pageCount || 0),
                                0
                              )}{' '}
                              págs
                            </span>
                          </div>
                        </div>
                      </div>

                      {!collapsedFolders['unassigned'] && unassignedDocs.length > 0 && (
                        <div className="px-2.5 pb-2.5 pt-1 bg-slate-950/35 border-t border-indigo-500/20">
                          <div className="pl-2.5 border-l-2 border-indigo-500/35 space-y-1.5">
                            {unassignedDocs.map((doc) => renderDocumentLeaf(doc))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sesiones colaborativas compartidas conmigo */}
                {sharedDocuments.length > 0 && (
                  <div>
                    {/* Pestaña superior estética integrada */}
                    <div
                      onClick={() =>
                        setCollapsedFolders((prev) => ({
                          ...prev,
                          shared_with_me: !prev.shared_with_me,
                        }))
                      }
                      className="flex items-end cursor-pointer select-none"
                    >
                      <div
                        className="h-2.5 w-20 rounded-t-lg border-t border-l border-r border-emerald-500/40 -mb-[1px] relative z-10 flex items-center px-2"
                        style={{ backgroundColor: 'rgb(var(--sf-bg-panel))' }}
                      >
                        <div className="h-1 w-full rounded-full bg-emerald-400/80" />
                      </div>
                    </div>
                    <div className="rounded-xl !rounded-tl-none border border-emerald-500/30 bg-emerald-950/15 overflow-hidden relative z-0">
                      <div
                        onClick={() =>
                          setCollapsedFolders((prev) => ({
                            ...prev,
                            shared_with_me: !prev.shared_with_me,
                          }))
                        }
                        className="p-2.5 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {collapsedFolders['shared_with_me'] ? (
                            <ChevronRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          )}
                          <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              Compartidos conmigo
                            </div>
                            <div className="text-[10px] text-emerald-300/80">
                              {sharedDocuments.length}{' '}
                              {sharedDocuments.length === 1
                                ? 'sesión colaborativa'
                                : 'sesiones colaborativas'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {!collapsedFolders['shared_with_me'] && (
                        <div className="px-2.5 pb-2.5 pt-1 bg-slate-950/45 border-t border-emerald-500/20 space-y-1.5">
                          {sharedDocuments.map((sDoc) => {
                            const isActive = sDoc.id === activeDocId;
                            return (
                              <div
                                key={sDoc.id}
                                onClick={() => {
                                  onOpenDocument(sDoc.id);
                                  onCloseDrawer?.();
                                }}
                                className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                  isActive
                ? 'bg-emerald-500/15 border-emerald-400/60'
                : 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40'
              }`}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="min-w-0 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                    <span className="text-xs font-medium text-white truncate">
                                      {sDoc.name}
                                    </span>
                                  </div>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                                    {sDoc.sharedRole === 'collaborator'
                                      ? 'Colaborador'
                                      : 'Lectura'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                                  <span>De @{sDoc.ownerUsername || 'compañero'}</span>
                                  <span>{sDoc.pageCount} págs</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        /* Pestaña integrada de Ruta del Plan dentro de la vista de lectura */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-medium">
                {completedStudyStepsCount} de {studySteps.length} bloques completados
              </span>
              <button
                type="button"
                onClick={onOpenPlannerTab}
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <Sliders className="w-3 h-3" />
                <span>Ajustar plan</span>
              </button>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{
                  width: `${studySteps.length > 0
                ? Math.round((completedStudyStepsCount / studySteps.length) * 100)
                : 0
              }%`,
          }}
        />
      </div>
      <p className="text-[10px] text-slate-400 leading-snug">
        {planResult.recommendation}
      </p>
    </div>

    <div className="flex-1 overflow-y-auto p-3">
      <RouteTimeline
        planResult={planResult}
        activeRouteStepId={activeRouteStepId}
        compact
        onStartRouteStep={onStartRouteStep}
        onToggleStepCompleted={onToggleStepCompleted}
      />
    </div>
  </div>
)}

{/* Estado de almacenamiento */ }
<div className="p-3 border-t border-indigo-500/25 bg-slate-900/90 flex items-center justify-between text-[11px] text-slate-400">
  <span>Almacenamiento: IndexedDB</span>
  <span className="text-indigo-300 font-medium">{syncStatusLabel}</span>
</div>
    </aside >
  );
};
