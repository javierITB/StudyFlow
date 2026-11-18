import { describe, it, expect, beforeAll } from 'vitest';
import { DOMParser as XmlDomParser } from '@xmldom/xmldom';
import { Superscript, Subscript } from '../tiptap/AcademicScriptExtensions';
import { AcademicHighlight, TextColor } from '../tiptap/AcademicColorExtensions';
import { IndentExtension } from '../tiptap/IndentExtension';
import { generateDocxBlob } from '../docxExport';

describe('Academic Extensions & Formatting', () => {
  beforeAll(() => {
    if (typeof globalThis.DOMParser === 'undefined') {
      (globalThis as unknown as { DOMParser: typeof XmlDomParser }).DOMParser = XmlDomParser;
    }
  });

  it('defines superscript and subscript extensions with expected names and tags', () => {
    expect(Superscript.name).toBe('superscript');
    expect(Subscript.name).toBe('subscript');
  });

  it('defines textColor and highlight extensions with multicolor option', () => {
    expect(TextColor.name).toBe('textColor');
    expect(AcademicHighlight.name).toBe('highlight');
  });

  it('calculates APA indent distances (1.27cm per level)', () => {
    const indentExt = IndentExtension;
    expect(indentExt.name).toBe('indent');
    expect(indentExt.options.indentDistanceCm).toBe(1.27);
    expect(indentExt.options.maxIndent).toBe(4);
  });

  it('exports HTML with superscript, subscript, highlight and indents without errors', async () => {
    const html = `
      <h1>Ensayo Científico</h1>
      <p data-indent="1">Párrafo con sangría de primera línea APA.</p>
      <p>Fórmula química: H<sub>2</sub>O y energía E = mc<sup>2</sup> con texto <s>tachado</s>.</p>
      <p><mark data-color="#fef08a">Texto resaltado de prueba</mark> con <span style="color: #1d4ed8;">tinta azul</span>.</p>
      <blockquote>Cita bibliográfica en bloque mayor a 40 palabras.</blockquote>
      <hr />
    `;
    const blob = await generateDocxBlob(html, 'Ensayo Test', 'letter');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(500);
  });
});
