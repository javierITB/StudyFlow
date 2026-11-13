import { jsPDF } from 'jspdf';
import { DocumentRecord, FolderRecord, StickyNoteRecord } from '../types/studyflow';
import { getZoneTitle } from './documentUtils';

export function exportNotesToPdf(
  notesToExport: StickyNoteRecord[],
  documents: DocumentRecord[],
  folders: FolderRecord[]
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const folderMap = new Map(folders.map((f) => [f.id, f.name]));
  const grouped: Record<string, StickyNoteRecord[]> = {};

  notesToExport.forEach((note) => {
    const key = note.docId || 'general';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(note);
  });

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('StudyFlow - Reporte de Apuntes de Estudio', 15, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  const exportDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(
    `Fecha de generación: ${exportDate} | Total de notas: ${notesToExport.length}`,
    15,
    28
  );

  let currentY = 50;

  for (const docKey of Object.keys(grouped)) {
    const docNotes = grouped[docKey];
    let docTitle = 'Notas Generales y Reflexiones';
    if (docKey !== 'general') {
      const found = documents.find((d) => d.id === docKey);
      if (found) {
        const folderLabel =
          found.folderId && folderMap.has(found.folderId)
            ? `[${folderMap.get(found.folderId)}] `
            : '';
        docTitle = `${folderLabel}${found.name}`;
      }
    }

    if (currentY > 250) {
      doc.addPage();
      currentY = 25;
    }

    doc.setFillColor(79, 70, 229);
    doc.rect(15, currentY, 3, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    const titleLines = doc.splitTextToSize(docTitle, 170);
    doc.text(titleLines, 22, currentY + 5.5);
    currentY += 8 + titleLines.length * 4;

    for (const note of docNotes) {
      const lines = doc.splitTextToSize(note.content || '(Sin texto)', 170);
      const boxHeight = 16 + lines.length * 5;

      if (currentY + boxHeight > 275) {
        doc.addPage();
        currentY = 25;
      }

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, currentY, 180, boxHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const zoneText = `Zona: ${getZoneTitle(note.zone || 'ideas')}`;
      const pageText = note.page ? ` | Página: ${note.page}` : '';
      doc.text(`${zoneText}${pageText}`, 20, currentY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(lines, 20, currentY + 13);

      currentY += boxHeight + 4;
    }

    currentY += 6;
  }

  doc.save(`StudyFlow_Apuntes_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Exporta los apuntes respetando la maquetación clásica del Método Cornell:
 * - Columna izquierda (30%): Palabras clave / Preguntas guía
 * - Columna derecha (70%): Notas de desarrollo
 * - Franja inferior horizontal: Resumen en 2 líneas
 */
export function exportCornellNotesToPdf(
  notesToExport: StickyNoteRecord[],
  documents: DocumentRecord[],
  folders: FolderRecord[]
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const folderMap = new Map(folders.map((f) => [f.id, f.name]));
  const grouped: Record<string, StickyNoteRecord[]> = {};

  notesToExport.forEach((note) => {
    const key = note.docId || 'general';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(note);
  });

  const drawPageHeader = (docTitle: string) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('StudyFlow · Apuntes Método Cornell', 15, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(199, 210, 254);
    const titleLines = doc.splitTextToSize(docTitle, 180);
    doc.text(titleLines[0] || docTitle, 15, 22);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generado: ${new Date().toLocaleDateString('es-ES')} · ${notesToExport.length} bloques`,
      15,
      28
    );

    // Encabezados de columnas Cornell
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, 36, 54, 8, 'FD');
    doc.rect(69, 36, 126, 8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text('CLAVES / PREGUNTAS', 18, 41.5);
    doc.text('NOTAS DE DESARROLLO', 73, 41.5);
  };

  const docKeys = Object.keys(grouped);
  docKeys.forEach((docKey, docIdx) => {
    if (docIdx > 0) doc.addPage();
    const docNotes = grouped[docKey];
    let docTitle = 'Apuntes Generales';
    if (docKey !== 'general') {
      const found = documents.find((d) => d.id === docKey);
      if (found) {
        const folderLabel =
          found.folderId && folderMap.has(found.folderId)
            ? `[${folderMap.get(found.folderId)}] `
            : '';
        docTitle = `${folderLabel}${found.name}`;
      }
    }

    drawPageHeader(docTitle);
    let currentY = 44;
    const summaries: string[] = [];

    for (const note of docNotes) {
      const cueRaw =
        note.cornellCues?.trim() ||
        `${getZoneTitle(note.zone || 'ideas')}${note.page ? ` · Pág ${note.page}` : ''}`;
      const devRaw = note.content?.trim() || '(Sin notas de desarrollo)';
      const cueLines = doc.splitTextToSize(cueRaw, 48);
      const devLines = doc.splitTextToSize(devRaw, 118);

      const lineCount = Math.max(cueLines.length, devLines.length);
      const rowHeight = Math.max(16, 8 + lineCount * 4.8);

      if (currentY + rowHeight > 250) {
        doc.addPage();
        drawPageHeader(`${docTitle} (cont.)`);
        currentY = 44;
      }

      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.rect(15, currentY, 54, rowHeight, 'FD');
      doc.setFillColor(255, 255, 255);
      doc.rect(69, currentY, 126, rowHeight, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(67, 56, 202);
      doc.text(cueLines, 18, currentY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(devLines, 73, currentY + 6);

      if (note.cornellSummary?.trim()) {
        summaries.push(
          `${note.page ? `[Pág. ${note.page}] ` : ''}${note.cornellSummary.trim()}`
        );
      }

      currentY += rowHeight;
    }

    // Sección inferior clásica: Resumen
    const summaryText =
      summaries.length > 0
        ? summaries.join(' • ')
        : 'Completa el campo Resumen en 2 líneas de tus notas Cornell para consolidar la síntesis del documento.';
    const summaryLines = doc.splitTextToSize(summaryText, 178);
    const summaryHeight = Math.max(22, 12 + summaryLines.length * 4.5);

    if (currentY + summaryHeight > 282) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY += 4;
    }

    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(165, 180, 252);
    doc.roundedRect(15, currentY, 180, summaryHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(55, 48, 163);
    doc.text('RESUMEN DE SÍNTESIS (MÉTODO CORNELL)', 19, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(summaryLines, 19, currentY + 12);
  });

  doc.save(`StudyFlow_Cornell_${new Date().toISOString().slice(0, 10)}.pdf`);
}


