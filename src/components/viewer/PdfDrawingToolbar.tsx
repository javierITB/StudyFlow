import React from 'react';
import {
  Check,
  Eraser,
  Highlighter,
  Pen,
  Trash2,
  Undo2,
} from 'lucide-react';
import { DrawingToolType } from '../../types/studyflow';
import { HIGHLIGHTER_COLORS, PEN_COLORS } from '../../lib/strokeEngine';

interface PdfDrawingToolbarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  currentColor: string;
  onSelectColor: (color: string) => void;
  strokeSize: number;
  onChangeStrokeSize: (size: number) => void;
  onUndo: () => void;
  canUndo: boolean;
  onClearPage: () => void;
  onClose: () => void;
}

export const PdfDrawingToolbar: React.FC<PdfDrawingToolbarProps> = ({
  activeTool,
  onSelectTool,
  currentColor,
  onSelectColor,
  strokeSize,
  onChangeStrokeSize,
  onUndo,
  canUndo,
  onClearPage,
  onClose,
}) => {
  const currentColors = activeTool === 'highlighter' ? HIGHLIGHTER_COLORS : PEN_COLORS;

  const sizePresets =
    activeTool === 'highlighter'
      ? [
          { label: 'Fino', val: 10 },
          { label: 'Medio', val: 18 },
          { label: 'Grueso', val: 28 },
        ]
      : [
          { label: 'Fino', val: 2 },
          { label: 'Medio', val: 4.5 },
          { label: 'Grueso', val: 8 },
        ];

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/35 rounded-2xl p-1.5 sm:p-2 shadow-2xl flex items-center gap-1.5 sm:gap-2.5 text-xs select-none animate-fade-in max-w-[95vw] overflow-x-auto">
      {/* 1. Selector de Herramienta */}
      <div className="flex bg-slate-950/80 border border-slate-700/80 rounded-xl p-0.5 gap-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => onSelectTool('highlighter')}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
            activeTool === 'highlighter'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Destacador fluorescente semitransparente"
        >
          <Highlighter className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Destacador</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('pen')}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
            activeTool === 'pen'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Lápiz o bolígrafo de tinta para notas a mano alzada"
        >
          <Pen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Lápiz</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('eraser')}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
            activeTool === 'eraser'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Borrador de trazos"
        >
          <Eraser className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">Borrador</span>
        </button>
      </div>

      <span className="w-px h-5 bg-slate-700/80 hidden sm:inline" />

      {/* 2. Paleta de Colores (solo activa para lápiz y destacador) */}
      {activeTool !== 'eraser' && (
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-700/80 rounded-xl px-1.5 py-1">
          {currentColors.map((c) => {
            const isSelected = currentColor.toLowerCase() === c.value.toLowerCase();
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onSelectColor(c.value)}
                className="w-5 h-5 rounded-full border border-slate-700 hover:scale-115 transition-transform flex items-center justify-center relative shadow-sm"
                style={{ backgroundColor: c.value }}
                title={c.label}
              >
                {isSelected && (
                  <Check
                    className={`w-3 h-3 ${
                      c.value === '#f8fafc' || c.value === '#facc15' ? 'text-slate-900' : 'text-white'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Selector de Grosor Personalizado */}
      {activeTool !== 'eraser' && (
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-700/80 rounded-xl px-2 py-1">
          <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
            {strokeSize}px
          </span>
          <div className="flex items-center gap-1">
            {sizePresets.map((sp) => (
              <button
                key={sp.label}
                type="button"
                onClick={() => onChangeStrokeSize(sp.val)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  strokeSize === sp.val
                    ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Acciones: Deshacer, Limpiar y Salir */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="h-7 w-7 flex items-center justify-center rounded-xl bg-slate-950/80 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Deshacer último trazo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onClearPage}
          className="h-7 w-7 flex items-center justify-center rounded-xl bg-slate-950/80 border border-slate-700/80 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Borrar todos los trazos de esta página"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="h-7 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors ml-1"
          title="Finalizar y cerrar modo dibujo"
        >
          <span>Listo</span>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        </button>
      </div>
    </div>
  );
};
