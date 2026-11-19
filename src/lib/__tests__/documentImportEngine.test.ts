import { describe, it, expect } from 'vitest';
import {
  detectImportableType,
  cleanDocumentTitle,
  prepareDocumentImport,
} from '../documentImportEngine';

describe('documentImportEngine', () => {
  it('detecta extensiones válidas de importación', () => {
    expect(detectImportableType('ensayo.md')).toBe('md');
    expect(detectImportableType('paper.markdown')).toBe('md');
    expect(detectImportableType('tesis.docx')).toBe('docx');
    expect(detectImportableType('lectura.pdf')).toBe('pdf');
    expect(detectImportableType('presentacion.pptx')).toBe('pptx');
    expect(detectImportableType('notas.txt')).toBe('txt');
    expect(detectImportableType('video.mp4')).toBeNull();
  });

  it('limpia nombres de archivo para generar títulos legibles', () => {
    expect(cleanDocumentTitle('mi_ensayo_filosofia_v2.md')).toBe('mi ensayo filosofia v2');
    expect(cleanDocumentTitle('Capitulo-1--Introduccion.docx')).toBe('Capitulo 1 Introduccion');
  });

  it('procesa un archivo Markdown simulado emitiendo eventos de progreso', async () => {
    const content = '# Tesis Central\n\nEste es el primer párrafo de prueba.\n\n---\n\n## Capítulo 2\n\nSegundo bloque de texto extenso.';
    const file = new File([content], 'mi_investigacion.md', { type: 'text/markdown' });

    const progressEvents: any[] = [];
    const prepared = await prepareDocumentImport(file, {
      profile: 'apa7',
      paperSize: 'letter',
      onProgress: (p) => progressEvents.push({ ...p }),
    });

    expect(prepared.title).toBe('mi investigacion');
    expect(prepared.fileType).toBe('md');
    expect(prepared.initialBlockHtml).toContain('<h1');
    expect(prepared.initialBlockHtml).toContain('Tesis Central');
    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents[progressEvents.length - 1].percent).toBeGreaterThanOrEqual(50);
  });
});
