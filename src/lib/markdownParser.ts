/**
 * Motor de parsing y streaming progresivo de Markdown para StudyFlow
 * Diseñado específicamente para documentos académicos y de investigación.
 */

export type AcademicStyleProfile = 'apa7' | 'ieee' | 'clean';

export interface MarkdownParseOptions {
  profile?: AcademicStyleProfile;
  enableAcademicCitations?: boolean;
  preservePageBreaks?: boolean;
}

/**
 * Escapar caracteres HTML básicos para prevenir inyecciones no deseadas
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Parser de líneas y bloques de Markdown a HTML compatible con TipTap/ProseMirror
 */
export function parseMarkdownToHtml(
  markdown: string,
  options: MarkdownParseOptions = {}
): string {
  const {
    profile = 'apa7',
    enableAcademicCitations = true,
    preservePageBreaks = true,
  } = options;

  if (!markdown || !markdown.trim()) {
    return '<p></p>';
  }

  const lines = markdown.split(/\r?\n/);
  const htmlParts: string[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBuffer: string[] = [];

  let inList: 'ul' | 'ol' | null = null;
  let inBlockquote = false;
  let blockquoteBuffer: string[] = [];

  let inTable = false;
  let tableRows: string[][] = [];
  let tableAlignments: ('left' | 'center' | 'right')[] = [];

  const flushList = () => {
    if (inList) {
      htmlParts.push(`</${inList}>`);
      inList = null;
    }
  };

  const flushBlockquote = () => {
    if (inBlockquote) {
      const innerHtml = blockquoteBuffer.map((line) => parseInlineMarkdown(line)).join('<br/>');
      const citationClass = enableAcademicCitations
        ? 'studyflow-academic-citation'
        : '';
      htmlParts.push(
        `<blockquote class="${citationClass} border-l-4 border-indigo-500 pl-4 py-1.5 my-3 italic text-slate-300 bg-indigo-500/5 rounded-r"><p>${innerHtml}</p></blockquote>`
      );
      blockquoteBuffer = [];
      inBlockquote = false;
    }
  };

  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1);
      const MAX_ROWS_PER_PAGE = 15;

      const numCols = headerRow.length;
      const isShortCol = new Array(numCols).fill(true);
      const minColWidths = new Array(numCols).fill(60);

      // Calcular el ancho mínimo necesario por columna basado en la palabra más larga del encabezado
      // para evitar que palabras como 'Contador', 'Cliente', 'BigBoss' o 'Admin' se corten en sílabas (Conta / dor)
      headerRow.forEach((cell, idx) => {
        const cleanWords = cell.replace(/[*_`]/g, '').trim().split(/\s+/);
        let maxWordLen = 0;
        for (const w of cleanWords) {
          if (w.length > maxWordLen) maxWordLen = w.length;
        }
        // Aproximadamente 9.5px por carácter en negrita + 24px de padding horizontal
        minColWidths[idx] = Math.max(55, Math.ceil(maxWordLen * 9.5 + 24));
      });

      bodyRows.forEach((row) => {
        row.forEach((cell, idx) => {
          if (idx < numCols && cell.trim().length > 4) {
            isShortCol[idx] = false;
          }
        });
      });

      let shortCount = 0;
      for (let c = 0; c < numCols; c++) {
        if (isShortCol[c]) shortCount++;
      }

      const colWidths = new Array(numCols).fill(100);
      if (numCols >= 4 && shortCount > 0) {
        let totalShortW = 0;
        for (let c = 0; c < numCols; c++) {
          if (isShortCol[c]) {
            // Asignar el ancho mínimo necesario para que el encabezado no corte sílabas
            const shortColW = Math.max(minColWidths[c], 65);
            colWidths[c] = shortColW;
            totalShortW += shortColW;
          }
        }
        const remainingW = Math.max(200, 720 - totalShortW);
        const textCount = numCols - shortCount;
        const textW = textCount > 0 ? Math.floor(remainingW / textCount) : 100;

        for (let c = 0; c < numCols; c++) {
          if (!isShortCol[c]) {
            colWidths[c] = Math.max(minColWidths[c], textW);
          }
        }
      } else {
        const evenW = Math.floor(720 / Math.max(1, numCols));
        for (let c = 0; c < numCols; c++) {
          colWidths[c] = Math.max(minColWidths[c], evenW);
        }
      }

      const buildTableSnippet = (rows: string[][], _isContinuation = false) => {
        let tableHtml = '<table class="studyflow-table border-collapse w-full my-4 border border-slate-700 text-sm">';
        if (headerRow) {
          tableHtml += '<thead class="bg-slate-800 text-slate-200 font-semibold"><tr>';
          headerRow.forEach((cell, idx) => {
            const align = tableAlignments[idx] || (isShortCol[idx] ? 'center' : 'left');
            const alignClass = align === 'center' ? ' text-center' : align === 'right' ? ' text-right' : ' text-left';
            tableHtml += `<th colwidth="${colWidths[idx]}" data-colwidth="${colWidths[idx]}" class="border border-slate-700 px-3 py-2${alignClass}" style="text-align: ${align};">${parseInlineMarkdown(cell)}</th>`;
          });
          tableHtml += '</tr></thead>';
        }
        if (rows.length > 0) {
          tableHtml += '<tbody class="divide-y divide-slate-700/60">';
          for (const row of rows) {
            tableHtml += '<tr class="hover:bg-slate-800/40">';
            row.forEach((cell, idx) => {
              const align = tableAlignments[idx] || (isShortCol[idx] ? 'center' : 'left');
              const alignClass = align === 'center' ? ' text-center' : align === 'right' ? ' text-right' : ' text-left';
              tableHtml += `<td colwidth="${colWidths[idx]}" data-colwidth="${colWidths[idx]}" class="border border-slate-700 px-3 py-1.5${alignClass}" style="text-align: ${align};">${parseInlineMarkdown(cell)}</td>`;
            });
            tableHtml += '</tr>';
          }
          tableHtml += '</tbody>';
        }
        tableHtml += '</table>';
        return tableHtml;
      };

      if (bodyRows.length <= MAX_ROWS_PER_PAGE) {
        htmlParts.push(buildTableSnippet(bodyRows));
      } else {
        // Cortar la tabla por páginas para mantener inmutables las proporciones de hoja
        for (let r = 0; r < bodyRows.length; r += MAX_ROWS_PER_PAGE) {
          const chunk = bodyRows.slice(r, r + MAX_ROWS_PER_PAGE);
          if (r > 0) {
            htmlParts.push('<div data-type="page-break" class="studyflow-page-break"></div>');
          }
          htmlParts.push(buildTableSnippet(chunk, r > 0));
        }
      }

      tableRows = [];
      tableAlignments = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Manejo de Bloques de Código (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushList();
        flushBlockquote();

        const rawCodeText = codeBuffer.join('\n');
        // Comprobar si el contenido dentro del bloque contiene diagramas ASCII, esquemas o árboles de cajas
        const isAsciiDiagramOrBox = /(?:[+\-│┌┐└┘├┤┬┴┼]{3,}|\|\s*[-=]{2,}\s*\||\+[—\-+]+\+)/.test(rawCodeText);
        // Comprobar si el contenido dentro del bloque contiene encabezados markdown o texto estructurado
        const hasMarkdownHeadings = /(?:^|\n)#{1,6}\s+\S+/m.test(rawCodeText);
        const hasListsOrTrees = !isAsciiDiagramOrBox && /(?:^|\n)(?:\d+\.|[-*•])\s+\S+/m.test(rawCodeText);
        const isTechnicalLang = /^(javascript|typescript|js|ts|python|py|sql|c|cpp|rust|go|java|html|css|json|bash|sh|php|ruby|swift|kotlin|csharp)$/i.test(codeBlockLang);

        // Si NO es diagrama ASCII y contiene encabezados o listas o documentación en bloque sin lenguaje técnico:
        if (!isAsciiDiagramOrBox && (hasMarkdownHeadings || hasListsOrTrees || (!codeBlockLang && !hasListsOrTrees)) && !isTechnicalLang && (codeBlockLang === 'text' || codeBlockLang === 'txt' || codeBlockLang === 'markdown' || codeBlockLang === 'md')) {
          // Desempaquetar el contenido como texto estructurado normal
          const unpackedHtml = parseMarkdownToHtml(rawCodeText, options);
          htmlParts.push(unpackedHtml);
        } else {
          const langClass = codeBlockLang ? ` language-${codeBlockLang}` : '';
          const MAX_CODE_LINES_PER_PAGE = 25;

          if (codeBuffer.length <= MAX_CODE_LINES_PER_PAGE) {
            const codeContent = escapeHtml(rawCodeText);
            htmlParts.push(
              `<pre class="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs overflow-x-auto text-indigo-300 my-3${langClass}"><code>${codeContent}</code></pre>`
            );
          } else {
            // Cortar el bloque de código extenso en páginas para evitar elongación física de la hoja
            for (let c = 0; c < codeBuffer.length; c += MAX_CODE_LINES_PER_PAGE) {
              const chunk = codeBuffer.slice(c, c + MAX_CODE_LINES_PER_PAGE);
              if (c > 0) {
                htmlParts.push('<div data-type="page-break" class="studyflow-page-break"></div>');
              }
              const chunkContent = escapeHtml(chunk.join('\n'));
              htmlParts.push(
                `<pre class="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs overflow-x-auto text-indigo-300 my-3${langClass}"><code>${chunkContent}</code></pre>`
              );
            }
          }
        }

        codeBuffer = [];
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        flushList();
        flushBlockquote();
        flushTable();
        inCodeBlock = true;
        codeBlockLang = trimmed.substring(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      // Protección contra bloques de código no cerrados que engullen documentación:
      // Si encontramos encabezados, listas o secciones informativas y no es un lenguaje técnico explícito,
      // cerramos el bloque anterior para que el documento no quede atrapado como código mono
      const isTechnicalLang = /^(javascript|typescript|js|ts|python|py|sql|c|cpp|rust|go|java|html|css|json|bash|sh|php|ruby|swift|kotlin|csharp)$/i.test(codeBlockLang);
      const isDocumentationLine =
        /^#{1,6}\s+\S+/.test(trimmed) ||
        /^(?:\d+\.|[-*•])\s+\S+/.test(trimmed) ||
        /^(?:M[OÓ]DULO|SECCI[OÓ]N|CAP[IÍ]TULO|CRITERIO|GLOSARIO)\s+/i.test(trimmed);

      if (isDocumentationLine && !isTechnicalLang) {
        if (codeBuffer.length > 0) {
          const rawCodeText = codeBuffer.join('\n');
          if (/(?:^|\n)#{1,6}\s+\S+/m.test(rawCodeText) || !isTechnicalLang) {
            htmlParts.push(parseMarkdownToHtml(rawCodeText, options));
          } else {
            htmlParts.push(
              `<pre class="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs overflow-x-auto text-indigo-300 my-3"><code>${escapeHtml(rawCodeText)}</code></pre>`
            );
          }
        }
        codeBuffer = [];
        codeBlockLang = '';
        inCodeBlock = false;
        // Continuar el procesamiento de esta línea como contenido normal
      } else {
        codeBuffer.push(rawLine);
        continue;
      }
    }

    // 2. Saltos de Página Explícitos (--- o *** o ___)
    if (preservePageBreaks && /^(?:---|\*\*\*|___)\s*$/.test(trimmed)) {
      flushList();
      flushBlockquote();
      flushTable();
      htmlParts.push('<div data-type="page-break" class="studyflow-page-break"></div>');
      continue;
    }

    // 3. Tablas Markdown (| col 1 | col 2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Extraer alineaciones de la fila separadora |:---|:---:|---:|
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
        const alignTokens = trimmed
          .substring(1, trimmed.length - 1)
          .split('|')
          .map((s) => s.trim());
        tableAlignments = alignTokens.map((tok) => {
          const leftColon = tok.startsWith(':');
          const rightColon = tok.endsWith(':');
          if (leftColon && rightColon) return 'center';
          if (rightColon) return 'right';
          return 'left';
        });
        continue;
      }
      flushList();
      flushBlockquote();
      inTable = true;
      const cells = trimmed
        .substring(1, trimmed.length - 1)
        .split('|')
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // 4. Citas Académicas (>)
    if (trimmed.startsWith('>')) {
      flushList();
      flushTable();
      inBlockquote = true;
      const quoteText = trimmed.replace(/^>\s?/, '');
      blockquoteBuffer.push(quoteText);
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    // 5. Encabezados (# a ######)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushBlockquote();
      flushTable();
      const level = headingMatch[1].length;
      const content = parseInlineMarkdown(headingMatch[2]);
      const tag = level <= 4 ? `h${level}` : 'h4';

      let styleClasses = '';
      if (profile === 'apa7') {
        if (level === 1) styleClasses = 'text-center font-bold text-xl mb-3 mt-6 text-slate-100';
        else if (level === 2) styleClasses = 'font-bold text-lg mb-2 mt-5 text-slate-100';
        else if (level === 3) styleClasses = 'font-semibold italic text-base mb-2 mt-4 text-slate-200';
        else styleClasses = 'font-semibold text-sm mb-1.5 mt-3 text-slate-300'; // H4
      } else if (profile === 'ieee') {
        styleClasses = level <= 2 ? 'font-bold uppercase tracking-wider text-sm mb-2 mt-4 text-indigo-300' : 'font-semibold text-sm mb-1.5 mt-3 text-slate-300';
      } else {
        styleClasses = level === 1 ? 'font-bold tracking-tight text-xl mb-3 mt-6 text-slate-100' : (level === 2 ? 'font-bold tracking-tight text-lg mb-2 mt-4 text-slate-100' : 'font-semibold text-base mb-1.5 mt-3 text-slate-200');
      }

      htmlParts.push(`<${tag} class="${styleClasses}">${content}</${tag}>`);
      continue;
    }

    // 6. Listas No Ordenadas (- o * o +)
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      flushBlockquote();
      flushTable();
      if (inList !== 'ul') {
        flushList();
        inList = 'ul';
        htmlParts.push('<ul class="list-disc list-inside space-y-1 my-2 text-slate-300 pl-2">');
      }
      htmlParts.push(`<li>${parseInlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    // 7. Listas Ordenadas (1. 2.)
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      flushBlockquote();
      flushTable();
      const startNum = parseInt(olMatch[1], 10);
      if (inList !== 'ol') {
        flushList();
        inList = 'ol';
        const startAttr = startNum > 1 ? ` start="${startNum}"` : '';
        htmlParts.push(`<ol${startAttr} class="list-decimal list-inside space-y-1 my-2 text-slate-300 pl-2">`);
      }
      htmlParts.push(`<li>${parseInlineMarkdown(olMatch[2])}</li>`);
      continue;
    }

    // 8. Líneas vacías: no romper la lista si la siguiente línea no vacía sigue perteneciendo a la misma lista
    if (!trimmed) {
      let nextIsSameList = false;
      for (let next = i + 1; next < lines.length; next++) {
        const nextTrimmed = lines[next].trim();
        if (!nextTrimmed) continue;
        if (inList === 'ol' && /^\d+\.\s+/.test(nextTrimmed)) {
          nextIsSameList = true;
        } else if (inList === 'ul' && /^[-*+]\s+/.test(nextTrimmed)) {
          nextIsSameList = true;
        }
        break;
      }
      if (!nextIsSameList) {
        flushList();
      }
      continue;
    }

    // Si no es un elemento de lista ni línea vacía de lista, vaciar lista abierta
    flushList();

    // 9. Párrafos normales
    const parsedLine = parseInlineMarkdown(trimmed);
    let pClass = 'mb-3 leading-relaxed text-slate-300';
    if (profile === 'apa7') {
      pClass += ' text-justify';
    }
    htmlParts.push(`<p class="${pClass}">${parsedLine}</p>`);
  }

  // Vaciar cualquier estado pendiente
  if (inCodeBlock && codeBuffer.length > 0) {
    const rawCodeText = codeBuffer.join('\n');
    const isTechnicalLang = /^(javascript|typescript|js|ts|python|py|sql|c|cpp|rust|go|java|html|css|json|bash|sh|php|ruby|swift|kotlin|csharp)$/i.test(codeBlockLang);
    if (!isTechnicalLang || /(?:^|\n)#{1,6}\s+\S+/m.test(rawCodeText)) {
      htmlParts.push(parseMarkdownToHtml(rawCodeText, options));
    } else {
      const codeContent = escapeHtml(rawCodeText);
      htmlParts.push(
        `<pre class="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs overflow-x-auto text-indigo-300 my-3"><code>${codeContent}</code></pre>`
      );
    }
    inCodeBlock = false;
    codeBuffer = [];
  }
  flushList();
  flushBlockquote();
  flushTable();

  return htmlParts.join('\n');
}

/**
 * Procesa marcas inline de Markdown:
 * **negrita**, *cursiva*, ~~tachado~~, `código inline`, [enlace](url)
 */
export function parseInlineMarkdown(text: string): string {
  if (!text) return '';

  const codeSpans: string[] = [];
  // 1. Proteger bloques de código en línea `...` con placeholders
  // para que identificadores snake_case o caracteres especiales dentro de código NUNCA
  // sean alterados por cursivas/negritas ni generen HTML malformado / intercalado.
  const protectedText = text.replace(/`([^`]+)`/g, (_match, codeContent) => {
    const idx = codeSpans.length;
    codeSpans.push(
      `<code class="bg-slate-800/80 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">${escapeHtml(codeContent)}</code>`
    );
    return `@@SF_CODESPAN_${idx}@@`;
  });

  // 2. Escapar HTML del texto fuera de los bloques de código protegidos
  let output = escapeHtml(protectedText);

  // 3. Negrita: **texto** o __texto__ (respetando límites para evitar romper snake_case)
  output = output.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/(?<=^|[\s(])__(.+?)__(?=[\s).,;:!?]|$)/g, '<strong>$1</strong>');

  // 4. Cursiva: *texto* o _texto_ (solo con límites de palabras para preservar snake_case)
  output = output.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  output = output.replace(/(?<=^|[\s(])_([^_]+)_(?=[\s).,;:!?]|$)/g, '<em>$1</em>');

  // 5. Tachado: ~~texto~~
  output = output.replace(/~~(.*?)~~/g, '<del class="line-through text-slate-500">$1</del>');

  // 6. Enlaces: [texto](url)
  output = output.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-400 underline hover:text-indigo-300">$1</a>'
  );

  // 7. Restaurar los códigos en línea protegidos e intactos
  output = output.replace(/@@SF_CODESPAN_(\d+)@@/g, (_match, idxStr) => {
    const idx = parseInt(idxStr, 10);
    return codeSpans[idx] || '';
  });

  return output;
}

/**
 * Divide un texto extenso de Markdown en bloques lógicos progresivos (chunks)
 * respetando límites naturales (saltos de página explícitos '---', encabezados '#' o párrafos)
 * para permitir que el Bloque 1 se renderice de inmediato en la primera hoja.
 */
export function chunkMarkdownDocument(
  rawText: string,
  maxWordsPerChunk: number = 1000
): string[] {
  if (!rawText || !rawText.trim()) return [''];

  // Normalizar saltos de línea
  const lines = rawText.split(/\r?\n/);
  const chunks: string[] = [];
  let currentChunkLines: string[] = [];
  let currentChunkWords = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineWords = trimmed ? trimmed.split(/\s+/).length : 0;

    // Límite explícito de salto de página
    const isExplicitBreak = /^(?:---|\*\*\*|___)\s*$/.test(trimmed);
    const isMajorHeading = /^#{1,2}\s+/.test(trimmed);

    // Si el chunk actual ya tiene contenido sustancial y encontramos un punto natural de corte
    const shouldBreak =
      currentChunkWords >= maxWordsPerChunk &&
      (isExplicitBreak || isMajorHeading || (!trimmed && currentChunkWords >= maxWordsPerChunk));

    if (shouldBreak && currentChunkLines.length > 0) {
      chunks.push(currentChunkLines.join('\n'));
      currentChunkLines = [];
      currentChunkWords = 0;
    }

    currentChunkLines.push(line);
    currentChunkWords += lineWords;
  }

  if (currentChunkLines.length > 0) {
    chunks.push(currentChunkLines.join('\n'));
  }

  return chunks.length > 0 ? chunks : [rawText];
}

/**
 * Divide HTML semántico continuo en bloques seguros y cerrados para carga progresiva,
 * sin romper etiquetas estructurales (<p>, <h1-h6>, <table>, <blockquote>, <pre>, <ol>, <ul>).
 */
export function chunkHtmlBlocks(
  fullHtml: string,
  maxWordsPerChunk: number = 800
): string[] {
  if (!fullHtml || !fullHtml.trim()) return ['<p></p>'];

  // Separar en bloques basados en etiquetas de nivel superior
  const blockRegex = /(?:<div data-type="page-break"[^>]*><\/div>|<(?:p|h[1-6]|table|blockquote|pre|ol|ul|div)[^>]*>[\s\S]*?<\/(?:p|h[1-6]|table|blockquote|pre|ol|ul|div)>)/gi;
  const blocks = fullHtml.match(blockRegex);

  if (!blocks || blocks.length <= 1) {
    return [fullHtml];
  }

  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentWords = 0;

  for (const block of blocks) {
    const textOnly = block.replace(/<[^>]*>/g, ' ').trim();
    const words = textOnly ? textOnly.split(/\s+/).length : 0;

    if (currentWords >= maxWordsPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
      currentChunk = [];
      currentWords = 0;
    }

    currentChunk.push(block);
    currentWords += words;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  return chunks.length > 0 ? chunks : [fullHtml];
}

/**
 * Estima la cantidad de palabras de un texto en Markdown
 */
export function countMarkdownWords(text: string): number {
  if (!text) return 0;
  // Quitar enlaces markdown [texto](url) dejando solo el texto
  let clean = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Quitar caracteres especiales y bloques de código para contar palabras netas
  clean = clean
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/[#*`_~>[\]()|\\-]/g, ' ')
    .trim();
  return clean ? clean.split(/\s+/).length : 0;
}

/**
 * Detecta si una cadena de texto contiene sintaxis y estructura típica de Markdown
 * (código con triple backtick, tablas, encabezados #, listas, citas, enlaces o separadores)
 */
export function isMarkdownContent(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;

  // 1. Bloque de código con backticks (```)
  if (/```[\s\S]*?```/.test(trimmed) || /^```\w*\n/m.test(trimmed)) {
    return true;
  }

  // 2. Tablas Markdown (al menos una fila con pipes y una fila divisora |---|)
  if (/^\s*\|.+?\|\s*$/m.test(trimmed) && /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/m.test(trimmed)) {
    return true;
  }

  // 3. Encabezados Markdown (# H1 .. ###### H6)
  if (/^#{1,6}\s+\S+/m.test(trimmed)) {
    return true;
  }

  // 4. Citas académicas / blockquotes (> Cita)
  if (/^>\s+\S+/m.test(trimmed)) {
    return true;
  }

  // 5. Separadores o saltos de página explícitos (---, ***, ___)
  if (/^(?:---|\*\*\*|___)\s*$/m.test(trimmed)) {
    return true;
  }

  // 6. Listas con viñetas o numeradas (- item, * item, 1. item) con múltiples ítems o saltos
  if (
    /(?:^|\n)\s*[-*+]\s+\S+[\s\S]*?(?:^|\n)\s*[-*+]\s+\S+/m.test(trimmed) ||
    /(?:^|\n)\s*\d+\.\s+\S+[\s\S]*?(?:^|\n)\s*\d+\.\s+\S+/m.test(trimmed)
  ) {
    return true;
  }

  // 7. Enlaces Markdown [texto](url) combinados con formato negrita/cursiva
  if (/\[.+?\]\(https?:\/\/.+?\)/.test(trimmed) && /(\*\*|__).+?(\*\*|__)/.test(trimmed)) {
    return true;
  }

  return false;
}

