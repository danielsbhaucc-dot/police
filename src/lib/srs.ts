import type { CardProgress, Rating } from '../types';
import {
  DEFAULT_EASE,
  MIN_EASE,
  LEARNING_STEPS_MINUTES,
  GRADUATING_INTERVAL_DAYS,
  EASY_INTERVAL_DAYS,
  KNOWN_INTERVAL_DAYS,
} from '../types';

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

function addMinutes(ms: number, minutes: number): number {
  return ms + minutes * MS_PER_MINUTE;
}

function addDays(ms: number, days: number): number {
  return ms + days * MS_PER_DAY;
}

export function createNewCard(vocabId: string): CardProgress {
  return {
    vocabId,
    state: 'new',
    easeFactor: DEFAULT_EASE,
    interval: 0,
    repetitions: 0,
    lapses: 0,
    nextReview: 0,
    lastReview: null,
    learningStep: 0,
    personalSentence: '',
    personalExperience: '',
    timesStudied: 0,
    timesCorrect: 0,
    introduced: false,
    selfDeclaredKnown: false,
  };
}

export function markAsKnown(card: CardProgress, now = Date.now()): CardProgress {
  return {
    ...card,
    state: 'known',
    introduced: true,
    selfDeclaredKnown: true,
    repetitions: 3,
    interval: KNOWN_INTERVAL_DAYS,
    easeFactor: DEFAULT_EASE + 0.3,
    nextReview: addDays(now, KNOWN_INTERVAL_DAYS),
    lastReview: now,
    timesStudied: card.timesStudied + 1,
    timesCorrect: card.timesCorrect + 1,
  };
}

export function markIntroduced(card: CardProgress): CardProgress {
  return { ...card, introduced: true };
}

/**
 * אלגוריתם SRS בהשראת Duocards/Anki:
 * שלבי למידה קצרים, מרווחים גדלים, ease factor דינמי
 */
export function applyRating(card: CardProgress, rating: Rating, now = Date.now()): CardProgress {
  const updated = { ...card, lastReview: now, timesStudied: card.timesStudied + 1, introduced: true };

  if (rating === 'good' || rating === 'easy') {
    updated.timesCorrect = card.timesCorrect + 1;
  }

  switch (card.state) {
    case 'new':
    case 'learning':
    case 'relearning':
      return applyLearningRating(updated, rating, now);
    case 'review':
    case 'known':
      return applyReviewRating(updated, rating, now);
    default:
      return updated;
  }
}

function applyLearningRating(card: CardProgress, rating: Rating, now: number): CardProgress {
  if (rating === 'again') {
    return {
      ...card,
      state: 'learning',
      learningStep: 0,
      nextReview: addMinutes(now, LEARNING_STEPS_MINUTES[0]),
      lapses: card.lapses + 1,
      easeFactor: Math.max(MIN_EASE, card.easeFactor - 0.2),
      selfDeclaredKnown: false,
    };
  }

  if (rating === 'hard') {
    const step = Math.max(0, card.learningStep);
    return {
      ...card,
      state: 'learning',
      learningStep: step,
      nextReview: addMinutes(now, LEARNING_STEPS_MINUTES[step] * 1.5),
      easeFactor: Math.max(MIN_EASE, card.easeFactor - 0.15),
    };
  }

  if (rating === 'good') {
    const nextStep = card.learningStep + 1;
    if (nextStep >= LEARNING_STEPS_MINUTES.length) {
      return {
        ...card,
        state: 'review',
        learningStep: 0,
        repetitions: 1,
        interval: GRADUATING_INTERVAL_DAYS,
        nextReview: addDays(now, GRADUATING_INTERVAL_DAYS),
      };
    }
    return {
      ...card,
      state: 'learning',
      learningStep: nextStep,
      nextReview: addMinutes(now, LEARNING_STEPS_MINUTES[nextStep]),
    };
  }

  return {
    ...card,
    state: 'review',
    learningStep: 0,
    repetitions: 1,
    interval: EASY_INTERVAL_DAYS,
    easeFactor: card.easeFactor + 0.15,
    nextReview: addDays(now, EASY_INTERVAL_DAYS),
  };
}

function applyReviewRating(card: CardProgress, rating: Rating, now: number): CardProgress {
  if (rating === 'again') {
    return {
      ...card,
      state: 'relearning',
      learningStep: 0,
      repetitions: 0,
      lapses: card.lapses + 1,
      easeFactor: Math.max(MIN_EASE, card.easeFactor - 0.2),
      nextReview: addMinutes(now, LEARNING_STEPS_MINUTES[0]),
      selfDeclaredKnown: false,
    };
  }

  let ease = card.easeFactor;
  let interval = card.interval;

  if (rating === 'hard') {
    ease = Math.max(MIN_EASE, ease - 0.15);
    interval = Math.max(1, Math.round(interval * 1.2));
  } else if (rating === 'good') {
    interval = Math.round(interval * ease);
  } else {
    ease = ease + 0.15;
    interval = Math.round(interval * ease * 1.3);
  }

  return {
    ...card,
    state: 'review',
    easeFactor: ease,
    interval,
    repetitions: card.repetitions + 1,
    nextReview: addDays(now, interval),
  };
}

export function isDue(card: CardProgress, now = Date.now()): boolean {
  if (card.state === 'new' && !card.introduced) return true;
  if (card.state === 'new') return false;
  if (card.state === 'known' && card.nextReview > now) return false;
  return card.nextReview <= now;
}

export function getDueCards(cards: CardProgress[], now = Date.now()): CardProgress[] {
  return cards.filter((c) => isDue(c, now));
}

export function sortByPriority(cards: CardProgress[], now = Date.now()): CardProgress[] {
  return [...cards].sort((a, b) => {
    const priority = (c: CardProgress) => {
      if (c.state === 'relearning') return 0;
      if (c.state === 'learning') return 1;
      if ((c.state === 'review' || c.state === 'known') && c.nextReview <= now) return 2;
      if (c.state === 'new' && !c.introduced) return 3;
      if (c.state === 'new') return 4;
      return 5;
    };
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;
    return a.nextReview - b.nextReview;
  });
}

export function masteryPercent(card: CardProgress): number {
  if (card.state === 'known') return 95;
  if (card.state === 'new') return 0;
  if (card.state === 'learning' || card.state === 'relearning') {
    return 20 + card.learningStep * 25;
  }
  const accuracy = card.timesStudied > 0 ? card.timesCorrect / card.timesStudied : 0;
  const intervalBonus = Math.min(40, card.interval * 5);
  return Math.min(100, Math.round(40 + accuracy * 30 + intervalBonus));
}

export function countKnown(cards: Record<string, CardProgress>): number {
  return Object.values(cards).filter((c) => c.state === 'known').length;
}
