/**
 * Motor unificado de importación progresiva de documentos para StudyFlow
 * Soporta archivos .md, .docx, .pdf, .pptx y .txt.
 */

import {
  parseMarkdownToHtml,
  chunkHtmlBlocks,
  countMarkdownWords,
  AcademicStyleProfile,
} from './markdownParser';

export type ImportableExtension = 'md' | 'markdown' | 'docx' | 'pdf' | 'pptx' | 'txt';

export interface ImportProgressState {
  fileName: string;
  fileType: ImportableExtension;
  percent: number; // 0 to 100
  currentBlock: number;
  totalBlocks: number;
  statusText: string;
  isComplete: boolean;
  error?: string | null;
}

export interface PreparedDocumentImport {
  title: string;
  fileName: string;
  fileType: ImportableExtension;
  fileSizeBytes: number;
  totalEstimatedWords: number;
  paperSize: 'letter' | 'legal' | 'a4';
  profile: AcademicStyleProfile;
  initialBlockHtml: string;
  totalBlocks: number;
  remainingBlocks: string[];
}

export interface ParseDocumentOptions {
  profile?: AcademicStyleProfile;
  paperSize?: 'letter' | 'legal' | 'a4';
  title?: string;
  onProgress?: (progress: ImportProgressState) => void;
}

/**
 * Detectar extensión normalizada del archivo
 */
export function detectImportableType(fileName: string): ImportableExtension | null {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (['md', 'markdown'].includes(ext)) return 'md';
  if (ext === 'docx') return 'docx';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'pptx') return 'pptx';
  if (ext === 'txt') return 'txt';
  return null;
}

/**
 * Limpia el nombre del archivo para generar un título limpio de trabajo académico
 */
export function cleanDocumentTitle(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  return withoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Prepara e inicia el parseo progresivo de un archivo cargado por el usuario
 */
export async function prepareDocumentImport(
  file: File,
  options: ParseDocumentOptions = {}
): Promise<PreparedDocumentImport> {
  const {
    profile = 'apa7',
    paperSize = 'letter',
    title: customTitle,
    onProgress,
  } = options;

  const fileType = detectImportableType(file.name);
  if (!fileType) {
    throw new Error(`Formato de archivo no soportado. Usa .md, .docx, .pdf, .pptx o .txt.`);
  }

  const fileName = file.name;
  const fileSizeBytes = file.size;
  const title = customTitle?.trim() || cleanDocumentTitle(fileName);

  // Notificar inicio
  onProgress?.({
    fileName,
    fileType,
    percent: 5,
    currentBlock: 0,
    totalBlocks: 1,
    statusText: 'Leyendo estructura del archivo...',
    isComplete: false,
  });

  if (fileType === 'md' || fileType === 'txt') {
    const rawText = await file.text();
    const words = countMarkdownWords(rawText);

    onProgress?.({
      fileName,
      fileType,
      percent: 25,
      currentBlock: 1,
      totalBlocks: 1,
      statusText: 'Segmentando contenido en bloques de lectura...',
      isComplete: false,
    });

    // Interpretar el documento completo como texto continuo para preservar la integridad semántica
    const fullHtml = parseMarkdownToHtml(rawText, { profile });
    const htmlChunks = chunkHtmlBlocks(fullHtml, 800);
    const totalBlocks = Math.max(1, htmlChunks.length);

    // Procesar el Bloque 1 inmediatamente
    const initialHtml = htmlChunks[0] || '<p></p>';
    const remainingBlocks = htmlChunks.slice(1);

    onProgress?.({
      fileName,
      fileType,
      percent: Math.round((1 / totalBlocks) * 100),
      currentBlock: 1,
      totalBlocks,
      statusText: totalBlocks > 1 ? `Bloque 1 de ${totalBlocks} listo para redactar` : 'Documento interpretado al 100%',
      isComplete: totalBlocks === 1,
    });

    return {
      title,
      fileName,
      fileType,
      fileSizeBytes,
      totalEstimatedWords: words,
      paperSize,
      profile,
      initialBlockHtml: initialHtml,
      totalBlocks,
      remainingBlocks,
    };
  }

  if (fileType === 'docx') {
    const buffer = await file.arrayBuffer();
    onProgress?.({
      fileName,
      fileType,
      percent: 30,
      currentBlock: 0,
      totalBlocks: 1,
      statusText: 'Extrayendo formato DOCX enriquecido...',
      isComplete: false,
    });

    const { parseDocxDocument } = await import('./docxParser');
    const parsed = await parseDocxDocument(buffer);
    const pages = parsed.pages;
    const totalBlocks = Math.max(1, pages.length);

    const initialBlockHtml = pages[0]?.html || '<p></p>';
    const remainingBlocks = pages.slice(1).map((p) => p.html);

    const estimatedWords = pages
      .map((p) => p.html.replace(/<[^>]*>/g, ' '))
      .join(' ')
      .trim()
      .split(/\s+/).length;

    onProgress?.({
      fileName,
      fileType,
      percent: Math.round((1 / totalBlocks) * 100),
      currentBlock: 1,
      totalBlocks,
      statusText: totalBlocks > 1 ? `Página 1 de ${totalBlocks} lista` : 'DOCX interpretado al 100%',
      isComplete: totalBlocks === 1,
    });

    return {
      title,
      fileName,
      fileType,
      fileSizeBytes,
      totalEstimatedWords: estimatedWords,
      paperSize,
      profile,
      initialBlockHtml,
      totalBlocks,
      remainingBlocks,
    };
  }

  if (fileType === 'pdf') {
    const buffer = await file.arrayBuffer();
    onProgress?.({
      fileName,
      fileType,
      percent: 20,
      currentBlock: 0,
      totalBlocks: 1,
      statusText: 'Cargando páginas del documento PDF...',
      isComplete: false,
    });

    const { loadPdfDocument } = await import('./pdfParser');
    const pdf = await loadPdfDocument(buffer);
    const numPages = pdf.numPages;
    const totalBlocks = Math.max(1, numPages);

    // Extraer página 1 inmediatamente
    const page1 = await pdf.getPage(1);
    const page1Content = await page1.getTextContent();
    const page1Text = page1Content.items
      .map((it: any) => it.str || '')
      .join(' ')
      .trim();

    const initialBlockHtml = `<h2 class="text-lg font-bold text-slate-100 mb-3">${title}</h2><p class="leading-relaxed text-slate-300 mb-4">${escapePdfText(page1Text)}</p>`;

    // Extraer páginas restantes
    const remainingBlocks: string[] = [];
    let totalText = page1Text;

    for (let p = 2; p <= numPages; p++) {
      const page = await pdf.getPage(p);
      const textContent = await page.getTextContent();
      const pText = textContent.items
        .map((it: any) => it.str || '')
        .join(' ')
        .trim();
      totalText += ' ' + pText;
      remainingBlocks.push(
        `<div data-type="page-break" class="studyflow-page-break"></div><p class="leading-relaxed text-slate-300 mb-4">${escapePdfText(pText)}</p>`
      );
    }

    const estimatedWords = totalText.trim().split(/\s+/).length;

    onProgress?.({
      fileName,
      fileType,
      percent: Math.round((1 / totalBlocks) * 100),
      currentBlock: 1,
      totalBlocks,
      statusText: totalBlocks > 1 ? `Página 1 de ${totalBlocks} lista` : 'PDF interpretado al 100%',
      isComplete: totalBlocks === 1,
    });

    return {
      title,
      fileName,
      fileType,
      fileSizeBytes,
      totalEstimatedWords: estimatedWords,
      paperSize,
      profile,
      initialBlockHtml,
      totalBlocks,
      remainingBlocks,
    };
  }

  if (fileType === 'pptx') {
    const buffer = await file.arrayBuffer();
    onProgress?.({
      fileName,
      fileType,
      percent: 25,
      currentBlock: 0,
      totalBlocks: 1,
      statusText: 'Extrayendo diapositivas y esquemas PPTX...',
      isComplete: false,
    });

    const { parsePptxDocument } = await import('./pptxParser');
    const parsed = await parsePptxDocument(buffer);
    const slides = parsed.slides;
    const totalBlocks = Math.max(1, slides.length);

    const slide1Texts = slides[0] ? extractPptxSlideTexts(slides[0]) : [];
    const slide1Title = slide1Texts[0] || 'Diapositiva 1';
    const slide1Body = slide1Texts.slice(1);

    const initialBlockHtml = slides[0]
      ? `<h2 class="text-lg font-bold text-slate-100 mb-2">${escapePdfText(slide1Title)}</h2><div class="space-y-2 text-slate-300">${slide1Body.map((t) => `<p>${escapePdfText(t)}</p>`).join('')}</div>`
      : '<p></p>';

    const remainingBlocks: string[] = [];
    let fullText = slide1Texts.join(' ');

    for (let s = 1; s < slides.length; s++) {
      const slide = slides[s];
      const sTexts = extractPptxSlideTexts(slide);
      const sTitle = sTexts[0] || `Diapositiva ${slide.slideNumber}`;
      const sBody = sTexts.slice(1);
      fullText += ' ' + sTexts.join(' ');
      remainingBlocks.push(
        `<div data-type="page-break" class="studyflow-page-break"></div><h3 class="text-base font-bold text-indigo-200 mb-2">${escapePdfText(sTitle)}</h3><div class="space-y-2 text-slate-300">${sBody.map((t) => `<p>${escapePdfText(t)}</p>`).join('')}</div>`
      );
    }

    const estimatedWords = fullText.trim().split(/\s+/).length;

    onProgress?.({
      fileName,
      fileType,
      percent: Math.round((1 / totalBlocks) * 100),
      currentBlock: 1,
      totalBlocks,
      statusText: totalBlocks > 1 ? `Diapositiva 1 de ${totalBlocks} lista` : 'Presentación interpretada al 100%',
      isComplete: totalBlocks === 1,
    });

    return {
      title,
      fileName,
      fileType,
      fileSizeBytes,
      totalEstimatedWords: estimatedWords,
      paperSize,
      profile,
      initialBlockHtml,
      totalBlocks,
      remainingBlocks,
    };
  }

  throw new Error(`Formato no soportado.`);
}

function extractPptxSlideTexts(slide: any): string[] {
  if (!slide || !Array.isArray(slide.elements)) return [];
  const texts: string[] = [];
  for (const el of slide.elements) {
    if (el.kind === 'shape' && Array.isArray(el.paragraphs)) {
      for (const p of el.paragraphs) {
        if (Array.isArray(p.runs)) {
          const line = p.runs.map((r: any) => r.text || '').join('').trim();
          if (line) texts.push(line);
        }
      }
    } else if (el.kind === 'table' && Array.isArray(el.rows)) {
      for (const row of el.rows) {
        if (Array.isArray(row)) {
          const line = row.filter(Boolean).join(' | ').trim();
          if (line) texts.push(line);
        }
      }
    }
  }
  return texts;
}

function escapePdfText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
