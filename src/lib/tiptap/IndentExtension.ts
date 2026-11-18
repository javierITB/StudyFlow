import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

export interface IndentOptions {
  types: string[];
  minIndent: number;
  maxIndent: number;
  indentDistanceCm: number;
}

export const IndentExtension = Extension.create<IndentOptions>({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote'],
      minIndent: 0,
      maxIndent: 4,
      indentDistanceCm: 1.27, // 1.27cm = 0.5in (Estándar APA)
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const attr = element.getAttribute('data-indent');
              if (attr) {
                const parsed = parseInt(attr, 10);
                return isNaN(parsed) ? 0 : parsed;
              }
              const ml = element.style.marginLeft;
              if (ml && ml.includes('cm')) {
                const val = parseFloat(ml);
                return Math.round(val / this.options.indentDistanceCm);
              }
              return 0;
            },
            renderHTML: (attributes) => {
              const level = attributes.indent || 0;
              if (level <= 0) {
                return {};
              }
              const distance = (level * this.options.indentDistanceCm).toFixed(2);
              return {
                'data-indent': String(level),
                style: `margin-left: ${distance}cm;`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { from, to } = selection;
          let applicable = false;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              applicable = true;
              const currentIndent = (node.attrs.indent as number) || 0;
              if (currentIndent < this.options.maxIndent) {
                if (dispatch) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    indent: currentIndent + 1,
                  });
                }
              }
            }
          });

          return applicable;
        },

      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { from, to } = selection;
          let applicable = false;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              applicable = true;
              const currentIndent = (node.attrs.indent as number) || 0;
              if (currentIndent > this.options.minIndent) {
                if (dispatch) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    indent: currentIndent - 1,
                  });
                }
              }
            }
          });

          return applicable;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        // En tablas o listas, dejamos que el comportamiento nativo tome precedencia
        if (this.editor.isActive('table') || this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
          return false;
        }
        return this.editor.commands.indent();
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('table') || this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
          return false;
        }
        return this.editor.commands.outdent();
      },
    };
  },
});

