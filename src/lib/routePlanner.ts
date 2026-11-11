import {
  DocumentRecord,
  FeasibilityStatus,
  FolderRecord,
  RouteStep,
  StudyPlanResult,
  StudySettings,
} from '../types/studyflow';

export interface GenerateRouteParams {
  documents: DocumentRecord[];
  folders: FolderRecord[];
  settings: StudySettings;
  deadline: string;
  completedStepIds?: string[];
  now?: Date;
}

function formatDayLabel(dayNumber: number, baseDate: Date): string {
  const target = new Date(baseDate.getTime());
  target.setDate(target.getDate() + (dayNumber - 1));
  if (dayNumber === 1) return 'Día 1 (Hoy)';
  if (dayNumber === 2) return 'Día 2 (Mañana)';
  const formatted = target.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `Día ${dayNumber} (${formatted})`;
}

/**
 * Genera una ruta secuencial de estudio hasta la fecha limite.
 * Inserta descansos cortos dentro del mismo documento y descansos largos
 * al cambiar de un archivo a otro (o tras N bloques continuos si es extenso).
 */
export function generateStudyRoute({
  documents,
  folders,
  settings,
  deadline,
  completedStepIds = [],
  now = new Date(),
}: GenerateRouteParams): StudyPlanResult {
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));
  const completedSet = new Set(completedStepIds);

  const rawSteps: Omit<RouteStep, 'dayNumber' | 'dayLabel'>[] = [];
  let totalPages = 0;
  let totalStudyBlocks = 0;
  let totalStudyMinutes = 0;
  let totalBreakMinutes = 0;
  let stepOrder = 1;

  const validDocs = documents.filter((doc) => (doc.pageCount || 0) > 0);
  const speed = Math.max(0.5, settings.speedMinPerPage || 3);
  const studyMin = Math.max(5, settings.studyMinutes || 25);
  const pagesPerBlockSetting = Math.max(1, settings.pagesPerBlock || 5);
  const shortBreak = Math.max(1, settings.shortBreakMinutes || 5);
  const longBreak = Math.max(2, settings.longBreakMinutes || 15);
  const everyN = Math.max(0, settings.longBreakEveryNBlocks || 0);

  validDocs.forEach((doc, docIndex) => {
    const docTotalPages = Math.max(1, doc.pageCount);
    const startPage = settings.resumeFromCurrentPage
      ? Math.min(Math.max(1, doc.currentPage || 1), docTotalPages)
      : 1;
    const remainingPages = Math.max(1, docTotalPages - startPage + 1);

    totalPages += remainingPages;

    const folderName = doc.folderId ? folderMap.get(doc.folderId) : undefined;
    const docBlocks: Array<{ startPage: number; endPage: number; durationMinutes: number }> = [];

    if (settings.intervalMode === 'pages') {
      let cursor = startPage;
      while (cursor <= docTotalPages) {
        const end = Math.min(docTotalPages, cursor + pagesPerBlockSetting - 1);
        const count = end - cursor + 1;
        docBlocks.push({
          startPage: cursor,
          endPage: end,
          durationMinutes: Math.max(1, Math.round(count * speed)),
        });
        cursor = end + 1;
      }
    } else {
      const totalDocMinutes = remainingPages * speed;
      const numBlocks = Math.max(1, Math.ceil(totalDocMinutes / studyMin));
      let cursor = startPage;

      for (let b = 0; b < numBlocks; b++) {
        const blocksRemaining = numBlocks - b;
        const pagesLeft = docTotalPages - cursor + 1;
        const pagesThisBlock =
          b === numBlocks - 1
            ? pagesLeft
            : Math.max(1, Math.round(pagesLeft / blocksRemaining));
        const end = Math.min(docTotalPages, cursor + pagesThisBlock - 1);
        const actualCount = Math.max(0, end - cursor + 1);
        const estMinutes =
          b === numBlocks - 1
            ? Math.max(1, Math.min(studyMin, Math.round(actualCount * speed)))
            : studyMin;

        if (actualCount > 0) {
          docBlocks.push({
            startPage: cursor,
            endPage: end,
            durationMinutes: estMinutes,
          });
          cursor = end + 1;
        }
      }
    }

    let blocksInsideDoc = 0;
    docBlocks.forEach((block, blockIdx) => {
      const stepId = `step_${doc.id}_${block.startPage}_${block.endPage}_${blockIdx}`;
      const pageCount = block.endPage - block.startPage + 1;

      rawSteps.push({
        id: stepId,
        order: stepOrder++,
        type: 'study',
        docId: doc.id,
        docName: doc.name,
        folderName,
        startPage: block.startPage,
        endPage: block.endPage,
        pageCount,
        durationMinutes: block.durationMinutes,
        completed: completedSet.has(stepId),
      });

      totalStudyBlocks++;
      totalStudyMinutes += block.durationMinutes;
      blocksInsideDoc++;

      const isLastBlockInDoc = blockIdx === docBlocks.length - 1;
      const isLastDoc = docIndex === validDocs.length - 1;

      if (!isLastBlockInDoc) {
        // Descanso dentro del mismo archivo: corto por defecto, o largo cada N bloques continuos
        const useLongBreak = everyN > 0 && blocksInsideDoc % everyN === 0;
        const breakMin = useLongBreak ? longBreak : shortBreak;
        const breakId = `brk_${doc.id}_${blockIdx}`;
        rawSteps.push({
          id: breakId,
          order: stepOrder++,
          type: useLongBreak ? 'long_break' : 'short_break',
          docId: doc.id,
          docName: doc.name,
          folderName,
          durationMinutes: breakMin,
          completed: completedSet.has(breakId),
        });
        totalBreakMinutes += breakMin;
      } else if (!isLastDoc) {
        // Transición entre un documento y otro: descanso largo si está habilitado
        const nextDoc = validDocs[docIndex + 1];
        const useLongTransition = settings.longBreakBetweenDocs;
        const breakMin = useLongTransition ? longBreak : shortBreak;
        const breakId = `trans_${doc.id}_to_${nextDoc.id}`;
        rawSteps.push({
          id: breakId,
          order: stepOrder++,
          type: useLongTransition ? 'long_break' : 'short_break',
          docId: doc.id,
          docName: doc.name,
          nextDocName: nextDoc.name,
          folderName,
          durationMinutes: breakMin,
          completed: completedSet.has(breakId),
        });
        totalBreakMinutes += breakMin;
      }
    });
  });

  const totalMinutes = totalStudyMinutes + totalBreakMinutes;

  let hoursUntilDeadline = 0;
  if (deadline) {
    const deadlineDate = new Date(deadline);
    if (!Number.isNaN(deadlineDate.getTime())) {
      hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    }
  }

  const daysAvailable =
    hoursUntilDeadline > 0 ? Math.max(1, Math.ceil(hoursUntilDeadline / 24)) : 1;

  // Distribuir pasos en dias sin cortar justo antes de un descanso
  const targetDailyMinutes = totalMinutes > 0 ? totalMinutes / daysAvailable : 0;
  const steps: RouteStep[] = [];
  let currentDay = 1;
  let accumulatedInDay = 0;

  rawSteps.forEach((step, idx) => {
    const prevWasBreak = idx > 0 && rawSteps[idx - 1].type !== 'study';
    if (
      step.type === 'study' &&
      prevWasBreak &&
      accumulatedInDay >= targetDailyMinutes &&
      currentDay < daysAvailable
    ) {
      currentDay++;
      accumulatedInDay = 0;
    }

    steps.push({
      ...step,
      dayNumber: currentDay,
      dayLabel: formatDayLabel(currentDay, now),
    });

    accumulatedInDay += step.durationMinutes;
  });

  const blocksPerDay = daysAvailable > 0 ? totalStudyBlocks / daysAvailable : totalStudyBlocks;
  const minutesPerDay = daysAvailable > 0 ? totalMinutes / daysAvailable : totalMinutes;
  const totalRequiredHours = totalMinutes / 60;

  let feasibility: FeasibilityStatus = 'optimal';
  let recommendation = '';

  if (totalPages === 0 || validDocs.length === 0) {
    feasibility = 'no_material';
    recommendation =
      'Selecciona al menos un documento con contenido para generar tu ruta de estudio.';
  } else if (!deadline || hoursUntilDeadline <= 0) {
    feasibility = 'expired';
    recommendation =
      'Define una fecha y hora límite futura para distribuir tus sesiones antes de la entrega.';
  } else if (totalRequiredHours > hoursUntilDeadline || minutesPerDay > 14 * 60) {
    feasibility = 'critical';
    recommendation = `Sobrecarga crítica: necesitas ${totalRequiredHours.toFixed(1)}h totales (${totalStudyBlocks} bloques) y solo restan ${hoursUntilDeadline.toFixed(1)}h reales. Reduce material, acorta los bloques o amplía la fecha objetivo.`;
  } else if (totalRequiredHours > hoursUntilDeadline * 0.65 || minutesPerDay > 6 * 60) {
    feasibility = 'tight';
    recommendation = `Horario ajustado: necesitarás ~${blocksPerDay.toFixed(1)} bloques/día (${(minutesPerDay / 60).toFixed(1)}h/día incluyendo descansos) para llegar antes del plazo.`;
  } else {
    feasibility = 'optimal';
    recommendation = `Ruta sostenible: avanza ${blocksPerDay.toFixed(1)} bloques/día (~${Math.round(minutesPerDay)} min diarios) con descansos cortos intra-archivo y descansos largos entre documentos.`;
  }

  return {
    steps,
    totalPages,
    totalStudyBlocks,
    totalStudyMinutes,
    totalBreakMinutes,
    totalMinutes,
    hoursUntilDeadline,
    daysAvailable,
    blocksPerDay,
    minutesPerDay,
    feasibility,
    recommendation,
  };
}

export function getDefaultDeadlineLocalString(daysAhead = 2): string {
  const target = new Date();
  target.setDate(target.getDate() + daysAhead);
  target.setHours(20, 0, 0, 0);
  const tzOffsetMs = target.getTimezoneOffset() * 60000;
  return new Date(target.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}
