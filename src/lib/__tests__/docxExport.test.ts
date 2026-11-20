import { describe, it, expect, beforeAll } from 'vitest';
import { DOMParser as XmlDomParser } from '@xmldom/xmldom';
import {
  exportHtmlToMarkdown,
  generateDocxBlob,
  getPaperDimensions,
  enhanceDomForExport,
} from '../docxExport';

describe('docxExport & Markdown converters', () => {
  beforeAll(() => {
    if (typeof globalThis.DOMParser === 'undefined') {
      (globalThis as unknown as { DOMParser: typeof XmlDomParser }).DOMParser = XmlDomParser;
    }
  });

  it('converts basic HTML headings, paragraphs, and blockquotes to markdown', () => {
    const html = `
      <h1>Título de Ensayo</h1>
      <p>Este es el párrafo de introducción con argumento central.</p>
      <blockquote>Cita bibliográfica importante</blockquote>
      <ul>
        <li>Punto 1</li>
        <li>Punto 2</li>
      </ul>
      <div data-type="page-break"></div>
      <h2>Conclusiones</h2>
      <p>Cierre del trabajo.</p>
    `;

    const md = exportHtmlToMarkdown(html);
    expect(md).toContain('# Título de Ensayo');
    expect(md).toContain('Este es el párrafo de introducción');
    expect(md).toContain('> Cita bibliográfica importante');
    expect(md).toContain('- Punto 1');
    expect(md).toContain('---');
    expect(md).toContain('## Conclusiones');
    expect(md).toContain('Cierre del trabajo.');
  });

  it('converts code blocks, tables, and h4 properly to markdown', () => {
    const html = `
      <h4>Subtítulo nivel 4</h4>
      <pre><code class="language-typescript">const x: number = 42;</code></pre>
      <table>
        <tbody>
          <tr><th>Módulo</th><th>Acceso</th></tr>
          <tr><td>Admin</td><td>Permitido</td></tr>
        </tbody>
      </table>
    `;

    const md = exportHtmlToMarkdown(html);
    expect(md).toContain('#### Subtítulo nivel 4');
    expect(md).toContain('```typescript');
    expect(md).toContain('const x: number = 42;');
    expect(md).toContain('| Módulo | Acceso |');
    expect(md).toContain('| --- | --- |');
    expect(md).toContain('| Admin | Permitido |');
  });

  it('enhanceDomForExport formats code blocks with dark styling and monospace font', () => {
    const parser = new XmlDomParser();
    const doc = parser.parseFromString(
      `<div><pre><code>+---+
| A |
+---+</code></pre></div>`,
      'text/html'
    );
    const container = doc.documentElement as unknown as HTMLElement;

    enhanceDomForExport(container);
    const pre = container.getElementsByTagName('pre')[0] as HTMLElement;
    expect(pre).toBeDefined();
    const style = pre.getAttribute('style') || '';
    expect(style).toContain('background-color: #0f172a');
    expect(style).toContain('white-space: pre-wrap');
    expect(style).toContain('Mono');
  });

  it('enhanceDomForExport balances multi-column matrix tables and sets colgroup', () => {
    const parser = new XmlDomParser();
    const doc = parser.parseFromString(
      `<div><table>
        <thead>
          <tr>
            <th>Módulo</th>
            <th>Código de Permiso</th>
            <th>Cliente</th>
            <th>Trabajador</th>
            <th>Admin</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Panel Cliente</td>
            <td>viewpanelcliente</td>
            <td>✔</td>
            <td>✖</td>
            <td>✔</td>
          </tr>
        </tbody>
      </table></div>`,
      'text/html'
    );
    const container = doc.documentElement as unknown as HTMLElement;

    enhanceDomForExport(container);
    const table = container.getElementsByTagName('table')[0] as HTMLElement;
    expect(table).toBeDefined();
    const cols = Array.from(table.getElementsByTagName('col'));
    expect(cols.length).toBe(5);

    // Icon columns (Cliente, Trabajador, Admin) get compact width (e.g. 8%), text columns get more
    const colStyles = cols.map((c) => c.getAttribute('style') || '');
    const pcts = colStyles.map((s) => parseFloat(s.match(/width:\s*([\d.]+)%/)?.[1] || '0'));
    expect(pcts[0]).toBeGreaterThan(pcts[2]); // Módulo > Cliente
    expect(pcts[1]).toBeGreaterThan(pcts[3]); // Código > Trabajador
  });

  it('generates a valid DOCX Blob from HTML content with tables and styles', async () => {
    const html = `
      <h1>Informe de Laboratorio</h1>
      <p>Resultados del experimento:</p>
      <table>
        <tbody>
          <tr><th>Muestra</th><th>Valor</th></tr>
          <tr><td>A</td><td>12.5</td></tr>
        </tbody>
      </table>
    `;

    const blob = await generateDocxBlob(html, 'Informe');
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  it('returns distinct physical dimensions for letter, legal (Oficio), and a4 formats', () => {
    const letter = getPaperDimensions('letter');
    const legal = getPaperDimensions('legal');
    const a4 = getPaperDimensions('a4');

    expect(letter.widthMm).toBeCloseTo(215.9, 1);
    expect(letter.heightMm).toBeCloseTo(279.4, 1);
    expect(legal.widthMm).toBe(216);
    expect(legal.heightMm).toBe(330);
    expect(legal.printableHeightPx).toBeGreaterThan(letter.printableHeightPx);
    expect(a4.widthMm).toBe(210);
    expect(a4.heightMm).toBe(297);
  });

  it('generates valid DOCX blobs for legal (Oficio) and a4 paper formats', async () => {
    const html = '<div><p>Primer párrafo</p><p>Segundo párrafo</p></div>';
    const legalBlob = await generateDocxBlob(html, 'OficioTest', 'legal');
    const a4Blob = await generateDocxBlob(html, 'A4Test', 'a4');
    expect(legalBlob.size).toBeGreaterThan(0);
    expect(a4Blob.size).toBeGreaterThan(0);
  });
});
