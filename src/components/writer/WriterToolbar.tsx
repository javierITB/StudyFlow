import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowRightSquare,
  Bold,
  BookOpen,
  ChevronDown,
  Download,
  FileCode,
  FileDown,
  FolderPlus,
  Italic,
  Maximize,
  Minimize,
  MinusSquare,
  MoveVertical,
  PlusSquare,
  Printer,
  Quote,
  Scissors,
  Sparkles,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface WriterToolbarProps {
  editor: Editor | null;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomFit?: () => void;
  isPreview?: boolean;
  onTogglePreview?: () => void;
  isPagedMode?: boolean;
  onTogglePagedMode?: () => void;
  paperFormat?: 'letter' | 'legal' | 'a4';
  onChangePaperFormat?: (format: 'letter' | 'legal' | 'a4') => void;
  pageInfo?: { pageCount: number; currentPage: number };
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  onOpenTemplates: () => void;
  onBackToHub?: () => void;
  onToggleCitations: () => void;
  citationsOpen: boolean;
  onExportDocx: () => void;
  onExportPdf?: () => void;
  onPrintPdf: () => void;
  onExportMarkdown: () => void;
  onAddToReadings: () => void;
}

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
];

const FONT_SIZES = [
  { label: '10 pt', value: '10pt' },
  { label: '11 pt', value: '11pt' },
  { label: '12 pt', value: '12pt' },
  { label: '14 pt', value: '14pt' },
  { label: '16 pt', value: '16pt' },
  { label: '18 pt', value: '18pt' },
  { label: '24 pt', value: '24pt' },
  { label: '32 pt', value: '32pt' },
];

const LINE_HEIGHTS = [
  { label: '1.0', value: '1.0' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2.0' },
];

export const WriterToolbar: React.FC<WriterToolbarProps> = ({
  editor,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomFit,
  isPagedMode = true,
  onTogglePagedMode,
  paperFormat = 'letter',
  onChangePaperFormat,
  isFullScreen,
  onToggleFullScreen,
  onOpenTemplates,
  onBackToHub,
  onToggleCitations,
  citationsOpen,
  onExportDocx,
  onExportPdf,
  onPrintPdf,
  onExportMarkdown,
  onAddToReadings,
}) => {
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [gridHover, setGridHover] = useState({ rows: 3, cols: 3 });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  if (!editor) return null;

  const currentFont = editor.getAttributes('textStyle').fontFamily || 'Arial';
  const currentSize = editor.getAttributes('textStyle').fontSize || '12pt';
  const currentLineHeight =
    editor.getAttributes('paragraph')?.lineHeight ||
    editor.getAttributes('tableCell')?.lineHeight ||
    editor.getAttributes('heading')?.lineHeight ||
    '';

  const changeCase = (mode: 'upper' | 'lower' | 'default') => {
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const text = editor.state.doc.textBetween(from, to, ' ');
    let newText = text;
    if (mode === 'upper') newText = text.toUpperCase();
    if (mode === 'lower') newText = text.toLowerCase();
    editor.chain().focus().insertContentAt({ from, to }, newText).run();
  };

  const handleInsertTable = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setShowTableGrid(false);
  };

  return (
    <div className="border-b border-indigo-500/25 bg-slate-900/95 backdrop-blur-xl px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-1.5 z-20 flex-shrink-0 text-xs select-none">
      {/* GRUPO IZQUIERDO: RETORNO Y TIPOGRAFIA */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Botón Volver full izquierda */}
        {onBackToHub && (
          <button
            type="button"
            onClick={onBackToHub}
            className="h-7.5 px-3 rounded-xl bg-slate-800/90 hover:bg-indigo-600/25 border border-slate-700/80 hover:border-indigo-400 text-slate-200 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm group mr-1.5"
            title="Volver a la galería de plantillas y lista general de documentos"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Volver</span>
          </button>
        )}

        {/* Selector de Fuente */}
        <div className="flex items-center bg-slate-950/80 border border-slate-700/80 rounded-xl px-2 h-7.5">
          <select
            value={currentFont}
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
            className="bg-transparent text-slate-200 text-[11px] font-medium outline-none cursor-pointer max-w-[110px] truncate"
            title="Tipografía del texto"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.value} value={f.value} className="bg-slate-900 text-white">
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Tamaño */}
        <div className="flex items-center bg-slate-950/80 border border-slate-700/80 rounded-xl px-1.5 h-7.5">
          <select
            value={currentSize}
            onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
            className="bg-transparent text-slate-200 text-[11px] font-mono outline-none cursor-pointer w-16"
            title="Tamaño de fuente"
          >
            {FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value} className="bg-slate-900 text-white">
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Mayúsculas / Minúsculas (M ↑ / m ↓ / d) */}
        <div className="flex bg-slate-950/80 border border-slate-700/80 rounded-xl p-0.5 gap-0.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => changeCase('upper')}
            className="h-6.5 px-1.5 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Transformar selección a Mayúsculas"
          >
            M ↑
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => changeCase('lower')}
            className="h-6.5 px-1.5 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Transformar selección a Minúsculas"
          >
            m ↓
          </button>
        </div>

        <span className="w-px h-5 bg-slate-700/60 mx-0.5 hidden sm:block" />

        {/* Estilos básicos: Negrita, Cursiva, Subrayado */}
        <div className="flex bg-slate-950/80 border border-slate-700/80 rounded-xl p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-6.5 w-6.5 flex items-center justify-center rounded-lg transition-colors ${
              editor.isActive('bold')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Negrita (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-6.5 w-6.5 flex items-center justify-center rounded-lg transition-colors ${
              editor.isActive('italic')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Cursiva (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`h-6.5 w-6.5 flex items-center justify-center rounded-lg transition-colors ${
              editor.isActive('underline')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Subrayado (Ctrl+U)"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alineación */}
        <div className="flex bg-slate-950/80 border border-slate-700/80 rounded-xl p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`h-6.5 w-6.5 flex items-center justify-center rounded-lg transition-colors ${
              editor.isActive({ textAlign: 'left' })
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Alinear a la izquierda"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`h-6.5 w-6.5 flex items-center justify-center rounded-lg transition-colors ${
              editor.isActive({ textAlign: 'center' })
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Centrar"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`h-6.5 w-6.5 flex items-center justify-center rounded-lg transition-colors ${
              editor.isActive({ textAlign: 'right' })
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Alinear a la derecha"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={`h-6.5 w-6.5 flex items-center justify-center rounded-lg transition-colors ${
              editor.isActive({ textAlign: 'justify' })
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Justificar texto"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Interlineado */}
        <div className="flex items-center bg-slate-950/80 border border-slate-700/80 rounded-xl px-1.5 h-7.5 gap-1">
          <MoveVertical className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={currentLineHeight}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                editor.chain().focus().unsetLineHeight().run();
              } else {
                editor.chain().focus().setLineHeight(val).run();
              }
            }}
            className="bg-transparent text-slate-200 text-[11px] outline-none cursor-pointer w-14"
            title="Interlineado de párrafo"
          >
            <option value="" className="bg-slate-900 text-white">
              Auto
            </option>
            {LINE_HEIGHTS.map((lh) => (
              <option key={lh.value} value={lh.value} className="bg-slate-900 text-white">
                {lh.label}
              </option>
            ))}
          </select>
        </div>

        <span className="w-px h-5 bg-slate-700/60 mx-0.5 hidden sm:block" />

        {/* Herramientas de Tablas */}
        <div className="relative flex bg-slate-950/80 border border-slate-700/80 rounded-xl p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => setShowTableGrid((v) => !v)}
            className={`h-6.5 px-2 flex items-center gap-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 ${
              showTableGrid ? 'bg-indigo-600 text-white' : ''
            }`}
            title="Insertar o configurar tabla"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Matriz interactiva de selección de tabla */}
          {showTableGrid && (
            <div className="absolute top-8 left-0 z-50 p-2.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl space-y-2 fade-in">
              <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider">
                Insertar Tabla ({gridHover.cols} × {gridHover.rows})
              </span>
              <div className="grid grid-cols-6 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                {Array.from({ length: 6 }).map((_, rIdx) =>
                  Array.from({ length: 6 }).map((_, cIdx) => {
                    const row = rIdx + 1;
                    const col = cIdx + 1;
                    const isHighlighted = row <= gridHover.rows && col <= gridHover.cols;
                    return (
                      <div
                        key={`${row}-${col}`}
                        onMouseEnter={() => setGridHover({ rows: row, cols: col })}
                        onClick={() => handleInsertTable(row, col)}
                        className={`w-4 h-4 rounded-sm border cursor-pointer transition-colors ${
                          isHighlighted
                            ? 'bg-indigo-500 border-indigo-400'
                            : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                        }`}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}

          {editor.isActive('table') && (
            <>
              <button
                type="button"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                disabled={!editor.can().addRowAfter()}
                className="h-6.5 w-6.5 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                title="Añadir fila abajo"
              >
                <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteRow().run()}
                disabled={!editor.can().deleteRow()}
                className="h-6.5 w-6.5 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-slate-800"
                title="Eliminar fila"
              >
                <MinusSquare className="w-3.5 h-3.5 text-red-400" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                disabled={!editor.can().addColumnAfter()}
                className="h-6.5 w-6.5 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                title="Añadir columna a la derecha"
              >
                <ArrowRightSquare className="w-3.5 h-3.5 text-emerald-400" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteTable().run()}
                disabled={!editor.can().deleteTable()}
                className="h-6.5 w-6.5 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-slate-800"
                title="Eliminar tabla"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </>
          )}
        </div>

        {/* Salto de Página */}
        <button
          type="button"
          onClick={() => editor.chain().focus().insertPageBreak().run()}
          className="h-7.5 px-2 bg-slate-950/80 border border-slate-700/80 hover:border-indigo-500/50 rounded-xl text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
          title="Insertar Salto de Página Carta/A4"
        >
          <Scissors className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline">Salto</span>
        </button>
      </div>

      {/* GRUPO DERECHO: ZOOM, VISTA PREVIA Y ACCIONES DE ESTUDIO */}
      <div className="flex items-center gap-1.5 flex-wrap ml-auto">
        {/* Controles de Zoom y Ajuste */}
        <div className="hidden lg:flex items-center bg-slate-950/80 border border-slate-700/80 rounded-xl p-0.5 gap-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            className="h-6.5 w-6.5 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            title="Alejar zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span
            onClick={onZoomReset}
            className="text-[10px] font-mono font-bold text-slate-300 px-1.5 cursor-pointer hover:text-white"
            title="Restablecer a 100%"
          >
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            className="h-6.5 w-6.5 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            title="Acercar zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {onZoomFit && (
            <button
              type="button"
              onClick={onZoomFit}
              className="px-2 py-0.5 rounded-lg text-[9.5px] font-mono font-semibold text-indigo-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Ajustar ancho automáticamente al espacio disponible"
            >
              Ajustar
            </button>
          )}
        </div>

        {/* Switch Modo Hojas Paginadas vs Continuo */}
        {onTogglePagedMode && (
          <button
            type="button"
            onClick={onTogglePagedMode}
            className={`h-7.5 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
              isPagedMode
                ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200 shadow-sm'
                : 'bg-slate-950/80 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
            title={
              isPagedMode
                ? 'Modo actual: Hojas físicas paginadas con cálculo dinámico. Clic para modo continuo.'
                : 'Modo actual: Lienzo continuo sin saltos. Clic para ver hojas físicas.'
            }
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isPagedMode ? 'Hojas' : 'Continuo'}</span>
          </button>
        )}

        {/* Selector de Tamaño de Papel Físico: Carta (216x279), Oficio (216x330), A4 (210x297) */}
        {onChangePaperFormat && (
          <div className="flex items-center bg-slate-950/80 border border-slate-700/80 rounded-xl px-2 h-7.5">
            <select
              value={paperFormat}
              onChange={(e) => onChangePaperFormat(e.target.value as 'letter' | 'legal' | 'a4')}
              className="bg-transparent text-slate-200 text-[11px] font-medium outline-none cursor-pointer"
              title="Formato físico del documento impreso"
            >
              <option value="letter" className="bg-slate-900 text-white">Carta (216 × 279 mm)</option>
              <option value="legal" className="bg-slate-900 text-white">Oficio (216 × 330 mm)</option>
              <option value="a4" className="bg-slate-900 text-white">A4 (210 × 297 mm)</option>
            </select>
          </div>
        )}

        {/* Botón Plantillas Guiadas */}
        <button
          type="button"
          onClick={onOpenTemplates}
          className="h-7.5 px-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/35 hover:bg-indigo-500/25 text-indigo-300 hover:text-indigo-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
          title="Estructuras académicas probadas (Ensayo, Monografía, Feynman...)"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Plantillas</span>
        </button>

        {/* Botón Cajón de Citas */}
        <button
          type="button"
          onClick={onToggleCitations}
          className={`h-7.5 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
            citationsOpen
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
              : 'bg-slate-950/80 border-slate-700/80 text-slate-300 hover:text-white hover:border-indigo-500/40'
          }`}
          title="Abrir cajón de notas y citas de lecturas"
        >
          <Quote className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Citas</span>
        </button>

        {/* Botón Agregar a Lecturas */}
        <button
          type="button"
          onClick={onAddToReadings}
          className="h-7.5 px-2.5 rounded-xl bg-purple-500/15 border border-purple-500/35 hover:bg-purple-500/25 text-purple-300 hover:text-purple-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
          title="Exportar y agregar a la biblioteca general de lectura"
        >
          <FolderPlus className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">A Lecturas</span>
        </button>

        {/* Menú de Exportación y Descarga */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportMenuOpen((v) => !v)}
            className="h-7.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-colors"
            title="Descargar o imprimir documento"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {exportMenuOpen && (
            <div
              className="absolute right-0 top-8 z-50 w-52 p-1.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-1 fade-in"
              onMouseLeave={() => setExportMenuOpen(false)}
            >
              {onExportPdf && (
                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false);
                    onExportPdf();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4 text-rose-400" />
                  <span>Descargar PDF (.pdf)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false);
                  onExportDocx();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2"
              >
                <FileDown className="w-4 h-4 text-indigo-400" />
                <span>Descargar Word (.docx)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false);
                  onExportMarkdown();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2"
              >
                <FileCode className="w-4 h-4 text-sky-400" />
                <span>Descargar Markdown (.md)</span>
              </button>
              <div className="h-px bg-slate-800 my-1" />
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false);
                  onPrintPdf();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir documento</span>
              </button>
            </div>
          )}
        </div>

        {/* Pantalla completa */}
        <button
          type="button"
          onClick={onToggleFullScreen}
          className="h-7.5 w-7.5 flex items-center justify-center rounded-xl bg-slate-950/80 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title={isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {isFullScreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>

        {/* Indicador de Autoguardado full derecha */}
        <div
          className="flex items-center gap-1.5 px-2.5 h-7.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 font-mono select-none"
          title="Tus cambios se guardan automáticamente en tu dispositivo"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden xl:inline text-slate-300 font-medium">Autoguardado</span>
        </div>
      </div>
    </div>
  );
};
