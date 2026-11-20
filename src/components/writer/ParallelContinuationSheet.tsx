import React, { useMemo, useState } from 'react';
import { Editor } from '@tiptap/react';
import { DOMSerializer } from '@tiptap/pm/model';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  X,
  FileText,
} from 'lucide-react';

interface ParallelContinuationSheetProps {
  currentPage: number;
  totalPages: number;
  paperFormat: 'letter' | 'legal' | 'a4';
  editor: Editor | null;
  breakPositions?: number[];
  onClose: () => void;
  onNavigateToPage?: (targetPage: number) => void;
  paperPixelWidth: number;
}

export const ParallelContinuationSheet: React.FC<ParallelContinuationSheetProps> = ({
  currentPage,
  totalPages,
  paperFormat,
  editor,
  breakPositions = [],
  onClose,
  onNavigateToPage,
  paperPixelWidth,
}) => {
  // Por defecto muestra la página inmediatamente siguiente (página actual + 1)
  const defaultPage = Math.min(totalPages, currentPage + 1);
  const [activeSpreadPage, setActiveSpreadPage] = useState<number>(defaultPage);

  // Sincronizar automáticamente si la página del editor principal avanza más allá
  const targetPage = useMemo(() => {
    if (activeSpreadPage <= currentPage && currentPage < totalPages) {
      return currentPage + 1;
    }
    return activeSpreadPage;
  }, [activeSpreadPage, currentPage, totalPages]);

  // Extraer el fragmento HTML exacto correspondiente a targetPage
  const pageHtml = useMemo(() => {
    if (!editor || !editor.state || !editor.state.doc) return '';

    const doc = editor.state.doc;
    const docSize = doc.content.size;

    if (targetPage > totalPages || totalPages <= 1) {
      return '';
    }

    // Posición inicial y final de la página targetPage
    // Si targetPage es 1: desde 0 hasta breakPositions[0]
    // Si targetPage es k: desde breakPositions[k-2] hasta breakPositions[k-1]
    const from = targetPage === 1 ? 0 : (breakPositions[targetPage - 2] ?? 0);
    const to =
      targetPage >= totalPages
        ? docSize
        : (breakPositions[targetPage - 1] ?? docSize);

    if (from >= to || from >= docSize) {
      return '';
    }

    try {
      const slice = doc.slice(from, Math.min(to, docSize));
      const serializer = DOMSerializer.fromSchema(editor.state.schema);
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(serializer.serializeFragment(slice.content));

      // Limpiar marcadores internos de salto para que no se dupliquen dentro de la vista de hoja
      const cleanedHtml = tempDiv.innerHTML.replace(
        /<div data-type="page-break"[^>]*>[\s\S]*?<\/div>/gi,
        ''
      );

      return cleanedHtml;
    } catch (err) {
      console.warn('Error serializando fragmento de hoja paralela:', err);
      return '';
    }
  }, [editor, editor?.state.doc, targetPage, totalPages, breakPositions]);

  const formatLabel =
    paperFormat === 'legal'
      ? 'Oficio (216 × 330 mm)'
      : paperFormat === 'a4'
      ? 'A4 (210 × 297 mm)'
      : 'Carta (216 × 279 mm)';

  const handlePrevPage = () => {
    setActiveSpreadPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setActiveSpreadPage((p) => Math.min(totalPages, p + 1));
  };

  const handleJumpMainEditor = () => {
    if (onNavigateToPage) {
      onNavigateToPage(targetPage);
    }
  };

  return (
    <div
      className="flex flex-col items-center flex-shrink-0 animate-in fade-in zoom-in-95 duration-200"
      style={{
        width: '100%',
        maxWidth: `${paperPixelWidth}px`,
      }}
    >
      {/* Barra de Navegación de la Hoja Paralela */}
      <div className="w-full mb-2 flex items-center justify-between gap-2 px-1 select-none text-xs">
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1 text-slate-300 shadow-sm">
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-white">Hoja Paralela</span>
          <span className="text-[10px] text-slate-500 font-mono">|</span>
          <span className="font-mono text-indigo-300 text-[11px]">
            Pág. {targetPage} de {totalPages}
          </span>
        </div>

        {/* Paginación y acciones */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={targetPage <= 1}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900/90 text-slate-300 hover:text-white transition-colors"
            title="Página anterior en paralelo"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={targetPage >= totalPages}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900/90 text-slate-300 hover:text-white transition-colors"
            title="Página siguiente en paralelo"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleJumpMainEditor}
            className="h-7 px-2 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-indigo-400 text-slate-300 hover:text-white text-[10.5px] font-medium flex items-center gap-1 transition-colors"
            title="Desplazar el editor principal a esta página"
          >
            <ExternalLink className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">Ir aquí</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-900/90 border border-slate-700/80 hover:bg-rose-500/20 hover:border-rose-500/40 text-slate-400 hover:text-rose-200 transition-colors ml-1"
            title="Cerrar vista de hojas en paralelo (volver a hoja simple)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hoja Física Réplica en Paralelo */}
      <div
        className="visual-page parallel-spread-page"
        style={{
          minHeight: '840px',
        }}
      >
        {/* Encabezado formal de la hoja de continuación */}
        <div
          className="pb-3 mb-4 border-b border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono select-none"
          style={{
            marginLeft: 'calc(-1 * var(--sheet-pad-x))',
            marginRight: 'calc(-1 * var(--sheet-pad-x))',
            paddingLeft: 'var(--sheet-pad-x)',
            paddingRight: 'var(--sheet-pad-x)',
          }}
        >
          <span className="flex items-center gap-1.5 font-semibold text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            <span>Página {targetPage} · {formatLabel}</span>
          </span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400">
            Continuación a la derecha
          </span>
        </div>

        {/* Contenido en vivo de la página */}
        {pageHtml ? (
          <div
            className="ProseMirror select-text cursor-default"
            dangerouslySetInnerHTML={{ __html: pageHtml }}
            onClick={() => {
              // Si el usuario hace clic sobre un texto de la hoja derecha, trasladar foco al editor
              handleJumpMainEditor();
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <FileText className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-700">
                Fin del documento
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Esta es la última página. Lo que redactes en la hoja izquierda fluirá automáticamente aquí cuando se complete el espacio físico.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                editor?.chain().focus('end').insertPageBreak().run();
              }}
              className="mt-2 px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-700 border border-indigo-400/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Salto de Página</span>
            </button>
          </div>
        )}

        {/* Pie de página formal */}
        <div
          className="mt-auto py-3.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono select-none"
          style={{
            marginLeft: 'calc(-1 * var(--sheet-pad-x))',
            marginRight: 'calc(-1 * var(--sheet-pad-x))',
            paddingLeft: 'var(--sheet-pad-x)',
            paddingRight: 'var(--sheet-pad-x)',
            paddingBottom: '20px',
          }}
        >
          <span>StudyFlexConnect · Redacción Académica</span>
          <span className="font-semibold text-slate-500">
            Página {targetPage} de {totalPages}
          </span>
        </div>
      </div>
    </div>
  );
};
