import { FsrsCardState, FsrsRating } from '../types/studyflow';

// Pesos estándar validados de FSRS-4.5 (17 parámetros)
const DEFAULT_W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
  0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
] as const;

const FSRS_DECAY = -0.5;
const FSRS_FACTOR = 19 / 81;
const REQUEST_RETENTION = 0.9;
const MS_PER_DAY = 86_400_000;

const RATING_GRADE: Record<FsrsRating, 1 | 2 | 3 | 4> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createInitialFsrsCard(now = new Date()): FsrsCardState {
  return {
    state: 'new',
    dueAt: now.toISOString(),
    stability: 0,
    difficulty: 5,
    reps: 0,
    lapses: 0,
  };
}

/**
 * Calcula la probabilidad de recuerdo actual R(t, S) in [0..1] según FSRS-4.5.
 */
export function computeRetrievability(
  card: FsrsCardState | undefined,
  now = new Date()
): number {
  if (!card || card.state === 'new' || card.stability <= 0 || !card.lastReviewAt) {
    return 1;
  }
  const elapsedDays = Math.max(
    0,
    (now.getTime() - new Date(card.lastReviewAt).getTime()) / MS_PER_DAY
  );
  return Math.pow(1 + (FSRS_FACTOR * elapsedDays) / card.stability, FSRS_DECAY);
}

function nextIntervalDays(stability: number, requestedRetention = REQUEST_RETENTION): number {
  const safeS = Math.max(0.1, stability);
  const raw =
    (safeS / FSRS_FACTOR) * (Math.pow(requestedRetention, 1 / FSRS_DECAY) - 1);
  return Math.max(1, Math.round(raw));
}

/**
 * Reprograma una tarjeta (Post-it u Oclusión) usando FSRS-4.5 según calificación del estudiante.
 */
export function scheduleFsrsReview(
  currentCard: FsrsCardState | undefined,
  rating: FsrsRating,
  now = new Date()
): FsrsCardState {
  const card = currentCard || createInitialFsrsCard(now);
  const g = RATING_GRADE[rating];
  const nowIso = now.toISOString();

  // Primera exposición (tarjeta nueva)
  if (card.state === 'new' || card.reps === 0 || card.stability <= 0) {
    const initialS = DEFAULT_W[g - 1];
    const initialD = clamp(DEFAULT_W[4] - DEFAULT_W[5] * (g - 3), 1, 10);

    if (rating === 'again') {
      const due = new Date(now.getTime() + 10 * 60 * 1000); // 10 min reaprendizaje
      return {
        state: 'learning',
        dueAt: due.toISOString(),
        stability: Number(initialS.toFixed(3)),
        difficulty: Number(initialD.toFixed(3)),
        reps: 1,
        lapses: card.lapses,
        lastReviewAt: nowIso,
      };
    }

    const intervalDays =
      rating === 'hard'
        ? Math.max(1, Math.round(nextIntervalDays(initialS) * 0.6))
        : nextIntervalDays(initialS);
    const due = new Date(now.getTime() + intervalDays * MS_PER_DAY);

    return {
      state: rating === 'hard' ? 'learning' : 'review',
      dueAt: due.toISOString(),
      stability: Number(initialS.toFixed(3)),
      difficulty: Number(initialD.toFixed(3)),
      reps: 1,
      lapses: card.lapses,
      lastReviewAt: nowIso,
    };
  }

  const r = computeRetrievability(card, now);
  const d0Good = clamp(DEFAULT_W[4], 1, 10);
  const nextD = clamp(
    DEFAULT_W[7] * d0Good +
      (1 - DEFAULT_W[7]) * clamp(card.difficulty - DEFAULT_W[6] * (g - 3), 1, 10),
    1,
    10
  );

  if (rating === 'again') {
    const lapseS =
      DEFAULT_W[11] *
      Math.pow(nextD, -DEFAULT_W[12]) *
      (Math.pow(card.stability + 1, DEFAULT_W[13]) - 1) *
      Math.exp(DEFAULT_W[14] * (1 - r));
    const boundedS = Math.max(0.2, Math.min(card.stability, lapseS));
    const due = new Date(now.getTime() + 10 * 60 * 1000);
    return {
      state: 'relearning',
      dueAt: due.toISOString(),
      stability: Number(boundedS.toFixed(3)),
      difficulty: Number(nextD.toFixed(3)),
      reps: card.reps + 1,
      lapses: card.lapses + 1,
      lastReviewAt: nowIso,
    };
  }

  const hardPenalty = rating === 'hard' ? DEFAULT_W[15] : 1;
  const easyBonus = rating === 'easy' ? DEFAULT_W[16] : 1;
  const recallGain =
    Math.exp(DEFAULT_W[8]) *
    (11 - nextD) *
    Math.pow(card.stability, -DEFAULT_W[9]) *
    (Math.exp(DEFAULT_W[10] * (1 - r)) - 1) *
    hardPenalty *
    easyBonus;
  const nextS = Math.max(card.stability, card.stability * (recallGain + 1));
  const days = nextIntervalDays(nextS);
  const due = new Date(now.getTime() + days * MS_PER_DAY);

  return {
    state: 'review',
    dueAt: due.toISOString(),
    stability: Number(nextS.toFixed(3)),
    difficulty: Number(nextD.toFixed(3)),
    reps: card.reps + 1,
    lapses: card.lapses,
    lastReviewAt: nowIso,
  };
}

export function formatFsrsIntervalLabel(dueAtIso: string, now = new Date()): string {
  const diffMs = new Date(dueAtIso).getTime() - now.getTime();
  if (diffMs <= 60 * 60 * 1000) {
    const mins = Math.max(1, Math.round(diffMs / 60000));
    return `${mins}m`;
  }
  const days = Math.max(1, Math.round(diffMs / MS_PER_DAY));
  if (days >= 30) {
    return `${Math.round(days / 30)}mes`;
  }
  return `${days}d`;
}

export function getNextIntervalsPreview(
  card: FsrsCardState | undefined,
  now = new Date()
): Record<FsrsRating, string> {
  const ratings: FsrsRating[] = ['again', 'hard', 'good', 'easy'];
  const result = {} as Record<FsrsRating, string>;
  for (const r of ratings) {
    const next = scheduleFsrsReview(card, r, now);
    result[r] = formatFsrsIntervalLabel(next.dueAt, now);
  }
  return result;
}

export function isCardDue(card: FsrsCardState | undefined, now = new Date()): boolean {
  if (!card) return true; // Tarjetas aún no estudiadas entran disponibles en cola de repaso
  return new Date(card.dueAt).getTime() <= now.getTime();
}

