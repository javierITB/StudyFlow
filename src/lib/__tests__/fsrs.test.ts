import { describe, expect, it } from 'vitest';
import {
  computeRetrievability,
  createInitialFsrsCard,
  getNextIntervalsPreview,
  isCardDue,
  scheduleFsrsReview,
} from '../fsrs';

describe('fsrs spaced repetition engine', () => {
  it('crea tarjetas nuevas vencidas y aumenta estabilidad con Good y Easy', () => {
    const t0 = new Date('2026-11-12T10:00:00Z');
    const card = createInitialFsrsCard(t0);
    expect(isCardDue(card, t0)).toBe(true);

    const afterGood = scheduleFsrsReview(card, 'good', t0);
    expect(afterGood.state).toBe('review');
    expect(afterGood.reps).toBe(1);
    expect(afterGood.stability).toBeGreaterThan(3);
    expect(isCardDue(afterGood, t0)).toBe(false);

    const afterEasy = scheduleFsrsReview(card, 'easy', t0);
    expect(afterEasy.stability).toBeGreaterThan(afterGood.stability);
  });

  it('reinicia a relearning e incrementa lapses al calificar Again', () => {
    const t0 = new Date('2026-11-12T10:00:00Z');
    const first = scheduleFsrsReview(undefined, 'good', t0);
    const t1 = new Date(first.dueAt);

    expect(computeRetrievability(first, t1)).toBeCloseTo(0.9, 1);

    const lapsed = scheduleFsrsReview(first, 'again', t1);
    expect(lapsed.state).toBe('relearning');
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.stability).toBeLessThanOrEqual(first.stability);
  });

  it('genera etiquetas legibles de proximos intervalos para los 4 botones', () => {
    const t0 = new Date('2026-11-12T10:00:00Z');
    const preview = getNextIntervalsPreview(undefined, t0);
    expect(preview.again).toBe('10m');
    expect(preview.good).toMatch(/\d+d/);
    expect(preview.easy).toMatch(/\d+d/);
  });
});

