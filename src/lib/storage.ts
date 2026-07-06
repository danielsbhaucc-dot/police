import { VOCABULARY } from '../data/vocabulary';
import type { AppState, CardProgress, StudySession, UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { createNewCard, markAsKnown, markIntroduced, countKnown } from './srs';

const STORAGE_KEY = 'police-exam-prep-v2';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function initCards(): Record<string, CardProgress> {
  const cards: Record<string, CardProgress> = {};
  for (const v of VOCABULARY) {
    cards[v.id] = createNewCard(v.id);
  }
  return cards;
}

function migrateCard(card: CardProgress): CardProgress {
  return {
    ...createNewCard(card.vocabId),
    ...card,
    introduced: card.introduced ?? false,
    selfDeclaredKnown: card.selfDeclaredKnown ?? false,
  };
}

function defaultState(): AppState {
  return {
    cards: initCards(),
    settings: { ...DEFAULT_SETTINGS },
    sessions: [],
    lastSessionDate: null,
    todayNewCount: 0,
    todayReviewCount: 0,
    knownWordsCount: 0,
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('police-exam-prep-v1');
    if (!raw) return defaultState();

    const parsed = JSON.parse(raw) as AppState;
    const cards = { ...initCards() };
    for (const [id, card] of Object.entries(parsed.cards ?? {})) {
      cards[id] = migrateCard(card);
    }

    const state: AppState = {
      ...defaultState(),
      ...parsed,
      cards,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      knownWordsCount: countKnown(cards),
    };

    if (state.lastSessionDate !== todayKey()) {
      state.todayNewCount = 0;
      state.todayReviewCount = 0;
      state.lastSessionDate = todayKey();
    }

    return state;
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function updateSettings(state: AppState, settings: Partial<UserSettings>): AppState {
  return { ...state, settings: { ...state.settings, ...settings } };
}

export function updateCard(state: AppState, card: CardProgress): AppState {
  const prev = state.cards[card.vocabId];
  const isNew = prev?.state === 'new' && card.state !== 'new';
  const isReview = prev?.state !== 'new' && prev?.state !== undefined;

  return {
    ...state,
    cards: { ...state.cards, [card.vocabId]: card },
    todayNewCount: isNew ? state.todayNewCount + 1 : state.todayNewCount,
    todayReviewCount: isReview && card.state !== 'new' ? state.todayReviewCount + 1 : state.todayReviewCount,
    knownWordsCount: countKnown({ ...state.cards, [card.vocabId]: card }),
    lastSessionDate: todayKey(),
  };
}

export function recordSession(state: AppState, session: StudySession): AppState {
  return {
    ...state,
    sessions: [...state.sessions.slice(-30), session],
    lastSessionDate: todayKey(),
  };
}

export function markCardKnown(state: AppState, vocabId: string): AppState {
  const card = state.cards[vocabId];
  if (!card) return state;
  return updateCard(state, markAsKnown(card));
}

export function markCardIntroduced(state: AppState, vocabId: string): AppState {
  const card = state.cards[vocabId];
  if (!card) return state;
  return updateCard(state, markIntroduced(card));
}

export function savePersonalData(
  state: AppState,
  vocabId: string,
  data: { sentence?: string; experience?: string }
): AppState {
  const card = state.cards[vocabId];
  if (!card) return state;
  return updateCard(state, {
    ...card,
    personalSentence: data.sentence ?? card.personalSentence,
    personalExperience: data.experience ?? card.personalExperience,
  });
}

export function getUnassessedCards(state: AppState): CardProgress[] {
  return Object.values(state.cards).filter((c) => c.state === 'new' && !c.introduced);
}

export function resetProgress(): AppState {
  const fresh = defaultState();
  saveState(fresh);
  return fresh;
}
