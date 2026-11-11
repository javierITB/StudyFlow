import JSZip from 'jszip';

export interface PptxTextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  fontSizePt?: number;
  color?: string;
}

export interface PptxParagraph {
  align: 'left' | 'center' | 'right' | 'justify';
  isBullet: boolean;
  runs: PptxTextRun[];
}

export interface PptxShapeElement {
  kind: 'shape';
  id: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  hasExplicitBounds: boolean;
  fillColor: string | null;
  borderColor: string | null;
  paragraphs: PptxParagraph[];
}

export interface PptxImageElement {
  kind: 'image';
  id: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  dataUrl: string;
}

export interface PptxTableElement {
  kind: 'table';
  id: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  rows: string[][];
}

export type PptxElement = PptxShapeElement | PptxImageElement | PptxTableElement;

export interface PptxSlide {
  slideNumber: number;
  backgroundColor: string | null;
  elements: PptxElement[];
  speakerNotes: string;
}

export interface ParsedPptxPresentation {
  slides: PptxSlide[];
  pageCount: number;
  aspectRatio: number;
}

const DEFAULT_SLIDE_CX = 12192000; // 16:9 standard EMU
const DEFAULT_SLIDE_CY = 6858000;

function getElementChildren(parent: Element): Element[] {
  const result: Element[] = [];
  const nodes = parent.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.nodeType === 1) {
      result.push(node as Element);
    }
  }
  return result;
}

function getFirstDirectChild(parent: Element, localName: string): Element | null {
  for (const child of getElementChildren(parent)) {
    if (child.localName === localName) return child;
  }
  return null;
}

function getAllDescendantsByLocalName(root: Element | Document, localName: string): Element[] {
  const result: Element[] = [];
  const elements = root.getElementsByTagName('*');
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].localName === localName) {
      result.push(elements[i]);
    }
  }
  return result;
}

function resolveZipPath(baseFilePath: string, relativeTarget: string): string {
  if (relativeTarget.startsWith('/')) {
    return relativeTarget.slice(1);
  }
  const baseParts = baseFilePath.split('/');
  baseParts.pop(); // remove filename
  for (const segment of relativeTarget.split('/')) {
    if (segment === '..') {
      baseParts.pop();
    } else if (segment !== '.' && segment !== '') {
      baseParts.push(segment);
    }
  }
  return baseParts.join('/');
}

function parseHexColor(colorParent: Element | null): string | null {
  if (!colorParent) return null;
  const srgb = getAllDescendantsByLocalName(colorParent, 'srgbClr')[0];
  if (srgb) {
    const val = srgb.getAttribute('val');
    if (val && /^[0-9a-fA-F]{6}$/.test(val)) {
      return `#${val}`;
    }
  }
  const scheme = getAllDescendantsByLocalName(colorParent, 'schemeClr')[0];
  if (scheme) {
    const val = scheme.getAttribute('val');
    const schemeDefaults: Record<string, string> = {
      bg1: '#ffffff',
      lt1: '#ffffff',
      tx1: '#0f172a',
      dk1: '#0f172a',
      bg2: '#f1f5f9',
      lt2: '#f1f5f9',
      tx2: '#334155',
      dk2: '#1e293b',
      accent1: '#4f46e5',
      accent2: '#0284c7',
      accent3: '#10b981',
      accent4: '#f59e0b',
      accent5: '#8b5cf6',
      accent6: '#ec4899',
    };
    if (val && schemeDefaults[val]) {
      return schemeDefaults[val];
    }
  }
  return null;
}

function extractBounds(
  container: Element,
  slideCx: number,
  slideCy: number
): { xPct: number; yPct: number; wPct: number; hPct: number; hasExplicitBounds: boolean } {
  const xfrm = getAllDescendantsByLocalName(container, 'xfrm')[0];
  if (!xfrm) {
    return { xPct: 6, yPct: 10, wPct: 88, hPct: 24, hasExplicitBounds: false };
  }
  const off = getFirstDirectChild(xfrm, 'off');
  const ext = getFirstDirectChild(xfrm, 'ext');
  const x = Number(off?.getAttribute('x') ?? NaN);
  const y = Number(off?.getAttribute('y') ?? NaN);
  const cx = Number(ext?.getAttribute('cx') ?? NaN);
  const cy = Number(ext?.getAttribute('cy') ?? NaN);

  if ([x, y, cx, cy].some((n) => Number.isNaN(n)) || cx <= 0 || cy <= 0) {
    return { xPct: 6, yPct: 10, wPct: 88, hPct: 24, hasExplicitBounds: false };
  }

  return {
    xPct: Math.max(0, Math.min(96, (x / slideCx) * 100)),
    yPct: Math.max(0, Math.min(94, (y / slideCy) * 100)),
    wPct: Math.max(4, Math.min(100, (cx / slideCx) * 100)),
    hPct: Math.max(4, Math.min(100, (cy / slideCy) * 100)),
    hasExplicitBounds: true,
  };
}

function parseParagraphs(txBody: Element): PptxParagraph[] {
  const pNodes = getAllDescendantsByLocalName(txBody, 'p');
  const paragraphs: PptxParagraph[] = [];

  for (const pNode of pNodes) {
    const pPr = getFirstDirectChild(pNode, 'pPr');
    const algnAttr = pPr?.getAttribute('algn') || 'l';
    const alignMap: Record<string, PptxParagraph['align']> = {
      l: 'left',
      ctr: 'center',
      r: 'right',
      just: 'justify',
    };
    const align = alignMap[algnAttr] || 'left';
    const hasBulletNone = pPr ? getAllDescendantsByLocalName(pPr, 'buNone').length > 0 : false;
    const hasBulletExplicit = pPr
      ? getAllDescendantsByLocalName(pPr, 'buChar').length > 0 ||
        getAllDescendantsByLocalName(pPr, 'buAutoNum').length > 0
      : false;
    const level = Number(pPr?.getAttribute('lvl') || '0');
    const isBullet = !hasBulletNone && (hasBulletExplicit || level > 0);

    const runs: PptxTextRun[] = [];
    for (const child of getElementChildren(pNode)) {
      if (child.localName === 'r') {
        const rPr = getFirstDirectChild(child, 'rPr');
        const tNode = getFirstDirectChild(child, 't');
        const text = tNode?.textContent ?? '';
        if (!text) continue;

        const bold = rPr?.getAttribute('b') === '1';
        const italic = rPr?.getAttribute('i') === '1';
        const szAttr = rPr?.getAttribute('sz');
        const fontSizePt = szAttr ? Math.round(Number(szAttr) / 100) : undefined;
        const solidFill = rPr ? getFirstDirectChild(rPr, 'solidFill') : null;
        const color = parseHexColor(solidFill) || undefined;

        runs.push({ text, bold, italic, fontSizePt, color });
      } else if (child.localName === 'br') {
        runs.push({ text: '\n', bold: false, italic: false });
      } else if (child.localName === 'fld') {
        const tNode = getFirstDirectChild(child, 't');
        if (tNode?.textContent) {
          runs.push({ text: tNode.textContent, bold: false, italic: false });
        }
      }
    }

    if (runs.length > 0) {
      paragraphs.push({ align, isBullet, runs });
    }
  }

  return paragraphs;
}

function guessImageMimeType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

function extractSlideNumberFromPath(path: string): number {
  const match = path.match(/slide(\d+)\.xml$/i);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

export async function parsePptxDocument(
  buffer: ArrayBuffer
): Promise<ParsedPptxPresentation> {
  const zip = await JSZip.loadAsync(buffer.slice(0));
  const domParser = new DOMParser();

  let slideCx = DEFAULT_SLIDE_CX;
  let slideCy = DEFAULT_SLIDE_CY;
  const orderedSlidePaths: string[] = [];

  const presentationFile = zip.file('ppt/presentation.xml');
  const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');

  if (presentationFile) {
    const presXmlText = await presentationFile.async('text');
    const presDoc = domParser.parseFromString(presXmlText, 'application/xml');
    const sldSz = getAllDescendantsByLocalName(presDoc, 'sldSz')[0];
    if (sldSz) {
      const cx = Number(sldSz.getAttribute('cx'));
      const cy = Number(sldSz.getAttribute('cy'));
      if (cx > 0 && cy > 0) {
        slideCx = cx;
        slideCy = cy;
      }
    }

    const relMap = new Map<string, string>();
    if (presRelsFile) {
      const relsText = await presRelsFile.async('text');
      const relsDoc = domParser.parseFromString(relsText, 'application/xml');
      for (const rel of getAllDescendantsByLocalName(relsDoc, 'Relationship')) {
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target');
        if (id && target) {
          relMap.set(id, resolveZipPath('ppt/presentation.xml', target));
        }
      }
    }

    for (const sldId of getAllDescendantsByLocalName(presDoc, 'sldId')) {
      const rId =
        sldId.getAttribute('r:id') ||
        sldId.getAttributeNS(
          'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
          'id'
        );
      if (rId && relMap.has(rId)) {
        orderedSlidePaths.push(relMap.get(rId)!);
      }
    }
  }

  if (orderedSlidePaths.length === 0) {
    const fallbackPaths = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => extractSlideNumberFromPath(a) - extractSlideNumberFromPath(b));
    orderedSlidePaths.push(...fallbackPaths);
  }

  if (orderedSlidePaths.length === 0) {
    throw new Error('No se encontraron diapositivas válidas en el archivo .pptx');
  }

  const slides: PptxSlide[] = [];

  for (let idx = 0; idx < orderedSlidePaths.length; idx++) {
    const slidePath = orderedSlidePaths[idx];
    const slideFile = zip.file(slidePath);
    if (!slideFile) continue;

    const slideXmlText = await slideFile.async('text');
    const slideDoc = domParser.parseFromString(slideXmlText, 'application/xml');

    // Leer relaciones de la diapositiva (imagenes y notas del orador)
    const relFileName = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
    const relsFile = zip.file(relFileName);
    const slideRels = new Map<string, { target: string; type: string }>();

    if (relsFile) {
      const relsXml = await relsFile.async('text');
      const relsDoc = domParser.parseFromString(relsXml, 'application/xml');
      for (const rel of getAllDescendantsByLocalName(relsDoc, 'Relationship')) {
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target');
        const type = rel.getAttribute('Type') || '';
        if (id && target) {
          slideRels.set(id, {
            target: resolveZipPath(slidePath, target),
            type,
          });
        }
      }
    }

    // Color de fondo
    const bgNode = getAllDescendantsByLocalName(slideDoc, 'bg')[0] || null;
    const backgroundColor = parseHexColor(bgNode);

    const elements: PptxElement[] = [];
    const spTree = getAllDescendantsByLocalName(slideDoc, 'spTree')[0];
    let fallbackOffsetY = 8;

    if (spTree) {
      let elCounter = 0;

      // Figuras y cuadros de texto (<p:sp>)
      for (const sp of getAllDescendantsByLocalName(spTree, 'sp')) {
        const spPr = getFirstDirectChild(sp, 'spPr');
        const txBody = getFirstDirectChild(sp, 'txBody');
        const paragraphs = txBody ? parseParagraphs(txBody) : [];
        const solidFill = spPr ? getFirstDirectChild(spPr, 'solidFill') : null;
        const fillColor = parseHexColor(solidFill);
        const lnNode = spPr ? getFirstDirectChild(spPr, 'ln') : null;
        const borderColor = lnNode
          ? parseHexColor(getFirstDirectChild(lnNode, 'solidFill'))
          : null;

        if (paragraphs.length === 0 && !fillColor) continue;

        const bounds = extractBounds(sp, slideCx, slideCy);
        if (!bounds.hasExplicitBounds) {
          bounds.yPct = Math.min(82, fallbackOffsetY);
          fallbackOffsetY += 18;
        }

        elements.push({
          kind: 'shape',
          id: `sp_${idx}_${elCounter++}`,
          ...bounds,
          fillColor,
          borderColor,
          paragraphs,
        });
      }

      // Imagenes (<p:pic>)
      for (const pic of getAllDescendantsByLocalName(spTree, 'pic')) {
        const blip = getAllDescendantsByLocalName(pic, 'blip')[0];
        const rEmbed =
          blip?.getAttribute('r:embed') ||
          blip?.getAttributeNS(
            'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
            'embed'
          );
        if (!rEmbed || !slideRels.has(rEmbed)) continue;

        const mediaPath = slideRels.get(rEmbed)!.target;
        const mediaFile = zip.file(mediaPath);
        if (!mediaFile) continue;

        const base64 = await mediaFile.async('base64');
        const mime = guessImageMimeType(mediaPath);
        const bounds = extractBounds(pic, slideCx, slideCy);

        elements.push({
          kind: 'image',
          id: `pic_${idx}_${elCounter++}`,
          xPct: bounds.xPct,
          yPct: bounds.yPct,
          wPct: bounds.wPct,
          hPct: bounds.hPct,
          dataUrl: `data:${mime};base64,${base64}`,
        });
      }

      // Tablas (<a:tbl>)
      for (const frame of getAllDescendantsByLocalName(spTree, 'graphicFrame')) {
        const tbl = getAllDescendantsByLocalName(frame, 'tbl')[0];
        if (!tbl) continue;

        const rows: string[][] = [];
        for (const tr of getAllDescendantsByLocalName(tbl, 'tr')) {
          const rowCells: string[] = [];
          for (const tc of getAllDescendantsByLocalName(tr, 'tc')) {
            const texts = getAllDescendantsByLocalName(tc, 't')
              .map((t) => t.textContent || '')
              .join(' ')
              .trim();
            rowCells.push(texts);
          }
          if (rowCells.length > 0) rows.push(rowCells);
        }

        if (rows.length > 0) {
          const bounds = extractBounds(frame, slideCx, slideCy);
          elements.push({
            kind: 'table',
            id: `tbl_${idx}_${elCounter++}`,
            xPct: bounds.xPct,
            yPct: bounds.yPct,
            wPct: bounds.wPct,
            hPct: bounds.hPct,
            rows,
          });
        }
      }
    }

    // Notas del orador (si existen)
    let speakerNotes = '';
    for (const rel of slideRels.values()) {
      if (rel.type.includes('notesSlide')) {
        const notesFile = zip.file(rel.target);
        if (notesFile) {
          const notesXml = await notesFile.async('text');
          const notesDoc = domParser.parseFromString(notesXml, 'application/xml');
          const noteTexts = getAllDescendantsByLocalName(notesDoc, 'p')
            .map((p) =>
              getAllDescendantsByLocalName(p, 't')
                .map((t) => t.textContent || '')
                .join('')
            )
            .filter((line) => line.trim().length > 0 && !/^\d+$/.test(line.trim()));
          speakerNotes = noteTexts.join('\n');
        }
      }
    }

    slides.push({
      slideNumber: idx + 1,
      backgroundColor,
      elements,
      speakerNotes,
    });
  }

  return {
    slides,
    pageCount: slides.length,
    aspectRatio: slideCx / slideCy,
  };
}
