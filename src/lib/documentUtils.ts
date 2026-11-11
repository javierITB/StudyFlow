import { DocumentType, FolderColor, KanbanZone } from '../types/studyflow';

export function detectDocumentType(fileName: string, mimeType = ''): DocumentType {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (
    lower.endsWith('.docx') ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (
    lower.endsWith('.pptx') ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'pptx';
  }
  if (lower.endsWith('.doc') || lower.endsWith('.ppt')) {
    throw new Error(
      `El archivo "${fileName}" usa un formato binario antiguo (.doc/.ppt). Exportalo o guardalo como .docx, .pptx o .pdf para abrirlo en el navegador.`
    );
  }
  throw new Error(
    `Formato no soportado para "${fileName}". Usa archivos .pdf, .docx o .pptx.`
  );
}

export async function extractDocumentPageCount(
  fileType: DocumentType,
  buffer: ArrayBuffer
): Promise<number> {
  if (fileType === 'pdf') {
    const { getPdfPageCount } = await import('./pdfParser');
    return getPdfPageCount(buffer);
  }
  if (fileType === 'docx') {
    const { parseDocxDocument } = await import('./docxParser');
    const parsed = await parseDocxDocument(buffer);
    return parsed.pageCount;
  }
  const { parsePptxDocument } = await import('./pptxParser');
  const parsedPptx = await parsePptxDocument(buffer);
  return parsedPptx.pageCount;
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getZoneTitle(zone: KanbanZone): string {
  switch (zone) {
    case 'ideas':
      return 'Ideas Clave';
    case 'preguntas':
      return 'Preguntas y Repaso';
    case 'resumen':
      return 'Resumen y Síntesis';
    case 'tareas':
      return 'Tareas y Acciones';
  }
}

export const FOLDER_COLOR_CLASSES: Record<
  FolderColor,
  { dot: string; badge: string; border: string }
> = {
  indigo: {
    dot: 'bg-indigo-400',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    border: 'border-indigo-500/40',
  },
  emerald: {
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    border: 'border-emerald-500/40',
  },
  amber: {
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    border: 'border-amber-500/40',
  },
  rose: {
    dot: 'bg-rose-400',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    border: 'border-rose-500/40',
  },
  sky: {
    dot: 'bg-sky-400',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    border: 'border-sky-500/40',
  },
  purple: {
    dot: 'bg-purple-400',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    border: 'border-purple-500/40',
  },
};
