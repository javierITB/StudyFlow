import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { DOMParser as XmlDomParser } from '@xmldom/xmldom';
import {
  computeStageHorizontalMargins,
  computeTouchNavigationAction,
  detectDocumentType,
} from '../documentUtils';
import { parsePptxDocument } from '../pptxParser';

describe('Document format detection & PPTX parsing', () => {
  it('detecta pdf, docx y pptx y rechaza binarios antiguos .doc/.ppt con mensaje claro', () => {
    expect(detectDocumentType('guia.pdf')).toBe('pdf');
    expect(detectDocumentType('resumen.DOCX')).toBe('docx');
    expect(detectDocumentType('clase1.pptx')).toBe('pptx');

    expect(() => detectDocumentType('viejo.ppt')).toThrow(/\.docx, \.pptx o \.pdf/i);
    expect(() => detectDocumentType('viejo.doc')).toThrow(/\.docx, \.pptx o \.pdf/i);
    expect(() => detectDocumentType('imagen.png')).toThrow(/Formato no soportado/i);
  });

  it('extrae diapositivas, texto, dimensiones y notas del orador desde un .pptx real', async () => {
    // Proveer DOMParser en entorno node de vitest
    if (typeof globalThis.DOMParser === 'undefined') {
      (globalThis as unknown as { DOMParser: typeof XmlDomParser }).DOMParser =
        XmlDomParser;
    }

    const zip = new JSZip();
    zip.file(
      'ppt/presentation.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:sldIdLst>
          <p:sldId id="256" r:id="rId1"/>
          <p:sldId id="257" r:id="rId2"/>
        </p:sldIdLst>
        <p:sldSz cx="12192000" cy="6858000"/>
      </p:presentation>`
    );

    zip.file(
      'ppt/_rels/presentation.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
        <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
      </Relationships>`
    );

    zip.file(
      'ppt/slides/slide1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm><a:off x="609600" y="685800"/><a:ext cx="6096000" cy="1371600"/></a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p><a:r><a:rPr b="1" sz="3200"/><a:t>Introducción a StudyFlow</a:t></a:r></a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>`
    );

    zip.file(
      'ppt/slides/_rels/slide1.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide1.xml"/>
      </Relationships>`
    );

    zip.file(
      'ppt/notesSlides/notesSlide1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
               xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld><p:spTree><p:sp><p:txBody>
          <a:p><a:r><a:t>Repasar fórmula clave</a:t></a:r></a:p>
        </p:txBody></p:sp></p:spTree></p:cSld>
      </p:notes>`
    );

    zip.file(
      'ppt/slides/slide2.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm><a:off x="609600" y="685800"/><a:ext cx="6096000" cy="1371600"/></a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p><a:r><a:t>Segunda Diapositiva</a:t></a:r></a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>`
    );

    const buffer = await zip.generateAsync({ type: 'arraybuffer' });
    const parsed = await parsePptxDocument(buffer);

    expect(parsed.pageCount).toBe(2);
    expect(parsed.aspectRatio).toBeCloseTo(16 / 9, 2);
    expect(parsed.slides[0].speakerNotes).toBe('Repasar fórmula clave');
    expect(parsed.slides[0].elements[0].kind).toBe('shape');
    if (parsed.slides[0].elements[0].kind === 'shape') {
      expect(parsed.slides[0].elements[0].paragraphs[0].runs[0].text).toBe(
        'Introducción a StudyFlow'
      );
      expect(parsed.slides[0].elements[0].paragraphs[0].runs[0].bold).toBe(true);
    }
  });

  it('colapsa los margenes horizontales cuando no hay notas sobresaliendo y los abre segun la ubicacion de las notas', () => {
    const base = {
      sheetWidth: 794,
      secondarySheetWidth: 794,
      spreadGapPx: 16,
      hasSecondaryPage: false,
      pageNotes: [],
      secondaryPageNotes: [],
      noteWidth: 212,
      isInteractiveMarginOpen: false,
    };

    // Sin notas ni modo interactivo: cero margen extra
    expect(computeStageHorizontalMargins(base)).toEqual({
      leftMargin: 0,
      rightMargin: 0,
      hasMarginOverhang: false,
    });

    // Con nota dentro de la hoja: sigue sin abrir margenes laterales
    expect(
      computeStageHorizontalMargins({
        ...base,
        pageNotes: [{ xRatio: 0.25 }],
      })
    ).toEqual({
      leftMargin: 0,
      rightMargin: 0,
      hasMarginOverhang: false,
    });

    // Con nota en margen derecho: solo abre el margen derecho necesario
    const withRightMargin = computeStageHorizontalMargins({
      ...base,
      pageNotes: [{ xRatio: 1.025 }],
    });
    expect(withRightMargin.leftMargin).toBe(0);
    expect(withRightMargin.rightMargin).toBeGreaterThanOrEqual(240);
    expect(withRightMargin.hasMarginOverhang).toBe(true);

    // En modo interativo (Pegar nota / arrastrando): abre ambos lados para soltar notas
    const interactive = computeStageHorizontalMargins({
      ...base,
      isInteractiveMarginOpen: true,
    });
    expect(interactive.leftMargin).toBeGreaterThanOrEqual(240);
    expect(interactive.rightMargin).toBeGreaterThanOrEqual(240);
    expect(interactive.hasMarginOverhang).toBe(false);
  });

  it('determina correctamente acciones táctiles de swipe y tap en bordes para tablets', () => {
    const containerWidth = 800;

    // Deslizar a la izquierda (swipe left) -> Siguiente página ('next')
    expect(
      computeTouchNavigationAction(
        { x: 500, y: 300, time: 1000 },
        { x: 380, y: 305, time: 1200 },
        containerWidth
      )
    ).toBe('next');

    // Deslizar a la derecha (swipe right) -> Página anterior ('prev')
    expect(
      computeTouchNavigationAction(
        { x: 200, y: 300, time: 1000 },
        { x: 340, y: 310, time: 1220 },
        containerWidth
      )
    ).toBe('prev');

    // Desplazamiento vertical (scroll para leer página larga) -> No debe cambiar página ('none')
    expect(
      computeTouchNavigationAction(
        { x: 400, y: 500, time: 1000 },
        { x: 420, y: 250, time: 1200 },
        containerWidth
      )
    ).toBe('none');

    // Pulsar (tap limpio) en el borde derecho (ej: x = 720 sobre 800 -> 90%) -> 'next'
    expect(
      computeTouchNavigationAction(
        { x: 720, y: 350, time: 1000 },
        { x: 722, y: 351, time: 1120 },
        containerWidth
      )
    ).toBe('next');

    // Pulsar (tap limpio) en el borde izquierdo (ej: x = 80 sobre 800 -> 10%) -> 'prev'
    expect(
      computeTouchNavigationAction(
        { x: 80, y: 350, time: 1000 },
        { x: 82, y: 349, time: 1110 },
        containerWidth
      )
    ).toBe('prev');

    // Pulsar en el centro (lectura o selección de texto, x = 400 -> 50%) -> 'none'
    expect(
      computeTouchNavigationAction(
        { x: 400, y: 350, time: 1000 },
        { x: 402, y: 351, time: 1150 },
        containerWidth
      )
    ).toBe('none');

    // Pulsación prolongada (long press / seleccionar texto > 350ms) -> 'none'
    expect(
      computeTouchNavigationAction(
        { x: 720, y: 350, time: 1000 },
        { x: 722, y: 350, time: 1500 },
        containerWidth
      )
    ).toBe('none');
  });
});


