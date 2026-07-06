import type { CardProgress } from '../types';

/** מילים שהמשתמש כבר מכיר – לא נכנסות ל-SRS ולא לשיעורים */
export function markAsSkipped(card: CardProgress, now = Date.now()): CardProgress {
  return {
    ...card,
    state: 'skipped',
    introduced: true,
    selfDeclaredKnown: true,
    nextReview: Number.MAX_SAFE_INTEGER,
    lastReview: now,
  };
}

export function isSkipped(card: CardProgress): boolean {
  return card.state === 'skipped';
}

export function countSkipped(cards: Record<string, CardProgress>): number {
  return Object.values(cards).filter((c) => c.state === 'skipped').length;
}
