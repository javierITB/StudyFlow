import React, { useState, useEffect, useRef } from 'react';
import {
  FileCode,
  FileSpreadsheet,
  FileText,
  Presentation,
  UploadCloud,
  X,
  Sparkles,
  BookOpen,
  FileCheck2,
} from 'lucide-react';
import {
  AcademicStyleProfile,
} from '../../lib/markdownParser';
import {
  cleanDocumentTitle,
  detectImportableType,
  ImportableExtension,
} from '../../lib/documentImportEngine';

interface ImportDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  droppedFile?: File | null;
  onConfirmImport: (
    file: File,
    options: {
      title: string;
      profile: AcademicStyleProfile;
      paperSize: 'letter' | 'legal' | 'a4';
    }
  ) => void;
}

export const ImportDocumentModal: React.FC<ImportDocumentModalProps> = ({
  isOpen,
  onClose,
  droppedFile,
  onConfirmImport,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(droppedFile || null);
  const [title, setTitle] = useState('');
  const [profile, setProfile] = useState<AcademicStyleProfile>('apa7');
  const [paperSize, setPaperSize] = useState<'letter' | 'legal' | 'a4'>('letter');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (droppedFile) {
      setSelectedFile(droppedFile);
      setTitle(cleanDocumentTitle(droppedFile.name));
    }
  }, [droppedFile]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      setTitle(cleanDocumentTitle(f.name));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setSelectedFile(f);
      setTitle(cleanDocumentTitle(f.name));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    onConfirmImport(selectedFile, {
      title: title.trim() || cleanDocumentTitle(selectedFile.name),
      profile,
      paperSize,
    });
    onClose();
  };

  const detectedType: ImportableExtension | null = selectedFile
    ? detectImportableType(selectedFile.name)
    : null;

  const getFormatBadge = () => {
    if (!detectedType) return null;
    switch (detectedType) {
      case 'md':
      case 'markdown':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <FileCode className="w-3 h-3" /> Markdown (.md)
          </span>
        );
      case 'docx':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono">
            <FileText className="w-3 h-3" /> Word (.docx)
          </span>
        );
      case 'pdf':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
            <FileSpreadsheet className="w-3 h-3" /> Documento (.pdf)
          </span>
        );
      case 'pptx':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono">
            <Presentation className="w-3 h-3" /> Diapositivas (.pptx)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-300 text-xs font-mono">
            <FileText className="w-3 h-3" /> Texto plano (.txt)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold">
              <Sparkles className="w-3 h-3" />
              <span>Importación Progresiva</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Importar Documento al Taller
            </h2>
            <p className="text-xs text-slate-400">
              Convierte archivos .md, .docx, .pdf o .pptx en un nuevo borrador editable de StudyFlow.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Zona de Selección o Carga de Archivo */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-indigo-400 bg-indigo-500/10'
                  : 'border-slate-700 hover:border-indigo-500/60 bg-slate-950/40 hover:bg-slate-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.docx,.pdf,.pptx,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center pointer-events-none space-y-2">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Haz clic para seleccionar o arrastra tu archivo
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Soporta <span className="text-emerald-400 font-mono">.md</span>,{' '}
                    <span className="text-indigo-400 font-mono">.docx</span>,{' '}
                    <span className="text-rose-400 font-mono">.pdf</span>,{' '}
                    <span className="text-amber-400 font-mono">.pptx</span> o .txt
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{selectedFile.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getFormatBadge()}
                    <span className="text-[11px] font-mono text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-xs text-slate-400 hover:text-rose-400 underline shrink-0 px-2 py-1"
              >
                Cambiar archivo
              </button>
            </div>
          )}

          {/* Configuración del Borrador */}
          {selectedFile && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Título del Trabajo
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Ensayo de Metodología de la Investigación"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Selector de Perfil de Formato Académico */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Perfil de Formato & Estilos
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setProfile('apa7')}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      profile === 'apa7'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> APA 7
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Citas académicas, jerarquía formal y sangría
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProfile('ieee')}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      profile === 'ieee'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1">
                      <FileCode className="w-3.5 h-3.5 text-cyan-400" /> IEEE
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Encabezados compactos y perfil técnico
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProfile('clean')}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      profile === 'clean'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" /> Limpio
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Interlineado contemporáneo minimalista
                    </span>
                  </button>
                </div>
              </div>

              {/* Selector de Tamaño de Papel */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Formato de Hoja
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaperSize('letter')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                      paperSize === 'letter'
                        ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Carta (216 × 279 mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('a4')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                      paperSize === 'a4'
                        ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    A4 (210 × 297 mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('legal')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                      paperSize === 'legal'
                        ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Oficio (216 × 356 mm)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedFile}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Comenzar Redacción</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

