import { Extension } from '@tiptap/core';
import { Table, createColGroup } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableMap, findTable } from '@tiptap/pm/tables';
import { DOMParser, Node as PMNode } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { parseMarkdownToHtml } from '../markdownParser';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customTable: {
      setTableWidth: (width: string) => ReturnType;
      setTableAlignment: (alignment: 'left' | 'center' | 'right') => ReturnType;
      setColumnWidth: (widthPx: number | null) => ReturnType;
      distributeColumnsEvenly: (totalTableWidthPx?: number) => ReturnType;
      splitTableAtCursor: (repeatHeader?: boolean) => ReturnType;
      autoPaginateTable: (maxRowsPerPage?: number) => ReturnType;
      autoPaginateAllTables: (maxRowsPerPage?: number) => ReturnType;
      autoPaginateAllCodeBlocks: (maxLinesPerPage?: number) => ReturnType;
      cleanOrphanBreakTexts: () => ReturnType;
      unpackMisformattedCodeBlocks: () => ReturnType;
      autoPaginateOversizedNodes: (maxRows?: number, maxLines?: number) => ReturnType;
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
    const { colgroup, tableWidth, tableMinWidth } = createColGroup(node, (this.options as any)?.cellMinWidth || 25);
    const width = node.attrs.width || 'auto';
    const align = node.attrs.alignment || 'center';
    let margin = '0 auto';
    if (align === 'left') margin = '0 auto 0 0';
    if (align === 'right') margin = '0 0 0 auto';

    let widthStyle = 'width: 100%;';
    if (width && width !== 'auto') {
      widthStyle = `width: ${width} !important;`;
    } else if (tableWidth) {
      widthStyle = `width: ${tableWidth};`;
    } else if (tableMinWidth) {
      widthStyle = `min-width: ${tableMinWidth};`;
    }

    return [
      'table',
      {
        ...HTMLAttributes,
        'data-width': width,
        'data-align': align,
        style: `${widthStyle} margin: ${margin} !important; ${HTMLAttributes.style || ''}`.trim(),
      },
      colgroup,
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

      setColumnWidth:
        (widthPx: number | null) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const tableResult = findTable(selection.$from);
          if (!tableResult) return false;

          const { node: tableNode, pos: tablePos } = tableResult;
          const map = TableMap.get(tableNode);

          let cellPos = -1;
          for (let d = selection.$from.depth; d > 0; d--) {
            const name = selection.$from.node(d).type.name;
            if (name === 'tableCell' || name === 'tableHeader') {
              cellPos = selection.$from.before(d);
              break;
            }
          }
          if (cellPos === -1) return false;

          const cellOffset = cellPos - tablePos - 1;
          const cellIndex = map.map.indexOf(cellOffset);
          if (cellIndex === -1) return false;

          const colIndex = cellIndex % map.width;

          if (dispatch) {
            for (let row = 0; row < map.height; row++) {
              const cOffset = map.map[row * map.width + colIndex];
              const absPos = tablePos + 1 + cOffset;
              const cell = tr.doc.nodeAt(absPos);
              if (cell) {
                tr.setNodeMarkup(absPos, undefined, {
                  ...cell.attrs,
                  colwidth: widthPx && widthPx > 20 ? [Math.round(widthPx)] : null,
                });
              }
            }
          }
          return true;
        },

      distributeColumnsEvenly:
        (totalTableWidthPx = 700) =>
        ({ tr, state, dispatch }) => {
          const tableResult = findTable(state.selection.$from);
          if (!tableResult) return false;

          const { node: tableNode, pos: tablePos } = tableResult;
          const map = TableMap.get(tableNode);
          if (map.width <= 0) return false;

          const colWidth = Math.max(40, Math.floor(totalTableWidthPx / map.width));

          if (dispatch) {
            for (let col = 0; col < map.width; col++) {
              for (let row = 0; row < map.height; row++) {
                const cOffset = map.map[row * map.width + col];
                const absPos = tablePos + 1 + cOffset;
                const cell = tr.doc.nodeAt(absPos);
                if (cell) {
                  tr.setNodeMarkup(absPos, undefined, {
                    ...cell.attrs,
                    colwidth: [colWidth],
                  });
                }
              }
            }
          }
          return true;
        },

      splitTableAtCursor:
        (repeatHeader = true) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          let tableNode: PMNode | null = null;
          let tablePos = -1;
          let currentRowIndex = -1;

          for (let d = selection.$from.depth; d > 0; d--) {
            const node = selection.$from.node(d);
            if (node.type.name === 'tableRow') {
              const parent = selection.$from.node(d - 1);
              if (parent && parent.type.name === 'table') {
                tableNode = parent;
                tablePos = selection.$from.before(d - 1);
                for (let i = 0; i < parent.childCount; i++) {
                  if (parent.child(i) === node) {
                    currentRowIndex = i;
                    break;
                  }
                }
              }
              break;
            }
          }

          if (!tableNode || tablePos === -1 || currentRowIndex <= 0 || currentRowIndex >= tableNode.childCount) {
            return false;
          }

          if (dispatch) {
            const headerRow = tableNode.child(0);
            const rows1: PMNode[] = [];
            const rows2: PMNode[] = [];

            if (repeatHeader && headerRow && currentRowIndex > 0) {
              rows2.push(headerRow);
            }

            for (let i = 0; i < tableNode.childCount; i++) {
              const row = tableNode.child(i);
              if (i < currentRowIndex) {
                rows1.push(row);
              } else {
                rows2.push(row);
              }
            }

            const tableType = state.schema.nodes.table;
            const t1 = tableType.create(tableNode.attrs, rows1);
            const t2 = tableType.create(tableNode.attrs, rows2);

            const pageBreakType = state.schema.nodes.pageBreak;
            const breakNode = pageBreakType ? pageBreakType.create() : null;

            const replacement = breakNode ? [t1, breakNode, t2] : [t1, t2];
            tr.replaceWith(tablePos, tablePos + tableNode.nodeSize, replacement);
          }
          return true;
        },

      autoPaginateTable:
        (maxRowsPerPage = 16) =>
        ({ tr, state, dispatch }) => {
          const tableResult = findTable(state.selection.$from);
          if (!tableResult) return false;

          const { node: tableNode, pos: tablePos } = tableResult;
          if (tableNode.childCount <= maxRowsPerPage) return false;

          if (dispatch) {
            const headerRow = tableNode.child(0);
            const tableType = state.schema.nodes.table;
            const pageBreakType = state.schema.nodes.pageBreak;

            const newNodes: PMNode[] = [];
            let currentChunk: PMNode[] = [];

            for (let i = 0; i < tableNode.childCount; i++) {
              const row = tableNode.child(i);
              currentChunk.push(row);

              if (currentChunk.length >= maxRowsPerPage && i < tableNode.childCount - 1) {
                newNodes.push(tableType.create(tableNode.attrs, currentChunk));
                if (pageBreakType) {
                  newNodes.push(pageBreakType.create());
                }
                currentChunk = [];
                if (headerRow) {
                  currentChunk.push(headerRow);
                }
              }
            }

            if (currentChunk.length > 0) {
              newNodes.push(tableType.create(tableNode.attrs, currentChunk));
            }

            tr.replaceWith(tablePos, tablePos + tableNode.nodeSize, newNodes);
          }
          return true;
        },

      autoPaginateAllTables:
        (maxRowsPerPage = 15) =>
        ({ tr, state, dispatch }) => {
          const tableType = state.schema.nodes.table;
          const pageBreakType = state.schema.nodes.pageBreak;
          if (!tableType || !pageBreakType) return false;

          const oversizedTables: { pos: number; node: PMNode }[] = [];
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'table' && node.childCount > maxRowsPerPage) {
              oversizedTables.push({ pos, node });
              return false;
            }
          });

          if (oversizedTables.length === 0) return false;

          if (dispatch) {
            for (let t = oversizedTables.length - 1; t >= 0; t--) {
              const { pos: tablePos, node: tableNode } = oversizedTables[t];
              const headerRow = tableNode.child(0);
              const newNodes: PMNode[] = [];
              let currentChunk: PMNode[] = [];

              for (let i = 0; i < tableNode.childCount; i++) {
                const row = tableNode.child(i);
                currentChunk.push(row);

                if (currentChunk.length >= maxRowsPerPage && i < tableNode.childCount - 1) {
                  newNodes.push(tableType.create(tableNode.attrs, currentChunk));
                  newNodes.push(pageBreakType.create());
                  currentChunk = [];
                  if (headerRow) {
                    currentChunk.push(headerRow);
                  }
                }
              }

              if (currentChunk.length > 0) {
                newNodes.push(tableType.create(tableNode.attrs, currentChunk));
              }

              tr.replaceWith(tablePos, tablePos + tableNode.nodeSize, newNodes);
            }
          }
          return true;
        },

      autoPaginateAllCodeBlocks:
        (maxLinesPerPage = 35) =>
        ({ tr, state, dispatch }) => {
          const codeBlockType = state.schema.nodes.codeBlock;
          const pageBreakType = state.schema.nodes.pageBreak;
          if (!codeBlockType || !pageBreakType) return false;

          const oversizedBlocks: { pos: number; node: PMNode }[] = [];
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'codeBlock') {
              const text = node.textContent || '';
              const lines = text.split('\n');
              if (lines.length > maxLinesPerPage) {
                oversizedBlocks.push({ pos, node });
              }
              return false;
            }
          });

          if (oversizedBlocks.length === 0) return false;

          if (dispatch) {
            for (let b = oversizedBlocks.length - 1; b >= 0; b--) {
              const { pos: blockPos, node: blockNode } = oversizedBlocks[b];
              const text = blockNode.textContent || '';
              const lines = text.split('\n');
              const newNodes: PMNode[] = [];

              for (let i = 0; i < lines.length; i += maxLinesPerPage) {
                const chunk = lines.slice(i, i + maxLinesPerPage).join('\n');
                if (i > 0) {
                  newNodes.push(pageBreakType.create());
                }
                newNodes.push(
                  codeBlockType.create(
                    blockNode.attrs,
                    chunk ? [state.schema.text(chunk)] : []
                  )
                );
              }

              tr.replaceWith(blockPos, blockPos + blockNode.nodeSize, newNodes);
            }
          }
          return true;
        },

      cleanOrphanBreakTexts:
        () =>
        ({ tr, state, dispatch }) => {
          const orphanBreakPositions: { pos: number; size: number }[] = [];
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'paragraph') {
              const text = node.textContent.trim();
              if (
                /^salto de p[áa]gina(\s*\(.*\))?$/i.test(text) ||
                /^p[áa]gina\s+\d+$/i.test(text) ||
                /^diapositiva\s+\d+$/i.test(text)
              ) {
                orphanBreakPositions.push({ pos, size: node.nodeSize });
              }
            }
          });

          if (orphanBreakPositions.length === 0) return false;

          if (dispatch) {
            const pageBreakType = state.schema.nodes.pageBreak;
            if (pageBreakType) {
              for (let i = orphanBreakPositions.length - 1; i >= 0; i--) {
                const { pos, size } = orphanBreakPositions[i];
                tr.replaceWith(pos, pos + size, pageBreakType.create());
              }
            }
          }
          return true;
        },

      unpackMisformattedCodeBlocks:
        () =>
        ({ tr, state, dispatch }) => {
          const blocksToUnpack: { pos: number; size: number; text: string }[] = [];
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'codeBlock') {
              const text = node.textContent || '';
              // Si contiene encabezados markdown (#), listas (\d+\. o -), árboles (|---) o secciones informativas
              const hasHeadings = /(?:^|\n)#{1,6}\s+\S+/m.test(text);
              const hasLists = /(?:^|\n)(?:\d+\.|[-*•])\s+\S+/m.test(text);
              const hasTrees = /(?:^|\n)[|├└│─-]{2,}\s+/m.test(text);
              const hasSections = /(?:^|\n)(?:M[OÓ]DULO|SECCI[OÓ]N|CAP[IÍ]TULO|CRITERIO|GLOSARIO)\s+/im.test(text);
              const isClearlyNotCode =
                text.split('\n').length > 8 &&
                !/[{};=<>]/.test(text) &&
                !/\b(function|const|let|var|class|import|def|return)\b/.test(text);

              if (hasHeadings || hasLists || hasTrees || hasSections || isClearlyNotCode) {
                blocksToUnpack.push({ pos, size: node.nodeSize, text });
              }
              return false;
            }
          });

          if (blocksToUnpack.length === 0) return false;

          if (dispatch && typeof document !== 'undefined') {
            for (let i = blocksToUnpack.length - 1; i >= 0; i--) {
              const { pos, size, text } = blocksToUnpack[i];
              const html = parseMarkdownToHtml(text);
              const parser = DOMParser.fromSchema(state.schema);
              const div = document.createElement('div');
              div.innerHTML = html;
              const docNode = parser.parse(div);
              tr.replaceWith(pos, pos + size, docNode.content);
            }
          }
          return true;
        },

      autoPaginateOversizedNodes:
        (maxRows = 15, maxLines = 25) =>
        ({ commands }) => {
          commands.unpackMisformattedCodeBlocks();
          commands.cleanOrphanBreakTexts();
          commands.autoPaginateAllTables(maxRows);
          commands.autoPaginateAllCodeBlocks(maxLines);
          return true;
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
          const colwidth = element.getAttribute('data-colwidth') || element.getAttribute('colwidth');
          return colwidth ? colwidth.split(',').map((n) => parseInt(n, 10)) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.colwidth) return {};
          return {
            'data-colwidth': attributes.colwidth.join(','),
            colwidth: attributes.colwidth.join(','),
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
          const colwidth = element.getAttribute('data-colwidth') || element.getAttribute('colwidth');
          return colwidth ? colwidth.split(',').map((n) => parseInt(n, 10)) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.colwidth) return {};
          return {
            'data-colwidth': attributes.colwidth.join(','),
            colwidth: attributes.colwidth.join(','),
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

/**
 * Obtiene el ancho actual en px de la columna donde se encuentra el cursor (o selección).
 * Retorna null si no tiene un ancho fijo explícito (es automático).
 */
export function getCurrentColumnWidth(state: EditorState): number | null {
  const tableResult = findTable(state.selection.$from);
  if (!tableResult) return null;
  const { node: tableNode, pos: tablePos } = tableResult;
  const map = TableMap.get(tableNode);

  let cellPos = -1;
  for (let d = state.selection.$from.depth; d > 0; d--) {
    const name = state.selection.$from.node(d).type.name;
    if (name === 'tableCell' || name === 'tableHeader') {
      cellPos = state.selection.$from.before(d);
      break;
    }
  }
  if (cellPos === -1) return null;

  const cellOffset = cellPos - tablePos - 1;
  const cellIndex = map.map.indexOf(cellOffset);
  if (cellIndex === -1) return null;

  const colIndex = cellIndex % map.width;
  for (let row = 0; row < map.height; row++) {
    const cOffset = map.map[row * map.width + colIndex];
    const absPos = tablePos + 1 + cOffset;
    const cell = state.doc.nodeAt(absPos);
    if (cell && cell.attrs.colwidth && Array.isArray(cell.attrs.colwidth) && cell.attrs.colwidth[0]) {
      return cell.attrs.colwidth[0];
    }
  }
  return null;
}

/**
 * Obtiene el alto actual en px de la fila donde se encuentra el cursor.
 * Retorna null si no tiene un alto fijo explícito.
 */
export function getCurrentRowHeight(state: EditorState): number | null {
  for (let d = state.selection.$from.depth; d > 0; d--) {
    const node = state.selection.$from.node(d);
    if (node.type.name === 'tableRow') {
      if (node.attrs.height) {
        const parsed = parseInt(node.attrs.height, 10);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    }
  }
  return null;
}

/**
 * Escanea el documento completo y divide tablas y bloques de código que excedan
 * los límites de hoja física, evitando cualquier elongación vertical del papel.
 */
export function sanitizeAndPaginateOversizedNodes(editor: any): boolean {
  if (!editor || !editor.commands) return false;
  return Boolean(editor.commands.autoPaginateOversizedNodes?.(15, 35));
}

