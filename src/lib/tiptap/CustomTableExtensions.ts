import { Extension } from '@tiptap/core';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customTable: {
      setTableWidth: (width: string) => ReturnType;
      setTableAlignment: (alignment: 'left' | 'center' | 'right') => ReturnType;
    };
    customTableRow: {
      setTableRowHeight: (height: string | null) => ReturnType;
    };
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

export const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 'auto',
        parseHTML: (element) => element.getAttribute('data-width') || element.style.width || 'auto',
        renderHTML: (attributes) => ({
          'data-width': attributes.width || 'auto',
        }),
      },
      alignment: {
        default: 'center',
        parseHTML: (element) => {
          const attr = element.getAttribute('data-align');
          if (attr) return attr;
          if (element.style.marginLeft === '0px' || element.style.marginLeft === '0') return 'left';
          if (element.style.marginRight === '0px' || element.style.marginRight === '0') return 'right';
          return 'center';
        },
        renderHTML: (attributes) => ({
          'data-align': attributes.alignment || 'center',
        }),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const width = node.attrs.width || 'auto';
    const align = node.attrs.alignment || 'center';
    let margin = '0 auto';
    if (align === 'left') margin = '0 auto 0 0';
    if (align === 'right') margin = '0 0 0 auto';

    const widthStyle = width === 'auto' ? 'width: auto;' : `width: ${width} !important;`;

    return [
      'table',
      {
        ...HTMLAttributes,
        'data-width': width,
        'data-align': align,
        style: `${widthStyle} margin: ${margin} !important; ${HTMLAttributes.style || ''}`.trim(),
      },
      ['tbody', 0],
    ];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setTableWidth:
        (width: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          let tablePos: number | null = null;
          let tableNode: any = null;

          for (let d = selection.$from.depth; d > 0; d--) {
            const node = selection.$from.node(d);
            if (node.type.name === 'table') {
              tablePos = selection.$from.before(d);
              tableNode = node;
              break;
            }
          }

          if (!tableNode) {
            state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
              if (node.type.name === 'table') {
                tablePos = pos;
                tableNode = node;
                return false;
              }
            });
          }

          if (tableNode && tablePos !== null) {
            if (dispatch) {
              tr.setNodeMarkup(tablePos, undefined, {
                ...tableNode.attrs,
                width,
              });
            }
            return true;
          }
          return false;
        },

      setTableAlignment:
        (alignment: 'left' | 'center' | 'right') =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          let tablePos: number | null = null;
          let tableNode: any = null;

          for (let d = selection.$from.depth; d > 0; d--) {
            const node = selection.$from.node(d);
            if (node.type.name === 'table') {
              tablePos = selection.$from.before(d);
              tableNode = node;
              break;
            }
          }

          if (!tableNode) {
            state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
              if (node.type.name === 'table') {
                tablePos = pos;
                tableNode = node;
                return false;
              }
            });
          }

          if (tableNode && tablePos !== null) {
            if (dispatch) {
              tr.setNodeMarkup(tablePos, undefined, {
                ...tableNode.attrs,
                alignment,
              });
            }
            return true;
          }
          return false;
        },
    };
  },
});

export const CustomTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-height') || element.style.height || null,
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return {
            'data-height': attributes.height,
            style: `height: ${attributes.height} !important;`,
          };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const height = node.attrs.height;
    const extra: Record<string, any> = {};
    if (height) {
      extra['data-height'] = height;
      extra.style = `height: ${height} !important;`;
    }

    return [
      'tr',
      {
        ...HTMLAttributes,
        ...extra,
        style: `${extra.style || ''} ${HTMLAttributes.style || ''}`.trim(),
      },
      0,
    ];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setTableRowHeight:
        (height: string | null) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          let rowPos: number | null = null;
          let rowNode: any = null;

          for (let d = selection.$from.depth; d > 0; d--) {
            const node = selection.$from.node(d);
            if (node.type.name === 'tableRow') {
              rowPos = selection.$from.before(d);
              rowNode = node;
              break;
            }
          }

          if (!rowNode) {
            state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
              if (node.type.name === 'tableRow') {
                rowPos = pos;
                rowNode = node;
                return false;
              }
            });
          }

          if (rowNode && rowPos !== null) {
            if (dispatch) {
              tr.setNodeMarkup(rowPos, undefined, {
                ...rowNode.attrs,
                height,
              });
            }
            return true;
          }
          return false;
        },
    };
  },
});

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const colwidth = element.getAttribute('data-colwidth');
          return colwidth ? colwidth.split(',').map((n) => parseInt(n, 10)) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.colwidth) return {};
          const totalWidth = attributes.colwidth.reduce((a: number, b: number) => a + b, 0);
          return {
            'data-colwidth': attributes.colwidth.join(','),
            style: `width: ${totalWidth}px; min-width: ${totalWidth}px;`,
          };
        },
      },
    };
  },
});

export const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const colwidth = element.getAttribute('data-colwidth');
          return colwidth ? colwidth.split(',').map((n) => parseInt(n, 10)) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.colwidth) return {};
          const totalWidth = attributes.colwidth.reduce((a: number, b: number) => a + b, 0);
          return {
            'data-colwidth': attributes.colwidth.join(','),
            style: `width: ${totalWidth}px; min-width: ${totalWidth}px;`,
          };
        },
      },
    };
  },
});

export const LineHeight = Extension.create({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'tableCell', 'tableHeader'],
      defaultLineHeight: null,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }) => {
          return this.options.types.some((type: string) => commands.updateAttributes(type, { lineHeight }));
        },
      unsetLineHeight:
        () =>
        ({ commands }) => {
          return this.options.types.some((type: string) => commands.resetAttributes(type, 'lineHeight'));
        },
    };
  },
});
