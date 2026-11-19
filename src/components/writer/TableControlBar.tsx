import React, { useEffect, useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  Columns,
  Rows,
  Scissors,
  Split,
  Table as TableIcon,
  Trash2,
  Plus,
  Minus,
} from 'lucide-react';
import { getCurrentColumnWidth, getCurrentRowHeight } from '../../lib/tiptap/CustomTableExtensions';

interface TableControlBarProps {
  editor: Editor | null;
}

export const TableControlBar: React.FC<TableControlBarProps> = ({ editor }) => {
  if (!editor || !editor.isActive('table')) {
    return null;
  }

  // Obtenemos los valores actuales de ancho de columna y alto de fila
  const currentWidth = getCurrentColumnWidth(editor.state);
  const currentHeight = getCurrentRowHeight(editor.state);

  const [inputWidth, setInputWidth] = useState<string>(currentWidth ? String(currentWidth) : '');
  const [inputHeight, setInputHeight] = useState<string>(currentHeight ? String(currentHeight) : '');

  useEffect(() => {
    setInputWidth(currentWidth ? String(currentWidth) : '');
  }, [currentWidth]);

  useEffect(() => {
    setInputHeight(currentHeight ? String(currentHeight) : '');
  }, [currentHeight]);

  const handleStepWidth = (deltaPx: number) => {
    const base = currentWidth || 130;
    const next = Math.max(40, base + deltaPx);
    editor.chain().focus().setColumnWidth(next).run();
  };

  const handleApplyWidth = (val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 30) {
      editor.chain().focus().setColumnWidth(num).run();
    } else if (val.trim() === '' || val.toLowerCase() === 'auto') {
      editor.chain().focus().setColumnWidth(null).run();
    }
  };

  const handleStepHeight = (deltaPx: number) => {
    const base = currentHeight || 36;
    const next = Math.max(20, base + deltaPx);
    editor.chain().focus().setTableRowHeight(`${next}px`).run();
  };

  const handleApplyHeight = (val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 20) {
      editor.chain().focus().setTableRowHeight(`${num}px`).run();
    } else if (val.trim() === '' || val.toLowerCase() === 'auto') {
      editor.chain().focus().setTableRowHeight(null).run();
    }
  };

  return (
    <div className="z-30 bg-slate-900/95 border-b border-indigo-500/30 px-3 py-1.5 flex items-center justify-between gap-3 text-xs text-slate-200 select-none shadow-md backdrop-blur-md overflow-x-auto custom-scrollbar flex-shrink-0 animate-fadeIn">
      {/* Indicador de Tabla */}
      <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[11px] flex-shrink-0">
        <TableIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Tabla Activa</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {/* Control de Ancho de Columna */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-0.5 shadow-inner">
          <Columns className="w-3 h-3 text-cyan-400 flex-shrink-0" />
          <span className="text-[10px] text-slate-400 font-medium">Ancho Col:</span>
          <button
            type="button"
            onClick={() => handleStepWidth(-15)}
            className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white cursor-pointer"
            title="Reducir ancho de columna (-15px)"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <input
            type="text"
            value={inputWidth}
            placeholder="Auto"
            onChange={(e) => setInputWidth(e.target.value)}
            onBlur={() => handleApplyWidth(inputWidth)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApplyWidth(inputWidth);
            }}
            className="w-12 h-5 bg-slate-900 border border-slate-700 rounded text-center text-[10px] font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
            title="Ancho en px de esta columna (Enter para aplicar o escribe Auto)"
          />
          <span className="text-[10px] text-slate-400 font-mono">px</span>
          <button
            type="button"
            onClick={() => handleStepWidth(15)}
            className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white cursor-pointer"
            title="Aumentar ancho de columna (+15px)"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().distributeColumnsEvenly().run()}
            className="px-1.5 h-5 rounded bg-slate-800 hover:bg-indigo-600/40 text-[9.5px] text-indigo-300 hover:text-white ml-0.5 cursor-pointer"
            title="Distribuir columnas uniformemente"
          >
            Distribuir
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setColumnWidth(null).run()}
            className="px-1.5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-[9.5px] text-slate-400 hover:text-slate-200 cursor-pointer"
            title="Restablecer ancho a automático"
          >
            Auto
          </button>
        </div>

        {/* Control de Alto de Fila */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-0.5 shadow-inner">
          <Rows className="w-3 h-3 text-amber-400 flex-shrink-0" />
          <span className="text-[10px] text-slate-400 font-medium">Alto Fila:</span>
          <button
            type="button"
            onClick={() => handleStepHeight(-4)}
            className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white cursor-pointer"
            title="Reducir alto de fila (-4px)"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <input
            type="text"
            value={inputHeight}
            placeholder="Auto"
            onChange={(e) => setInputHeight(e.target.value)}
            onBlur={() => handleApplyHeight(inputHeight)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApplyHeight(inputHeight);
            }}
            className="w-11 h-5 bg-slate-900 border border-slate-700 rounded text-center text-[10px] font-mono text-amber-300 focus:outline-none focus:border-amber-400"
            title="Alto en px de esta fila (Enter para aplicar)"
          />
          <span className="text-[10px] text-slate-400 font-mono">px</span>
          <button
            type="button"
            onClick={() => handleStepHeight(4)}
            className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white cursor-pointer"
            title="Aumentar alto de fila (+4px)"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTableRowHeight(null).run()}
            className="px-1.5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-[9.5px] text-slate-400 hover:text-slate-200 ml-0.5 cursor-pointer"
            title="Restablecer alto de fila a automático"
          >
            Auto
          </button>
        </div>

        {/* Acciones de Paginación y Corte */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().splitTableAtCursor(true).run()}
            className="h-6 px-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 text-[10.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Dividir la tabla en esta fila hacia una nueva página (repite encabezados)"
          >
            <Scissors className="w-3 h-3 text-indigo-400" />
            <span>Dividir en nueva pág</span>
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().autoPaginateTable(15).run()}
            className="h-6 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Cortar automáticamente tablas largas cada 15 filas para no romper los límites de hoja"
          >
            <Split className="w-3 h-3 text-emerald-400" />
            <span>Auto-paginar (15 f)</span>
          </button>
        </div>

        {/* Estructura rápida (+/- filas y columnas) */}
        <div className="flex items-center gap-0.5 bg-slate-950/80 border border-slate-700/80 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="px-1.5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-[9.5px] text-slate-200 cursor-pointer"
            title="Añadir fila abajo"
          >
            + Fila
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="px-1.5 h-5 rounded bg-slate-800 hover:bg-rose-900/40 text-[9.5px] text-rose-300 cursor-pointer"
            title="Eliminar fila actual"
          >
            - Fila
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="px-1.5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-[9.5px] text-slate-200 cursor-pointer"
            title="Añadir columna a la derecha"
          >
            + Col
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="px-1.5 h-5 rounded bg-slate-800 hover:bg-rose-900/40 text-[9.5px] text-rose-300 cursor-pointer"
            title="Eliminar columna actual"
          >
            - Col
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="p-1 h-5 w-5 flex items-center justify-center rounded bg-rose-900/30 hover:bg-rose-900/60 text-rose-400 cursor-pointer"
            title="Eliminar tabla completa"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

