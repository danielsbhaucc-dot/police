import type { AppState, CardProgress } from '../types';
import { SESSION_NEW_WORDS_TARGET } from '../types';
import { sortByPriority } from './srs';
import { buildSessionQueue } from './studyPlan';

export interface SessionSetup {
  reviewQueue: CardProgress[];
  newWordPool: CardProgress[];
}

/** בונה שיעור: חזרות + מאגר מילים חדשות (יותר מ-10 למקרה של דילוגים) */
export function buildSessionSetup(state: AppState, now = Date.now()): SessionSetup {
  const sq = buildSessionQueue(state, now);
  const allNew = sortByPriority(
    Object.values(state.cards).filter((c) => c.state === 'new'),
    now
  );

  const inSession = new Set([
    ...sq.reviewCards.map((c) => c.vocabId),
    ...sq.newCards.map((c) => c.vocabId),
  ]);

  const poolFromQueue = sq.newCards;
  const extraNew = allNew
    .filter((c) => !inSession.has(c.vocabId))
    .slice(0, SESSION_NEW_WORDS_TARGET + 10);

  return {
    reviewQueue: sq.reviewCards,
    newWordPool: [...poolFromQueue, ...extraNew].filter(
      (c, i, arr) => arr.findIndex((x) => x.vocabId === c.vocabId) === i
    ),
  };
}

export function pullNextNewWord(pool: CardProgress[], usedIds: Set<string>): CardProgress | null {
  return pool.find((c) => !usedIds.has(c.vocabId)) ?? null;
}
