import {
  DocumentRecord,
  FeasibilityStatus,
  FolderRecord,
  RouteSegment,
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

interface PendingDocSlice {
  docId: string;
  docName: string;
  folderName?: string;
  cursor: number;
  endPage: number;
}

interface RawStudyBlock {
  segments: RouteSegment[];
  durationMinutes: number;
  finishedADoc: boolean;
  nextDocNameAfterBlock?: string;
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
 * Soporta tres estrategias de bloques:
 * - 'pack': empaqueta documentos cortos consecutivos dentro del mismo ciclo (ej. 25 min o N pags)
 *   y coloca el descanso al completar el bloque o cambiar de tema tras terminarlo.
 * - 'exact_doc': ajusta la duracion del bloque al tiempo real estimado de cada archivo.
 * - 'full_block': asigna al menos un bloque Pomodoro completo a cada archivo.
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

  const validDocs = documents.filter((doc) => (doc.pageCount || 0) > 0);
  const speed = Math.max(0.5, settings.speedMinPerPage || 3);
  const studyMin = Math.max(5, settings.studyMinutes || 25);
  const pagesPerBlockSetting = Math.max(1, settings.pagesPerBlock || 5);
  const shortBreak = Math.max(1, settings.shortBreakMinutes || 5);
  const longBreak = Math.max(2, settings.longBreakMinutes || 15);
  const everyN = Math.max(0, settings.longBreakEveryNBlocks || 0);
  const allocationMode = settings.blockAllocationMode || 'pack';

  let totalPages = 0;
  const docSlices: PendingDocSlice[] = validDocs.map((doc) => {
    const docTotalPages = Math.max(1, doc.pageCount);
    const startPage = settings.resumeFromCurrentPage
      ? Math.min(Math.max(1, doc.currentPage || 1), docTotalPages)
      : 1;
    totalPages += Math.max(1, docTotalPages - startPage + 1);
    return {
      docId: doc.id,
      docName: doc.name,
      folderName: doc.folderId ? folderMap.get(doc.folderId) : undefined,
      cursor: startPage,
      endPage: docTotalPages,
    };
  });

  const studyBlocks: RawStudyBlock[] = [];

  if (allocationMode === 'pack') {
    let sliceIdx = 0;

    while (sliceIdx < docSlices.length) {
      const segments: RouteSegment[] = [];
      let blockUsedCapacity = 0;
      const blockCapacity =
        settings.intervalMode === 'pages' ? pagesPerBlockSetting : studyMin;
      let finishedADoc = false;

      while (sliceIdx < docSlices.length) {
        const current = docSlices[sliceIdx];
        const pagesRemaining = current.endPage - current.cursor + 1;
        if (pagesRemaining <= 0) {
          sliceIdx++;
          continue;
        }

        const remainingCapacity = blockCapacity - blockUsedCapacity;

        if (settings.intervalMode === 'pages') {
          if (remainingCapacity <= 0) break;
          const pagesToTake = Math.min(pagesRemaining, remainingCapacity);
          const segEnd = current.cursor + pagesToTake - 1;
          segments.push({
            docId: current.docId,
            docName: current.docName,
            folderName: current.folderName,
            startPage: current.cursor,
            endPage: segEnd,
            pageCount: pagesToTake,
            estimatedMinutes: Math.max(1, Math.round(pagesToTake * speed)),
          });
          current.cursor = segEnd + 1;
          blockUsedCapacity += pagesToTake;
        } else {
          // Modo tiempo: cuantas paginas caben en la capacidad restante del bloque
          if (remainingCapacity < speed && segments.length > 0) {
            break;
          }
          const exactPagesInCap =
            segments.length === 0 && remainingCapacity < speed
              ? 1
              : Math.max(1, Math.floor(remainingCapacity / speed));
          const pagesToTake = Math.min(pagesRemaining, exactPagesInCap);
          const segEnd = current.cursor + pagesToTake - 1;
          const segMinutes = Math.max(1, Math.round(pagesToTake * speed));

          segments.push({
            docId: current.docId,
            docName: current.docName,
            folderName: current.folderName,
            startPage: current.cursor,
            endPage: segEnd,
            pageCount: pagesToTake,
            estimatedMinutes: segMinutes,
          });
          current.cursor = segEnd + 1;
          blockUsedCapacity += segMinutes;
        }

        if (current.cursor > current.endPage) {
          finishedADoc = true;
          sliceIdx++;
        } else {
          // El documento sigue teniendo paginas pendientes, asi que este bloque ya se lleno
          break;
        }
      }

      if (segments.length > 0) {
        const rawEstMinutes = segments.reduce((sum, s) => sum + s.estimatedMinutes, 0);
        const blockDuration =
          settings.intervalMode === 'time'
            ? Math.max(1, Math.min(studyMin, rawEstMinutes))
            : Math.max(1, rawEstMinutes);

        studyBlocks.push({
          segments,
          durationMinutes: blockDuration,
          finishedADoc,
          nextDocNameAfterBlock:
            sliceIdx < docSlices.length ? docSlices[sliceIdx].docName : undefined,
        });
      }
    }
  } else {
    // 'exact_doc' o 'full_block': cada documento mantiene sus bloques independientes
    docSlices.forEach((doc, idx) => {
      const remainingPages = doc.endPage - doc.cursor + 1;
      const nextDocName =
        idx + 1 < docSlices.length ? docSlices[idx + 1].docName : undefined;

      if (settings.intervalMode === 'pages') {
        let cursor = doc.cursor;
        while (cursor <= doc.endPage) {
          const segEnd = Math.min(doc.endPage, cursor + pagesPerBlockSetting - 1);
          const count = segEnd - cursor + 1;
          const estMin = Math.max(1, Math.round(count * speed));
          const isLastOfDoc = segEnd >= doc.endPage;
          studyBlocks.push({
            segments: [
              {
                docId: doc.docId,
                docName: doc.docName,
                folderName: doc.folderName,
                startPage: cursor,
                endPage: segEnd,
                pageCount: count,
                estimatedMinutes: estMin,
              },
            ],
            durationMinutes: estMin,
            finishedADoc: isLastOfDoc,
            nextDocNameAfterBlock: isLastOfDoc ? nextDocName : undefined,
          });
          cursor = segEnd + 1;
        }
      } else {
        const totalDocMinutes = remainingPages * speed;
        const numBlocks = Math.max(1, Math.ceil(totalDocMinutes / studyMin));
        let cursor = doc.cursor;

        for (let b = 0; b < numBlocks; b++) {
          const blocksRemaining = numBlocks - b;
          const pagesLeft = doc.endPage - cursor + 1;
          const pagesThisBlock =
            b === numBlocks - 1
              ? pagesLeft
              : Math.max(1, Math.round(pagesLeft / blocksRemaining));
          const segEnd = Math.min(doc.endPage, cursor + pagesThisBlock - 1);
          const actualCount = Math.max(0, segEnd - cursor + 1);
          if (actualCount <= 0) continue;

          const exactEst = Math.max(1, Math.round(actualCount * speed));
          const durationMinutes =
            allocationMode === 'full_block'
              ? studyMin
              : b === numBlocks - 1
                ? Math.min(studyMin, exactEst)
                : studyMin;

          const isLastOfDoc = b === numBlocks - 1 || segEnd >= doc.endPage;

          studyBlocks.push({
            segments: [
              {
                docId: doc.docId,
                docName: doc.docName,
                folderName: doc.folderName,
                startPage: cursor,
                endPage: segEnd,
                pageCount: actualCount,
                estimatedMinutes: durationMinutes,
              },
            ],
            durationMinutes,
            finishedADoc: isLastOfDoc,
            nextDocNameAfterBlock: isLastOfDoc ? nextDocName : undefined,
          });

          cursor = segEnd + 1;
        }
      }
    });
  }

  // Convertir bloques a RouteStep[] intercalando descansos cortos y largos
  const rawSteps: Omit<RouteStep, 'dayNumber' | 'dayLabel'>[] = [];
  let totalStudyBlocks = 0;
  let totalStudyMinutes = 0;
  let totalBreakMinutes = 0;
  let stepOrder = 1;
  let streakWithoutLongBreak = 0;

  studyBlocks.forEach((block, idx) => {
    const firstSeg = block.segments[0];
    const lastSeg = block.segments[block.segments.length - 1];
    const totalBlockPages = block.segments.reduce((sum, s) => sum + s.pageCount, 0);

    const stepId = `step_${block.segments
      .map((s) => `${s.docId}_${s.startPage}_${s.endPage}`)
      .join('__')}_${idx}`;

    const displayName =
      block.segments.length === 1
        ? firstSeg.docName
        : `${firstSeg.docName} + ${block.segments.length - 1} más`;

    rawSteps.push({
      id: stepId,
      order: stepOrder++,
      type: 'study',
      docId: firstSeg.docId,
      docName: displayName,
      folderName: firstSeg.folderName,
      startPage: firstSeg.startPage,
      endPage: lastSeg.endPage,
      pageCount: totalBlockPages,
      segments: block.segments,
      durationMinutes: block.durationMinutes,
      completed: completedSet.has(stepId),
    });

    totalStudyBlocks++;
    totalStudyMinutes += block.durationMinutes;
    streakWithoutLongBreak++;

    const isLastBlockOverall = idx === studyBlocks.length - 1;
    if (!isLastBlockOverall) {
      const hitPeriodicLong =
        everyN > 0 && streakWithoutLongBreak % everyN === 0;
      const shouldBeLongBreak =
        (block.finishedADoc && settings.longBreakBetweenDocs) || hitPeriodicLong;

      const breakMinutes = shouldBeLongBreak ? longBreak : shortBreak;
      const breakId = `brk_${idx}_${shouldBeLongBreak ? 'long' : 'short'}`;

      if (shouldBeLongBreak) {
        streakWithoutLongBreak = 0;
      }

      rawSteps.push({
        id: breakId,
        order: stepOrder++,
        type: shouldBeLongBreak ? 'long_break' : 'short_break',
        docId: lastSeg.docId,
        docName: lastSeg.docName,
        nextDocName: block.nextDocNameAfterBlock,
        folderName: lastSeg.folderName,
        durationMinutes: breakMinutes,
        completed: completedSet.has(breakId),
      });

      totalBreakMinutes += breakMinutes;
    }
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
    recommendation = `Ruta sostenible: avanza ${blocksPerDay.toFixed(1)} bloques/día (~${Math.round(minutesPerDay)} min diarios) con descansos cortos intra-archivo y descansos largos al cambiar de documento.`;
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
