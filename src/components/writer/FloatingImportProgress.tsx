import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileCode,
  FileSpreadsheet,
  FileText,
  Loader2,
  Presentation,
  X,
} from 'lucide-react';
import { ImportProgressState } from '../../lib/documentImportEngine';

interface FloatingImportProgressProps {
  progress: ImportProgressState | null;
  onDismiss: () => void;
}

export const FloatingImportProgress: React.FC<FloatingImportProgressProps> = ({
  progress,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (progress) {
      setIsVisible(true);

      // Si se completó el 100%, iniciar temporizador de auto-cierre suave a los 3 segundos
      if (progress.isComplete || progress.percent >= 100) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => {
            onDismiss();
          }, 400); // Dar tiempo a la animación de desvanecimiento
        }, 3000);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [progress, onDismiss]);

  if (!progress || !isVisible) return null;

  const getFileIcon = () => {
    switch (progress.fileType) {
      case 'md':
      case 'markdown':
        return <FileCode className="w-4 h-4 text-emerald-400" />;
      case 'docx':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'pptx':
        return <Presentation className="w-4 h-4 text-amber-400" />;
      case 'pdf':
        return <FileSpreadsheet className="w-4 h-4 text-rose-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const isDone = progress.isComplete || progress.percent >= 100;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 w-80 max-w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
    >
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-2xl p-3.5 space-y-2.5 text-slate-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/70 flex items-center justify-center shrink-0">
              {getFileIcon()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate" title={progress.fileName}>
                {progress.fileName}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {progress.statusText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isDone ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            )}
            <button
              type="button"
              onClick={() => {
                setIsVisible(false);
                setTimeout(onDismiss, 200);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>
              {progress.totalBlocks > 1
                ? `Bloque ${progress.currentBlock} / ${progress.totalBlocks}`
                : isDone
                ? 'Listo en el editor'
                : 'Interpretando...'}
            </span>
            <span className={isDone ? 'text-emerald-400 font-bold' : 'text-indigo-300 font-bold'}>
              {Math.min(100, Math.max(0, progress.percent))}%
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/40">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isDone
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, progress.percent))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

