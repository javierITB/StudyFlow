import { describe, expect, it } from 'vitest';
import {
  computeAdaptiveStrategyRecommendation,
  computeDiagnosticStats,
  computeRecommendedPomodoro,
  mergeReadingSample,
} from '../diagnosticEngine';
import { DocumentRecord, PageReadingSample } from '../../types/studyflow';

describe('diagnosticEngine', () => {
  it('filtra saltos rapidos (<3s) y acumula tiempo activo por pagina', () => {
    let samples: PageReadingSample[] = [];

    // Salto rapido de 2s al hojear: debe ignorarse
    samples = mergeReadingSample(samples, {
      docId: 'd1',
      docName: 'Guia.pdf',
      fileType: 'pdf',
      page: 1,
      addedSeconds: 2,
    });
    expect(samples).toHaveLength(0);

    // Lectura real de 45s en pagina 2, luego revisita de 30s
    samples = mergeReadingSample(samples, {
      docId: 'd1',
      docName: 'Guia.pdf',
      fileType: 'pdf',
      page: 2,
      addedSeconds: 45,
    });
    samples = mergeReadingSample(samples, {
      docId: 'd1',
      docName: 'Guia.pdf',
      fileType: 'pdf',
      page: 2,
      addedSeconds: 30,
    });
    expect(samples).toHaveLength(1);
    expect(samples[0].activeSeconds).toBe(75);
  });

  it('recomienda ciclos largos para lectura agil/diapositivas y sprints cortos para densidad extrema', () => {
    const agileSamples: PageReadingSample[] = [
      { docId: 'p1', docName: 'Slides.pptx', fileType: 'pptx', page: 1, activeSeconds: 35, updatedAt: '' },
      { docId: 'p1', docName: 'Slides.pptx', fileType: 'pptx', page: 2, activeSeconds: 45, updatedAt: '' },
      { docId: 'p1', docName: 'Slides.pptx', fileType: 'pptx', page: 3, activeSeconds: 40, updatedAt: '' },
      { docId: 'p1', docName: 'Slides.pptx', fileType: 'pptx', page: 4, activeSeconds: 50, updatedAt: '' },
    ];

    const agileRec = computeRecommendedPomodoro(agileSamples, 'balanced');
    expect(agileRec.difficulty).toBe('agile');
    expect(agileRec.confidence).toBe('calibrated');
    expect(agileRec.recommendedSettings.studyMinutes).toBeGreaterThanOrEqual(45);
    expect(agileRec.recommendedSettings.speedMinPerPage).toBeLessThan(1.2);

    const extremeSamples: PageReadingSample[] = [
      { docId: 'd2', docName: 'Calculo.pdf', fileType: 'pdf', page: 1, activeSeconds: 360, updatedAt: '' },
      { docId: 'd2', docName: 'Calculo.pdf', fileType: 'pdf', page: 2, activeSeconds: 420, updatedAt: '' },
      { docId: 'd2', docName: 'Calculo.pdf', fileType: 'pdf', page: 3, activeSeconds: 390, updatedAt: '' },
      { docId: 'd2', docName: 'Calculo.pdf', fileType: 'pdf', page: 4, activeSeconds: 450, updatedAt: '' },
      { docId: 'd2', docName: 'Calculo.pdf', fileType: 'pdf', page: 5, activeSeconds: 410, updatedAt: '' },
    ];

    const extremeRec = computeRecommendedPomodoro(extremeSamples, 'balanced');
    expect(extremeRec.difficulty).toBe('extreme');
    expect(extremeRec.confidence).toBe('high');
    expect(extremeRec.recommendedSettings.studyMinutes).toBe(15);
    expect(extremeRec.recommendedSettings.longBreakEveryNBlocks).toBe(3);
  });

  it('diferencia entre criterio equilibrado (resistente a outlier) y criterio por maximo', () => {
    const samples: PageReadingSample[] = [
      { docId: 'd1', docName: 'Paper.pdf', fileType: 'pdf', page: 1, activeSeconds: 120, updatedAt: '' },
      { docId: 'd1', docName: 'Paper.pdf', fileType: 'pdf', page: 2, activeSeconds: 130, updatedAt: '' },
      { docId: 'd1', docName: 'Paper.pdf', fileType: 'pdf', page: 3, activeSeconds: 140, updatedAt: '' },
      { docId: 'd1', docName: 'Paper.pdf', fileType: 'pdf', page: 4, activeSeconds: 480, updatedAt: '' }, // pagina muy densa / outlier
    ];

    const stats = computeDiagnosticStats(samples);
    expect(stats.minSeconds).toBe(120);
    expect(stats.maxSeconds).toBe(480);
    expect(stats.medianSeconds).toBe(135);

    const balanced = computeRecommendedPomodoro(samples, 'balanced');
    const conservativeMax = computeRecommendedPomodoro(samples, 'max');

    expect(conservativeMax.recommendedSettings.speedMinPerPage).toBeGreaterThan(
      balanced.recommendedSettings.speedMinPerPage
    );
    expect(conservativeMax.recommendedSettings.studyMinutes).toBeLessThanOrEqual(
      balanced.recommendedSettings.studyMinutes
    );
  });

  it('sugiere estrategias adaptadas al perfil del estudiante, urgencia y documentos cargados', () => {
    const flowRec = computeAdaptiveStrategyRecommendation({
      samples: [],
      learnerProfile: {
        focusPattern: 'flow_uninterrupted',
        primaryGoal: 'retention',
        timePressureTolerance: 'flexible_pace',
        reviewPreference: 'active_recall',
      },
      hoursUntilDeadline: 96,
    });
    expect(flowRec.strategyMatches?.[0].strategyId).toBe('flowtime');
    expect(flowRec.strategyMatches?.[0].recommendedSynthesis).toBe('fsrs_occlusion');

    const multiDocs: DocumentRecord[] = [
      {
        id: 'doc1',
        folderId: null,
        name: 'A.pdf',
        fileType: 'pdf',
        size: 100,
        pageCount: 20,
        currentPage: 1,
        uploadDate: '',
      },
      {
        id: 'doc2',
        folderId: null,
        name: 'B.pdf',
        fileType: 'pdf',
        size: 100,
        pageCount: 25,
        currentPage: 1,
        uploadDate: '',
      },
    ];
    const interleaveRec = computeAdaptiveStrategyRecommendation({
      samples: [],
      documents: multiDocs,
      learnerProfile: {
        focusPattern: 'short_bursts',
        primaryGoal: 'multi_subject',
        timePressureTolerance: 'flexible_pace',
        reviewPreference: 'structured_cornell',
      },
      hoursUntilDeadline: 72,
    });
    expect(interleaveRec.strategyMatches?.some((m) => m.strategyId === 'interleaving')).toBe(
      true
    );
    expect(interleaveRec.strategyMatches?.[0].recommendedSynthesis).toBe('cornell');
  });
});

