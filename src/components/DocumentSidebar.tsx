import React, { useRef, useState } from 'react';
import {
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  Presentation,
  Trash2,
  UploadCloud,
  FileSpreadsheet,
} from 'lucide-react';
import { DocumentRecord, FolderColor, FolderRecord } from '../types/studyflow';
import { FOLDER_COLOR_CLASSES, formatFileSize } from '../lib/documentUtils';

interface DocumentSidebarProps {
  folders: FolderRecord[];
  documents: DocumentRecord[];
  activeDocId: string | null;
  selectedFolderFilter: string; // 'all' | 'unassigned' | folder.id
  isUploading: boolean;
  syncStatusLabel: string;
  onSelectFolderFilter: (filterId: string) => void;
  onCreateFolder: (name: string, color: FolderColor) => Promise<void>;
  onDeleteFolder: (folder: FolderRecord) => void;
  onUploadFiles: (files: FileList) => Promise<void>;
  onOpenDocument: (docId: string) => void;
  onMoveDocumentToFolder: (docId: string, folderId: string | null) => Promise<void>;
  onDeleteDocument: (doc: DocumentRecord) => void;
}

const FOLDER_COLORS: FolderColor[] = [
  'indigo',
  'emerald',
  'amber',
  'sky',
  'purple',
  'rose',
];

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  folders,
  documents,
  activeDocId,
  selectedFolderFilter,
  isUploading,
  syncStatusLabel,
  onSelectFolderFilter,
  onCreateFolder,
  onDeleteFolder,
  onUploadFiles,
  onOpenDocument,
  onMoveDocumentToFolder,
  onDeleteDocument,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<FolderColor>('indigo');
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const filteredDocs = documents.filter((doc) => {
    if (selectedFolderFilter === 'all') return true;
    if (selectedFolderFilter === 'unassigned') return !doc.folderId;
    return doc.folderId === selectedFolderFilter;
  });

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
    setDragOverFolderId(null);
    const docId = e.dataTransfer.getData('application/x-studyflow-doc');
    if (docId) {
      await onMoveDocumentToFolder(docId, targetFolderId);
    }
  };

  const renderDocIcon = (doc: DocumentRecord, active: boolean) => {
    const colorClass = active
      ? 'bg-indigo-600 text-white'
      : doc.fileType === 'pptx'
        ? 'bg-amber-500/15 text-amber-400'
        : doc.fileType === 'docx'
          ? 'bg-sky-500/15 text-sky-400'
          : 'bg-slate-800 text-slate-300';

    return (
      <div
        className={`w-7 h-7 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0 mt-0.5`}
      >
        {doc.fileType === 'pptx' ? (
          <Presentation className="w-4 h-4" />
        ) : doc.fileType === 'docx' ? (
          <FileSpreadsheet className="w-4 h-4" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
      </div>
    );
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 border-r border-slate-800 bg-slate-900/60 flex flex-col flex-shrink-0 h-2/5 md:h-full overflow-hidden">
      {/* Subida de archivos */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Material de Estudio
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {documents.length} docs
          </span>
        </div>

        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
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
              void onUploadFiles(e.dataTransfer.files);
            }
          }}
          className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-colors ${
            isDragOverUpload
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-700 hover:border-indigo-500 bg-slate-950/40'
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
                void onUploadFiles(e.target.files);
              }
              e.target.value = '';
            }}
          />
          <div className="flex flex-col items-center pointer-events-none">
            {isUploading ? (
              <Loader2 className="w-7 h-7 text-indigo-400 mb-1 animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7 text-indigo-400 mb-1" />
            )}
            <p className="text-xs font-medium text-slate-200">
              {isUploading ? 'Procesando archivo...' : 'Arrastra PDF, DOCX o PPTX'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Soporta apuntes, guías y diapositivas
            </p>
          </div>
        </div>
      </div>

      {/* Carpetas / Ramos */}
      <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-950/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Carpetas / Ramos
          </span>
          <button
            type="button"
            onClick={() => setShowNewFolderForm((v) => !v)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Nueva</span>
          </button>
        </div>

        {showNewFolderForm && (
          <form
            onSubmit={handleCreateFolderSubmit}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 space-y-2 fade-in"
          >
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ej. Cálculo II, Anatomía..."
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewFolderColor(c)}
                    className={`w-4 h-4 rounded-full ${FOLDER_COLOR_CLASSES[c].dot} ${
                      newFolderColor === c ? 'ring-2 ring-white scale-110' : 'opacity-65'
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

        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          <button
            type="button"
            onClick={() => onSelectFolderFilter('all')}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
              selectedFolderFilter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            Todos ({documents.length})
          </button>

          <button
            type="button"
            onClick={() => onSelectFolderFilter('unassigned')}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverFolderId('unassigned');
            }}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={(e) => void handleFolderDrop(e, null)}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
              selectedFolderFilter === 'unassigned'
                ? 'bg-slate-700 text-white border-slate-500'
                : dragOverFolderId === 'unassigned'
                  ? 'bg-indigo-500/20 border-indigo-400 text-white'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            Sin carpeta ({documents.filter((d) => !d.folderId).length})
          </button>

          {folders.map((folder) => {
            const count = documents.filter((d) => d.folderId === folder.id).length;
            const active = selectedFolderFilter === folder.id;
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
                className={`group inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  active
                    ? 'bg-indigo-600/25 text-white border-indigo-500'
                    : dragOverFolderId === folder.id
                      ? 'bg-indigo-500/20 border-indigo-400 text-white'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
                onClick={() => onSelectFolderFilter(folder.id)}
              >
                <span className={`w-2 h-2 rounded-full ${colorCfg.dot}`} />
                <Folder className="w-3 h-3 opacity-70" />
                <span className="truncate max-w-[100px]">{folder.name}</span>
                <span className="font-mono text-[10px] opacity-70">({count})</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder);
                  }}
                  title="Eliminar carpeta"
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 ml-0.5 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de Documentos */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-400">
            <FileText className="w-9 h-9 mx-auto text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-400">
              {documents.length === 0
                ? 'Sin documentos cargados'
                : 'No hay archivos en esta carpeta'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Sube archivos PDF, DOCX o PPTX para leer, fijar post-its y planificar tu ruta.
            </p>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isActive = doc.id === activeDocId;
            const folder = folders.find((f) => f.id === doc.folderId);
            const progressPct = Math.min(
              100,
              Math.round(((doc.currentPage || 1) / Math.max(1, doc.pageCount)) * 100)
            );

            return (
              <div
                key={doc.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-studyflow-doc', doc.id);
                }}
                className={`p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-950/50'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex items-start space-x-2.5 min-w-0 flex-1 cursor-pointer"
                    onClick={() => onOpenDocument(doc.id)}
                  >
                    {renderDocIcon(doc, isActive)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4
                          className="text-xs font-semibold text-white truncate"
                          title={doc.name}
                        >
                          {doc.name}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 mt-0.5">
                        <span className="uppercase font-mono px-1 rounded bg-slate-800 text-slate-300">
                          {doc.fileType}
                        </span>
                        <span className="font-mono">
                          {doc.currentPage}/{doc.pageCount}{' '}
                          {doc.fileType === 'pptx' ? 'slides' : 'págs'}
                        </span>
                        <span>•</span>
                        <span>{formatFileSize(doc.size)}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteDocument(doc)}
                    title="Eliminar documento"
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Selector rapido de carpeta */}
                <div className="mt-2 pt-2 border-t border-slate-800/70 flex items-center justify-between gap-2">
                  {folder ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border truncate max-w-[130px] ${
                        FOLDER_COLOR_CLASSES[folder.color || 'indigo'].badge
                      }`}
                    >
                      {folder.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Sin carpeta</span>
                  )}

                  <select
                    value={doc.folderId || ''}
                    onChange={(e) =>
                      void onMoveDocumentToFolder(doc.id, e.target.value || null)
                    }
                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none focus:border-indigo-500 max-w-[140px]"
                    title="Asignar carpeta o ramo"
                  >
                    <option value="">Sin carpeta</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Estado de almacenamiento */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>Almacenamiento: IndexedDB</span>
        <span className="text-slate-300 font-medium">{syncStatusLabel}</span>
      </div>
    </aside>
  );
};

