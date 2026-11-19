import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowRightSquare,
  Bold,
  Check,
  ChevronDown,
  Code,
  Columns,
  Divide,
  Download,
  Eraser,
  FileCode,
  FileDown,
  FolderPlus,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  Indent as IndentIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Maximize,
  Minimize,
  MinusSquare,
  Outdent as OutdentIcon,
  Plus,
  PlusSquare,
  Printer,
  Quote,
  Redo2,
  Rows,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Split,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
  UploadCloud,
} from 'lucide-react';
import { LayoutStyleId } from '../../types/studyflow';
import { parseMarkdownToHtml } from '../../lib/markdownParser';
import { sanitizeAndPaginateOversizedNodes } from '../../lib/tiptap/CustomTableExtensions';

interface WriterToolbarProps {
  editor: Editor | null;
  layoutStyle?: LayoutStyleId;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  onOpenTemplates: () => void;
  onPublishTemplate?: () => void;
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
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Inter', value: 'Inter, sans-serif' },
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
  { label: '1.0 (Simple)', value: '1.0' },
  { label: '1.15 (Estándar)', value: '1.15' },
  { label: '1.5 (Lectura)', value: '1.5' },
  { label: '2.0 (Doble APA)', value: '2.0' },
];

const TEXT_COLORS = [
  { label: 'Negro automático', value: '#0f172a' },
  { label: 'Carbón / Grafito', value: '#334155' },
  { label: 'Gris pizarra', value: '#64748b' },
  { label: 'Azul académico', value: '#1d4ed8' },
  { label: 'Azul marino', value: '#1e3a8a' },
  { label: 'Borgoña / Tinto', value: '#991b1b' },
  { label: 'Verde bosque', value: '#166534' },
  { label: 'Púrpura formal', value: '#6b21a8' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Amarillo estudio', value: '#fef08a' },
  { label: 'Menta / Idea', value: '#bbf7d0' },
  { label: 'Celeste analítico', value: '#bae6fd' },
  { label: 'Lavanda / Cita', value: '#e9d5ff' },
  { label: 'Durazno / Hallazgo', value: '#fed7aa' },
  { label: 'Rosa / Atención', value: '#fecdd3' },
];

type ActiveDropdown =
  | 'style'
  | 'moreFormat'
  | 'color'
  | 'paragraph'
  | 'lineHeight'
  | 'insert'
  | 'export'
  | 'link'
  | null;

export const WriterToolbar: React.FC<WriterToolbarProps> = ({
  editor,
  layoutStyle = 'islands',
  isFullScreen,
  onToggleFullScreen,
  onOpenTemplates,
  onPublishTemplate,
  onBackToHub,
  onToggleCitations,
  citationsOpen,
  onExportDocx,
  onExportPdf,
  onPrintPdf,
  onExportMarkdown,
  onAddToReadings,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const [gridHover, setGridHover] = useState({ rows: 3, cols: 3 });
  const [linkUrlInput, setLinkUrlInput] = useState('');

  const toolbarContainerRef = useRef<HTMLDivElement>(null);

  // Cerrar popovers al hacer click fuera
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        toolbarContainerRef.current &&
        !toolbarContainerRef.current.contains(target)
      ) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (!editor) return null;

  const toggleDropdown = (name: ActiveDropdown) => {
    setActiveDropdown((current) => (current === name ? null : name));
  };

  const closeDropdown = () => setActiveDropdown(null);

  const currentFont = editor.getAttributes('textStyle').fontFamily || 'Arial';
  const currentSize = editor.getAttributes('textStyle').fontSize || '12pt';
  const currentTextColor = editor.getAttributes('textStyle').color || '#0f172a';
  const currentLineHeight =
    editor.getAttributes('paragraph')?.lineHeight ||
    editor.getAttributes('tableCell')?.lineHeight ||
    editor.getAttributes('heading')?.lineHeight ||
    '';

  const isH1 = editor.isActive('heading', { level: 1 });
  const isH2 = editor.isActive('heading', { level: 2 });
  const isH3 = editor.isActive('heading', { level: 3 });
  const isH4 = editor.isActive('heading', { level: 4 });
  const isBlockquote = editor.isActive('blockquote');
  const isCodeBlock = editor.isActive('codeBlock');
  const isOrderedList = editor.isActive('orderedList');
  const isBulletList = editor.isActive('bulletList');

  const currentStyleLabel = isH1
    ? 'Título 1'
    : isH2
    ? 'Título 2'
    : isH3
    ? 'Título 3'
    : isH4
    ? 'Título 4'
    : isBlockquote
    ? 'Cita bloque'
    : isCodeBlock
    ? 'Código'
    : isOrderedList
    ? 'Numeración'
    : isBulletList
    ? 'Viñetas'
    : 'Texto normal';

  const handleSmartToggleOrderedList = () => {
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      const selectedText = editor.state.doc.textBetween(from, to, '\n');
      if (/^\s*\d+[\.\)]\s+/m.test(selectedText)) {
        const cleaned = selectedText
          .split('\n')
          .map((line) => line.replace(/^\s*\d+[\.\)]\s+/, ''))
          .join('\n');
        editor
          .chain()
          .focus()
          .insertContentAt({ from, to }, cleaned)
          .setTextSelection({ from, to: from + cleaned.length })
          .toggleOrderedList()
          .run();
        return;
      }
    }
    editor.chain().focus().toggleOrderedList().run();
  };

  const handleSmartToggleBulletList = () => {
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      const selectedText = editor.state.doc.textBetween(from, to, '\n');
      if (/^\s*[-*•]\s+/m.test(selectedText)) {
        const cleaned = selectedText
          .split('\n')
          .map((line) => line.replace(/^\s*[-*•]\s+/, ''))
          .join('\n');
        editor
          .chain()
          .focus()
          .insertContentAt({ from, to }, cleaned)
          .setTextSelection({ from, to: from + cleaned.length })
          .toggleBulletList()
          .run();
        return;
      }
    }
    editor.chain().focus().toggleBulletList().run();
  };

  const changeCase = (mode: 'upper' | 'lower') => {
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const text = editor.state.doc.textBetween(from, to, ' ');
    const newText = mode === 'upper' ? text.toUpperCase() : text.toLowerCase();
    editor.chain().focus().insertContentAt({ from, to }, newText).run();
  };

  const handleInsertTable = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    closeDropdown();
  };

  const handleOpenLinkPopover = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrlInput(previousUrl);
    setActiveDropdown('link');
  };

  const handleApplyLink = () => {
    if (!linkUrlInput.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      let finalUrl = linkUrlInput.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = `https://${finalUrl}`;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    }
    closeDropdown();
  };

  const handleRemoveLink = () => {
    editor.chain().focus().unsetLink().run();
    closeDropdown();
  };

  const handleClearFormatting = () => {
    editor.chain().focus().clearNodes().unsetAllMarks().run();
  };

  const showRichPreviews = layoutStyle === 'classic';

  return (
    <div
      ref={toolbarContainerRef}
      className="relative z-40 border-b border-indigo-500/25 bg-slate-900/95 backdrop-blur-xl px-2 sm:px-3 py-1 flex items-center justify-between gap-1 flex-shrink-0 text-xs select-none overflow-visible"
    >
      {/* ========================================================================= */}
      {/* SECCIÓN IZQUIERDA: GRUPOS SEMÁNTICOS Y SUBMENÚS MINIMALISTAS */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        {/* 1. Volver */}
        {onBackToHub && (
          <button
            type="button"
            onClick={onBackToHub}
            className="h-7 px-2.5 rounded-lg bg-slate-800/90 hover:bg-indigo-600/30 border border-slate-700/80 hover:border-indigo-400 text-slate-200 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm group mr-0.5"
            title="Volver a la galería de plantillas y lista de trabajos"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Volver</span>
          </button>
        )}

        {/* 2. Historial: Deshacer / Rehacer */}
        <div className="flex bg-slate-950/80 border border-slate-700/80 rounded-lg p-0.5 gap-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300 transition-colors"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300 transition-colors"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="w-px h-5 bg-slate-700/60 mx-0.5" />

        {/* 3. Submenú de Estilo de Párrafo (Heading / Styles Dropdown) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('style')}
            className={`h-7 px-2 sm:px-2.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 min-w-[95px] sm:min-w-[115px] justify-between transition-colors shadow-sm ${
              activeDropdown === 'style'
                ? 'bg-slate-800 border-indigo-400 text-white'
                : 'bg-slate-950/80 border-slate-700/80 hover:border-slate-600 text-slate-200'
            }`}
            title="Jerarquía de texto y estilos de redacción"
          >
            <span className="truncate">{currentStyleLabel}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
          </button>

          {activeDropdown === 'style' && (
            <div className="absolute top-8 left-0 z-50 w-52 p-1.5 rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl space-y-0.5 fade-in text-slate-200">
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  closeDropdown();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                  !isH1 && !isH2 && !isH3 && !isBlockquote && !isCodeBlock
                    ? 'bg-indigo-600/30 text-indigo-200 font-semibold'
                    : 'hover:bg-slate-800'
                }`}
              >
                <span>Texto normal</span>
                {!isH1 && !isH2 && !isH3 && !isBlockquote && !isCodeBlock && (
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 1 }).run();
                  closeDropdown();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                  isH1 ? 'bg-indigo-600/30 text-indigo-200' : 'hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Heading1 className="w-4 h-4 text-indigo-400" />
                  <span className={showRichPreviews ? 'text-base font-bold text-white' : 'text-xs font-semibold'}>
                    Título 1 (H1)
                  </span>
                </div>
                {isH1 && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 2 }).run();
                  closeDropdown();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                  isH2 ? 'bg-indigo-600/30 text-indigo-200' : 'hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Heading2 className="w-4 h-4 text-cyan-400" />
                  <span className={showRichPreviews ? 'text-sm font-semibold text-slate-100' : 'text-xs'}>
                    Título 2 (H2)
                  </span>
                </div>
                {isH2 && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 3 }).run();
                  closeDropdown();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                  isH3 ? 'bg-indigo-600/30 text-indigo-200' : 'hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Heading3 className="w-4 h-4 text-emerald-400" />
                  <span className={showRichPreviews ? 'text-xs font-medium text-slate-200' : 'text-xs'}>
                    Título 3 (H3)
                  </span>
                </div>
                {isH3 && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 4 }).run();
                  closeDropdown();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                  isH4 ? 'bg-indigo-600/30 text-indigo-200' : 'hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Heading4 className="w-4 h-4 text-teal-400" />
                  <span className={showRichPreviews ? 'text-xs font-medium text-slate-300' : 'text-xs'}>
                    Título 4 (H4)
                  </span>
                </div>
                {isH4 && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>

              <div className="h-px bg-slate-800 my-1" />

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleBlockquote().run();
                  closeDropdown();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                  isBlockquote ? 'bg-indigo-600/30 text-indigo-200' : 'hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Quote className="w-3.5 h-3.5 text-amber-400" />
                  <span className={showRichPreviews ? 'text-xs italic border-l-2 border-indigo-400 pl-1.5' : 'text-xs'}>
                    Cita en bloque (APA)
                  </span>
                </div>
                {isBlockquote && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleCodeBlock().run();
                  closeDropdown();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                  isCodeBlock ? 'bg-indigo-600/30 text-indigo-200' : 'hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Code className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-xs font-mono">Bloque de código</span>
                </div>
                {isCodeBlock && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
            </div>
          )}
        </div>

        {/* 4. Tipografía y Tamaño integrados en una sola cápsula compacta */}
        <div className="flex items-center bg-slate-950/80 border border-slate-700/80 rounded-lg h-7 px-1.5 gap-1 shadow-sm">
          <select
            value={currentFont}
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
            className="bg-transparent text-slate-200 text-[11px] font-medium outline-none cursor-pointer max-w-[85px] sm:max-w-[105px] truncate"
            title="Tipografía del documento"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.value} value={f.value} className="bg-slate-900 text-white">
                {f.label}
              </option>
            ))}
          </select>
          <span className="w-px h-3.5 bg-slate-700/70" />
          <select
            value={currentSize}
            onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
            className="bg-transparent text-slate-200 text-[11px] font-mono outline-none cursor-pointer w-12 text-center"
            title="Tamaño de fuente"
          >
            {FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value} className="bg-slate-900 text-white">
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <span className="w-px h-5 bg-slate-700/60 mx-0.5" />

        {/* 5. Formato de Caracteres: Acceso Rápido [B, I, U] + Submenú [Más Formato ▾] */}
        <div className="flex items-center bg-slate-950/80 border border-slate-700/80 rounded-lg p-0.5 gap-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
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
            className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
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
            className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
              editor.isActive('underline')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Subrayado (Ctrl+U)"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>

          {/* Submenú Más Formato: Tachado, Superíndice, Subíndice, Mayús/Minús, Borrador */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown('moreFormat')}
              className={`h-6 px-1.5 flex items-center gap-0.5 rounded transition-colors ${
                editor.isActive('strike') || editor.isActive('superscript') || editor.isActive('subscript')
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Más formato (Tachado, Superíndice, Subíndice, Mayúsculas, Limpiar formato)"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {activeDropdown === 'moreFormat' && (
              <div className="absolute top-8 left-0 z-50 w-56 p-2 rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl space-y-1 fade-in text-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">
                  Estilos avanzados
                </div>

                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleStrike().run();
                    closeDropdown();
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                    editor.isActive('strike') ? 'bg-indigo-600/30 text-indigo-200' : 'hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Strikethrough className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tachado</span>
                  </div>
                  {editor.isActive('strike') && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleSuperscript().run();
                    closeDropdown();
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                    editor.isActive('superscript') ? 'bg-indigo-600/30 text-indigo-200' : 'hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SuperscriptIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Superíndice (X²)</span>
                  </div>
                  {editor.isActive('superscript') && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleSubscript().run();
                    closeDropdown();
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                    editor.isActive('subscript') ? 'bg-indigo-600/30 text-indigo-200' : 'hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SubscriptIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Subíndice (X₁)</span>
                  </div>
                  {editor.isActive('subscript') && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>

                <div className="h-px bg-slate-800 my-1" />

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">
                  Transformar texto
                </div>
                <div className="grid grid-cols-2 gap-1 px-1">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      changeCase('upper');
                      closeDropdown();
                    }}
                    className="py-1 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] font-bold text-slate-200 text-center transition-colors"
                  >
                    MAYÚSCULAS
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      changeCase('lower');
                      closeDropdown();
                    }}
                    className="py-1 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] font-bold text-slate-200 text-center transition-colors"
                  >
                    minúsculas
                  </button>
                </div>

                <div className="h-px bg-slate-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    handleClearFormatting();
                    closeDropdown();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-rose-300 hover:bg-rose-500/15 transition-colors"
                >
                  <Eraser className="w-3.5 h-3.5 text-rose-400" />
                  <span>Limpiar formato del texto</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 6. Submenú Unificado: Color de Tinta & Resaltador de Lectura */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('color')}
            className={`h-7 px-2 rounded-lg border flex items-center gap-1.5 transition-colors shadow-sm ${
              activeDropdown === 'color'
                ? 'bg-slate-800 border-indigo-400 text-white'
                : 'bg-slate-950/80 border-slate-700/80 hover:border-slate-600 text-slate-300'
            }`}
            title="Color de tinta académica y resaltador de lectura"
          >
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold leading-none">A</span>
              <span
                className="w-3 h-0.5 rounded-full mt-0.5"
                style={{ backgroundColor: currentTextColor || '#0f172a' }}
              />
            </div>
            <Highlighter className="w-3 h-3 text-amber-400/90" />
            <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
          </button>

          {activeDropdown === 'color' && (
            <div className="absolute top-8 left-0 z-50 w-56 p-3 rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl space-y-3 fade-in text-slate-200">
              {/* Tinta de Texto */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Tinta de texto</span>
                  <span className="text-[9px] text-slate-500 font-normal">Académica</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setColor(c.value).run();
                        closeDropdown();
                      }}
                      className="w-7 h-7 rounded-lg border border-slate-700/80 hover:scale-110 transition-transform flex items-center justify-center relative shadow-sm"
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    >
                      {currentTextColor === c.value && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    closeDropdown();
                  }}
                  className="w-full mt-1.5 py-1 text-center text-[10px] text-slate-400 hover:text-slate-200 border-t border-slate-800"
                >
                  Restablecer tinta automática
                </button>
              </div>

              <div className="h-px bg-slate-800" />

              {/* Resaltador de Lectura */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Resaltador de revisión</span>
                  <span className="text-[9px] text-slate-500 font-normal">Pastel</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {HIGHLIGHT_COLORS.map((h) => (
                    <button
                      key={h.value}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setHighlight({ color: h.value }).run();
                        closeDropdown();
                      }}
                      className="h-6 rounded-md border border-slate-600/50 hover:scale-105 transition-transform flex items-center justify-center"
                      style={{ backgroundColor: h.value }}
                      title={h.label}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetHighlight().run();
                    closeDropdown();
                  }}
                  className="w-full mt-1.5 py-1 text-center text-[10px] text-slate-400 hover:text-rose-300 border-t border-slate-800"
                >
                  Quitar resaltador
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="w-px h-5 bg-slate-700/60 mx-0.5" />

        {/* 7. Alineación de Párrafo */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('paragraph')}
            className={`h-7 px-2 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-colors shadow-sm ${
              activeDropdown === 'paragraph'
                ? 'bg-slate-800 border-indigo-400 text-white'
                : 'bg-slate-950/80 border-slate-700/80 hover:border-slate-600 text-slate-200'
            }`}
            title="Alineación de párrafo"
          >
            {editor.isActive({ textAlign: 'center' }) ? (
              <AlignCenter className="w-3.5 h-3.5 text-indigo-400" />
            ) : editor.isActive({ textAlign: 'right' }) ? (
              <AlignRight className="w-3.5 h-3.5 text-indigo-400" />
            ) : editor.isActive({ textAlign: 'justify' }) ? (
              <AlignJustify className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <AlignLeft className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="hidden sm:inline">Alinear</span>
            <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
          </button>

          {activeDropdown === 'paragraph' && (
            <div className="absolute top-8 left-0 z-50 w-64 p-3 rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl space-y-3 fade-in text-slate-200">
              {/* Alineación */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Alineación de texto
                </div>
                <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setTextAlign('left').run();
                      closeDropdown();
                    }}
                    className={`py-1.5 flex items-center justify-center rounded transition-colors ${
                      editor.isActive({ textAlign: 'left' })
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Alinear a la izquierda"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setTextAlign('center').run();
                      closeDropdown();
                    }}
                    className={`py-1.5 flex items-center justify-center rounded transition-colors ${
                      editor.isActive({ textAlign: 'center' })
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Centrar"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setTextAlign('right').run();
                      closeDropdown();
                    }}
                    className={`py-1.5 flex items-center justify-center rounded transition-colors ${
                      editor.isActive({ textAlign: 'right' })
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Alinear a la derecha"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setTextAlign('justify').run();
                      closeDropdown();
                    }}
                    className={`py-1.5 flex items-center justify-center rounded transition-colors ${
                      editor.isActive({ textAlign: 'justify' })
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Justificar texto"
                  >
                    <AlignJustify className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 8. Interlineado Directo */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('lineHeight')}
            className={`h-7 px-2 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition-colors shadow-sm ${
              activeDropdown === 'lineHeight'
                ? 'bg-slate-800 border-indigo-400 text-white'
                : 'bg-slate-950/80 border-slate-700/80 hover:border-slate-600 text-slate-200'
            }`}
            title="Interlineado del documento (Simple, 1.15, 1.5, Doble APA)"
          >
            <span className="text-indigo-400 font-bold font-mono text-[11px]">↕</span>
            <span className="font-mono text-xs">{currentLineHeight || '1.15'}</span>
            <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
          </button>

          {activeDropdown === 'lineHeight' && (
            <div className="absolute top-8 left-0 z-50 w-52 p-2 rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl space-y-1 fade-in text-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">
                Interlineado
              </div>
              {LINE_HEIGHTS.map((lh) => {
                const isSelected = (currentLineHeight || '1.15') === lh.value;
                return (
                  <button
                    key={lh.value}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setLineHeight(lh.value).run();
                      closeDropdown();
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600/30 text-indigo-200 font-semibold'
                        : 'hover:bg-slate-800'
                    }`}
                  >
                    <span>{lh.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 9. Listas y Sangría APA Directas */}
        <div className="flex items-center bg-slate-950/80 border border-slate-700/80 rounded-lg p-0.5 gap-0.5 shadow-sm">
          <button
            type="button"
            onClick={handleSmartToggleBulletList}
            className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
              editor.isActive('bulletList')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Lista con viñetas"
          >
            <List className="w-3.5 h-3.5 text-emerald-400" />
          </button>
          <button
            type="button"
            onClick={handleSmartToggleOrderedList}
            className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
              editor.isActive('orderedList')
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Lista numerada continua (1, 2, 3...)"
          >
            <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
          </button>
          <span className="w-px h-3.5 bg-slate-700/60" />
          <button
            type="button"
            onClick={() => editor.chain().focus().outdent().run()}
            className="h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reducir sangría"
          >
            <OutdentIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().indent().run()}
            className="h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Aumentar sangría APA (1.27 cm)"
          >
            <IndentIcon className="w-3.5 h-3.5 text-indigo-400" />
          </button>
        </div>

        {/* 8. Submenú de Inserción: Tabla (6x6 interactiva), Enlace, Salto de página, Regla */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('insert')}
            className={`h-7 px-2 sm:px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${
              activeDropdown === 'insert'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-950/80 border-slate-700/80 hover:border-indigo-400 text-slate-200 hover:text-white'
            }`}
            title="Insertar tabla, enlaces, salto de página o elementos estructurales"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Insertar</span>
            <ChevronDown className="w-2.5 h-2.5" />
          </button>

          {activeDropdown === 'insert' && (
            <div className="absolute top-8 left-0 z-50 w-72 p-2.5 rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl space-y-2 fade-in text-slate-200">
              {/* Tabla con selector matricial 6x6 */}
              <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <TableIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Tabla académica</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300">
                    {gridHover.cols} × {gridHover.rows}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
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
                              : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                          }`}
                        />
                      );
                    })
                  )}
                </div>

                {/* Controles contextuales de tabla activa */}
                {editor.isActive('table') && (
                  <div className="mt-2 pt-2 border-t border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                      Ajustes de Tabla
                    </span>

                    {/* Fila 1: Filas y Columnas básicas */}
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => editor.chain().focus().addRowAfter().run()}
                        disabled={!editor.can().addRowAfter()}
                        className="py-1 px-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 flex items-center justify-center gap-0.5 cursor-pointer"
                        title="Añadir fila abajo"
                      >
                        <PlusSquare className="w-3 h-3 text-emerald-400" /> Fila
                      </button>
                      <button
                        type="button"
                        onClick={() => editor.chain().focus().deleteRow().run()}
                        disabled={!editor.can().deleteRow()}
                        className="py-1 px-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-rose-300 flex items-center justify-center gap-0.5 cursor-pointer"
                        title="Eliminar fila"
                      >
                        <MinusSquare className="w-3 h-3 text-rose-400" /> Fila
                      </button>
                      <button
                        type="button"
                        onClick={() => editor.chain().focus().addColumnAfter().run()}
                        disabled={!editor.can().addColumnAfter()}
                        className="py-1 px-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 flex items-center justify-center gap-0.5 cursor-pointer"
                        title="Añadir columna derecha"
                      >
                        <ArrowRightSquare className="w-3 h-3 text-emerald-400" /> Col
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          editor.chain().focus().deleteTable().run();
                          closeDropdown();
                        }}
                        disabled={!editor.can().deleteTable()}
                        className="py-1 px-1 rounded bg-rose-900/40 hover:bg-rose-900/60 text-[10px] text-rose-300 flex items-center justify-center gap-0.5 cursor-pointer"
                        title="Eliminar tabla completa"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" /> Borrar
                      </button>
                    </div>

                    {/* Fila 2: Dimensiones de celda (ancho col y alto fila) */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/60">
                      <div className="flex items-center justify-between bg-slate-950 p-1 rounded border border-slate-800 text-[10px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Columns className="w-3 h-3 text-cyan-400" /> Col
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const cell = editor.getAttributes('tableCell') || editor.getAttributes('tableHeader');
                              const cur = cell?.colwidth?.[0] || 130;
                              editor.chain().focus().setColumnWidth(Math.max(40, cur - 15)).run();
                            }}
                            className="w-4 h-4 bg-slate-800 hover:bg-slate-700 rounded text-center leading-none text-slate-200"
                            title="Reducir ancho columna"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const cell = editor.getAttributes('tableCell') || editor.getAttributes('tableHeader');
                              const cur = cell?.colwidth?.[0] || 130;
                              editor.chain().focus().setColumnWidth(cur + 15).run();
                            }}
                            className="w-4 h-4 bg-slate-800 hover:bg-slate-700 rounded text-center leading-none text-slate-200"
                            title="Aumentar ancho columna"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => editor.chain().focus().distributeColumnsEvenly().run()}
                            className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[9px] text-cyan-300"
                            title="Distribuir columnas uniformemente"
                          >
                            Dist
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-slate-950 p-1 rounded border border-slate-800 text-[10px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Rows className="w-3 h-3 text-amber-400" /> Fila
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const row = editor.getAttributes('tableRow');
                              const cur = row?.height ? parseInt(row.height, 10) : 36;
                              editor.chain().focus().setTableRowHeight(`${Math.max(20, cur - 4)}px`).run();
                            }}
                            className="w-4 h-4 bg-slate-800 hover:bg-slate-700 rounded text-center leading-none text-slate-200"
                            title="Reducir alto de fila"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const row = editor.getAttributes('tableRow');
                              const cur = row?.height ? parseInt(row.height, 10) : 36;
                              editor.chain().focus().setTableRowHeight(`${cur + 4}px`).run();
                            }}
                            className="w-4 h-4 bg-slate-800 hover:bg-slate-700 rounded text-center leading-none text-slate-200"
                            title="Aumentar alto de fila"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => editor.chain().focus().setTableRowHeight(null).run()}
                            className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[9px] text-amber-300"
                            title="Restablecer alto automático"
                          >
                            Auto
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Fila 3: Paginación y corte de tabla para proteger el tamaño de hoja */}
                    <div className="space-y-1 pt-1 border-t border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => {
                          editor.chain().focus().splitTableAtCursor(true).run();
                          closeDropdown();
                        }}
                        className="w-full text-left px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Corta la tabla en la fila actual y la envía a la siguiente página repitiendo el encabezado"
                      >
                        <Scissors className="w-3 h-3 text-indigo-400" />
                        <span>Dividir tabla aquí (nueva página)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          editor.chain().focus().autoPaginateTable(15).run();
                          closeDropdown();
                        }}
                        className="w-full text-left px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Divide automáticamente la tabla en páginas de hasta 15 filas respetando el tamaño físico de hoja"
                      >
                        <Split className="w-3 h-3 text-emerald-400" />
                        <span>Auto-paginar tabla larga (15 filas)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Enlace Web */}
              <button
                type="button"
                onClick={handleOpenLinkPopover}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Enlace o referencia web</span>
                </div>
                {editor.isActive('link') && (
                  <span className="text-[10px] text-cyan-400 font-mono">Activo</span>
                )}
              </button>

              {/* Pegar código Markdown directamente */}
              <button
                type="button"
                onClick={async () => {
                  closeDropdown();
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text && text.trim()) {
                      const parsed = parseMarkdownToHtml(text);
                      if (parsed && parsed !== '<p></p>') {
                        editor.chain().focus().insertContent(parsed).run();
                        setTimeout(() => {
                          sanitizeAndPaginateOversizedNodes(editor);
                        }, 60);
                        return;
                      }
                    }
                  } catch {
                    // Si el navegador bloquea clipboard.readText(), enfocar y usar atajo nativo
                  }
                  editor.chain().focus().run();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Pega e interpreta código Markdown desde el portapapeles directamente en la zona de redacción"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pegar Markdown del portapapeles</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Ctrl+V</span>
              </button>

              {/* Salto de Página */}
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().insertPageBreak().run();
                  closeDropdown();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Scissors className="w-3.5 h-3.5 text-indigo-400" />
                <span>Salto de página (Carta/Oficio/A4)</span>
              </button>

              {/* Regla Horizontal */}
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setHorizontalRule().run();
                  closeDropdown();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Divide className="w-3.5 h-3.5 text-slate-400" />
                <span>Línea divisoria horizontal</span>
              </button>
            </div>
          )}
        </div>

        {/* Popover de Configuración de Hipervínculo */}
        {activeDropdown === 'link' && (
          <div className="absolute top-10 left-36 sm:left-64 z-50 w-72 p-2.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl space-y-2 fade-in text-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Hipervínculo web
            </span>
            <input
              type="url"
              placeholder="https://ejemplo.com/paper"
              value={linkUrlInput}
              onChange={(e) => setLinkUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyLink();
                if (e.key === 'Escape') closeDropdown();
              }}
              autoFocus
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-indigo-400"
            />
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
              {editor.isActive('link') && (
                <button
                  type="button"
                  onClick={handleRemoveLink}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Quitar</span>
                </button>
              )}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={closeDropdown}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyLink}
                  className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN DERECHA: PUBLICAR, PLANTILLAS, CITAS, A LECTURAS, EXPORTAR Y ESTADO */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-auto">
        {/* Publicar en la Comunidad */}
        {onPublishTemplate && (
          <button
            type="button"
            onClick={onPublishTemplate}
            className="h-7 px-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/35 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Publicar este documento como plantilla pública en la comunidad"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Publicar</span>
          </button>
        )}

        {/* Plantillas Guiadas */}
        <button
          type="button"
          onClick={onOpenTemplates}
          className="h-7 px-2.5 rounded-lg bg-indigo-500/15 border border-indigo-500/35 hover:bg-indigo-500/25 text-indigo-300 hover:text-indigo-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          title="Plantillas académicas probadas (Ensayo, Monografía, Lab, Feynman...)"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline">Plantillas</span>
        </button>

        {/* Cajón de Citas */}
        <button
          type="button"
          onClick={onToggleCitations}
          className={`h-7 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
            citationsOpen
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-slate-950/80 border-slate-700/80 text-slate-300 hover:text-white hover:border-indigo-500/40'
          }`}
          title="Abrir cajón de citas y notas de lecturas"
        >
          <Quote className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline">Citas</span>
        </button>

        {/* Agregar a Lecturas */}
        <button
          type="button"
          onClick={onAddToReadings}
          className="h-7 px-2.5 rounded-lg bg-purple-500/15 border border-purple-500/35 hover:bg-purple-500/25 text-purple-300 hover:text-purple-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          title="Exportar trabajo directamente al Visor de Material de estudio"
        >
          <FolderPlus className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden lg:inline">A Lecturas</span>
        </button>

        {/* Menú Exportar */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('export')}
            className="h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-colors"
            title="Descargar o imprimir documento"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
            <ChevronDown className="w-2.5 h-2.5 ml-0.5" />
          </button>

          {activeDropdown === 'export' && (
            <div className="absolute right-0 top-8 z-50 w-52 p-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl space-y-1 fade-in text-slate-200">
              {onExportPdf && (
                <button
                  type="button"
                  onClick={() => {
                    closeDropdown();
                    onExportPdf();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4 text-rose-400" />
                  <span>Descargar PDF (.pdf)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  closeDropdown();
                  onExportDocx();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2"
              >
                <FileDown className="w-4 h-4 text-indigo-400" />
                <span>Descargar Word (.docx)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeDropdown();
                  onExportMarkdown();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2"
              >
                <FileCode className="w-4 h-4 text-sky-400" />
                <span>Descargar Markdown (.md)</span>
              </button>
              <div className="h-px bg-slate-800 my-1" />
              <button
                type="button"
                onClick={() => {
                  closeDropdown();
                  onPrintPdf();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2"
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
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-950/80 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title={isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {isFullScreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>

        {/* Badge Autoguardado */}
        <div
          className="flex items-center gap-1.5 px-2 h-7 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-mono select-none"
          title="Tus cambios se guardan automáticamente en tu dispositivo y nube"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden xl:inline text-slate-300 font-medium">Autoguardado</span>
        </div>
      </div>
    </div>
  );
};
