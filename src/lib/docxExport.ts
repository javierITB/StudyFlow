import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';

export type ExportPaperFormat = 'letter' | 'legal' | 'a4';

export interface PaperDimensionsSpec {
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  printableHeightPx: number;
  twipWidth: number;
  twipHeight: number;
  label: string;
}

export function getPaperDimensions(format: ExportPaperFormat = 'letter'): PaperDimensionsSpec {
  switch (format) {
    case 'legal':
      return {
        widthMm: 216,
        heightMm: 330,
        widthPx: 816,
        heightPx: 1247,
        printableHeightPx: 1032,
        twipWidth: 12246,
        twipHeight: 18709,
        label: 'Oficio (216 × 330 mm)',
      };
    case 'a4':
      return {
        widthMm: 210,
        heightMm: 297,
        widthPx: 794,
        heightPx: 1123,
        printableHeightPx: 907,
        twipWidth: 11906,
        twipHeight: 16838,
        label: 'A4 (210 × 297 mm)',
      };
    case 'letter':
    default:
      return {
        widthMm: 215.9,
        heightMm: 279.4,
        widthPx: 816,
        heightPx: 1056,
        printableHeightPx: 840,
        twipWidth: 12240,
        twipHeight: 15840,
        label: 'Carta (216 × 279 mm)',
      };
  }
}

function getAlignment(alignStr: string | null): (typeof AlignmentType)[keyof typeof AlignmentType] {
  if (!alignStr) return AlignmentType.LEFT;
  const lower = alignStr.toLowerCase();
  if (lower === 'center') return AlignmentType.CENTER;
  if (lower === 'right') return AlignmentType.RIGHT;
  if (lower === 'justify') return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
}

function parseInlineNodes(element: Element): TextRun[] {
  const runs: TextRun[] = [];

  const walk = (
    node: Node,
    state: {
      bold?: boolean;
      italics?: boolean;
      underline?: boolean;
      strike?: boolean;
      superScript?: boolean;
      subScript?: boolean;
      color?: string;
      font?: string;
      size?: number;
    }
  ) => {
    if (node.nodeType === 3 /* Node.TEXT_NODE */) {
      const text = node.textContent || '';
      if (!text) return;
      runs.push(
        new TextRun({
          text,
          bold: state.bold,
          italics: state.italics,
          underline: state.underline ? {} : undefined,
          strike: state.strike,
          superScript: state.superScript,
          subScript: state.subScript,
          color: state.color,
          font: state.font || 'Arial',
          size: state.size ? state.size * 2 : 24,
        })
      );
      return;
    }

    if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();
      if (tagName === 'br') {
        runs.push(new TextRun({ text: '', break: 1 }));
        return;
      }
      const style = el.style || ({} as CSSStyleDeclaration);

      const nextState = { ...state };
      if (
        tagName === 'strong' ||
        tagName === 'b' ||
        style.fontWeight === 'bold' ||
        parseInt(style.fontWeight || '400', 10) >= 600
      ) {
        nextState.bold = true;
      }
      if (tagName === 'em' || tagName === 'i' || style.fontStyle === 'italic') {
        nextState.italics = true;
      }
      if (tagName === 'u' || style.textDecoration?.includes('underline')) {
        nextState.underline = true;
      }
      if (tagName === 's' || tagName === 'strike' || tagName === 'del' || style.textDecoration?.includes('line-through')) {
        nextState.strike = true;
      }
      if (tagName === 'sup') {
        nextState.superScript = true;
      }
      if (tagName === 'sub') {
        nextState.subScript = true;
      }
      if (style.color) {
        const hex = style.color.trim();
        if (hex.startsWith('#')) {
          nextState.color = hex.slice(1);
        }
      }
      if (style.fontFamily) {
        nextState.font = style.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
      }
      if (style.fontSize) {
        const parsed = parseInt(style.fontSize, 10);
        if (!isNaN(parsed)) nextState.size = parsed;
      }

      Array.from(el.childNodes || []).forEach((child) => walk(child, nextState));
    }
  };

  Array.from(element.childNodes || []).forEach((child) => walk(child, { font: 'Arial', size: 12 }));
  return runs.length > 0
    ? runs
    : [new TextRun({ text: element.textContent || '', font: 'Arial', size: 24 })];
}

function appendBlockElement(el: HTMLElement, children: Array<Paragraph | Table>): void {
  const tag = el.tagName.toLowerCase();
  const textAlign = (el.style && el.style.textAlign) || el.getAttribute?.('data-align') || 'left';
  const align = getAlignment(textAlign);
  const indentAttr = el.getAttribute?.('data-indent');
  const indentLevel = indentAttr ? parseInt(indentAttr, 10) : 0;
  const indentTwip = indentLevel > 0 ? indentLevel * 720 : undefined;

  if (el.getAttribute?.('data-type') === 'page-break' || el.classList?.contains('page-break-wrapper')) {
    children.push(
      new Paragraph({
        pageBreakBefore: true,
      })
    );
    return;
  }

  if (el.classList?.contains('page-cut-marker') || el.classList?.contains('page-boundary-widget')) {
    return;
  }

  if (tag === 'h1') {
    children.push(
      new Paragraph({
        text: el.textContent || '',
        heading: HeadingLevel.HEADING_1,
        alignment: align,
        spacing: { before: 240, after: 120 },
      })
    );
  } else if (tag === 'h2') {
    children.push(
      new Paragraph({
        text: el.textContent || '',
        heading: HeadingLevel.HEADING_2,
        alignment: align,
        spacing: { before: 200, after: 100 },
      })
    );
  } else if (tag === 'h3') {
    children.push(
      new Paragraph({
        text: el.textContent || '',
        heading: HeadingLevel.HEADING_3,
        alignment: align,
        spacing: { before: 160, after: 80 },
      })
    );
  } else if (tag === 'table') {
    const rows: TableRow[] = [];
    const trElements = Array.from(
      el.querySelectorAll ? el.querySelectorAll('tr') : el.getElementsByTagName('tr')
    );

    trElements.forEach((tr) => {
      const cells: TableCell[] = [];
      const cellElements = Array.from(
        tr.querySelectorAll
          ? tr.querySelectorAll('th, td')
          : [...Array.from(tr.getElementsByTagName('th')), ...Array.from(tr.getElementsByTagName('td'))]
      );

      cellElements.forEach((cell) => {
        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: parseInlineNodes(cell),
              }),
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
            },
          })
        );
      });

      if (cells.length > 0) {
        rows.push(new TableRow({ children: cells }));
      }
    });

    if (rows.length > 0) {
      children.push(
        new Table({
          rows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
        })
      );
    }
  } else if (tag === 'blockquote') {
    const subParas = Array.from(
      el.querySelectorAll ? el.querySelectorAll('p') : el.getElementsByTagName('p')
    );
    if (subParas.length > 0) {
      subParas.forEach((p) => {
        children.push(
          new Paragraph({
            children: parseInlineNodes(p),
            alignment: align,
            indent: { left: 720 },
            spacing: { before: 80, after: 80 },
          })
        );
      });
    } else {
      children.push(
        new Paragraph({
          children: parseInlineNodes(el),
          alignment: align,
          indent: { left: 720 },
          spacing: { before: 120, after: 120 },
        })
      );
    }
  } else if (tag === 'ul' || tag === 'ol') {
    const listItems = Array.from(
      el.querySelectorAll ? el.querySelectorAll('li') : el.getElementsByTagName('li')
    );
    listItems.forEach((li) => {
      children.push(
        new Paragraph({
          children: parseInlineNodes(li),
          bullet: tag === 'ul' ? { level: 0 } : undefined,
          numbering: tag === 'ol' ? { reference: 'numbered-list', level: 0 } : undefined,
          spacing: { before: 40, after: 40 },
        })
      );
    });
  } else if (tag === 'div') {
    const hasBlockChildren = Array.from(el.childNodes || []).some(
      (c) =>
        c.nodeType === 1 &&
        ['p', 'h1', 'h2', 'h3', 'table', 'blockquote', 'ul', 'ol', 'div'].includes(
          (c as HTMLElement).tagName.toLowerCase()
        )
    );
    if (hasBlockChildren) {
      Array.from(el.childNodes || []).forEach((child) => {
        if (child.nodeType === 1) {
          appendBlockElement(child as HTMLElement, children);
        }
      });
    } else {
      children.push(
        new Paragraph({
          children: parseInlineNodes(el),
          alignment: align,
          indent: indentTwip ? { left: indentTwip } : undefined,
          spacing: { before: 60, after: 120, line: 360 },
        })
      );
    }
  } else if (tag === 'hr') {
    children.push(
      new Paragraph({
        text: '────────────────────────────────────',
        alignment: AlignmentType.CENTER,
        spacing: { before: 140, after: 140 },
      })
    );
  } else {
    children.push(
      new Paragraph({
        children: parseInlineNodes(el),
        alignment: align,
        indent: indentTwip ? { left: indentTwip } : undefined,
        spacing: { before: 60, after: 120, line: 360 },
      })
    );
  }
}

export async function generateDocxBlob(
  htmlContent: string,
  title: string = 'Documento',
  paperFormat: ExportPaperFormat = 'letter'
): Promise<Blob> {
  const dims = getPaperDimensions(paperFormat);
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');
  const body = doc.body || (doc.getElementsByTagName ? doc.getElementsByTagName('body')?.[0] : null);
  const container = (body?.firstElementChild || body || doc.documentElement) as unknown as HTMLElement;

  const children: Array<Paragraph | Table> = [];

  Array.from(container.childNodes || []).forEach((node) => {
    if (node.nodeType !== 1 /* Node.ELEMENT_NODE */) return;
    appendBlockElement(node as HTMLElement, children);
  });

  if (children.length === 0) {
    children.push(
      new Paragraph({
        text: 'Documento vacío',
      })
    );
  }

  const wordDoc = new Document({
    creator: 'StudyFlexConnect',
    title: title || 'Trabajo de Estudio',
    sections: [
      {
        properties: {
          page: {
            size: {
              width: dims.twipWidth,
              height: dims.twipHeight,
            },
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(wordDoc);
}

export async function exportHtmlToDocx(
  htmlContent: string,
  title: string = 'Documento',
  paperFormat: ExportPaperFormat = 'letter'
): Promise<void> {
  const blob = await generateDocxBlob(htmlContent, title, paperFormat);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.trim().replace(/\s+/g, '_') || 'trabajo'}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportHtmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const body = doc.body || doc.getElementsByTagName('body')?.[0];
  const container = (body?.firstElementChild || body || doc.documentElement) as unknown as HTMLElement;

  let md = '';
  Array.from(container.childNodes || []).forEach((node) => {
    if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim() || '';

      if (tag === 'h1') md += `# ${text}\n\n`;
      else if (tag === 'h2') md += `## ${text}\n\n`;
      else if (tag === 'h3') md += `### ${text}\n\n`;
      else if (tag === 'blockquote') md += `> ${text}\n\n`;
      else if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(el.querySelectorAll ? el.querySelectorAll('li') : el.getElementsByTagName('li'));
        items.forEach((li, idx) => {
          const prefix = tag === 'ul' ? '- ' : `${idx + 1}. `;
          md += `${prefix}${li.textContent?.trim() || ''}\n`;
        });
        md += '\n';
      } else if (tag === 'li') md += `- ${text}\n`;
      else if (el.getAttribute?.('data-type') === 'page-break') md += `\n---\n\n`;
      else if (text) md += `${text}\n\n`;
    }
  });

  return md.trim();
}

const SHARED_EXPORT_STYLES = `
  .sf-export-content {
    font-family: 'Arial', sans-serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #0f172a;
    background: #ffffff;
  }
  .sf-export-content p {
    margin: 0 0 0.9em 0;
    text-align: justify;
  }
  .sf-export-content h1 {
    font-size: 22pt;
    font-weight: 800;
    letter-spacing: -0.025em;
    margin: 1.2em 0 0.45em 0;
    color: #0f172a;
    line-height: 1.25;
  }
  .sf-export-content h2 {
    font-size: 15pt;
    font-weight: 700;
    letter-spacing: -0.015em;
    margin: 1.2em 0 0.4em 0;
    color: #1e293b;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 4px;
  }
  .sf-export-content h3 {
    font-size: 12.5pt;
    font-weight: 600;
    margin: 1.1em 0 0.35em 0;
    color: #334155;
  }
  .sf-export-content blockquote {
    border-left: 4px solid #6366f1;
    background-color: #f8fafc;
    padding: 12px 18px;
    margin: 1.25em 0;
    border-radius: 0 8px 8px 0;
    color: #334155;
  }
  .sf-export-content blockquote p:last-child {
    margin-bottom: 0;
  }
  .sf-export-content hr {
    border: none;
    border-top: 1.5px solid #e2e8f0;
    margin: 1.5em 0;
  }
  .sf-export-content ul, .sf-export-content ol {
    padding-left: 1.6em;
    margin: 0.6em 0 0.9em 0;
  }
  .sf-export-content li {
    margin-bottom: 0.3em;
  }
  .sf-export-content table {
    margin: 1.25em 0;
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
    border: 1px solid #cbd5e1;
  }
  .sf-export-content th {
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    text-align: left;
    border: 1px solid #cbd5e1;
    padding: 10px 14px;
    font-size: 10pt;
  }
  .sf-export-content td {
    border: 1px solid #e2e8f0;
    padding: 10px 14px;
    font-size: 10pt;
    color: #1e293b;
    vertical-align: top;
  }
`;

/**
 * Genera y descarga un archivo .pdf real directamente en la pestaña actual,
 * respetando exactamente las dimensiones y proporciones de Carta, Oficio o A4
 * y paginando bloque por bloque sin cortar líneas ni abrir ventanas emergentes.
 */
export async function exportHtmlToPdf(
  htmlContent: string,
  title: string = 'Documento',
  paperFormat: ExportPaperFormat = 'letter'
): Promise<void> {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const dims = getPaperDimensions(paperFormat);
  const padX = 56;
  const padTop = 52;
  const footerReserve = 64;

  const sandboxHost = document.createElement('div');
  sandboxHost.style.position = 'fixed';
  sandboxHost.style.left = '-99999px';
  sandboxHost.style.top = '0';
  sandboxHost.style.width = `${dims.widthPx}px`;
  sandboxHost.style.background = '#ffffff';
  sandboxHost.style.zIndex = '-1';
  sandboxHost.innerHTML = `
    <style>${SHARED_EXPORT_STYLES}</style>
    <div class="sf-export-content" style="width:${dims.widthPx}px;padding:0 ${padX}px;box-sizing:border-box;">
      ${htmlContent}
    </div>
  `;
  document.body.appendChild(sandboxHost);

  try {
    const contentEl = sandboxHost.querySelector('.sf-export-content') as HTMLElement;
    const rawBlocks = Array.from(contentEl.children) as HTMLElement[];

    // Paginar bloques en hojas exactas según printableHeightPx
    const pagesBlocks: HTMLElement[][] = [[]];
    let currentAcc = 0;
    let prevMarginBottom = 0;

    for (const block of rawBlocks) {
      if (
        block.classList.contains('page-cut-marker') ||
        block.classList.contains('page-boundary-widget')
      ) {
        continue;
      }

      if (
        block.getAttribute('data-type') === 'page-break' ||
        block.classList.contains('page-break-wrapper')
      ) {
        if (pagesBlocks[pagesBlocks.length - 1].length > 0) {
          pagesBlocks.push([]);
          currentAcc = 0;
          prevMarginBottom = 0;
        }
        continue;
      }

      const style = window.getComputedStyle(block);
      const marginTop = parseFloat(style.marginTop) || 0;
      const marginBottom = parseFloat(style.marginBottom) || 0;
      const collapsedTop =
        currentAcc === 0 ? marginTop : Math.max(0, marginTop - prevMarginBottom);
      const blockHeight = block.offsetHeight + collapsedTop + marginBottom;

      if (currentAcc > 40 && currentAcc + blockHeight > dims.printableHeightPx) {
        pagesBlocks.push([block]);
        currentAcc = block.offsetHeight + marginTop + marginBottom;
        prevMarginBottom = marginBottom;
      } else {
        pagesBlocks[pagesBlocks.length - 1].push(block);
        currentAcc += blockHeight;
        prevMarginBottom = marginBottom;
      }
    }

    const totalPages = Math.max(1, pagesBlocks.length);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [dims.widthMm, dims.heightMm],
    });

    const safeTitle = (title || 'Trabajo Académico').replace(/[<>&]/g, '');

    for (let i = 0; i < totalPages; i++) {
      const sheet = document.createElement('div');
      sheet.className = 'sf-export-content';
      sheet.style.width = `${dims.widthPx}px`;
      sheet.style.height = `${dims.heightPx}px`;
      sheet.style.padding = `${padTop}px ${padX}px ${footerReserve}px ${padX}px`;
      sheet.style.boxSizing = 'border-box';
      sheet.style.background = '#ffffff';
      sheet.style.position = 'relative';
      sheet.style.overflow = 'hidden';

      const blocks = pagesBlocks[i] || [];
      for (const b of blocks) {
        sheet.appendChild(b.cloneNode(true));
      }

      const footer = document.createElement('div');
      footer.style.position = 'absolute';
      footer.style.left = `${padX}px`;
      footer.style.right = `${padX}px`;
      footer.style.bottom = '20px';
      footer.style.paddingTop = '10px';
      footer.style.borderTop = '1px solid #e2e8f0';
      footer.style.display = 'flex';
      footer.style.justifyContent = 'space-between';
      footer.style.alignItems = 'center';
      footer.style.fontSize = '10px';
      footer.style.color = '#64748b';
      footer.style.fontFamily = 'monospace';
      footer.innerHTML = `<span>StudyFlexConnect · ${safeTitle}</span><span>Página ${i + 1} de ${totalPages} · ${dims.label}</span>`;
      sheet.appendChild(footer);

      sandboxHost.appendChild(sheet);

      const canvas = await html2canvas(sheet, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.96);
      if (i > 0) {
        pdf.addPage([dims.widthMm, dims.heightMm], 'portrait');
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, dims.widthMm, dims.heightMm);
      sandboxHost.removeChild(sheet);
    }

    const fileName = `${(title || 'trabajo').trim().replace(/\s+/g, '_')}.pdf`;
    pdf.save(fileName);
  } finally {
    if (sandboxHost.parentNode) {
      sandboxHost.parentNode.removeChild(sandboxHost);
    }
  }
}

/**
 * Imprime el documento mediante un iframe oculto sin abrir pestañas nuevas
 * ni bloquear la ventana principal con popups de estética cruda.
 */
export function printFormattedDocument(
  title: string,
  htmlContent: string,
  paperFormat: ExportPaperFormat = 'letter'
): void {
  const dims = getPaperDimensions(paperFormat);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const cleanup = () => {
    window.setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 500);
  };

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    cleanup();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - StudyFlexConnect</title>
        <style>
          @page {
            size: ${dims.widthMm}mm ${dims.heightMm}mm;
            margin: 18mm 18mm 20mm 18mm;
          }
          body {
            background: #ffffff;
            margin: 0;
            padding: 0;
          }
          ${SHARED_EXPORT_STYLES}
          div[data-type="page-break"],
          .page-break-wrapper {
            page-break-before: always;
            break-before: page;
            height: 0;
            overflow: hidden;
            margin: 0;
            padding: 0;
            border: none;
          }
          .page-cut-marker,
          .page-boundary-widget {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="sf-export-content">
          ${htmlContent}
        </div>
      </body>
    </html>
  `);
  doc.close();

  const win = iframe.contentWindow;
  win.onafterprint = cleanup;
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      cleanup();
    }
  }, 180);
}
