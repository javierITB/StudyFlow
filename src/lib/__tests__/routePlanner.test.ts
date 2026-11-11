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
  it('empaqueta archivos cortos en un mismo bloque Pomodoro y pone descanso largo al terminar', () => {
    const shortDocs: DocumentRecord[] = [
      { ...SAMPLE_DOCS[0], id: 'shortA', name: 'LecturaA.pdf', pageCount: 2 }, // 6 min
      { ...SAMPLE_DOCS[1], id: 'shortB', name: 'LecturaB.pptx', pageCount: 4 }, // 12 min
      { ...SAMPLE_DOCS[0], id: 'shortC', name: 'LecturaC.pdf', pageCount: 10 }, // 30 min (toma 7m en bloque 1 y resto en bloque 2)
    ];

    const settings: StudySettings = {
      ...DEFAULT_STUDY_SETTINGS,
      intervalMode: 'time',
      blockAllocationMode: 'pack',
      studyMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakBetweenDocs: true,
      speedMinPerPage: 3,
    };

    const result = generateStudyRoute({
      documents: shortDocs,
      folders: SAMPLE_FOLDERS,
      settings,
      deadline: '2026-11-14T20:00:00Z',
      now: new Date('2026-11-11T10:00:00Z'),
    });

    const studySteps = result.steps.filter((s) => s.type === 'study');
    expect(studySteps.length).toBe(2);

    // Bloque 1 empaqueta LecturaA (2 pags = 6m) + LecturaB (4 pags = 12m) + 2 pags de LecturaC (6m) = 24m
    expect(studySteps[0].segments?.map((s) => `${s.docId}:${s.startPage}-${s.endPage}`)).toEqual([
      'shortA:1-2',
      'shortB:1-4',
      'shortC:1-2',
    ]);
    expect(studySteps[0].durationMinutes).toBe(24);

    // Como el Bloque 1 completo archivos antes de pasar al Bloque 2, sigue un descanso largo de 15m
    expect(result.steps[1].type).toBe('long_break');
    expect(result.steps[1].durationMinutes).toBe(15);

    // Bloque 2 termina las paginas restantes de LecturaC (pags 3-10 -> 24 min)
    expect(studySteps[1].segments?.map((s) => `${s.docId}:${s.startPage}-${s.endPage}`)).toEqual([
      'shortC:3-10',
    ]);
    expect(studySteps[1].durationMinutes).toBe(24);
  });

  it('en modo exact_doc ajusta la duracion al tiempo real de cada archivo', () => {
    const shortDocs: DocumentRecord[] = [
      { ...SAMPLE_DOCS[0], id: 'shortA', name: 'LecturaA.pdf', pageCount: 2 }, // 6 min
      { ...SAMPLE_DOCS[1], id: 'shortB', name: 'LecturaB.pptx', pageCount: 4 }, // 12 min
    ];

    const settings: StudySettings = {
      ...DEFAULT_STUDY_SETTINGS,
      intervalMode: 'time',
      blockAllocationMode: 'exact_doc',
      studyMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakBetweenDocs: true,
      speedMinPerPage: 3,
    };

    const result = generateStudyRoute({
      documents: shortDocs,
      folders: SAMPLE_FOLDERS,
      settings,
      deadline: '2026-11-14T20:00:00Z',
      now: new Date('2026-11-11T10:00:00Z'),
    });

    expect(result.steps.map((s) => `${s.type}:${s.durationMinutes}`)).toEqual([
      'study:6',
      'long_break:15',
      'study:12',
    ]);
  });

  it('genera descansos cortos dentro del mismo archivo y descanso largo entre documentos en modo por paginas', () => {
    const settings: StudySettings = {
      ...DEFAULT_STUDY_SETTINGS,
      intervalMode: 'pages',
      blockAllocationMode: 'exact_doc',
      pagesPerBlock: 5,
      shortBreakMinutes: 5,
      longBreakMinutes: 20,
      longBreakBetweenDocs: true,
      speedMinPerPage: 2,
    };

    const result = generateStudyRoute({
      documents: SAMPLE_DOCS,
      folders: SAMPLE_FOLDERS,
      settings,
      deadline: '2026-11-14T20:00:00Z',
      now: new Date('2026-11-11T10:00:00Z'),
    });

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
      blockAllocationMode: 'exact_doc',
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
      settings: { ...DEFAULT_STUDY_SETTINGS, speedMinPerPage: 3 },
      deadline: '2026-11-11T14:00:00Z',
      now,
    });
    expect(overloaded.feasibility).toBe('critical');
  });
});
