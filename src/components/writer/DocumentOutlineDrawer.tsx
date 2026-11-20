import React, { useEffect, useState, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import {
  ListTree,
  ChevronLeft,
  Search,
  X,
  Compass,
} from 'lucide-react';

export interface OutlineHeadingItem {
  id: string;
  level: number;
  text: string;
  pos: number;
}

interface DocumentOutlineDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  editor: Editor | null;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const DocumentOutlineDrawer: React.FC<DocumentOutlineDrawerProps> = ({
  isOpen,
  onToggle,
  editor,
  containerRef,
}) => {
  const [headings, setHeadings] = useState<OutlineHeadingItem[]>([]);
  const [activePos, setActivePos] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Extraer encabezados del documento TipTap y escuchar cambios
  useEffect(() => {
    if (!editor) return;

    const extractHeadings = () => {
      const found: OutlineHeadingItem[] = [];
      const { doc, selection } = editor.state;

      doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          const level = node.attrs.level || 1;
          const text = node.textContent.trim();
          if (text) {
            found.push({
              id: `heading-${pos}`,
              level,
              text,
              pos,
            });
          }
        }
      });

      setHeadings(found);

      // Determinar cuál es el título activo más cercano al cursor
      const cursor = selection.from;
      let currentActive: number | null = null;
      for (const h of found) {
        if (h.pos <= cursor) {
          currentActive = h.pos;
        } else {
          break;
        }
      }
      setActivePos(currentActive ?? (found[0]?.pos ?? null));
    };

    extractHeadings();

    editor.on('update', extractHeadings);
    editor.on('selectionUpdate', extractHeadings);

    return () => {
      editor.off('update', extractHeadings);
      editor.off('selectionUpdate', extractHeadings);
    };
  }, [editor]);

  // Filtrar encabezados si el usuario escribe en el buscador
  const filteredHeadings = useMemo(() => {
    if (!searchTerm.trim()) return headings;
    const term = searchTerm.toLowerCase();
    return headings.filter((h) => h.text.toLowerCase().includes(term));
  }, [headings, searchTerm]);

  // Manejar el salto suave hacia un título
  const handleJumpTo = (pos: number) => {
    if (!editor) return;

    editor.chain().focus().setTextSelection(pos).run();

    try {
      const dom = editor.view.nodeDOM(pos);
      if (dom instanceof HTMLElement) {
        dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    } catch {
      // Continuar con cálculo de coordenadas si nodeDOM no es elemento directo
    }

    try {
      const coords = editor.view.coordsAtPos(pos);
      if (coords && containerRef?.current) {
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const targetTop = container.scrollTop + (coords.top - rect.top) - 80;
        container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }
    } catch {
      // fallback sin scroll adicional
    }
  };

  // Si está cerrado, mostrar pestaña flotante minimalista en el lateral izquierdo
  if (!isOpen) {
    return (
      <div className="absolute left-2 top-20 z-30">
        <button
          type="button"
          onClick={onToggle}
          className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-indigo-500/30 hover:border-indigo-400 shadow-xl backdrop-blur-md text-[11px] font-semibold transition-all"
          title="Abrir índice y árbol de títulos (H1 - H4)"
        >
          <ListTree className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Índice</span>
          {headings.length > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[9.5px] font-mono">
              {headings.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <aside
      className="w-64 sm:w-72 h-full flex flex-col bg-slate-900/95 border-r border-indigo-500/20 backdrop-blur-xl z-30 flex-shrink-0 select-none shadow-2xl animate-in slide-in-from-left duration-200"
      aria-label="Índice de contenido del documento"
    >
      {/* Cabecera del Panel */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <ListTree className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
              <span>Índice de Títulos</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {headings.length === 1 ? '1 sección' : `${headings.length} secciones`}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Colapsar panel de índice"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Buscador de secciones si hay más de 5 encabezados */}
      {headings.length > 5 && (
        <div className="px-3 pt-2.5 pb-1 flex-shrink-0">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar título o sección..."
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg pl-8 pr-7 py-1 text-[11px] text-slate-200 placeholder-slate-500 outline-none transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista del Árbol de Títulos */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
        {filteredHeadings.length === 0 ? (
          <div className="p-4 text-center space-y-2">
            <div className="w-9 h-9 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500">
              <Compass className="w-4 h-4" />
            </div>
            {searchTerm ? (
              <p className="text-xs text-slate-400">
                No se encontraron títulos que coincidan con "{searchTerm}".
              </p>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-300">
                  Sin títulos detectados
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Usa los formatos <strong className="text-indigo-300">Título 1 al 4</strong> o escribe con <code className="bg-slate-800 px-1 py-0.5 rounded text-[10px] text-indigo-300 font-mono">#</code> para generar el índice automático.
                </p>
              </div>
            )}
          </div>
        ) : (
          filteredHeadings.map((h) => {
            const isActive = activePos === h.pos;
            const levelIndent =
              h.level === 1
                ? 'pl-2'
                : h.level === 2
                ? 'pl-5'
                : h.level === 3
                ? 'pl-8'
                : 'pl-11';

            const dotColor =
              h.level === 1
                ? 'bg-indigo-400'
                : h.level === 2
                ? 'bg-cyan-400'
                : h.level === 3
                ? 'bg-emerald-400'
                : 'bg-amber-400';

            const textSize =
              h.level === 1
                ? 'text-xs font-bold text-slate-100'
                : h.level === 2
                ? 'text-[11.5px] font-semibold text-slate-200'
                : h.level === 3
                ? 'text-[11px] font-medium text-slate-300'
                : 'text-[10.5px] font-normal text-slate-400';

            return (
              <button
                key={h.id}
                type="button"
                onClick={() => handleJumpTo(h.pos)}
                className={`w-full text-left py-1.5 pr-2 rounded-lg flex items-start gap-2 transition-all group ${levelIndent} ${
                  isActive
                    ? 'bg-indigo-600/20 border-l-2 border-indigo-400 text-white shadow-sm'
                    : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                }`}
                title={`Saltar a: ${h.text} (H${h.level})`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 transition-transform group-hover:scale-125 ${dotColor}`}
                />
                <span className={`truncate leading-snug ${textSize}`}>
                  {h.text}
                </span>
                <span className="ml-auto opacity-0 group-hover:opacity-100 text-[9px] font-mono text-slate-500 flex-shrink-0 transition-opacity">
                  H{h.level}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Pie del Panel: Accesos y Ayuda */}
      <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/40 text-[10px] text-slate-500 font-mono flex items-center justify-between flex-shrink-0">
        <span>Navegación Rápida</span>
        <span className="text-indigo-400">H1 - H4</span>
      </div>
    </aside>
  );
};
