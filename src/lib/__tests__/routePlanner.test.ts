import { describe, expect, it } from 'vitest';
import { generateStudyRoute } from '../routePlanner';
import { applyPresetToSettings, DEFAULT_STUDY_SETTINGS } from '../studyMethods';
import { DocumentRecord, FolderRecord, StudySettings } from '../../types/studyflow';

const SAMPLE_FOLDERS: FolderRecord[] = [
  { id: 'f1', name: 'Cálculo II', color: 'indigo', createdAt: '2026-11-10T10:00:00Z' },
  { id: 'f2', name: 'Física', color: 'emerald', createdAt: '2026-11-10T10:00:00Z' },
];

const SAMPLE_DOCS: DocumentRecord[] = [
  {
    id: 'doc1',
    folderId: 'f1',
    name: 'Integrales.pdf',
    fileType: 'pdf',
    size: 1000,
    pageCount: 12,
    currentPage: 1,
    uploadDate: '2026-11-10T10:00:00Z',
  },
  {
    id: 'doc2',
    folderId: 'f2',
    name: 'Cinematica.pptx',
    fileType: 'pptx',
    size: 2000,
    pageCount: 8,
    currentPage: 1,
    uploadDate: '2026-11-10T10:00:00Z',
  },
];

describe('StudyFlow routePlanner', () => {
  it('genera descansos cortos dentro del mismo archivo y descanso largo entre documentos', () => {
    const settings: StudySettings = {
      ...DEFAULT_STUDY_SETTINGS,
      intervalMode: 'pages',
      pagesPerBlock: 5,
      shortBreakMinutes: 5,
      longBreakMinutes: 20,
      longBreakBetweenDocs: true,
      speedMinPerPage: 2,
    };

    const now = new Date('2026-11-11T10:00:00Z');
    const deadline = '2026-11-14T20:00:00Z';

    const result = generateStudyRoute({
      documents: SAMPLE_DOCS,
      folders: SAMPLE_FOLDERS,
      settings,
      deadline,
      now,
    });

    // Doc1 (12 pags -> 1-5, 6-10, 11-12) = 3 bloques; Doc2 (8 pags -> 1-5, 6-8) = 2 bloques
    expect(result.totalStudyBlocks).toBe(5);
    expect(result.totalPages).toBe(20);
    expect(result.feasibility).toBe('optimal');

    const studySteps = result.steps.filter((s) => s.type === 'study');
    expect(studySteps.map((s) => `${s.docId}:${s.startPage}-${s.endPage}`)).toEqual([
      'doc1:1-5',
      'doc1:6-10',
      'doc1:11-12',
      'doc2:1-5',
      'doc2:6-8',
    ]);

    // Verificar secuencia exacta de descansos:
    // doc1 block0 -> short -> doc1 block1 -> short -> doc1 block2 -> LONG (cambio a doc2) -> doc2 block0 -> short -> doc2 block1
    expect(result.steps.map((s) => s.type)).toEqual([
      'study',
      'short_break',
      'study',
      'short_break',
      'study',
      'long_break',
      'study',
      'short_break',
      'study',
    ]);

    const transitionBreak = result.steps.find((s) => s.type === 'long_break');
    expect(transitionBreak?.durationMinutes).toBe(20);
    expect(transitionBreak?.nextDocName).toBe('Cinematica.pptx');
  });

  it('soporta bloques flexibles por tiempo y respeta la pagina actual', () => {
    const deep = applyPresetToSettings(DEFAULT_STUDY_SETTINGS, 'deep');
    const settings: StudySettings = {
      ...deep,
      speedMinPerPage: 3,
      resumeFromCurrentPage: true,
    };

    const docs: DocumentRecord[] = [
      { ...SAMPLE_DOCS[0], pageCount: 20, currentPage: 11 }, // quedan 10 paginas -> 30 min -> 1 bloque de 50m
    ];

    const result = generateStudyRoute({
      documents: docs,
      folders: SAMPLE_FOLDERS,
      settings,
      deadline: '2026-11-13T20:00:00Z',
      now: new Date('2026-11-11T10:00:00Z'),
    });

    expect(result.totalPages).toBe(10);
    expect(result.totalStudyBlocks).toBe(1);
    expect(result.steps[0].startPage).toBe(11);
    expect(result.steps[0].endPage).toBe(20);
  });

  it('detecta fecha vencida y sobrecarga critica correctamente', () => {
    const now = new Date('2026-11-11T10:00:00Z');

    const expired = generateStudyRoute({
      documents: SAMPLE_DOCS,
      folders: SAMPLE_FOLDERS,
      settings: DEFAULT_STUDY_SETTINGS,
      deadline: '2026-11-10T10:00:00Z',
      now,
    });
    expect(expired.feasibility).toBe('expired');

    const overloaded = generateStudyRoute({
      documents: [{ ...SAMPLE_DOCS[0], pageCount: 200 }],
      folders: SAMPLE_FOLDERS,
      settings: { ...DEFAULT_STUDY_SETTINGS, speedMinPerPage: 3 }, // 600 min = 10h + breaks
      deadline: '2026-11-11T14:00:00Z', // solo 4 horas
      now,
    });
    expect(overloaded.feasibility).toBe('critical');
  });
});

