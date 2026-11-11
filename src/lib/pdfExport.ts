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

