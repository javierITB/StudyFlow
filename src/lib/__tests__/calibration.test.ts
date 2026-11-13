import { describe, expect, it } from 'vitest';
import { computeFlowtimeBreakMinutes } from '../studyMethods';
import {
  advanceCalibrationTour,
  buildCalibrationSessionMetric,
  createCalibrationTour,
} from '../calibration';

describe('calibration & flowtime', () => {
  it('calcula descansos proporcionales correctos para Flowtime', () => {
    expect(computeFlowtimeBreakMinutes(10 * 60)).toBe(5);
    expect(computeFlowtimeBreakMinutes(25 * 60)).toBe(8);
    expect(computeFlowtimeBreakMinutes(49 * 60)).toBe(8);
    expect(computeFlowtimeBreakMinutes(50 * 60)).toBe(10);
    expect(computeFlowtimeBreakMinutes(95 * 60)).toBe(15);
    expect(computeFlowtimeBreakMinutes(130 * 60)).toBe(20);
  });

  it('recorre sesiones A/B y sugiere ganador equilibrando velocidad, sintesis y fatiga', () => {
    let tour = createCalibrationTour(['pomodoro', 'flowtime', 'ultradian_52_17']);
    expect(tour.isActive).toBe(true);
    expect(tour.currentIndex).toBe(0);

    tour = advanceCalibrationTour(
      tour,
      buildCalibrationSessionMetric({
        strategyId: 'pomodoro',
        realStudySeconds: 25 * 60,
        breakSeconds: 5 * 60,
        pagesAdvanced: 6,
        notesAndOcclusionsCreated: 4,
        fatigueRating: 4,
      })
    );
    expect(tour.isActive).toBe(true);
    expect(tour.currentIndex).toBe(1);

    tour = advanceCalibrationTour(
      tour,
      buildCalibrationSessionMetric({
        strategyId: 'flowtime',
        realStudySeconds: 40 * 60,
        breakSeconds: 8 * 60,
        pagesAdvanced: 16,
        notesAndOcclusionsCreated: 10,
        fatigueRating: 1,
      })
    );
    expect(tour.isActive).toBe(true);
    expect(tour.currentIndex).toBe(2);

    tour = advanceCalibrationTour(
      tour,
      buildCalibrationSessionMetric({
        strategyId: 'ultradian_52_17',
        realStudySeconds: 52 * 60,
        breakSeconds: 17 * 60,
        pagesAdvanced: 12,
        notesAndOcclusionsCreated: 6,
        fatigueRating: 3,
      })
    );

    expect(tour.isActive).toBe(false);
    expect(tour.sessions).toHaveLength(3);
    expect(tour.recommendedWinner).toBe('flowtime');
  });
});

