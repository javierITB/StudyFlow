import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: () => ReturnType;
    };
  }
}

const PageBreakComponent: React.FC<NodeViewProps> = ({ deleteNode }) => {
  return (
    <NodeViewWrapper
      className="page-break-wrapper my-0 block select-none"
      contentEditable={false}
      draggable={false}
      onDragStart={(e: React.DragEvent) => e.preventDefault()}
      style={{
        pageBreakBefore: 'always',
        breakBefore: 'page',
        width: 'calc(100% + (2 * var(--sheet-pad-x, 56px)))',
        marginLeft: 'calc(-1 * var(--sheet-pad-x, 56px))',
        marginRight: 'calc(-1 * var(--sheet-pad-x, 56px))',
      }}
    >
      {/* Borde inferior de la hoja previa con pie de página */}
      <div
        className="px-[var(--sheet-pad-x,56px)] py-3 border-b border-slate-300 shadow-[0_10px_18px_-4px_rgba(0,0,0,0.22)] flex items-center justify-between text-[10px] text-slate-400 font-mono"
        style={{ background: 'var(--sf-paper-bg, #ffffff)' }}
      >
        <span>StudyFlexConnect · Redacción Académica</span>
        <span className="font-semibold text-slate-500">Salto Manual</span>
      </div>

      {/* Espacio físico del escritorio (Corte físico entre hojas, adaptado al tema activo) */}
      <div
        className="h-10 flex items-center justify-center relative shadow-[inset_0_8px_10px_-4px_rgba(0,0,0,0.35),inset_0_-8px_10px_-4px_rgba(0,0,0,0.35)]"
        style={{ background: 'rgb(var(--sf-bg-app, 16 18 24))' }}
      >
        <div className="bg-slate-900/95 border border-indigo-500/40 rounded-full px-3.5 py-1 text-[10.5px] font-mono font-bold text-indigo-300 flex items-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.45)]">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>SALTO DE PÁGINA MANUAL · SIGUIENTE HOJA</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode();
            }}
            className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-800 hover:bg-red-500/30 text-slate-300 hover:text-red-200 transition-colors cursor-pointer"
            title="Eliminar salto de página manual"
          >
            ×
          </button>
        </div>
      </div>

      {/* Borde superior de la nueva hoja con encabezado */}
      <div
        className="px-[var(--sheet-pad-x,56px)] py-3 border-t border-slate-200 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.1)] flex items-center justify-between text-[10px] text-slate-400 font-mono"
        style={{ background: 'var(--sf-paper-bg, #ffffff)' }}
      >
        <span className="font-semibold text-slate-500">Nueva Página</span>
        <span className="uppercase tracking-wider text-[9px]">Continuación</span>
      </div>
    </NodeViewWrapper>
  );
};

export const PageBreak = Node.create({
  name: 'pageBreak',

  group: 'block',

  atom: true,

  draggable: false,

  selectable: false,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="page-break"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'page-break' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakComponent);
  },

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
          });
        },
    };
  },
});
