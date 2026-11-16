import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Node as PMNode } from '@tiptap/pm/model';
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view';

export type PaginationPaperFormat = 'letter' | 'legal' | 'a4';

export interface AutoPaginationOptions {
  enabled: boolean;
  paperFormat: PaginationPaperFormat;
  onPaginationChange?: (info: {
    pageCount: number;
    currentPage: number;
    lastPageFillerPx: number;
    paperFormat: PaginationPaperFormat;
  }) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    autoPagination: {
      setPaperFormat: (format: PaginationPaperFormat) => ReturnType;
      setPaginationEnabled: (enabled: boolean) => ReturnType;
    };
  }
}

interface PaginationPluginState {
  decorations: DecorationSet;
  pageCount: number;
  currentPage: number;
  breakPositions: number[];
  paperFormat: PaginationPaperFormat;
  enabled: boolean;
  recalcCounter: number;
}

export const autoPaginationPluginKey = new PluginKey<PaginationPluginState>('autoPagination');

/**
 * Alturas imprimibles útiles en píxeles CSS a 96 DPI (área de contenido dentro de márgenes):
 * - Carta (215.9 × 279.4 mm ≈ 816 × 1056 px total): área útil ≈ 840 px.
 * - Oficio (216 × 330 mm ≈ 816 × 1247 px total): área útil ≈ 1032 px (+192 px vs Carta).
 * - A4 (210 × 297 mm ≈ 794 × 1123 px total): área útil ≈ 907 px.
 */
export function getPrintableHeightPx(paperFormat: PaginationPaperFormat): number {
  switch (paperFormat) {
    case 'legal':
      return 1032;
    case 'a4':
      return 907;
    case 'letter':
    default:
      return 840;
  }
}

function getFormatLabel(paperFormat: PaginationPaperFormat): string {
  switch (paperFormat) {
    case 'legal':
      return 'Oficio 216 × 330 mm';
    case 'a4':
      return 'A4 210 × 297 mm';
    case 'letter':
    default:
      return 'Carta 216 × 279 mm';
  }
}

function createPageCutDOM(
  pageNumber: number,
  paperFormat: PaginationPaperFormat,
  fillerPx: number
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'page-cut-marker page-boundary-widget select-none';
  wrapper.setAttribute('data-page-break', 'true');
  wrapper.setAttribute('data-page-number', String(pageNumber));
  wrapper.setAttribute('data-paper-format', paperFormat);
  wrapper.setAttribute('contenteditable', 'false');

  const formatLabel = getFormatLabel(paperFormat);
  const roundedFiller = Math.max(0, Math.round(fillerPx));

  wrapper.innerHTML = `
    <div class="page-cut-filler" style="height: ${roundedFiller}px;"></div>
    <div class="page-cut-footer">
      <span class="page-cut-app-title">StudyFlexConnect · ${formatLabel}</span>
      <span class="page-cut-number">Página ${pageNumber - 1}</span>
    </div>
    <div class="page-cut-gap">
      <div class="page-cut-badge">
        <span class="page-cut-dot"></span>
        <span>PÁGINA ${pageNumber} · ${formatLabel}</span>
      </div>
    </div>
    <div class="page-cut-header">
      <span class="page-cut-number">Página ${pageNumber}</span>
      <span class="page-cut-tag">${formatLabel}</span>
    </div>
  `;

  return wrapper;
}

function createManualFillerDOM(fillerPx: number, pageNumber: number): HTMLElement {
  const filler = document.createElement('div');
  filler.className = 'page-cut-filler page-boundary-widget select-none';
  filler.setAttribute('data-manual-filler-page', String(pageNumber));
  filler.setAttribute('contenteditable', 'false');
  filler.style.height = `${Math.max(0, Math.round(fillerPx))}px`;
  return filler;
}

export const AutoPaginationExtension = Extension.create<AutoPaginationOptions>({
  name: 'autoPagination',

  addOptions() {
    return {
      enabled: true,
      paperFormat: 'letter',
      onPaginationChange: undefined,
    };
  },

  addCommands() {
    return {
      setPaperFormat:
        (format: PaginationPaperFormat) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(autoPaginationPluginKey, { setPaperFormat: format });
            tr.setMeta('addToHistory', false);
            dispatch(tr);
          }
          return true;
        },
      setPaginationEnabled:
        (enabled: boolean) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(autoPaginationPluginKey, { setEnabled: enabled });
            tr.setMeta('addToHistory', false);
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const initialOptions = this.options;

    return [
      new Plugin<PaginationPluginState>({
        key: autoPaginationPluginKey,

        state: {
          init() {
            return {
              decorations: DecorationSet.empty,
              pageCount: 1,
              currentPage: 1,
              breakPositions: [],
              paperFormat: initialOptions.paperFormat || 'letter',
              enabled: initialOptions.enabled ?? true,
              recalcCounter: 0,
            };
          },

          apply(tr, prev, _oldState, newState) {
            const meta = tr.getMeta(autoPaginationPluginKey) as
              | {
                  setPaperFormat?: PaginationPaperFormat;
                  setEnabled?: boolean;
                  decorations?: DecorationSet;
                  pageCount?: number;
                  currentPage?: number;
                  breakPositions?: number[];
                }
              | undefined;

            if (meta) {
              if (meta.setPaperFormat !== undefined || meta.setEnabled !== undefined) {
                const nextEnabled = meta.setEnabled ?? prev.enabled;
                const nextFormat = meta.setPaperFormat ?? prev.paperFormat;
                return {
                  ...prev,
                  enabled: nextEnabled,
                  paperFormat: nextFormat,
                  decorations: nextEnabled ? prev.decorations : DecorationSet.empty,
                  recalcCounter: prev.recalcCounter + 1,
                };
              }
              return {
                ...prev,
                decorations: meta.decorations ?? prev.decorations,
                pageCount: meta.pageCount ?? prev.pageCount,
                currentPage: meta.currentPage ?? prev.currentPage,
                breakPositions: meta.breakPositions ?? prev.breakPositions,
              };
            }

            if (!prev.enabled) {
              return {
                ...prev,
                decorations: DecorationSet.empty,
                pageCount: 1,
                currentPage: 1,
                breakPositions: [],
              };
            }

            return {
              ...prev,
              decorations: prev.decorations.map(tr.mapping, newState.doc),
            };
          },
        },

        props: {
          decorations(state) {
            const pluginState = autoPaginationPluginKey.getState(state);
            if (!pluginState || !pluginState.enabled) {
              return DecorationSet.empty;
            }
            return pluginState.decorations;
          },
        },

        view(editorView: EditorView) {
          let rafId: number | null = null;
          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          let isMeasuring = false;
          let lastSignature = '';
          let lastMeasuredFillerPx = 0;

          const calculatePagination = () => {
            if (!editorView.dom || isMeasuring) {
              return;
            }

            const pluginState = autoPaginationPluginKey.getState(editorView.state);
            const isEnabled = pluginState ? pluginState.enabled : initialOptions.enabled;
            const paperFormat = pluginState ? pluginState.paperFormat : initialOptions.paperFormat;

            if (!isEnabled) {
              if (lastSignature !== 'disabled') {
                lastSignature = 'disabled';
                const tr = editorView.state.tr;
                tr.setMeta(autoPaginationPluginKey, {
                  decorations: DecorationSet.empty,
                  pageCount: 1,
                  currentPage: 1,
                  breakPositions: [],
                });
                tr.setMeta('addToHistory', false);
                editorView.dispatch(tr);
                initialOptions.onPaginationChange?.({
                  pageCount: 1,
                  currentPage: 1,
                  lastPageFillerPx: 0,
                  paperFormat,
                });
              }
              return;
            }

            isMeasuring = true;

            try {
              const targetHeight = getPrintableHeightPx(paperFormat);

              // Iterar exclusivamente sobre nodos de nivel superior del documento ProseMirror
              const topBlocks: { pos: number; node: PMNode; dom: HTMLElement }[] = [];
              editorView.state.doc.forEach((node, offset) => {
                const dom = editorView.nodeDOM(offset);
                if (dom instanceof HTMLElement) {
                  topBlocks.push({ pos: offset, node, dom });
                }
              });

              let currentPage = 1;
              let currentAccumulatedHeight = 0;
              let prevMarginBottom = 0;

              type BreakSpec =
                | { kind: 'auto'; pos: number; pageNumber: number; fillerPx: number }
                | { kind: 'manual'; pos: number; pageNumber: number; fillerPx: number };

              const breaks: BreakSpec[] = [];

              for (const block of topBlocks) {
                if (block.node.type.name === 'pageBreak') {
                  const fillerPx = Math.max(0, targetHeight - currentAccumulatedHeight);
                  breaks.push({
                    kind: 'manual',
                    pos: block.pos,
                    pageNumber: currentPage,
                    fillerPx,
                  });
                  currentPage++;
                  currentAccumulatedHeight = 0;
                  prevMarginBottom = 0;
                  continue;
                }

                // Medir usando offsetHeight + márgenes CSS (invariante ante CSS transform: scale(zoom))
                const style = window.getComputedStyle(block.dom);
                const marginTop = parseFloat(style.marginTop) || 0;
                const marginBottom = parseFloat(style.marginBottom) || 0;
                const collapsedMarginTop =
                  currentAccumulatedHeight === 0
                    ? marginTop
                    : Math.max(0, marginTop - prevMarginBottom);
                const blockHeight = block.dom.offsetHeight + collapsedMarginTop + marginBottom;

                if (
                  currentAccumulatedHeight > 40 &&
                  currentAccumulatedHeight + blockHeight > targetHeight
                ) {
                  const fillerPx = Math.max(0, targetHeight - currentAccumulatedHeight);
                  currentPage++;
                  breaks.push({
                    kind: 'auto',
                    pos: block.pos,
                    pageNumber: currentPage,
                    fillerPx,
                  });
                  currentAccumulatedHeight = block.dom.offsetHeight + marginTop + marginBottom;
                  prevMarginBottom = marginBottom;
                } else {
                  currentAccumulatedHeight += blockHeight;
                  prevMarginBottom = marginBottom;
                }
              }

              // Espacio restante en la última hoja para mantener altura física fija
              const lastPageUsed =
                currentAccumulatedHeight > targetHeight
                  ? currentAccumulatedHeight % targetHeight
                  : currentAccumulatedHeight;
              const lastPageFillerPx = Math.max(0, Math.round(targetHeight - lastPageUsed));
              lastMeasuredFillerPx = lastPageFillerPx;

              // Posición del cursor
              const selFrom = editorView.state.selection.from;
              const breakPositions = breaks.map((b) => b.pos);
              let cursorPage = 1;
              for (const b of breaks) {
                if (selFrom >= b.pos) {
                  cursorPage = b.kind === 'manual' ? b.pageNumber + 1 : b.pageNumber;
                }
              }

              const structureSignature = `${paperFormat}|${breaks
                .map((b) => `${b.kind}:${b.pos}:${b.pageNumber}`)
                .join('|')}`;

              if (structureSignature !== lastSignature) {
                lastSignature = structureSignature;

                const decorations = DecorationSet.create(
                  editorView.state.doc,
                  breaks.map((b) =>
                    b.kind === 'manual'
                      ? Decoration.widget(
                          b.pos,
                          () => createManualFillerDOM(b.fillerPx, b.pageNumber),
                          {
                            side: -1,
                            key: `manual-filler-${paperFormat}-${b.pos}-${b.pageNumber}`,
                          }
                        )
                      : Decoration.widget(
                          b.pos,
                          () => createPageCutDOM(b.pageNumber, paperFormat, b.fillerPx),
                          {
                            side: -1,
                            key: `page-cut-${paperFormat}-${b.pageNumber}`,
                          }
                        )
                  )
                );

                const tr = editorView.state.tr;
                tr.setMeta(autoPaginationPluginKey, {
                  decorations,
                  pageCount: currentPage,
                  currentPage: cursorPage,
                  breakPositions,
                });
                tr.setMeta('addToHistory', false);
                editorView.dispatch(tr);
              } else {
                for (const b of breaks) {
                  const rounded = Math.max(0, Math.round(b.fillerPx));
                  if (b.kind === 'manual') {
                    const el = editorView.dom.querySelector(
                      `[data-manual-filler-page="${b.pageNumber}"]`
                    ) as HTMLElement | null;
                    if (el && el.style.height !== `${rounded}px`) {
                      el.style.height = `${rounded}px`;
                    }
                  } else {
                    const marker = editorView.dom.querySelector(
                      `.page-cut-marker[data-page-number="${b.pageNumber}"] .page-cut-filler`
                    ) as HTMLElement | null;
                    if (marker && marker.style.height !== `${rounded}px`) {
                      marker.style.height = `${rounded}px`;
                    }
                  }
                }
              }

              initialOptions.onPaginationChange?.({
                pageCount: currentPage,
                currentPage: cursorPage,
                lastPageFillerPx,
                paperFormat,
              });
            } finally {
              isMeasuring = false;
            }
          };

          const scheduleMeasure = (debounceMs = 45) => {
            if (timeoutId) clearTimeout(timeoutId);
            if (rafId) cancelAnimationFrame(rafId);

            timeoutId = setTimeout(() => {
              rafId = requestAnimationFrame(() => {
                calculatePagination();
              });
            }, debounceMs);
          };

          const resizeObserver = new ResizeObserver(() => {
            scheduleMeasure(80);
          });
          resizeObserver.observe(editorView.dom);

          scheduleMeasure(80);

          return {
            update(view, prevState) {
              const prevPlugin = autoPaginationPluginKey.getState(prevState);
              const currPlugin = autoPaginationPluginKey.getState(view.state);

              if (prevPlugin?.recalcCounter !== currPlugin?.recalcCounter) {
                lastSignature = '';
                scheduleMeasure(10);
                return;
              }

              const docChanged = !view.state.doc.eq(prevState.doc);
              const selChanged = !view.state.selection.eq(prevState.selection);

              if (docChanged) {
                scheduleMeasure(45);
              } else if (selChanged && currPlugin) {
                const selFrom = view.state.selection.from;
                let cursorPage = 1;
                for (let i = 0; i < currPlugin.breakPositions.length; i++) {
                  if (selFrom >= currPlugin.breakPositions[i]) {
                    cursorPage = i + 2;
                  }
                }
                if (cursorPage !== currPlugin.currentPage) {
                  initialOptions.onPaginationChange?.({
                    pageCount: currPlugin.pageCount,
                    currentPage: Math.min(currPlugin.pageCount, cursorPage),
                    lastPageFillerPx: lastMeasuredFillerPx,
                    paperFormat: currPlugin.paperFormat,
                  });
                }
              }
            },

            destroy() {
              if (timeoutId) clearTimeout(timeoutId);
              if (rafId) cancelAnimationFrame(rafId);
              resizeObserver.disconnect();
            },
          };
        },
      }),
    ];
  },
});
