import { describe, it, expect } from 'vitest';
import {
  parseMarkdownToHtml,
  parseInlineMarkdown,
  chunkMarkdownDocument,
  chunkHtmlBlocks,
  countMarkdownWords,
  isMarkdownContent,
} from '../markdownParser';

describe('markdownParser', () => {
  it('convierte encabezados # a h1, h2 y h3 con estilos académicos', () => {
    const md = '# Título Principal\n## Subtítulo 1\n### Subsección A';
    const html = parseMarkdownToHtml(md, { profile: 'apa7' });

    expect(html).toContain('<h1');
    expect(html).toContain('Título Principal</h1>');
    expect(html).toContain('<h2');
    expect(html).toContain('Subtítulo 1</h2>');
    expect(html).toContain('<h3');
    expect(html).toContain('Subsección A</h3>');
  });

  it('procesa citas académicas > como bloques estilizados con clases StudyFlow', () => {
    const md = '> «El conocimiento científico debe ser susceptible de refutación empírica.»';
    const html = parseMarkdownToHtml(md, { enableAcademicCitations: true });

    expect(html).toContain('<blockquote');
    expect(html).toContain('studyflow-academic-citation');
    expect(html).toContain('El conocimiento científico');
  });

  it('respeta saltos de página explícitos con --- convirtiéndolos a divisores StudyFlow', () => {
    const md = 'Primera página de texto.\n\n---\n\nSegunda página de texto.';
    const html = parseMarkdownToHtml(md, { preservePageBreaks: true });

    expect(html).toContain('studyflow-page-break');
    expect(html).toContain('Primera página');
    expect(html).toContain('Segunda página');
  });

  it('procesa correctamente tablas complejas con código snake_case, alineaciones y anchos balanceados sin romper celdas', () => {
    const md = `### 1.2. Matriz General de Permisos RBAC por Módulo

| Sección / Módulo | Vista Operativa | Permiso Canónico (ID) | Cliente | Contador | Admin | BigBoss |
|---|---|---|:---:|:---:|:---:|:---:|
| **Informes** | Formulario 29 (F29) | \`view_formulario_29\` / \`edit_formulario_29\` | VER | SÍ | SÍ | ALL |
| **Herramientas** | Tareas Encoladas | \`view_tareas_encoladas\` / \`edit_tareas_encoladas\` | — | SÍ | SÍ | ALL |
| **Herramientas** | Carga Masiva Movimientos | \`view_carga_masiva_movimientos\` / \`bulk_create_movimientos\` | — | SÍ | SÍ | ALL |
| **Herramientas** | Carga Masiva Vouchers | \`view_carga_masiva_vouchers\` / \`bulk_create_vouchers\` | — | SÍ | SÍ | ALL |
| **Admin** | Roles y Permisos | \`view_gestor_roles\` / \`create_gestor_roles\` / \`edit_gestor_roles\` | — | — | SÍ | ALL |
| **SaaS BigBoss** | Gestión Global Tenants | \`view_plan_cuentas\` / \`isSystemOnly\` (GodMode) | — | — | — | SÍ |`;

    const html = parseMarkdownToHtml(md);

    // 1. Debe contener estructura de tabla
    expect(html).toContain('<table class="studyflow-table');
    expect(html).toContain('1.2. Matriz General de Permisos RBAC por Módulo');

    // 2. Códigos snake_case no deben contener etiquetas <em> intercaladas ni estar corruptos
    expect(html).toContain('view_formulario_29');
    expect(html).toContain('view_carga_masiva_movimientos');
    expect(html).toContain('bulk_create_movimientos');
    expect(html).not.toMatch(/<code[^>]*>[^<]*<em>/);
    expect(html).not.toMatch(/<em>[^<]*<\/code>/);

    // 3. Encabezados deben tener ancho suficiente para no cortar palabras en sílabas (Contador >= 95, BigBoss >= 90)
    expect(html).toMatch(/<th[^>]*colwidth="1\d\d"[^>]*>.*Contador<\/th>/);
    expect(html).toMatch(/<th[^>]*colwidth="9\d"[^>]*>.*BigBoss<\/th>/);

    // 4. Debe respetar alineaciones centradas indicadas por :---: en la fila separadora
    expect(html).toMatch(/<th[^>]*text-center[^>]*style="text-align: center;"[^>]*>.*Contador<\/th>/);
    expect(html).toMatch(/<td[^>]*text-center[^>]*style="text-align: center;"[^>]*>SÍ<\/td>/);
  });

  it('convierte listas con viñetas y ordenadas', () => {
    const md = '- Primer ítem\n- Segundo ítem\n\n1. Paso uno\n2. Paso dos';
    const html = parseMarkdownToHtml(md);

    expect(html).toContain('<ul');
    expect(html).toContain('<li>Primer ítem</li>');
    expect(html).toContain('<ol');
    expect(html).toContain('<li>Paso uno</li>');
  });

  it('procesa marcas inline (negrita, cursiva, código, tachado y enlaces)', () => {
    const inline = parseInlineMarkdown(
      'Texto con **negrita**, *cursiva*, ~~tachado~~, `const x = 1` y [Google](https://google.com)'
    );

    expect(inline).toContain('<strong>negrita</strong>');
    expect(inline).toContain('<em>cursiva</em>');
    expect(inline).toContain('<del class="line-through text-slate-500">tachado</del>');
    expect(inline).toContain('<code');
    expect(inline).toContain('const x = 1');
    expect(inline).toContain('<a href="https://google.com"');
  });

  it('divide textos extensos en bloques (chunking) respetando saltos y encabezados', () => {
    const md = [
      '# Capítulo 1',
      'Párrafo '.repeat(300),
      '---',
      '# Capítulo 2',
      'Párrafo '.repeat(300),
    ].join('\n\n');

    const chunks = chunkMarkdownDocument(md, 200);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]).toContain('# Capítulo 1');
  });

  it('cuenta palabras ignorando sintaxis especial de Markdown', () => {
    const md = '# Título\n\nEste es un **párrafo** con [enlace](https://test.com) y `código`.';
    const words = countMarkdownWords(md);
    expect(words).toBe(9);
  });

  it('auto-pagina tablas extensas (> 15 filas) repitiendo el encabezado y añadiendo salto de página limpio', () => {
    const rows = ['| ID | Elemento | Estado |', '|---|---|---|'];
    for (let i = 1; i <= 35; i++) {
      rows.push(`| ${i} | Item ${i} | OK |`);
    }
    const md = rows.join('\n');
    const html = parseMarkdownToHtml(md);

    expect(html).toContain('data-type="page-break"');
    expect(html).toContain('studyflow-page-break');
    // No debe imprimir texto crudo 'Salto de Página' como contenido
    expect(html).not.toContain('Salto de Página');
    // Debe haber 3 tablas (15 + 15 + 5 filas)
    const tableMatches = html.match(/<table /g);
    expect(tableMatches?.length).toBe(3);
    // Cada una debe tener el encabezado
    const thMatches = html.match(/<th /g);
    expect(thMatches?.length).toBe(3 * 3); // 3 tablas x 3 columnas
  });

  it('auto-pagina bloques de código extensos (> 35 líneas) añadiendo salto de página limpio', () => {
    const codeLines = ['```typescript'];
    for (let i = 1; i <= 75; i++) {
      codeLines.push(`const line${i} = ${i};`);
    }
    codeLines.push('```');
    const md = codeLines.join('\n');
    const html = parseMarkdownToHtml(md);

    expect(html).toContain('data-type="page-break"');
    expect(html).toContain('studyflow-page-break');
    expect(html).not.toContain('Salto de Página');
    const preMatches = html.match(/<pre /g);
    expect(preMatches?.length).toBe(3); // 35 + 35 + 5 = 75 líneas divididas en 3 bloques
  });

  it('detecta correctamente contenido y código Markdown en el portapapeles', () => {
    expect(isMarkdownContent('# Título')).toBe(true);
    expect(isMarkdownContent('## Subtítulo')).toBe(true);
    expect(isMarkdownContent('```js\nconsole.log(1);\n```')).toBe(true);
    expect(isMarkdownContent('| A | B |\n|---|---|\n| 1 | 2 |')).toBe(true);
    expect(isMarkdownContent('> Cita importante')).toBe(true);
    expect(isMarkdownContent('- Item 1\n- Item 2')).toBe(true);
    expect(isMarkdownContent('---')).toBe(true);
    expect(isMarkdownContent('Hola mundo normal sin markdown')).toBe(false);
  });

  it('soporta Título 4 (H4) con etiqueta h4 nativa', () => {
    const md = '#### 4.1 Criterio de Evaluación';
    const html = parseMarkdownToHtml(md);
    expect(html).toContain('<h4');
    expect(html).toContain('4.1 Criterio de Evaluación</h4>');
  });

  it('mantiene la lista ordenada continua en un único <ol> aun con líneas vacías intermedias', () => {
    const md = '1. Primer paso importante\n\n2. Segundo paso detallado\n\n3. Tercer paso final';
    const html = parseMarkdownToHtml(md);
    // Debe haber un solo <ol> que contenga los 3 elementos
    const olMatches = html.match(/<ol /g);
    expect(olMatches?.length).toBe(1);
    expect(html).toContain('<li>Primer paso importante</li>');
    expect(html).toContain('<li>Segundo paso detallado</li>');
    expect(html).toContain('<li>Tercer paso final</li>');
  });

  it('desempaqueta bloques de código que contienen encabezados markdown priorizando texto sobre código', () => {
    const md = '```\n### 4. CRITERIO OFICIAL DE REDACCIÓN\nCada caso de uso cumple con la estructura:\n1. Encabezado\n2. Requisitos\n```';
    const html = parseMarkdownToHtml(md);
    // No debe ser un <pre><code> sino texto enriquecido con h3 y ol
    expect(html).not.toContain('<pre');
    expect(html).toContain('<h3');
    expect(html).toContain('4. CRITERIO OFICIAL DE REDACCIÓN</h3>');
    expect(html).toContain('<ol');
    expect(html).toContain('<li>Encabezado</li>');
  });

  it('respeta el número inicial en listas ordenadas usando start attribute', () => {
    const md = '4. Cuarto criterio de evaluación\n5. Quinto criterio de evaluación';
    const html = parseMarkdownToHtml(md);
    expect(html).toContain('<ol start="4"');
    expect(html).toContain('<li>Cuarto criterio de evaluación</li>');
  });

  it('divide HTML continuo en bloques cerrados y seguros sin romper etiquetas', () => {
    const html = [
      '<h2>Sección 1</h2>',
      '<p>' + 'Palabra '.repeat(400) + '</p>',
      '<h3>Sección 2</h3>',
      '<p>' + 'Palabra '.repeat(500) + '</p>',
    ].join('\n');

    const chunks = chunkHtmlBlocks(html, 400);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]).toContain('<h2>Sección 1</h2>');
    expect(chunks[1]).toContain('<h3>Sección 2</h3>');
  });
});

