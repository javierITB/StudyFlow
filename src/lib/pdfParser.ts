import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function loadPdfDocument(buffer: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
  return loadingTask.promise;
}

export async function getPdfPageCount(buffer: ArrayBuffer): Promise<number> {
  const pdf = await loadPdfDocument(buffer);
  const count = pdf.numPages;
  await pdf.destroy();
  return count;
}

