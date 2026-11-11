import mammoth from 'mammoth/mammoth.browser.js';

export interface DocxPage {
  pageNumber: number;
  html: string;
}

export interface ParsedDocxDocument {
  pages: DocxPage[];
  pageCount: number;
  warnings: string[];
}

const CHARS_PER_VIRTUAL_PAGE = 1750;
const IMAGE_VIRTUAL_CHAR_WEIGHT = 450;

function sanitizeNodeTree(root: Element): void {
  const blockedTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM']);
  const children = Array.from(root.children);

  for (const child of children) {
    if (blockedTags.has(child.tagName)) {
      child.remove();
      continue;
    }

    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) {
        child.removeAttribute(attr.name);
      } else if ((name === 'href' || name === 'src') && val.startsWith('javascript:')) {
        child.removeAttribute(attr.name);
      }
    }

    sanitizeNodeTree(child);
  }
}

/**
 * Divide un HTML generado por Mammoth en paginas virtuales.
 * Respeta saltos de pagina explicitos (<hr class="studyflow-page-break">)
 * y distribuye bloques extensos en hojas equilibradas para lectura y post-its.
 */
export function paginateDocxHtml(rawHtml: string): DocxPage[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) {
    return [{ pageNumber: 1, html: '<p class="text-slate-500">Documento vacío.</p>' }];
  }

  sanitizeNodeTree(container);

  const nodes = Array.from(container.childNodes).filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || '').trim().length > 0;
    }
    return node.nodeType === Node.ELEMENT_NODE;
  });

  if (nodes.length === 0) {
    return [{ pageNumber: 1, html: '<p class="text-slate-500">Documento sin contenido visible.</p>' }];
  }

  const pages: DocxPage[] = [];
  let currentNodes: string[] = [];
  let currentChars = 0;

  const flushPage = () => {
    if (currentNodes.length > 0) {
      pages.push({
        pageNumber: pages.length + 1,
        html: currentNodes.join(''),
      });
      currentNodes = [];
      currentChars = 0;
    }
  };

  for (const node of nodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const isDirectPageBreak =
        el.tagName === 'HR' && el.classList.contains('studyflow-page-break');
      const nestedBreak = el.querySelector('hr.studyflow-page-break');

      if (isDirectPageBreak) {
        flushPage();
        continue;
      }

      if (nestedBreak) {
        nestedBreak.remove();
        const htmlWithoutBreak = el.outerHTML;
        if ((el.textContent || '').trim().length > 0 || el.querySelector('img')) {
          currentNodes.push(htmlWithoutBreak);
        }
        flushPage();
        continue;
      }

      const imgCount = el.querySelectorAll('img').length + (el.tagName === 'IMG' ? 1 : 0);
      const textWeight = (el.textContent || '').trim().length;
      const nodeWeight = textWeight + imgCount * IMAGE_VIRTUAL_CHAR_WEIGHT;

      if (currentNodes.length > 0 && currentChars + nodeWeight > CHARS_PER_VIRTUAL_PAGE) {
        flushPage();
      }

      currentNodes.push(el.outerHTML);
      currentChars += nodeWeight;
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '').trim();
      if (!text) continue;
      if (currentNodes.length > 0 && currentChars + text.length > CHARS_PER_VIRTUAL_PAGE) {
        flushPage();
      }
      const p = doc.createElement('p');
      p.textContent = text;
      currentNodes.push(p.outerHTML);
      currentChars += text.length;
    }
  }

  flushPage();

  return pages.length > 0
    ? pages
    : [{ pageNumber: 1, html: '<p class="text-slate-500">Documento vacío.</p>' }];
}

export async function parseDocxDocument(buffer: ArrayBuffer): Promise<ParsedDocxDocument> {
  const result = await mammoth.convertToHtml(
    { arrayBuffer: buffer.slice(0) },
    {
      styleMap: ["br[type='page'] => hr.studyflow-page-break"],
      includeDefaultStyleMap: true,
    }
  );

  const pages = paginateDocxHtml(result.value);
  return {
    pages,
    pageCount: pages.length,
    warnings: result.messages.map((m) => m.message),
  };
}

