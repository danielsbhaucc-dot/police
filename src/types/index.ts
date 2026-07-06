export type CardState = 'new' | 'learning' | 'review' | 'relearning' | 'skipped';
export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface CardProgress {
  vocabId: string;
  state: CardState;
  easeFactor: number;
  interval: number;
  repetitions: number;
  lapses: number;
  nextReview: number;
  lastReview: number | null;
  learningStep: number;
  personalSentence: string;
  personalExperience: string;
  timesStudied: number;
  timesCorrect: number;
  introduced: boolean;
  selfDeclaredKnown: boolean;
}

export interface UserSettings {
  examDate: string | null;
  dailyGoalOverride: number | null;
  eveningReviewEnabled: boolean;
  onboardingComplete: boolean;
  assessmentDone: boolean;
}

export interface StudySession {
  startedAt: number;
  cardsStudied: number;
  newCardsStudied: number;
  reviewCardsStudied: number;
  correctCount: number;
  type: 'study' | 'assessment' | 'evening';
}

export interface AppState {
  cards: Record<string, CardProgress>;
  settings: UserSettings;
  sessions: StudySession[];
  lastSessionDate: string | null;
  todayNewCount: number;
  todayReviewCount: number;
  knownWordsCount: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  examDate: null,
  dailyGoalOverride: null,
  eveningReviewEnabled: true,
  onboardingComplete: false,
  assessmentDone: false,
};

export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_SESSION_MINUTES = 30;
export const LEARNING_STEPS_MINUTES = [1, 10];
export const GRADUATING_INTERVAL_DAYS = 1;
export const EASY_INTERVAL_DAYS = 4;
export const REVIEW_ONLY_DAYS_BEFORE_EXAM = 3;
export const SESSION_NEW_WORDS_TARGET = 10;
