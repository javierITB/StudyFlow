import React, { useEffect, useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Code,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Underline,
  Eraser,
} from 'lucide-react';
import { parseMarkdownToHtml } from '../../lib/markdownParser';

interface FloatingFormatMenuProps {
  editor: Editor | null;
}

export const FloatingFormatMenu: React.FC<FloatingFormatMenuProps> = ({ editor }) => {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updatePosition = () => {
      const { selection } = editor.state;
      if (selection.empty || !editor.view.dom.contains(document.activeElement)) {
        setCoords(null);
        return;
      }

      try {
        const fromCoords = editor.view.coordsAtPos(selection.from);
        const toCoords = editor.view.coordsAtPos(selection.to);

        const left = (fromCoords.left + toCoords.left) / 2;
        const top = Math.min(fromCoords.top, toCoords.top) - 48;

        // Limitar dentro de la pantalla
        const clampedLeft = Math.max(160, Math.min(window.innerWidth - 160, left));
        const clampedTop = Math.max(70, top);

        setCoords({ top: clampedTop, left: clampedLeft });
      } catch {
        setCoords(null);
      }
    };

    updatePosition();

    const handleSelectionChange = () => {
      requestAnimationFrame(updatePosition);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    editor.on('selectionUpdate', updatePosition);
    editor.on('blur', () => setCoords(null));

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      editor.off('selectionUpdate', updatePosition);
    };
  }, [editor]);

  if (!editor || !coords) return null;

  const isH1 = editor.isActive('heading', { level: 1 });
  const isH2 = editor.isActive('heading', { level: 2 });
  const isH3 = editor.isActive('heading', { level: 3 });
  const isH4 = editor.isActive('heading', { level: 4 });
  const isBlockquote = editor.isActive('blockquote');
  const isCodeBlock = editor.isActive('codeBlock');
  const isOrderedList = editor.isActive('orderedList');
  const isBulletList = editor.isActive('bulletList');
  const isBold = editor.isActive('bold');
  const isItalic = editor.isActive('italic');
  const isUnderline = editor.isActive('underline');

  // Convertir a texto normal: si está dentro de un bloque de código, desempaquetar su contenido a texto rico
  const handleConvertToParagraph = () => {
    if (isCodeBlock) {
      let codeNode: any = null;
      let codePos = -1;
      for (let d = editor.state.selection.$from.depth; d > 0; d--) {
        const n = editor.state.selection.$from.node(d);
        if (n.type.name === 'codeBlock') {
          codeNode = n;
          codePos = editor.state.selection.$from.before(d);
          break;
        }
      }
      if (codeNode && codePos !== -1) {
        const text = codeNode.textContent || '';
        const html = parseMarkdownToHtml(text);
        editor.chain().focus().setNodeSelection(codePos).insertContent(html).run();
        return;
      }
    }
    editor.chain().focus().setParagraph().run();
  };

  const handleToggleOrderedList = () => {
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

  const handleToggleBulletList = () => {
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

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        transform: 'translateX(-50%)',
      }}
      className="z-50 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 rounded-xl px-1.5 py-1 flex items-center gap-0.5 shadow-2xl text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-150"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Texto Normal */}
      <button
        type="button"
        onClick={handleConvertToParagraph}
        className={`px-1.5 py-1 rounded-lg text-[10.5px] font-medium flex items-center gap-1 transition-colors ${
          !isH1 && !isH2 && !isH3 && !isH4 && !isBlockquote && !isCodeBlock && !isOrderedList && !isBulletList
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Formato: Texto normal (párrafo)"
      >
        <Pilcrow className="w-3 h-3 text-indigo-400" />
        <span className="hidden sm:inline">Texto</span>
      </button>

      {/* Encabezados H1, H2, H3, H4 */}
      <div className="flex items-center gap-0.5 bg-slate-950/70 rounded-lg p-0.5 border border-slate-800/80">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold font-mono transition-colors ${
            isH1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Título 1 (H1)"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold font-mono transition-colors ${
            isH2 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Título 2 (H2)"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold font-mono transition-colors ${
            isH3 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Título 3 (H3)"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold font-mono transition-colors ${
            isH4 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Título 4 (H4)"
        >
          H4
        </button>
      </div>

      {/* Cita en bloque */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-1 rounded-lg transition-colors ${
          isBlockquote ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Cita académica en bloque (APA 7)"
      >
        <Quote className="w-3.5 h-3.5 text-amber-400" />
      </button>

      {/* Bloque de código */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`p-1 rounded-lg transition-colors ${
          isCodeBlock ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Bloque de código monospaciado"
      >
        <Code className="w-3.5 h-3.5 text-sky-400" />
      </button>

      {/* Listas */}
      <div className="flex items-center gap-0.5 bg-slate-950/70 rounded-lg p-0.5 border border-slate-800/80">
        <button
          type="button"
          onClick={handleToggleBulletList}
          className={`p-1 rounded transition-colors ${
            isBulletList ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Lista con viñetas"
        >
          <List className="w-3.5 h-3.5 text-emerald-400" />
        </button>
        <button
          type="button"
          onClick={handleToggleOrderedList}
          className={`p-1 rounded transition-colors ${
            isOrderedList ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Lista numerada continua (1, 2, 3...)"
        >
          <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
        </button>
      </div>

      <span className="w-px h-4 bg-slate-700/60 mx-0.5" />

      {/* Estilos en línea: Negrita, Cursiva, Subrayado */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1 rounded transition-colors ${
          isBold ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Negrita (Ctrl+B)"
      >
        <Bold className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1 rounded transition-colors ${
          isItalic ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Cursiva (Ctrl+I)"
      >
        <Italic className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-1 rounded transition-colors ${
          isUnderline ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Subrayado (Ctrl+U)"
      >
        <Underline className="w-3 h-3" />
      </button>

      {/* Limpiar formato */}
      <button
        type="button"
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-300 transition-colors"
        title="Borrar formato del texto seleccionado"
      >
        <Eraser className="w-3 h-3" />
      </button>
    </div>
  );
};
